"""Generate participant-facing data for Shared Rulebook V7.

Pipeline:

    fixed atomic grammar + function-first curriculum
        -> behaviorally constrained scene variants
        -> behavioral-contract selection
        -> exact compositional solver
        -> browser JSON/JavaScript
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from experiment_v2 import (
    SHIFT_BLUEPRINTS,
    build_shift_library,
    contract_report,
    ground_truth_json,
    rule_schema_json,
)
from norm_solver import analyze_curriculum_prefixes, solve_shift_suite
from wh_engine import simulate


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
TASKS_JSON = DATA_DIR / "tasks.json"
TASKS_JS = DATA_DIR / "tasks.generated.js"


def world_dimensions(world):
    rows = max(r for r, _ in world.walls) + 1
    cols = max(c for _, c in world.walls) + 1
    return rows, cols


def goal_json(goal):
    if goal.kind == "reach":
        return {"kind": "reach", "target": list(goal.target)}
    if goal.kind == "operate":
        return {"kind": "operate", "machine": goal.target}
    raise ValueError(f"V4 does not expose goal kind {goal.kind!r}.")


def agent_is_active(world, agent):
    if agent.goal.kind == "reach":
        return agent.pos != agent.goal.target
    if agent.goal.kind == "operate":
        return agent.pos != world.machines[agent.goal.target].cell
    return True


def world_json(world):
    rows, cols = world_dimensions(world)
    return {
        "name": world.name,
        "rows": rows,
        "cols": cols,
        "walls": [list(cell) for cell in sorted(world.walls)],
        "zones": [
            {"cell": list(cell), "zone": zone}
            for cell, zone in sorted(world.zone.items())
        ],
        "protected": [
            {"zone": zone, "contaminant": contaminant}
            for zone, contaminant in world.protected
        ],
        "agents": [
            {
                "id": agent.id,
                "start": list(agent.pos),
                "role": agent.role,
                "carrying": agent.carrying,
                "active": agent_is_active(world, agent),
                "tokens": sorted(agent.tokens),
                "goal": goal_json(agent.goal),
            }
            for agent in world.agents
        ],
        "items": [],
        "machines": [
            {
                "id": machine.id,
                "cell": list(machine.cell),
                "needs_permit": machine.needs_permit,
                "setup_role": machine.setup_role,
            }
            for machine in world.machines.values()
        ],
        "scanners": [],
    }


def vocabulary_json(schema):
    vocabulary = []
    for field in schema["fields"]:
        for value in field["values"]:
            for negated in (False, True):
                vocabulary.append(
                    {
                        "object": field["object"],
                        "property": field["id"],
                        "predicate": field["predicate"],
                        "value": value["id"],
                        "negated": negated,
                        "label": value["label"],
                    }
                )
    return vocabulary


def _contract_json(report):
    return {
        name: {
            key: value
            for key, value in row.items()
        }
        for name, row in report.items()
    }


def make_library(*, include_solver=True, include_prefixes=False):
    shifts = build_shift_library()
    schema = rule_schema_json()
    if include_solver:
        solver = solve_shift_suite(shifts)
    else:
        solver = {
            "solver": "not_run",
            "candidate_rule_count": schema["canonical_rule_count"],
        }
    shortcut_audit = {
        row["shift_id"]: row
        for row in solver.get("task_shortcut_audit", [])
    }

    shift_rows = []
    for shift, blueprint in zip(shifts, SHIFT_BLUEPRINTS):
        baseline = simulate(shift.world, [], trace=True)
        contract_ok, report = contract_report(shift.world, blueprint["contract"])
        active_agent_count = sum(
            agent_is_active(shift.world, agent)
            for agent in shift.world.agents
        )
        shift_rows.append(
            {
                "id": shift.id,
                "label": shift.participant_label,
                "level": shift.layer,
                "layer": shift.layer,
                "prerequisites": list(shift.prerequisites),
                "family": "shared_rulebook_curriculum",
                "active_agent_count": active_agent_count,
                "description": blueprint["participant_description"],
                "participant_prompt": (
                    "Run the scene, inspect what goes wrong, and decide whether "
                    "the shared rulebook should be added to or refined."
                ),
                "analysis": {
                    "layer": shift.layer,
                    "prerequisites": list(shift.prerequisites),
                    "stage": shift.stage,
                    "evidence_function": shift.evidence_function,
                    "expected_transition": shift.expected_transition,
                    "selected_variant": shift.world.name,
                    "nuisance_score": list(shift.nuisance_score),
                    "active_agent_count": active_agent_count,
                    "contract_satisfied": contract_ok,
                    "contract": _contract_json(report),
                    "shortcut_audit": shortcut_audit.get(shift.id),
                },
                "world": world_json(shift.world),
                "baseline": {
                    "ok": baseline[0],
                    "reason": baseline[1],
                    "frames": baseline[2],
                },
            }
        )

    library = {
        "experiment_version": 7,
        "title": "Shared Rulebook",
        "objective": (
            "Build one compact set of shared rules that lets every scene "
            "finish without contamination, collision, or incorrect machine access."
        ),
        "world_rules": [
            (
                "Every scene uses a 10 by 10 warehouse and the same rule "
                "language. Walls shape which routes are available."
            ),
            (
                "Robots choose the shortest legal route. If routes are equally "
                "short, they choose the one with fewer turns."
            ),
            (
                "If multiple robots enter the same square in the same step, "
                "they collide."
            ),
            (
                "A robot that reaches a floor target stops there. A robot that "
                "finishes at a machine leaves the station after that step."
            ),
            (
                "A target square is being entered by multiple robots when at "
                "least two robots currently intend to enter it."
            ),
            (
                "Carrying a spill into cold storage can contaminate the shared area. "
                "A cleaner can enter with a spill without causing contamination."
            ),
            (
                "A machine is used by entering its square. Only one robot can "
                "enter it per step."
            ),
            (
                "At setup machines, an operator must enter first to prepare "
                "the station; a carrier can enter after the operator releases it."
            ),
            "The same shared rulebook applies to every scene.",
        ],
        "rule_schema": schema,
        "global_actions": [
            {"id": "MOVE", "label": "move into a square"},
        ],
        "global_vocabulary": vocabulary_json(schema),
        "action_condition_space": {
            "MOVE": vocabulary_json(schema),
        },
        "ground_truth_design": ground_truth_json(),
        "global_solver": solver,
        "curriculum_prefixes": (
            analyze_curriculum_prefixes(shifts)
            if include_solver and include_prefixes
            else []
        ),
        "tasks": shift_rows,
    }
    return library


def write_library(library):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(library, indent=2)
    TASKS_JSON.write_text(payload + "\n", encoding="utf-8")
    TASKS_JS.write_text(
        "window.TASK_LIBRARY = " + payload + ";\n",
        encoding="utf-8",
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--skip-solver",
        action="store_true",
        help="Export shifts without recalibrating the exact solver.",
    )
    parser.add_argument(
        "--include-prefixes",
        action="store_true",
        help="Also solve every recommended curriculum prefix.",
    )
    args = parser.parse_args()
    library = make_library(
        include_solver=not args.skip_solver,
        include_prefixes=args.include_prefixes,
    )
    write_library(library)
    print(
        f"wrote {len(library['tasks'])} scenes; "
        f"rule candidates={library['rule_schema']['canonical_rule_count']}; "
        f"solver={library['global_solver']['solver']}"
    )


if __name__ == "__main__":
    main()
