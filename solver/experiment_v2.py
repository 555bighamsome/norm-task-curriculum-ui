"""Evidence-first curriculum and fixed atomic rule language for experiment V7.

Participants solve one scene at a time and may save useful rules to a persistent
library. Early trials make broad rules reasonable; later counterexamples make
those rules more precise. The final scene is calibrated so that its shortest
reusable solution retrieves three rules with evidence from earlier scenes.
"""
from __future__ import annotations

from dataclasses import dataclass
from itertools import product

from wh_engine import Agent, Goal, Machine, World, norm_str, simulate


ROWS = 10
COLS = 10
MAX_RULE_CONDITIONS = 8
DIRECTIONS = ("N", "S", "E", "W")
ROLES = ("carrier", "cleaner", "operator")


@dataclass(frozen=True)
class ShiftSpec:
    id: str
    participant_label: str
    layer: int
    prerequisites: tuple[str, ...]
    stage: str
    evidence_function: str
    expected_transition: str
    world: World
    contract: dict[str, tuple[bool, str | None]]
    nuisance_score: tuple[int, ...] = ()


RULE_FIELDS = (
    {
        "id": "target_type",
        "object": "Target square",
        "predicate": "target_type",
        "values": (
            {"id": "cold", "label": "cold storage"},
            {"id": "machine", "label": "a machine station"},
        ),
    },
    {
        "id": "contested",
        "object": "Target square",
        "predicate": "contested",
        "values": (
            {
                "id": True,
                "label": "being entered by multiple robots",
            },
        ),
    },
    {
        "id": "role",
        "object": "Robot",
        "predicate": "role",
        "values": (
            {"id": "carrier", "label": "a carrier"},
            {"id": "cleaner", "label": "a cleaner"},
            {"id": "operator", "label": "an operator"},
        ),
    },
    {
        "id": "carrying",
        "object": "Robot",
        "predicate": "carrying",
        "values": (
            {"id": "spill", "label": "carrying a spill"},
        ),
    },
    {
        "id": "move_dir",
        "object": "Movement",
        "predicate": "move_dir",
        "values": (
            {"id": "N", "label": "northbound"},
            {"id": "S", "label": "southbound"},
            {"id": "E", "label": "eastbound"},
            {"id": "W", "label": "westbound"},
        ),
    },
)


def literal(predicate, value, negated=False):
    return predicate, value, bool(negated)


def rule(*conditions):
    return "MOVE", list(conditions)


BROAD_PROTECTION = rule(literal("target_type", "cold"))
CARGO_PROTECTION = rule(
    literal("target_type", "cold"),
    literal("carrying", "spill"),
)
CARRIER_PROTECTION = rule(
    literal("target_type", "cold"),
    literal("carrying", "spill"),
    literal("role", "carrier"),
)
OPERATOR_PROTECTION = rule(
    literal("target_type", "cold"),
    literal("carrying", "spill"),
    literal("role", "operator"),
)
NEGATED_EXCEPTION = rule(
    literal("target_type", "cold"),
    literal("carrying", "spill"),
    literal("role", "cleaner", True),
)
YIELD_NORTH = rule(
    literal("contested", True),
    literal("move_dir", "N"),
)
YIELD_SOUTH = rule(
    literal("contested", True),
    literal("move_dir", "S"),
)
YIELD_EAST = rule(
    literal("contested", True),
    literal("move_dir", "E"),
)
YIELD_EAST_CARRIER = rule(
    literal("contested", True),
    literal("move_dir", "E"),
    literal("role", "carrier"),
)
YIELD_EAST_CLEANER = rule(
    literal("contested", True),
    literal("move_dir", "E"),
    literal("role", "cleaner"),
)
YIELD_EAST_OPERATOR = rule(
    literal("contested", True),
    literal("move_dir", "E"),
    literal("role", "operator"),
)
SCOPED_YIELD_EAST_CARRIER = rule(
    literal("target_type", "machine", True),
    literal("contested", True),
    literal("move_dir", "E"),
    literal("role", "carrier"),
)
SCOPED_YIELD_EAST_OPERATOR = rule(
    literal("target_type", "machine", True),
    literal("contested", True),
    literal("move_dir", "E"),
    literal("role", "operator"),
)
YIELD_WEST = rule(
    literal("contested", True),
    literal("move_dir", "W"),
)
YIELD_NORTH_OR_WEST = rule(
    literal("contested", True),
    literal("move_dir", "S", True),
    literal("move_dir", "E", True),
)
MACHINE_CARRIER_PRIORITY = rule(
    literal("target_type", "machine"),
    literal("contested", True),
    literal("role", "carrier"),
)
MACHINE_CLEANER_PRIORITY = rule(
    literal("target_type", "machine"),
    literal("contested", True),
    literal("role", "cleaner"),
)
SCOPED_YIELD_EAST = rule(
    literal("target_type", "machine", True),
    literal("contested", True),
    literal("move_dir", "E"),
)
BROAD_CARRIER_PRIORITY = rule(
    literal("contested", True),
    literal("role", "carrier"),
)
MACHINE_NON_OPERATOR_PRIORITY = rule(
    literal("target_type", "machine"),
    literal("contested", True),
    literal("role", "operator", True),
)
NON_OPERATOR_PRIORITY = rule(
    literal("contested", True),
    literal("role", "operator", True),
)
MACHINE_CLEANER_CONTEST = rule(
    literal("contested", True),
    literal("role", "cleaner"),
)

