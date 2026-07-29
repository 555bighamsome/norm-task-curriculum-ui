"""Validate the active V7 curriculum and compositional-solver calibration."""
from __future__ import annotations

import json
from pathlib import Path

from experiment_v2 import (
    SHIFT_BLUEPRINTS,
    build_shift_library,
    contract_report,
)
from wh_engine import simulate


PROJECT_ROOT = Path(__file__).resolve().parents[1]
TASKS_JSON = PROJECT_ROOT / "data" / "tasks.json"


def _rule_from_json(row):
    return (
        row["action"],
        tuple(
            (
                condition["predicate"],
                condition["value"],
                bool(condition["negated"]),
            )
            for condition in row["conditions"]
        ),
    )


def _static_world_signature(task):
    world = task["world"]
    return {
        "rows": world["rows"],
        "cols": world["cols"],
        "walls": world["walls"],
        "zones": world["zones"],
        "protected": world["protected"],
        "machines": world["machines"],
        "scanners": world["scanners"],
    }


def main():
    data = json.loads(TASKS_JSON.read_text(encoding="utf-8"))
    tasks = data["tasks"]
    shifts = build_shift_library()

    if data.get("experiment_version") != 7:
        raise SystemExit("generated library is not experiment V7")
    if len(tasks) != 10 or len(shifts) != 10:
        raise SystemExit(f"expected 10 scenes, found {len(tasks)} generated")

    first_world = _static_world_signature(tasks[0])
    if first_world["rows"] != 10 or first_world["cols"] != 10:
        raise SystemExit("every warehouse scene must be 10 x 10")

    expected_active_counts = (1, 2, 2, 2, 4, 5, 4, 4, 8, 12)
    for task_index, task in enumerate(tasks):
        signature = _static_world_signature(task)
        if signature["rows"] != 10 or signature["cols"] != 10:
            raise SystemExit(f"{task['id']} is not 10 x 10")
        active_agents = [
            agent for agent in task["world"]["agents"] if agent.get("active")
        ]
        if len(active_agents) != expected_active_counts[task_index]:
            raise SystemExit(
                f"{task['id']} has {len(active_agents)} active robots; "
                f"expected {expected_active_counts[task_index]}"
            )
        if task["active_agent_count"] != len(active_agents):
            raise SystemExit(f"{task['id']} exports the wrong active-agent count")
        if len(active_agents) != len(task["world"]["agents"]):
            raise SystemExit(f"{task['id']} exports an off-duty robot")
        starts = {
            tuple(agent["start"]): agent["id"]
            for agent in task["world"]["agents"]
        }
        machines = {
            machine["id"]: tuple(machine["cell"])
            for machine in task["world"]["machines"]
        }
        for agent in task["world"]["agents"]:
            target = (
                tuple(agent["goal"]["target"])
                if agent["goal"]["kind"] == "reach"
                else machines[agent["goal"]["machine"]]
            )
            occupying_id = starts.get(target)
            if occupying_id is not None and occupying_id != agent["id"]:
                raise SystemExit(
                    f"{task['id']} starts robot {occupying_id} on "
                    f"robot {agent['id']}'s target"
                )
        if task["baseline"]["ok"]:
            raise SystemExit(f"{task['id']} succeeds without shared rules")
        analysis = task["analysis"]
        if not analysis["contract_satisfied"]:
            raise SystemExit(f"{task['id']} failed its behavioral contract")
        if not all(row["matches"] for row in analysis["contract"].values()):
            raise SystemExit(f"{task['id']} contains a mismatched contract row")

    for shift, blueprint in zip(shifts, SHIFT_BLUEPRINTS):
        matches, _ = contract_report(shift.world, blueprint["contract"])
        if not matches:
            raise SystemExit(f"{shift.id} no longer satisfies its source contract")
        reference_rulebook = blueprint.get("optimality_reference")
        if reference_rulebook and not simulate(shift.world, reference_rulebook)[0]:
            raise SystemExit(f"reference rulebook fails {shift.id}")
        for shortcut in blueprint.get("shortcut_rulebooks", ()):
            if not simulate(shift.world, shortcut)[0]:
                raise SystemExit(f"declared shortcut fails {shift.id}")

    schema = data["rule_schema"]
    solver = data["global_solver"]
    if schema["canonical_rule_count"] != solver["candidate_rule_count"]:
        raise SystemExit("schema and solver candidate counts disagree")
    if solver["solver"] != "per_trial_exact_calibration":
        raise SystemExit("active calibration is not the per-trial solver")
    if solver.get("global_rulebook_required") is not False:
        raise SystemExit("curriculum version must not require one global rulebook")

    expected_optima = {
        "trial_6": (1, 3),
        "trial_7": (1, 2),
        "trial_8": (1, 2),
        "trial_9": (2, 6),
        "trial_10": (3, 9),
    }
    for task_id, expected in expected_optima.items():
        task = next(row for row in tasks if row["id"] == task_id)
        optimality = task["analysis"].get("optimality")
        if not optimality or not optimality["is_reference_optimal"]:
            raise SystemExit(f"{task_id} reference is not certified optimal")
        actual = (
            optimality["minimum_rule_count"],
            optimality["minimum_mdl"],
        )
        if actual != expected:
            raise SystemExit(
                f"{task_id} optimum is {actual}; expected {expected}"
            )
        if optimality["candidate_rule_count"] != schema["canonical_rule_count"]:
            raise SystemExit(f"{task_id} did not audit the canonical rule space")
        if not all(
            shortcut["solves"] and shortcut["strictly_more_expensive"]
            for shortcut in optimality["shortcut_checks"]
        ):
            raise SystemExit(f"{task_id} shortcut calibration is invalid")

    trial_10 = next(task for task in tasks if task["id"] == "trial_10")
    final_audit = trial_10["analysis"]["optimality"]
    if final_audit["single_rule_solution_count"] != 0:
        raise SystemExit("T10 has a canonical single-rule shortcut")
    if final_audit["two_rule_solution_count"] != 0:
        raise SystemExit("T10 has a two-rule reusable shortcut")
    if final_audit["three_rule_solution_count_below_reference_mdl"] != 0:
        raise SystemExit("T10 has a lower-MDL reusable three-rule shortcut")
    if final_audit["reference_cost_solution_count"] != 1:
        raise SystemExit("T10 reference does not solve at MDL 9")
    if not final_audit["reference_rules_reused_from_prior_trials"]:
        raise SystemExit("not every T10 reference rule has prior-trial evidence")
    if not all(
        row["prior_trial_ids"]
        for row in final_audit["reference_rule_prior_evidence"]
    ):
        raise SystemExit("T10 reference evidence is incomplete")

    print(
        "valid V7 pilot library: "
        f"{len(tasks)} curriculum scenes, active counts={list(expected_active_counts)}, "
        "controlled 10x10 maps, "
        f"{schema['canonical_rule_count']} canonical single rules, "
        "independent scene solving; "
        "T10 reusable optimum k=3, MDL=9, "
        f"pairs tested={final_audit['two_rule_systems_tested']}, "
        "lower-MDL triples tested="
        f"{final_audit['three_rule_systems_tested_below_reference_mdl']}"
    )


if __name__ == "__main__":
    main()
