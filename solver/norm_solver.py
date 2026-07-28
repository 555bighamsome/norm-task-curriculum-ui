"""Flat exact baseline for the evidence-first Shared Rulebook curriculum.

The solver begins with the same unweighted canonical rule space shown to
participants. A rule becomes *grounded* when it solves at least one early
learning trial on its own. The solver then exhaustively searches rulebooks made
from grounded rules, ordered by number of rules and total literal count (MDL).

This restriction is part of the model, not a claim about all logically possible
rulebooks: it represents construction by retaining previously successful rules.
Unexpected participant rulebooks are always evaluated directly by the engine.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from itertools import combinations

from experiment_v2 import (
    GROUND_TRUTH_RULEBOOK,
    MAX_RULE_CONDITIONS,
    build_shift_library,
    candidate_rules,
    rule_key,
    rule_mdl,
)
from wh_engine import norm_str, simulate


@dataclass(frozen=True)
class CandidateRecord:
    index: int
    evidence_mask: int
    mdl: int


@dataclass(frozen=True)
class SolutionRecord:
    rule_indices: tuple[int, ...]
    mdl: int

    @property
    def k(self):
        return len(self.rule_indices)


def clone_rule(rule):
    action, conditions = rule
    return action, list(conditions)


def clone_rulebook(rulebook):
    return [clone_rule(rule) for rule in rulebook]


def rulebook_mdl(rulebook):
    return sum(rule_mdl(rule) for rule in rulebook)


def analyze_trial_optimality(world, reference_rulebook, *, max_conditions=MAX_RULE_CONDITIONS):
    """Exhaustively certify a reference rulebook for one scene.

    We first test every canonical single rule.  For a one-rule reference, we
    check whether any lower-MDL single rule also solves.  For a multi-rule
    reference, we additionally test every unordered two-rule system with
    total MDL strictly below the reference.  This is deliberately separate
    from the grounded curriculum solver.
    """
    candidates = candidate_rules(max_conditions)
    reference = [clone_rule(rule) for rule in reference_rulebook]
    reference_mdl = rulebook_mdl(reference)
    single_winners = []
    for candidate in candidates:
        if simulate(world, [candidate])[0]:
            single_winners.append(candidate)

    lower_mdl_single_winners = [
        candidate
        for candidate in single_winners
        if rule_mdl(candidate) < reference_mdl
    ]

    by_mdl = defaultdict(list)
    for candidate in candidates:
        by_mdl[rule_mdl(candidate)].append(candidate)
    lower_mdl_pair_winners = []
    pair_systems_tested = 0
    if len(reference) >= 2:
        for first_mdl in sorted(by_mdl):
            for second_mdl in sorted(by_mdl):
                if first_mdl > second_mdl or first_mdl + second_mdl >= reference_mdl:
                    continue
                for first in by_mdl[first_mdl]:
                    for second in by_mdl[second_mdl]:
                        if first_mdl == second_mdl and rule_key(first) >= rule_key(second):
                            continue
                        pair_systems_tested += 1
                        if simulate(world, [first, second])[0]:
                            lower_mdl_pair_winners.append((first, second))

    reference_solves = simulate(world, reference)[0]
    optimal = reference_solves and (
        (
            len(reference) == 1
            and not lower_mdl_single_winners
        )
        or (
            len(reference) >= 2
            and not single_winners
            and not lower_mdl_pair_winners
        )
    )
    minimum_rule_count = 0 if simulate(world, [])[0] else (
        1 if single_winners else len(reference)
    )
    return {
        "solver": "single_trial_exact_enumeration",
        "hypothesis_space": "all canonical MOVE rules up to eight conditions",
        "candidate_rule_count": len(candidates),
        "single_rule_systems_tested": len(candidates),
        "single_rule_solution_count": len(single_winners),
        "lower_mdl_single_solution_count": len(lower_mdl_single_winners),
        "two_rule_systems_tested_below_reference_mdl": pair_systems_tested,
        "two_rule_solution_count_below_reference_mdl": len(lower_mdl_pair_winners),
        "minimum_rule_count": minimum_rule_count,
        "minimum_mdl": reference_mdl if optimal else None,
        "reference_rulebook": [_serialize_rule(rule) for rule in reference],
        "reference_rulebook_mdl": reference_mdl,
        "reference_solves": reference_solves,
        "is_reference_optimal": optimal,
    }


def _literal_map(rule):
    rows = defaultdict(list)
    for predicate, value, negated in rule[1]:
        rows[predicate].append((value, bool(negated)))
    return rows


def _has(rows, predicate, value, negated=False):
    return (value, bool(negated)) in rows.get(predicate, ())


def classify_rule(rule):
    """Describe a rule's behavioral content without assigning it to a pool."""
    rows = _literal_map(rule)
    cold = _has(rows, "target_type", "cold")
    machine = _has(rows, "target_type", "machine")
    not_machine = _has(rows, "target_type", "machine", True)
    contested = _has(rows, "contested", True)
    spill = _has(rows, "carrying", "spill")

    if cold:
        if spill and _has(rows, "role", "cleaner", True):
            return "protective norm with cleaner exception"
        if spill:
            return "spill-sensitive protection"
        return "broad cold-storage protection"
    if machine and rows.get("role"):
        if contested:
            return "contested machine priority"
        if rows.get("move_dir"):
            return "machine route-shaping rule"
        return "permanent machine-role restriction"
    if contested and rows.get("move_dir"):
        return (
            "road-scoped direction convention"
            if not_machine
            else "cross-context direction convention"
        )
    if contested and rows.get("role"):
        return "cross-context role priority"
    if contested:
        return "broad contention prohibition"
    if rows.get("move_dir"):
        return "permanent direction restriction"
    return "mixed restriction"