ANCHOR_RULEBOOKS = {
    "empty": [],
    "broad": [BROAD_PROTECTION],
    "cargo": [CARGO_PROTECTION],
    "carrier_patch": [CARRIER_PROTECTION],
    "operator_patch": [OPERATOR_PROTECTION],
    "enumerated_roles": [CARRIER_PROTECTION, OPERATOR_PROTECTION],
    "negated_exception": [NEGATED_EXCEPTION],
    "yield_north": [YIELD_NORTH],
    "yield_south": [YIELD_SOUTH],
    "yield_east": [YIELD_EAST],
    "yield_east_by_role": [YIELD_EAST_CARRIER, YIELD_EAST_CLEANER],
    "yield_west": [YIELD_WEST],
    "compressed_yield": [YIELD_NORTH_OR_WEST],
    "machine_carrier_priority": [MACHINE_CARRIER_PRIORITY],
    "machine_non_operator_priority": [MACHINE_NON_OPERATOR_PRIORITY],
    "scoped_machine_non_operator_priority": [MACHINE_NON_OPERATOR_PRIORITY],
    "non_operator_priority": [NON_OPERATOR_PRIORITY],
    "machine_priority_by_role": [
        BROAD_CARRIER_PRIORITY,
        MACHINE_CLEANER_CONTEST,
    ],
    "broad_carrier_priority": [BROAD_CARRIER_PRIORITY],
    "scoped_yield_east": [SCOPED_YIELD_EAST],
    "scoped_road_and_machine": [
        SCOPED_YIELD_EAST,
        MACHINE_NON_OPERATOR_PRIORITY,
    ],
    "broad_role_and_road": [SCOPED_YIELD_EAST, BROAD_CARRIER_PRIORITY],
    "machine_only": [MACHINE_CARRIER_PRIORITY],
    "road_only": [SCOPED_YIELD_EAST],
    "broad_cold": [BROAD_PROTECTION],
    "cargo_and_road": [CARGO_PROTECTION, SCOPED_YIELD_EAST],
    "scoped_road": [SCOPED_YIELD_EAST],
    "machine_priority": [MACHINE_CARRIER_PRIORITY],
    "broad_role_priority": [BROAD_CARRIER_PRIORITY],
    "unscoped_road_and_machine": [
        YIELD_EAST,
        NON_OPERATOR_PRIORITY,
    ],
    "protect_and_north": [NEGATED_EXCEPTION, YIELD_NORTH],
    "protect_and_west": [NEGATED_EXCEPTION, YIELD_WEST],
    "road_and_machine_broad": [YIELD_EAST, BROAD_CARRIER_PRIORITY],
    "road_and_machine_scoped": [
        SCOPED_YIELD_EAST,
        MACHINE_NON_OPERATOR_PRIORITY,
    ],
    "road_and_machine": [
        YIELD_EAST,
        MACHINE_NON_OPERATOR_PRIORITY,
    ],
    "protect_and_scoped_road": [
        NEGATED_EXCEPTION,
        SCOPED_YIELD_EAST,
    ],
    "protect_and_road": [
        NEGATED_EXCEPTION,
        YIELD_EAST,
    ],
    "protect_and_machine": [
        NEGATED_EXCEPTION,
        MACHINE_NON_OPERATOR_PRIORITY,
    ],
    "complete_rulebook": [
        NEGATED_EXCEPTION,
        YIELD_EAST,
        MACHINE_NON_OPERATOR_PRIORITY,
    ],
    "compact_rulebook": [
        NEGATED_EXCEPTION,
        YIELD_EAST,
        MACHINE_NON_OPERATOR_PRIORITY,
    ],
}

GROUND_TRUTH_RULEBOOK = [
    NEGATED_EXCEPTION,
    YIELD_EAST,
    MACHINE_NON_OPERATOR_PRIORITY,
]


def border():
    return {
        (r, c)
        for r in range(ROWS)
        for c in range(COLS)
        if r in (0, ROWS - 1) or c in (0, COLS - 1)
    }


