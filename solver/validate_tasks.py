"""Validate the active V7 curriculum and compositional-solver calibration."""
from __future__ import annotations

import json
from pathlib import Path

from experiment_v2 import (
    GROUND_TRUTH_RULEBOOK,
    NON_OPERATOR_PRIORITY,
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

    expected_active_counts = (1, 2, 2, 2, 4, 3, 4, 3, 4, 3)
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
        reference_rulebook = (
            [NON_OPERATOR_PRIORITY]
            if shift.id == "trial_6"
            else GROUND_TRUTH_RULEBOOK
        )
        if not simulate(shift.world, reference_rulebook)[0]:
            raise SystemExit(f"hidden reference rulebook fails {shift.id}")

    schema = data["rule_schema"]
    solver = data["global_solver"]
    if schema["canonical_rule_count"] != solver["candidate_rule_count"]:
        raise SystemExit("schema and solver candidate counts disagree")
    if solver["solver"] != "flat_grounded_exact_enumeration":
        raise SystemExit("active calibration is not the compositional solver")
    if solver["minimum_rule_count"] != 3 or solver["minimum_mdl"] != 9:
        raise SystemExit("expected the full library optimum to have k=3 and MDL=9")
    shortcut_audit = {
        row["shift_id"]: row
        for row in solver.get("task_shortcut_audit", [])
    }
    for task_id in ("trial_7", "trial_8", "trial_9", "trial_10"):
        row = shortcut_audit.get(task_id)
        if row is None or row["single_rule_count"] != 0:
            raise SystemExit(f"{task_id} still has a single-rule shortcut")
    if shortcut_audit.get("trial_5", {}).get("minimum_single_rule_mdl") != 3:
        raise SystemExit("trial_5 must require at least three conditions")
    trial_6 = next(task for task in tasks if task["id"] == "trial_6")
    optimality = trial_6["analysis"].get("optimality")
    if not optimality or not optimality["is_reference_optimal"]:
        raise SystemExit("trial_6 reference pair is not certified optimal")
    if optimality["candidate_rule_count"] != schema["canonical_rule_count"]:
        raise SystemExit("trial_6 did not search the full canonical rule space")
    if optimality["single_rule_solution_count"] == 0:
        raise SystemExit("trial_6 should have a one-rule solution")
    if optimality["lower_mdl_single_solution_count"] != 0:
        raise SystemExit("trial_6 has a lower-MDL single-rule shortcut")
    if optimality["two_rule_solution_count_below_reference_mdl"] != 0:
        raise SystemExit("trial_6 has a lower-MDL two-rule shortcut")
    if optimality["minimum_rule_count"] != 1 or optimality["minimum_mdl"] != 2:
        raise SystemExit("trial_6 should have optimum k=1, MDL=2")
    if len(solver["solutions"]) < 2:
        raise SystemExit("expected multiple minimum-MDL systems")
    if solver["systems_enumerated"] <= solver["candidate_rule_count"]:
        raise SystemExit("search cost does not include the multi-rule layer")

    for solution in solver["solutions"]:
        rulebook = [_rule_from_json(row) for row in solution["rules"]]
        failed = [
            shift.id
            for shift in shifts
            if not simulate(shift.world, rulebook)[0]
        ]
        if failed:
            raise SystemExit(
                f"serialized minimum solution fails shifts: {', '.join(failed)}"
            )

    print(
        "valid V7 pilot library: "
        f"{len(tasks)} curriculum scenes, active counts={list(expected_active_counts)}, "
        "controlled 10x10 maps, "
        f"{schema['canonical_rule_count']} canonical single rules, "
        f"k={solver['minimum_rule_count']}, MDL={solver['minimum_mdl']}, "
        f"minimum systems={len(solver['solutions'])}, "
        f"search cost={solver['systems_enumerated']}; "
        f"T6 optimum k={optimality['minimum_rule_count']}, "
        f"MDL={optimality['minimum_mdl']}"
    )


if __name__ == "__main__":
    main()