def _serialize_rule(rule):
    return {
        "action": rule[0],
        "conditions": [
            {
                "predicate": predicate,
                "value": value,
                "negated": bool(negated),
            }
            for predicate, value, negated in rule[1]
        ],
        "mdl": rule_mdl(rule),
        "text": norm_str(rule),
        "classification": classify_rule(rule),
    }


def _serialize_solution(record, candidates):
    rules = [candidates[index] for index in record.rule_indices]
    return {
        "k": record.k,
        "mdl": record.mdl,
        "rules": [_serialize_rule(rule) for rule in rules],
        "key": [rule_key(rule) for rule in rules],
    }


def _evaluate_rulebook(shifts, rulebook, *, stop_on_failure=False):
    mask = 0
    reasons = []
    simulations = 0
    for index, shift in enumerate(shifts):
        ok, reason = simulate(shift.world, rulebook)
        simulations += 1
        reasons.append(reason)
        if ok:
            mask |= 1 << index
        elif stop_on_failure:
            break
    return mask, tuple(reasons), simulations


def _learning_shifts(shifts):
    """Trials that can ground a rule before the interaction layer."""
    return [shift for shift in shifts if shift.layer <= 2]


def _ground_candidates(learning_shifts, candidates):
    records = []
    signature_counts = Counter()
    simulations = 0
    for index, candidate in enumerate(candidates):
        mask = 0
        for shift_index, shift in enumerate(learning_shifts):
            ok, _ = simulate(shift.world, [candidate])
            simulations += 1
            if ok:
                mask |= 1 << shift_index
        signature_counts[mask] += 1
        if mask:
            records.append(
                CandidateRecord(
                    index=index,
                    evidence_mask=mask,
                    mdl=rule_mdl(candidate),
                )
            )
    return records, signature_counts, simulations


def _candidate_systems(records, k, full_evidence_mask):
    """Return grounded k-rule systems whose evidence covers learning trials."""
    return [
        tuple(record.index for record in group)
        for group in combinations(records, k)
        if (
            group[0].evidence_mask
            | group[1].evidence_mask
            | (
                group[2].evidence_mask
                if k == 3
                else 0
            )
        )
        == full_evidence_mask
    ]


def _single_rule_audit(shifts, candidates):
    """Report single-rule shortcuts before interpreting a curriculum result."""
    audit = []
    for shift in shifts:
        winners = [
            candidate
            for candidate in candidates
            if simulate(shift.world, [candidate])[0]
        ]
        minimum_mdl = min(
            (rule_mdl(candidate) for candidate in winners),
            default=None,
        )
        audit.append({
            "shift_id": shift.id,
            "single_rule_count": len(winners),
            "minimum_single_rule_mdl": minimum_mdl,
            "minimum_single_rule_examples": [
                _serialize_rule(candidate)
                for candidate in winners
                if rule_mdl(candidate) == minimum_mdl
            ][:5],
        })
    return audit