def facility_cells():
    """Three horizontal aisles joined by fixed vertical corridors."""
    cells = set()
    for row in (2, 5, 8):
        cells.update((row, col) for col in range(1, COLS - 1))
    for col in (1, 4, 8):
        cells.update((row, col) for row in range(1, ROWS - 1))
    return cells


def facility_walls():
    open_cells = facility_cells()
    return {
        (r, c)
        for r in range(ROWS)
        for c in range(COLS)
        if (r, c) not in open_cells
    }


def walls_from_open(open_cells):
    return {
        (row, col)
        for row in range(ROWS)
        for col in range(COLS)
        if (row, col) not in set(open_cells)
    }


def facility_zones():
    return {
        (5, 2): "cold",
        (5, 3): "cold",
    }


def make_world(name, changes, *, zones=None, machines=None, walls=None):
    agents = [
        Agent(
            row["agent_id"],
            row["start"],
            row["goal"],
            role=row["role"],
            carrying=row["carrying"],
        )
        for row in changes
    ]
    return World(
        name=name,
        walls=set(facility_walls() if walls is None else walls),
        zone=dict(facility_zones() if zones is None else zones),
        agents=sorted(agents, key=lambda agent: agent.id),
        machines=dict(machines or {}),
        protected=[("cold", "spill")],
        T=80,
    )


def change(
    agent_id,
    start,
    target,
    *,
    role="carrier",
    carrying="none",
    goal_kind="reach",
):
    goal = Goal(goal_kind, target)
    return {
        "agent_id": agent_id,
        "start": start,
        "goal": goal,
        "role": role,
        "carrying": carrying,
    }


def operate(agent_id, start, machine="packer", *, role="carrier"):
    return change(
        agent_id,
        start,
        machine,
        role=role,
        goal_kind="operate",
    )


def safety_broad_variants():
    return [
        make_world(
            "safety_broad",
            [
                change(0, (5, 1), (5, 8), carrying="spill"),
            ],
        ),
    ]


def safety_cargo_variants():
    worlds = []
    for cold_target in ((5, 2), (5, 3)):
        worlds.append(
            make_world(
                f"safety_clean_access_{cold_target[1]}",
                [
                    change(0, (5, 1), (5, 7), carrying="spill"),
                    change(1, (2, 4), cold_target),
                ],
            )
        )
    return worlds


def safety_exception_variants():
    return [
        make_world(
            "safety_cleaner_exception",
            [
                change(
                    0,
                    (5, 1),
                    (5, 2),
                    role="cleaner",
                    carrying="spill",
                ),
                change(
                    1,
                    (5, 8),
                    (6, 1),
                    role="operator",
                    carrying="spill",
                ),
                # A second non-cleaner is needed so that "operator" is not
                # an adequate substitute for the general cleaner exception.
                change(
                    2,
                    (3, 4),
                    (4, 1),
                    role="carrier",
                    carrying="spill",
                ),
                # A non-cleaner carrying clean cargo is also allowed into cold
                # storage, so the carrying condition cannot be dropped.
                change(
                    3,
                    (1, 8),
                    (5, 3),
                    role="carrier",
                    carrying="none",
                ),
            ],
        )
    ]


def road_convention_variants():
    return [
        make_world(
            "road_eastbound_yields",
            [
                # The eastbound robot's target is the junction itself. If it
                # enters first, it parks there and blocks the southbound route.
                change(0, (2, 3), (2, 4)),
                change(1, (1, 4), (5, 4)),
            ],
            zones={},
        )
    ]


def machine_priority_variants():
    return [
        make_world(
            "machine_operator_setup",
            [
                operate(0, (3, 4), role="carrier"),
                operate(1, (2, 5), role="operator"),
            ],
            zones={},
            machines={
                "packer": Machine(
                    "packer",
                    (2, 4),
                    setup_role="operator",
                ),
            },
        )
    ]


def machine_replication_variants():
    """A machine and an open-floor junction expose an over-broad role rule."""
    return [
        make_world(
            "machine_priority_requires_context",
            [
                # On the road, the carrier is southbound and must continue;
                # the eastbound operator gives way.
                change(0, (1, 4), (5, 4), role="carrier"),
                change(1, (2, 3), (2, 4), role="operator"),
                # At the machine, the carrier gives way to the operator.
                operate(2, (6, 8), "sealer", role="carrier"),
                operate(3, (5, 7), "sealer", role="operator"),
            ],
            zones={},
            machines={
                "sealer": Machine(
                    "sealer",
                    (5, 8),
                    setup_role="operator",
                ),
            },
        )
    ]


def combined_road_machine_reuse_variants():
    """A new layout requiring the two learned coordination norms together.

    The ordinary junction is unchanged in kind but appears before the machine
    conflict in a different part of the route. The machine is at the lower
    aisle exit, so neither conflict can be solved by memorising one location.
    """
    return [
        make_world(
            "combined_road_machine_reuse",
            [
                # Ordinary junction: the carrier continues south while the
                # eastbound operator yields at the shared open square.
                change(0, (1, 4), (5, 4), role="carrier"),
                change(1, (2, 3), (2, 4), role="operator"),
                # Machine junction: the operator prepares the lower station;
                # the carrier enters after the station is released.
                operate(2, (7, 8), "sealer", role="carrier"),
                operate(3, (8, 7), "sealer", role="operator"),
            ],
            zones={},
            machines={
                "sealer": Machine(
                    "sealer",
                    (8, 8),
                    setup_role="operator",
                ),
            },
        )
    ]


def safety_rule_reuse_variants():
    """The precise safety rule is useful in a new multi-entry layout.

    Two harmful robots approach cold storage from opposite directions. Two
    cleaners enter it legitimately from the remaining directions, and a robot
    without a spill supplies the carrying counterexample. The compact
    not-cleaner rule handles all five cases; direction- or role-enumeration
    remains possible but requires several rules.
    """
    open_cells = {
        (row, col)
        for row in range(2, 8)
        for col in range(1, 9)
    }
    open_cells.remove((2, 8))
    open_cells.update({(1, 7), (1, 8)})
    return [
        make_world(
            "safety_rule_reuse",
            [
                change(
                    0,
                    (4, 1),
                    (4, 8),
                    role="operator",
                    carrying="spill",
                ),
                change(
                    1,
                    (5, 8),
                    (5, 1),
                    role="carrier",
                    carrying="spill",
                ),
                change(
                    2,
                    (2, 4),
                    (4, 4),
                    role="cleaner",
                    carrying="spill",
                ),
                change(
                    3,
                    (7, 5),
                    (5, 5),
                    role="cleaner",
                    carrying="spill",
                ),
                change(
                    4,
                    (1, 7),
                    (1, 8),
                    role="carrier",
                    carrying="none",
                ),
            ],
            zones={
                (4, 4): "cold",
                (4, 5): "cold",
                (5, 4): "cold",
                (5, 5): "cold",
                (1, 8): "cold",
            },
            walls=walls_from_open(open_cells),
        )
    ]


def _compact_composition_world(name, *, safety=False, road=False, machine=False):
    """Build a connected, low-load warehouse from familiar event modules."""
    open_cells = set()
    changes = []
    zones = {}
    machines = {}
    next_agent_id = 0

    if road or machine:
        # A top aisle joins the road crossing to the machine area.
        open_cells.update((2, col) for col in range(1, 9))
    if road:
        open_cells.update({(1, 2), (3, 2)})
        changes.extend([
            change(next_agent_id, (2, 1), (2, 2), role="carrier"),
            change(next_agent_id + 1, (1, 2), (3, 2), role="operator"),
        ])
        next_agent_id += 2
    if machine:
        open_cells.update({(1, 7), (3, 7)})
        machines["sealer"] = Machine("sealer", (2, 7), setup_role="operator")
        changes.extend([
            # Different approach directions prevent the road convention from
            # accidentally resolving the machine conflict.
            operate(next_agent_id, (3, 7), "sealer", role="carrier"),
            operate(next_agent_id + 1, (2, 8), "sealer", role="operator"),
        ])
        next_agent_id += 2
    if safety:
        # Three linked aisles make a short detour available around cold storage.
        for row in (6, 7, 8):
            open_cells.update((row, col) for col in range(1, 9))
        zones[(7, 3)] = "cold"
        changes.extend([
            change(next_agent_id, (7, 1), (7, 8), role="carrier", carrying="spill"),
            change(next_agent_id + 1, (6, 3), (7, 4), role="cleaner", carrying="spill"),
        ])
        # This unused aisle connects the modules visually as one warehouse
        # without adding another interaction to solve.
        if road or machine:
            open_cells.update((row, 8) for row in range(3, 7))

    return make_world(
        name,
        changes,
        zones=zones,
        machines=machines,
        walls=walls_from_open(open_cells),
    )


def safety_road_composition_variants():
    return [_compact_composition_world("safety_and_road", safety=True, road=True)]


def safety_machine_composition_variants():
    return [_compact_composition_world("safety_and_machine", safety=True, machine=True)]


def road_machine_composition_variants():
    return [_compact_composition_world("road_and_machine", road=True, machine=True)]