def _search_system_layer(
    shifts,
    candidates,
    systems,
    *,
    tested_by_rule_count,
    tested_by_mdl,
):
    by_mdl = defaultdict(list)
    for indices in systems:
        mdl = sum(rule_mdl(candidates[index]) for index in indices)
        by_mdl[mdl].append(indices)

    systems_enumerated = 0
    systems_simulated = 0
    shift_simulations = 0
    for mdl in sorted(by_mdl):
        winners = []
        for indices in by_mdl[mdl]:
            systems_enumerated += 1
            tested_by_rule_count[len(indices)] += 1
            tested_by_mdl[mdl] += 1
            rulebook = [candidates[index] for index in indices]
            systems_simulated += 1
            mask, _, used = _evaluate_rulebook(
                shifts,
                rulebook,
                stop_on_failure=True,
            )
            shift_simulations += used
            if mask == (1 << len(shifts)) - 1:
                winners.append(SolutionRecord(indices, mdl))
        if winners:
            return (
                winners,
                mdl,
                systems_enumerated,
                systems_simulated,
                shift_simulations,
            )
    return [], None, systems_enumerated, systems_simulated, shift_simulations


def solve_shift_suite(
    shifts=None,
    *,
    max_rules=3,
    max_conditions=MAX_RULE_CONDITIONS,
):
    """Find minimum grounded rulebooks under a flat prior.

    All canonical single rules are considered equally. Retaining only rules
    with positive evidence from a learning trial is a behavioral pruning rule;
    no hand-written safety/road/machine family labels are used.
    """
    if max_rules != 3:
        raise ValueError("The V7 curriculum is calibrated to at most three rules.")

    shifts = list(shifts or build_shift_library())
    learning_shifts = _learning_shifts(shifts)
    if not learning_shifts:
        raise ValueError("At least one layer-1 or layer-2 trial is required.")

    candidates = candidate_rules(max_conditions)
    records, signatures, grounding_simulations = _ground_candidates(
        learning_shifts,
        candidates,
    )
    full_evidence_mask = (1 << len(learning_shifts)) - 1

    tested_by_rule_count = Counter({0: 1, 1: len(candidates)})
    tested_by_mdl = Counter({0: 1})
    for candidate in candidates:
        tested_by_mdl[rule_mdl(candidate)] += 1

    systems_enumerated = 1 + len(candidates)
    systems_simulated = 1 + len(candidates)
    shift_simulations = grounding_simulations

    for k in (2, 3):
        systems = _candidate_systems(records, k, full_evidence_mask)
        winners, winning_mdl, enum, simmed, used = _search_system_layer(
            shifts,
            candidates,
            systems,
            tested_by_rule_count=tested_by_rule_count,
            tested_by_mdl=tested_by_mdl,
        )
        systems_enumerated += enum
        systems_simulated += simmed
        shift_simulations += used
        if winners:
            return _result(
                shifts,
                candidates,
                records,
                signatures,
                learning_shifts,
                winners,
                winning_mdl,
                systems_enumerated,
                systems_simulated,
                shift_simulations,
                tested_by_rule_count,
                tested_by_mdl,
            )

    raise RuntimeError(
        "No three-rule solution exists in the grounded hypothesis space."
    )


def _result(
    shifts,
    candidates,
    records,
    signatures,
    learning_shifts,
    winners,
    winning_mdl,
    systems_enumerated,
    systems_simulated,
    shift_simulations,
    tested_by_rule_count,
    tested_by_mdl,
):
    return {
        "solver": "flat_grounded_exact_enumeration",
        "prior": "uniform over canonical rules before behavioral evidence",
        "minimum_rule_count": winners[0].k,
        "minimum_mdl": winning_mdl,
        "solutions": [
            _serialize_solution(record, candidates)
            for record in winners
        ],
        "candidate_rule_count": len(candidates),
        "grounded_rule_count": len(records),
        "learning_trial_ids": [shift.id for shift in learning_shifts],
        "behavioral_signature_count": len(signatures),
        "systems_enumerated": systems_enumerated,
        "systems_simulated": systems_simulated,
        "shift_simulations": shift_simulations,
        "tested_by_rule_count": dict(sorted(tested_by_rule_count.items())),
        "tested_by_mdl": dict(sorted(tested_by_mdl.items())),
        "task_shortcut_audit": _single_rule_audit(shifts, candidates),
        "reference_rulebook": [
            _serialize_rule(rule)
            for rule in GROUND_TRUTH_RULEBOOK
        ],
        "reference_rulebook_mdl": rulebook_mdl(GROUND_TRUTH_RULEBOOK),
        "search_cost_definition": (
            "canonical rulebooks enumerated in increasing rule count and MDL "
            "after evidence-based pruning; participant attempts are not search cost"
        ),
        "scope_note": (
            "Exact for rulebooks whose component rules each solve at least one "
            "layer-1 or layer-2 learning trial alone. Any submitted rulebook is "
            "still evaluated directly, including ungrounded shortcuts."
        ),
    }