def repeated_road_convention_variants():
    """Two road conflicts share direction but not role or opposing direction."""
    open_cells = {
        (2, 1), (2, 2), (2, 3), (1, 2), (3, 2),
        (6, 5), (6, 6), (6, 7), (5, 6), (7, 6),
    }
    return [
        make_world(
            "repeated_eastbound_yield",
            [
                # The eastbound robots stop on the contested square. Letting
                # either enter first would permanently block the crossing route.
                change(0, (2, 1), (2, 2), role="carrier"),
                change(1, (1, 2), (3, 2), role="operator"),
                change(2, (6, 5), (6, 6), role="cleaner"),
                change(3, (7, 6), (5, 6), role="carrier"),
            ],
            zones={},
            walls=walls_from_open(open_cells),
        )
    ]


def repeated_machine_priority_variants():
    """Two setup machines require the same operator-first priority."""
    open_cells = {
        (2, 1), (2, 2), (2, 3), (1, 2), (3, 2),
        (6, 5), (6, 6), (6, 7), (5, 6), (7, 6),
    }
    return [
        make_world(
            "repeated_operator_first",
            [
                operate(0, (2, 1), "packer", role="carrier"),
                operate(1, (1, 2), "packer", role="operator"),
                operate(2, (6, 7), "sealer", role="cleaner"),
                operate(3, (7, 6), "sealer", role="operator"),
            ],
            zones={},
            machines={
                "packer": Machine(
                    "packer",
                    (2, 2),
                    setup_role="operator",
                ),
                "sealer": Machine(
                    "sealer",
                    (6, 6),
                    setup_role="operator",
                ),
            },
            walls=walls_from_open(open_cells),
        )
    ]


def scoped_context_variants():
    """Road and machine conflicts require two context-scoped conventions."""
    open_cells = {
        # Two ordinary road crossings.
        (2, 1), (2, 2), (2, 3), (1, 2), (3, 2),
        (2, 6), (2, 7), (2, 8), (1, 7), (3, 7),
        # Two machine crossings.
        (7, 1), (7, 2), (7, 3), (6, 2), (8, 2),
        (7, 6), (7, 7), (7, 8), (6, 7), (8, 7),
    }
    return [
        make_world(
            "road_and_machine_scope",
            [
                change(0, (2, 1), (2, 2), role="carrier"),
                change(1, (1, 2), (3, 2), role="operator"),
                change(2, (2, 6), (2, 7), role="operator"),
                change(3, (3, 7), (1, 7), role="carrier"),
                operate(4, (7, 1), "packer", role="carrier"),
                operate(5, (6, 2), "packer", role="operator"),
                operate(6, (8, 7), "sealer", role="cleaner"),
                operate(7, (7, 6), "sealer", role="operator"),
            ],
            zones={},
            machines={
                "packer": Machine(
                    "packer",
                    (7, 2),
                    setup_role="operator",
                ),
                "sealer": Machine(
                    "sealer",
                    (7, 7),
                    setup_role="operator",
                ),
            },
            walls=walls_from_open(open_cells),
        )
    ]


def integrated_variants():
    """A compact final scene requiring the three learned rule families.

    It contains one instance of each earlier problem type rather than several
    duplicate conflicts. The difficulty is selecting and combining cached
    rules, not parsing a crowded map.
    """
    return [
        _compact_composition_world(
            "integrated_shared_system",
            safety=True,
            road=True,
            machine=True,
        )
    ]


SHIFT_BLUEPRINTS = (
    {
        "id": "trial_1",
        "participant_label": "T1",
        "participant_description": (
            "One robot must reach its target in a warehouse containing cold storage."
        ),
        "layer": 1,
        "prerequisites": (),
        "stage": "Safety discovery",
        "evidence_function": (
            "A single visible externality makes a broad protective norm a "
            "reasonable first hypothesis."
        ),
        "expected_transition": "no rule -> broad cold-storage protection",
        "variants": safety_broad_variants,
        "contract": {
            "empty": (False, "pollution"),
            "broad": (True, "ok"),
            "cargo": (True, "ok"),
            "negated_exception": (True, "ok"),
        },
    },
    {
        "id": "trial_2",
        "participant_label": "T2",
        "participant_description": (
            "Two robots must reach their targets through the warehouse."
        ),
        "layer": 1,
        "prerequisites": (),
        "stage": "Road convention discovery",
        "evidence_function": (
            "Two robots approach the same ordinary square. A direction-based "
            "yielding convention can coordinate them without assigning IDs."
        ),
        "expected_transition": "no road norm -> contested eastbound yielding",
        "variants": road_convention_variants,
        "contract": {
            "empty": (False, "collision"),
            "yield_east": (True, "ok"),
            "yield_west": (False, "collision"),
            "scoped_yield_east": (True, "ok"),
        },
    },
    {
        "id": "trial_3",
        "participant_label": "T3",
        "participant_description": (
            "Two robots must complete their targets at the same machine."
        ),
        "layer": 1,
        "prerequisites": (),
        "stage": "Machine priority discovery",
        "evidence_function": (
            "An operator must prepare a shared station before a carrier uses "
            "it, making role-based priority useful."
        ),
        "expected_transition": "no machine norm -> carrier yields at a contested machine",
        "variants": machine_priority_variants,
        "contract": {
            "empty": (False, "resource-conflict"),
            "machine_carrier_priority": (True, "ok"),
            "broad_carrier_priority": (True, "ok"),
            "yield_east": (False, "resource-conflict"),
        },
    },
    {
        "id": "trial_4",
        "participant_label": "T4",
        "participant_description": (
            "Two robots must reach their targets in a warehouse containing cold "
            "storage."
        ),
        "layer": 2,
        "prerequisites": ("trial_1",),
        "stage": "Safety refinement",
        "evidence_function": (
            "A legitimate clean delivery is a counterexample to banning "
            "everyone from cold storage."
        ),
        "expected_transition": "broad protection -> spill-sensitive protection",
        "variants": safety_cargo_variants,
        "contract": {
            "empty": (False, "pollution"),
            "broad": (False, "no-legal-plan"),
            "cargo": (True, "ok"),
            "negated_exception": (True, "ok"),
        },
    },
    {
        "id": "trial_5",
        "participant_label": "T5",
        "participant_description": (
            "All robots must reach their targets in a warehouse containing cold "
            "storage."
        ),
        "layer": 2,
        "prerequisites": ("trial_4",),
        "stage": "Exception and negation",
        "evidence_function": (
            "A cleaner carrying a spill is a legitimate exception, while an "
            "operator carrying the same spill remains harmful."
        ),
        "expected_transition": (
            "spill-sensitive protection -> compact not-cleaner exception"
        ),
        "variants": safety_exception_variants,
        "contract": {
            "empty": (False, "pollution"),
            "cargo": (False, "no-legal-plan"),
            "operator_patch": (False, "pollution"),
            "carrier_patch": (False, "pollution"),
            "negated_exception": (True, "ok"),
        },
    },
    {
        "id": "trial_6",
        "participant_label": "T6",
        "participant_description": (
            "Five robots must reach their targets in a warehouse containing cold "
            "storage."
        ),
        "layer": 3,
        "prerequisites": ("trial_5",),
        "stage": "Safety-rule reuse",
        "evidence_function": (
            "The same precise safety rule handles harmful entries from opposite "
            "directions while preserving legitimate cleaner and clean-cargo access."
        ),
        "expected_transition": (
            "retrieve one compact safety rule instead of enumerating roles or routes"
        ),
        "variants": safety_rule_reuse_variants,
        "optimality_reference": [NEGATED_EXCEPTION],
        "shortcut_rulebooks": (
            [CARRIER_PROTECTION, OPERATOR_PROTECTION],
        ),
        "contract": {
            "empty": (False, None),
            "negated_exception": (True, "ok"),
            "enumerated_roles": (True, "ok"),
            "cargo": (False, "no-legal-plan"),
            "broad": (False, "no-legal-plan"),
        },
    },
    {
        "id": "trial_7",
        "participant_label": "T7",
        "participant_description": (
            "Four robots must reach their targets through cold storage and a shared crossing."
        ),
        "layer": 3,
        "prerequisites": ("trial_5", "trial_2"),
        "stage": "Safety and road reuse",
        "evidence_function": (
            "A familiar safety event and a familiar road conflict occur in one "
            "small warehouse. Both earlier rules are needed, with no new rule "
            "type introduced."
        ),
        "expected_transition": (
            "retrieve the safety and road rules together"
        ),
        "variants": safety_road_composition_variants,
        "optimality_reference": [NEGATED_EXCEPTION, YIELD_EAST],
        "shortcut_rulebooks": (
            [CARRIER_PROTECTION, OPERATOR_PROTECTION, YIELD_EAST],
        ),
        "contract": {
            "empty": (False, None),
            "protect_and_road": (True, "ok"),
            "negated_exception": (False, "collision"),
            "yield_east": (False, "pollution"),
        },
    },
    {
        "id": "trial_8",
        "participant_label": "T8",
        "participant_description": (
            "Four robots must complete their targets at cold storage and a setup machine."
        ),
        "layer": 3,
        "prerequisites": ("trial_5", "trial_3"),
        "stage": "Safety and machine reuse",
        "evidence_function": (
            "A familiar safety event and a familiar operator-first machine event "
            "occur together. Both earlier rules are needed."
        ),
        "expected_transition": (
            "retrieve the safety and machine rules together"
        ),
        "variants": safety_machine_composition_variants,
        "optimality_reference": [NEGATED_EXCEPTION, MACHINE_NON_OPERATOR_PRIORITY],
        "shortcut_rulebooks": (
            [CARRIER_PROTECTION, OPERATOR_PROTECTION, MACHINE_NON_OPERATOR_PRIORITY],
        ),
        "contract": {
            "empty": (False, None),
            "protect_and_machine": (True, "ok"),
            "negated_exception": (False, "resource-conflict"),
            "machine_non_operator_priority": (False, "pollution"),
        },
    },
    {
        "id": "trial_9",
        "participant_label": "T9",
        "participant_description": (
            "Four robots must complete their targets across a shared crossing and a setup machine."
        ),
        "layer": 3,
        "prerequisites": ("trial_2", "trial_3"),
        "stage": "Road and machine reuse",
        "evidence_function": (
            "A familiar road conflict and a familiar machine conflict occur in "
            "one small warehouse. Both earlier rules are needed."
        ),
        "expected_transition": (
            "retrieve the road and machine rules together"
        ),
        "variants": road_machine_composition_variants,
        "optimality_reference": [
            YIELD_EAST,
            MACHINE_NON_OPERATOR_PRIORITY,
        ],
        "shortcut_rulebooks": (
            [
                YIELD_EAST_CARRIER,
                YIELD_EAST_OPERATOR,
                MACHINE_CARRIER_PRIORITY,
                MACHINE_CLEANER_PRIORITY,
            ],
        ),
        "contract": {
            "empty": (False, "resource-conflict"),
            "road_and_machine": (True, "ok"),
            "yield_east": (False, "resource-conflict"),
            "machine_non_operator_priority": (False, "collision"),
        },
    },
    {
        "id": "trial_10",
        "participant_label": "T10",
        "participant_description": (
            "Six robots must complete their targets in a warehouse containing "
            "cold storage, a shared crossing, and a setup machine."
        ),
        "layer": 4,
        "prerequisites": ("trial_6", "trial_9"),
        "stage": "Integrated system",
        "evidence_function": (
            "One instance of each familiar problem type appears together. The "
            "task tests selection of three cached rules, not a larger map."
        ),
        "expected_transition": (
            "retrieve and jointly apply the safety, road, and machine rules"
        ),
        "variants": integrated_variants,
        "optimality_reference": [
            NEGATED_EXCEPTION,
            YIELD_EAST,
            MACHINE_NON_OPERATOR_PRIORITY,
        ],
        "shortcut_rulebooks": (
            [
                NEGATED_EXCEPTION,
                YIELD_EAST_CARRIER,
                YIELD_EAST_OPERATOR,
                MACHINE_CARRIER_PRIORITY,
                MACHINE_CLEANER_PRIORITY,
            ],
        ),
        "contract": {
            "empty": (False, None),
            "negated_exception": (False, None),
            "protect_and_road": (False, "resource-conflict"),
            "protect_and_machine": (False, "collision"),
            "complete_rulebook": (True, "ok"),
        },
    },
)