def solve_case_suite(cases=None, **kwargs):
    return solve_shift_suite(cases, **kwargs)


def analyze_curriculum_prefixes(shifts=None):
    """Describe whether the intended cumulative rulebook solves each prefix."""
    shifts = list(shifts or build_shift_library())
    reference_by_trial = {
        "trial_1": [GROUND_TRUTH_RULEBOOK[0]],
        "trial_2": [GROUND_TRUTH_RULEBOOK[1]],
        "trial_3": [GROUND_TRUTH_RULEBOOK[2]],
        "trial_4": [GROUND_TRUTH_RULEBOOK[0]],
        "trial_5": [GROUND_TRUTH_RULEBOOK[0]],
        "trial_6": [GROUND_TRUTH_RULEBOOK[1], GROUND_TRUTH_RULEBOOK[2]],
        "trial_7": [GROUND_TRUTH_RULEBOOK[2]],
        "trial_8": [GROUND_TRUTH_RULEBOOK[0], GROUND_TRUTH_RULEBOOK[1]],
        "trial_9": [GROUND_TRUTH_RULEBOOK[0], GROUND_TRUTH_RULEBOOK[2]],
        "trial_10": GROUND_TRUTH_RULEBOOK,
    }
    cumulative = []
    rows = []
    for shift in shifts:
        for rule in reference_by_trial.get(shift.id, GROUND_TRUTH_RULEBOOK):
            if rule_key(rule) not in {rule_key(row) for row in cumulative}:
                cumulative.append(rule)
        prefix = shifts[: len(rows) + 1]
        mask, reasons, _ = _evaluate_rulebook(prefix, cumulative)
        rows.append(
            {
                "prefix_length": len(prefix),
                "trial_ids": [row.id for row in prefix],
                "reference_rule_count": len(cumulative),
                "reference_mdl": rulebook_mdl(cumulative),
                "reference_solves_prefix": mask == (1 << len(prefix)) - 1,
                "reasons": list(reasons),
            }
        )
    return rows


def analyze_submitted_rulebook(rulebook, shifts=None):
    shifts = list(shifts or build_shift_library())
    mask, reasons, _ = _evaluate_rulebook(shifts, rulebook)
    redundant = []
    for index in range(len(rulebook)):
        reduced = rulebook[:index] + rulebook[index + 1 :]
        reduced_mask, _, _ = _evaluate_rulebook(shifts, reduced)
        if reduced_mask == mask:
            redundant.append(index)
    return {
        "rule_count": len(rulebook),
        "mdl": rulebook_mdl(rulebook),
        "rule_classes": [classify_rule(rule) for rule in rulebook],
        "solved_trial_count": mask.bit_count(),
        "trial_count": len(shifts),
        "solves_complete_library": mask == (1 << len(shifts)) - 1,
        "redundant_rule_indices": redundant,
        "outcomes": [
            {
                "trial_id": shift.id,
                "ok": bool(mask & (1 << index)),
                "reason": reasons[index],
            }
            for index, shift in enumerate(shifts)
        ],
    }


if __name__ == "__main__":
    result = solve_shift_suite()
    print(
        f"k={result['minimum_rule_count']} "
        f"MDL={result['minimum_mdl']} "
        f"solutions={len(result['solutions'])} "
        f"search_cost={result['systems_enumerated']}"
    )
    for index, solution in enumerate(result["solutions"], start=1):
        print(f"solution {index}")
        for row in solution["rules"]:
            print(" ", row["text"])