def _reason_matches(actual, expected):
    if expected is None:
        return True
    return (
        actual == expected
        or actual.startswith(expected)
        or actual.endswith(expected)
    )


def contract_report(world, contract):
    rows = {}
    matches = True
    for name, (expected_ok, expected_reason) in contract.items():
        ok, reason = simulate(world, ANCHOR_RULEBOOKS[name])
        row_ok = ok == expected_ok and _reason_matches(reason, expected_reason)
        rows[name] = {
            "ok": ok,
            "reason": reason,
            "expected_ok": expected_ok,
            "expected_reason": expected_reason,
            "matches": row_ok,
        }
        matches = matches and row_ok
    return matches, rows


def _path_nuisance_score(world):
    """Prefer shorter, more balanced baseline traces among valid variants."""
    _, _, frames = simulate(world, [], trace=True)
    return len(frames), sum(
        abs(agent.pos[0] - (
            agent.goal.target[0]
            if agent.goal.kind == "reach"
            else world.machines[agent.goal.target].cell[0]
        ))
        + abs(agent.pos[1] - (
            agent.goal.target[1]
            if agent.goal.kind == "reach"
            else world.machines[agent.goal.target].cell[1]
        ))
        for agent in world.agents
    )


def select_shift(blueprint):
    valid = []
    rejected = []
    for world in blueprint["variants"]():
        matches, report = contract_report(world, blueprint["contract"])
        if matches:
            valid.append((_path_nuisance_score(world), world, report))
        else:
            rejected.append({"world": world.name, "report": report})
    if not valid:
        raise RuntimeError(
            f"No generated world satisfies {blueprint['id']} contract: {rejected}"
        )
    valid.sort(key=lambda row: (row[0], row[1].name))
    score, world, _ = valid[0]
    return ShiftSpec(
        id=blueprint["id"],
        participant_label=blueprint["participant_label"],
        layer=blueprint["layer"],
        prerequisites=tuple(blueprint["prerequisites"]),
        stage=blueprint["stage"],
        evidence_function=blueprint["evidence_function"],
        expected_transition=blueprint["expected_transition"],
        world=world,
        contract=blueprint["contract"],
        nuisance_score=score,
    )


def build_shift_library():
    return [select_shift(blueprint) for blueprint in SHIFT_BLUEPRINTS]


def build_case_library():
    """Backward-compatible alias used by analysis scripts."""
    return build_shift_library()


def _selector_options():
    """Canonical selectors for each semantic field.

    Multiple negative direction literals are retained when they express a
    two-direction subset. Redundant positive/negative descriptions are
    canonicalized away, while the participant interface may still accept them.
    """
    target = (
        (),
        (literal("target_type", "cold"),),
        (literal("target_type", "machine"),),
        (literal("target_type", "cold", True),),
        (literal("target_type", "machine", True),),
        (
            literal("target_type", "cold", True),
            literal("target_type", "machine", True),
        ),
    )
    contested = (
        (),
        (literal("contested", True),),
        (literal("contested", True, True),),
    )
    role = (
        (),
        *((
            literal("role", role_name),
        ) for role_name in ROLES),
        *((
            literal("role", role_name, True),
        ) for role_name in ROLES),
    )
    carrying = (
        (),
        (literal("carrying", "spill"),),
        (literal("carrying", "spill", True),),
    )
    direction = [()]
    direction.extend((literal("move_dir", direction_name),) for direction_name in DIRECTIONS)
    direction.extend(
        (literal("move_dir", direction_name, True),)
        for direction_name in DIRECTIONS
    )
    # Any two allowed directions are most compactly represented by excluding
    # the complementary pair.
    for first_index in range(len(DIRECTIONS)):
        for second_index in range(first_index + 1, len(DIRECTIONS)):
            allowed = {DIRECTIONS[first_index], DIRECTIONS[second_index]}
            excluded = [direction_name for direction_name in DIRECTIONS if direction_name not in allowed]
            direction.append(tuple(
                literal("move_dir", direction_name, True)
                for direction_name in excluded
            ))
    return target, contested, role, carrying, tuple(direction)


def rule_key(candidate):
    action, conditions = candidate
    return (
        action,
        tuple(sorted(
            (predicate, str(value), bool(negated))
            for predicate, value, negated in conditions
        )),
    )


def rule_mdl(candidate):
    return len(candidate[1])


def candidate_rules(max_conditions=MAX_RULE_CONDITIONS):
    candidates = {}
    for selectors in product(*_selector_options()):
        conditions = tuple(condition for selector in selectors for condition in selector)
        if not conditions or len(conditions) > max_conditions:
            continue
        candidate = rule(*conditions)
        candidates[rule_key(candidate)] = candidate
    return sorted(
        candidates.values(),
        key=lambda candidate: (rule_mdl(candidate), rule_key(candidate)),
    )


def rule_schema_json():
    candidates = candidate_rules()
    return {
        "action": {
            "id": "MOVE",
            "label": "MOVE INTO A SQUARE",
        },
        "operators": [
            {"id": "IS", "label": "IS"},
            {"id": "IS_NOT", "label": "IS NOT"},
        ],
        "fields": [
            {
                **field,
                "values": [dict(value) for value in field["values"]],
            }
            for field in RULE_FIELDS
        ],
        "max_conditions": MAX_RULE_CONDITIONS,
        "canonical_rule_count": len(candidates),
        "canonicalization": (
            "The interface accepts up to eight conditions. The exact solver "
            "collapses logically equivalent categorical descriptions."
        ),
    }


def ground_truth_json():
    return {
        "final_trial_reference_rulebook": [
            norm_str(candidate)
            for candidate in GROUND_TRUTH_RULEBOOK
        ],
        "rule_count": len(GROUND_TRUTH_RULEBOOK),
        "mdl": sum(rule_mdl(candidate) for candidate in GROUND_TRUTH_RULEBOOK),
        "curriculum_logic": (
            "A broad safety rule is refined by legitimate counterexamples. "
            "A road convention and a machine-priority norm are then learned. "
            "T7--T9 then require each pair of these three rules, before T10 "
            "requires all three together. Earlier scenes do not need to share "
            "one rulebook."
        ),
        "recommended_order": [
            blueprint["id"]
            for blueprint in SHIFT_BLUEPRINTS
        ],
    }
