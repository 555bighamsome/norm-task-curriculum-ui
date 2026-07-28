"""
norm-lab: the complete designed system.

  generator  -> parametric multi-agent scenarios (band-stacked interference modules)
  solver     -> enumerate the FIXED constraint space, search the minimal shared
                norm-set, report SEARCH COST (the 'computational power' proxy)
  quantify   -> per-constraint: mdl, firing-rate, restrictiveness, necessity,
                over-restriction (is it an over-approximation?)
  classify   -> per-constraint: interference type / form / character / status
  spectrum   -> batch-generate -> map scenarios to required #constraints

Run:  python3 lab.py
"""
from itertools import combinations
from wh_engine import (Agent, Goal, Item, Machine, World, simulate, zone_of, make_ctx,
                       norm_forbids, is_dynamic, norm_str, DIRS)

# ============================================================ GENERATOR
# Each protected-zone "type" is a (zone-tag, carry-tag) pair: a non-cleaner carrying
# that contaminant must not enter that zone.  Distinct types need distinct norms;
# repeated types compress to one norm.
PROT_TYPES = [("cold", "spill"), ("fragile", "glass"), ("secure", "valuable")]

# The experiment-facing primitive space is fixed before task generation.  The
# default "human_medium" profile keeps the space small enough for people while
# removing the old over-narrow feel: directions are symmetric, roles are visible,
# and USE has a real resource vocabulary.  We still exclude identity, coordinates,
# and "intersection" labels so participants cannot solve social coordination as
# a local patch.
PRIMITIVE_PROFILE = "human_medium"

CORE_ACTION_LITERALS = {
    "MOVE": (
        ("dest_zone", "cold"),
        ("carrying", "spill"),
        # Cleaner exception is represented as a negative role condition; this
        # avoids an equivalent "role=carrier" shortcut in the MOVE space.
        ("role_not", "cleaner"),
        ("move_dir", "N"),
        ("move_dir", "S"),
        ("contested", True),
    ),
    "USE": (
        ("role", "carrier"),
        ("contested", True),
    ),
}

HUMAN_MEDIUM_ACTION_LITERALS = {
    "MOVE": (
        ("dest_zone", "cold"),
        ("carrying", "spill"),
        # Keep the intended exception form early in the pool so solver tie-breaks
        # prefer "cleaner excepted" over the equivalent carrier-only shortcut.
        ("role_not", "cleaner"),
        ("move_dir", "N"),
        ("move_dir", "S"),
        ("move_dir", "E"),
        ("move_dir", "W"),
        ("contested", True),
    ),
    "USE": (
        ("role", "carrier"),
        ("role", "operator"),
        ("contested", True),
    ),
}

EXPANDED_ZONES = tuple(z for z, _ in PROT_TYPES) + ("intersection",)
EXPANDED_CARRIES = tuple(c for _, c in PROT_TYPES)
EXPANDED_ROLES = ("carrier", "cleaner", "operator")
EXPANDED_DIRECTIONS = ("N", "S", "E", "W")
EXPANDED_ITEM_COLOURS = ("red", "blue")
EXPANDED_MACHINES = ("packer",)

EXPANDED_ACTION_LITERALS = {
    "MOVE": tuple(
        [("dest_zone", z) for z in EXPANDED_ZONES]
        + [("carrying", c) for c in EXPANDED_CARRIES]
        + [("move_dir", d) for d in EXPANDED_DIRECTIONS]
        + [("role_not", r) for r in EXPANDED_ROLES]
        + [("role", r) for r in EXPANDED_ROLES]
        + [("contested", True)]
    ),
    "PICK": tuple(
        [("item_unscanned", True)]
        + [("item_colour", c) for c in EXPANDED_ITEM_COLOURS]
        + [("role_not", r) for r in EXPANDED_ROLES]
        + [("role", r) for r in EXPANDED_ROLES]
        + [("carrying", c) for c in EXPANDED_CARRIES]
    ),
    "USE": tuple(
        [("machine", m) for m in EXPANDED_MACHINES]
        + [("no_permit", True)]
        + [("role", r) for r in EXPANDED_ROLES]
        + [("role_not", r) for r in EXPANDED_ROLES]
        + [("contested", True)]
    ),
}

PRIMITIVE_PROFILES = {
    "core": {
        "description": (
            "Default curriculum vocabulary: cold-chain contamination, cleaner "
            "exception, crossing coordination, and one machine-contention "
            "priority rule. PICK/precondition rules are reserved for extensions."
        ),
        "action_literals": CORE_ACTION_LITERALS,
    },
    "human_medium": {
        "description": (
            "Experiment-facing vocabulary: MOVE/USE only, symmetric movement "
            "directions, visible social roles, cold-chain/spill externality, "
            "and machine contention. It deliberately excludes coordinates, "
            "robot IDs, and intersection labels to keep rules type-level and "
            "social rather than local."
        ),
        "action_literals": HUMAN_MEDIUM_ACTION_LITERALS,
    },
    "expanded": {
        "description": (
            "Reserved broader vocabulary for later stimulus sets with multiple "
            "protected-zone types, colours, permit checks, and named machines."
        ),
        "action_literals": EXPANDED_ACTION_LITERALS,
    },
}

ACTION_LITERALS = PRIMITIVE_PROFILES[PRIMITIVE_PROFILE]["action_literals"]
GLOBAL_ACTIONS = tuple(ACTION_LITERALS.keys())
GLOBAL_LITERALS = tuple(
    dict.fromkeys(lit for action in GLOBAL_ACTIONS for lit in ACTION_LITERALS[action])
)

def _band(zt, ct, h, idb, role_exc):
    """A 3-row social contamination module at top-row h (cols 1..5):
       A = carrier hauling the contaminant across (would pollute the zone)
       B = carrier stocking clean goods INTO the zone (broad rule would block it)
       C = cleaner who must bring the contaminant in to clean (precise rule blocks it)"""
    zones = {(h + 1, 3): zt, (h + 2, 3): zt}
    agents = [
        Agent(idb, (h + 1, 2 if role_exc else 1), Goal("reach", (h + 1, 5)),
              role="carrier", carrying=ct),
        Agent(idb + 1, (h + 2, 1), Goal("reach", (h + 2, 3)), role="carrier"),
    ]
    n = 2
    if role_exc:
        agents.append(Agent(idb + 2, (h + 1, 5), Goal("reach", (h + 1, 3)),
                            role="cleaner", carrying=ct))
        n = 3
    return zones, (zt, ct), agents, n

def generate(types, role_exc=False, name="gen"):
    """types: list of indices into PROT_TYPES (repeats allowed)."""
    rows, cols = 4 * len(types) + 1, 7
    walls = {(r, c) for r in range(rows) for c in range(cols)
             if r in (0, rows - 1) or c in (0, cols - 1)}
    zones, protected, agents, idb = {}, [], [], 0
    for i, ti in enumerate(types):
        h = 1 + i * 4
        for c in range(1, cols - 1):
            walls.add((h + 3, c))                       # band separator
        zt, ct = PROT_TYPES[ti]
        z, p, ags, n = _band(zt, ct, h, idb, role_exc)
        zones.update(z)
        if p not in protected:
            protected.append(p)
        agents += ags; idb += n
    return World(name, walls, zones, agents, protected=protected)

def border(rows, cols):
    return {(r, c) for r in range(rows) for c in range(cols)
            if r in (0, rows - 1) or c in (0, cols - 1)}

PILOT_ROWS = 9
PILOT_COLS = 9

def pilot_border():
    return border(PILOT_ROWS, PILOT_COLS)

def corridor_walls(rows, cols, allowed):
    """Border plus blocked interior, leaving only the explicitly allowed cells.
    Useful for counterbalanced crossing tasks where accidental alternate routes
    would change which relational norm is being tested."""
    allowed = set(allowed)
    walls = border(rows, cols)
    for r in range(1, rows - 1):
        for c in range(1, cols - 1):
            if (r, c) not in allowed:
                walls.add((r, c))
    return walls

def generate_inbound_pollution(name="inbound_pollution"):
    return generate([0], role_exc=False, name=name)

def generate_cleaner_exception(name="cleaner_exception"):
    return generate([0], role_exc=True, name=name)

def generate_externality_simple(name="externality_simple"):
    """A warmup externality task where a broad cached rule is sufficient.
    A spill carrier would contaminate cold-chain space; another carrier is
    present but does not need to enter the cold zone yet."""
    walls = pilot_border()
    zones = {(4, 3): "cold", (4, 4): "cold"}
    agents = [
        Agent(0, (4, 1), Goal("reach", (4, 7)), role="carrier", carrying="spill"),
        Agent(1, (2, 1), Goal("reach", (2, 7)), role="carrier"),
    ]
    return World(name, walls, zones, agents, protected=[("cold", "spill")])

def generate_externality_precision(name="externality_precision"):
    """A legal stocker now must enter cold-chain space, so the broad rule
    "nobody enters cold" is too restrictive."""
    walls = pilot_border()
    zones = {(4, c): "cold" for c in (3, 4, 5)}
    agents = [
        Agent(0, (4, 1), Goal("reach", (4, 7)), role="carrier", carrying="spill"),
        Agent(1, (1, 7), Goal("reach", (4, 4)), role="carrier"),
    ]
    return World(name, walls, zones, agents, protected=[("cold", "spill")])

def generate_externality_exception(name="externality_exception"):
    """A cleaner may legitimately bring spill into the cold zone to repair the
    shared state, forcing an exception to the contamination rule."""
    walls = pilot_border()
    zones = {(4, c): "cold" for c in (3, 4, 5)}
    agents = [
        Agent(0, (4, 1), Goal("reach", (4, 7)), role="carrier", carrying="spill"),
        Agent(1, (1, 7), Goal("reach", (4, 4)), role="carrier"),
        Agent(2, (7, 1), Goal("reach", (4, 3)), role="cleaner", carrying="spill"),
    ]
    return World(name, walls, zones, agents, protected=[("cold", "spill")])

def generate_externality_many_agents(name="externality_many_agents"):
    """A larger cold-chain map with multiple spill carriers, a legitimate stocker,
    a cleaner exception, and an unrelated carrier.  The required norm should
    compress over agent count: the same type-level exception rule solves all
    spill routes without naming individual robots."""
    walls = border(10, 13)
    zones = {(r, c): "cold" for r in (4, 5) for c in (5, 6, 7)}
    agents = [
        Agent(0, (4, 1), Goal("reach", (4, 11)), role="carrier", carrying="spill"),
        Agent(1, (5, 11), Goal("reach", (5, 1)), role="carrier", carrying="spill"),
        Agent(2, (1, 6), Goal("reach", (4, 6)), role="carrier"),
        Agent(3, (8, 6), Goal("reach", (5, 6)), role="cleaner", carrying="spill"),
        Agent(4, (8, 1), Goal("reach", (8, 11)), role="carrier"),
    ]
    return World(name, walls, zones, agents, protected=[("cold", "spill")])

def generate_externality_scale_agents(name="externality_scale_agents"):
    """A still larger generated cold-chain map.  It keeps the same social
    structure as the cleaner-exception task but increases the number of agents,
    legal entries, and spill routes.  The intended result is norm compression:
    one type-level exception norm scales across the larger population."""
    walls = border(12, 15)
    zones = {(r, c): "cold" for r in (5, 6) for c in (6, 7, 8)}
    agents = [
        Agent(0, (5, 1), Goal("reach", (5, 13)), role="carrier", carrying="spill"),
        Agent(1, (6, 13), Goal("reach", (6, 1)), role="carrier", carrying="spill"),
        Agent(2, (1, 7), Goal("reach", (5, 7)), role="carrier"),
        Agent(3, (10, 8), Goal("reach", (6, 8)), role="carrier"),
        Agent(4, (10, 7), Goal("reach", (6, 7)), role="cleaner", carrying="spill"),
        Agent(5, (10, 1), Goal("reach", (10, 13)), role="carrier"),
        Agent(6, (1, 13), Goal("reach", (1, 1)), role="carrier"),
    ]
    return World(name, walls, zones, agents, protected=[("cold", "spill")])

def generate_crossing(name="crossing_coordination"):
    """Two same-role agents reach the same one-cell intersection at the same tick.
    Since role/identity do not separate them, the minimal useful norm must refer
    to live contention plus movement direction."""
    allowed = (
        {(4, c) for c in range(1, 8)}
        | {(r, 4) for r in range(1, 8)}
    )
    walls = corridor_walls(PILOT_ROWS, PILOT_COLS, allowed)
    zone = {(4, 4): "intersection"}
    a0 = Agent(0, (4, 1), Goal("reach", (4, 7)), role="carrier")
    a1 = Agent(1, (7, 4), Goal("reach", (1, 4)), role="carrier")
    return World(name, walls, zone, [a0, a1], protected=[])

def generate_crossing_south(name="crossing_south_coordination"):
    """Counterbalanced crossing where the solver's minimal convention is
    contested + southbound yielding."""
    allowed = {
        (1, 3), (2, 3), (3, 3), (4, 3),
        (2, 1), (2, 2), (2, 4), (2, 5),
    }
    walls = corridor_walls(6, 7, allowed)
    zone = {(2, 3): "intersection"}
    a0 = Agent(0, (1, 3), Goal("reach", (4, 3)), role="carrier")
    a1 = Agent(1, (2, 2), Goal("reach", (2, 5)), role="carrier")
    return World(name, walls, zone, [a0, a1], protected=[])

def generate_crossing_east(name="crossing_east_coordination"):
    """Counterbalanced crossing where only the eastbound robot can yield
    without causing a later swap conflict."""
    allowed = {
        (2, 1), (2, 2), (2, 3), (2, 4), (2, 5),
        (3, 3),
    }
    walls = corridor_walls(5, 7, allowed)
    zone = {(2, 3): "intersection"}
    a0 = Agent(0, (2, 1), Goal("reach", (2, 5)), role="carrier")
    a1 = Agent(1, (2, 5), Goal("reach", (3, 3)), role="carrier")
    return World(name, walls, zone, [a0, a1], protected=[])

def generate_crossing_west(name="crossing_west_coordination"):
    """Mirror of the east-yield task: the westbound robot must yield."""
    allowed = {
        (2, 1), (2, 2), (2, 3), (2, 4), (2, 5),
        (3, 3),
    }
    walls = corridor_walls(5, 7, allowed)
    zone = {(2, 3): "intersection"}
    a0 = Agent(0, (2, 5), Goal("reach", (2, 1)), role="carrier")
    a1 = Agent(1, (2, 1), Goal("reach", (3, 3)), role="carrier")
    return World(name, walls, zone, [a0, a1], protected=[])

def generate_precondition(name="scan_before_pick"):
    """A hazardous item is fastest to pick immediately, but doing so causes an
    incident.  A PICK norm forces the agent to scan before pickup."""
    walls = border(5, 7)
    item = Item("pkg", (1, 3), colour="red", hazardous=True, scanned=False)
    a0 = Agent(0, (1, 1), Goal("deliver", ("pkg", (1, 5))), role="carrier")
    a1 = Agent(1, (3, 1), Goal("reach", (3, 5)), role="carrier")
    return World(name, walls, {}, [a0, a1], items={"pkg": item}, scanners={(3, 3)})

def generate_resource_contention(name="resource_contention"):
    """Two agents enter the same capacity-1 machine station at the same tick.
    A contested MOVE norm assigns temporary priority; the station is released
    one step after a robot operates it."""
    walls = pilot_border()
    machine = Machine("packer", (4, 4))
    a0 = Agent(0, (1, 1), Goal("operate", "packer"), role="operator", tokens=frozenset({"permit"}))
    a1 = Agent(1, (7, 7), Goal("operate", "packer"), role="carrier", tokens=frozenset({"permit"}))
    return World(name, walls, {}, [a0, a1], machines={"packer": machine})

def generate_induced_crossing(name="induced_crossing"):
    """A contamination norm changes the spill carriers' paths, inducing a new
    same-role crossing conflict in the central aisle."""
    walls = pilot_border()
    zones = {(4, c): "cold" for c in (3, 5)}
    zones[(3, 4)] = "intersection"
    agents = [
        Agent(0, (4, 1), Goal("reach", (4, 7)), role="carrier", carrying="spill"),
        Agent(1, (1, 7), Goal("reach", (4, 5)), role="carrier"),
        Agent(2, (7, 4), Goal("reach", (1, 4)), role="carrier", carrying="spill"),
    ]
    return World(name, walls, zones, agents, protected=[("cold", "spill")])

def generate_exception_induced_crossing(name="exception_induced_crossing"):
    """The induced-crossing map with a cleaner exception added to the same cold
    zone, requiring a refined protective norm plus the relational yield norm."""
    walls = pilot_border()
    zones = {(4, c): "cold" for c in (3, 5)}
    zones[(3, 4)] = "intersection"
    agents = [
        Agent(0, (4, 1), Goal("reach", (4, 7)), role="carrier", carrying="spill"),
        Agent(1, (1, 7), Goal("reach", (4, 5)), role="carrier"),
        Agent(2, (7, 4), Goal("reach", (1, 4)), role="carrier", carrying="spill"),
        Agent(3, (7, 1), Goal("reach", (4, 3)), role="cleaner", carrying="spill"),
    ]
    return World(name, walls, zones, agents, protected=[("cold", "spill")])

def generate_integrated_social_warehouse(name="integrated_social_warehouse"):
    """A single social warehouse: cold-chain externality with cleaner exception,
    an induced aisle conflict, and a shared machine contention."""
    walls = pilot_border()
    zones = {(4, c): "cold" for c in (3, 5)}
    zones[(3, 4)] = "intersection"
    agents = [
        Agent(0, (4, 1), Goal("reach", (4, 7)), role="carrier", carrying="spill"),
        Agent(1, (1, 5), Goal("reach", (4, 5)), role="carrier"),
        Agent(2, (7, 4), Goal("reach", (1, 4)), role="carrier", carrying="spill"),
        Agent(3, (6, 1), Goal("reach", (4, 3)), role="cleaner", carrying="spill"),
        Agent(4, (1, 7), Goal("operate", "packer"), role="operator", tokens=frozenset({"permit"})),
        Agent(5, (7, 1), Goal("operate", "packer"), role="carrier", tokens=frozenset({"permit"})),
    ]
    machine = Machine("packer", (7, 7))
    return World(name, walls, zones, agents, machines={"packer": machine},
                 protected=[("cold", "spill")])

def _world_dims(w):
    return max(r for r, _ in w.walls) + 1, max(c for _, c in w.walls) + 1

def _shift_cell(cell, dr, dc):
    return (cell[0] + dr, cell[1] + dc)

def _shift_goal(goal, dr, dc, item_map, machine_map):
    if goal.kind == "reach":
        return Goal("reach", _shift_cell(goal.target, dr, dc))
    if goal.kind == "deliver":
        item_id, target = goal.target
        return Goal("deliver", (item_map[item_id], _shift_cell(target, dr, dc)))
    if goal.kind == "operate":
        return Goal("operate", machine_map[goal.target])
    return goal

def _map_goal(goal, map_cell, item_map, machine_map):
    if goal.kind == "reach":
        return Goal("reach", map_cell(goal.target))
    if goal.kind == "deliver":
        item_id, target = goal.target
        return Goal("deliver", (item_map[item_id], map_cell(target)))
    if goal.kind == "operate":
        return Goal("operate", machine_map[goal.target])
    return goal

def _transform_world(w, name, map_cell):
    item_map = {item_id: item_id for item_id in w.items}
    machine_map = {machine_id: machine_id for machine_id in w.machines}
    agents = [
        Agent(
            a.id,
            map_cell(a.pos),
            _map_goal(a.goal, map_cell, item_map, machine_map),
            role=a.role,
            colour=a.colour,
            carrying=a.carrying,
            tokens=a.tokens,
        )
        for a in w.agents
    ]
    items = {
        item_id: Item(
            item.id,
            map_cell(item.cell),
            colour=item.colour,
            hazardous=item.hazardous,
            scanned=item.scanned,
        )
        for item_id, item in w.items.items()
    }
    machines = {
        machine_id: Machine(
            machine.id,
            map_cell(machine.cell),
            needs_permit=machine.needs_permit,
        )
        for machine_id, machine in w.machines.items()
    }
    return World(
        name,
        {map_cell(p) for p in w.walls},
        {map_cell(p): z for p, z in w.zone.items()},
        agents,
        items=items,
        machines=machines,
        scanners={map_cell(p) for p in w.scanners},
        protected=list(w.protected),
        T=w.T,
    )

def flip_rows(w, name):
    rows, _ = _world_dims(w)
    return _transform_world(w, name, lambda p: (rows - 1 - p[0], p[1]))

def generate_induced_crossing_south(name="induced_crossing_south"):
    return flip_rows(generate_induced_crossing(name + "_source"), name)

def generate_exception_induced_crossing_south(name="exception_induced_crossing_south"):
    return flip_rows(generate_exception_induced_crossing(name + "_source"), name)

def generate_integrated_social_warehouse_south(name="integrated_social_warehouse_south"):
    return flip_rows(generate_integrated_social_warehouse(name + "_source"), name)

def compose_world(name, modules, columns=2, gap=1):
    """Place several already-validated modules into one larger warehouse map.
    Modules remain spatially separated, so difficulty comes from composing
    shared norms rather than pathfinding clutter."""
    dims = [_world_dims(w) for w in modules]
    cell_w = max(c for _, c in dims) + gap
    cell_h = max(r for r, _ in dims) + gap
    walls, zones, protected = set(), {}, []
    agents, items, machines, scanners = [], {}, {}, set()
    next_agent = 0

    for i, w in enumerate(modules):
        tile_r, tile_c = divmod(i, columns)
        dr, dc = tile_r * cell_h, tile_c * cell_w
        item_map = {}
        for item_id in w.items:
            item_map[item_id] = item_id if item_id not in items else f"{item_id}_{i}"
        machine_map = {}
        for machine_id in w.machines:
            machine_map[machine_id] = machine_id if machine_id not in machines else f"{machine_id}_{i}"

        walls |= {_shift_cell(p, dr, dc) for p in w.walls}
        zones.update({_shift_cell(p, dr, dc): z for p, z in w.zone.items()})
        for p in w.protected:
            if p not in protected:
                protected.append(p)

        for a in w.agents:
            agents.append(Agent(
                next_agent,
                _shift_cell(a.pos, dr, dc),
                _shift_goal(a.goal, dr, dc, item_map, machine_map),
                role=a.role,
                colour=a.colour,
                carrying=a.carrying,
                tokens=a.tokens,
            ))
            next_agent += 1

        for item_id, item in w.items.items():
            items[item_map[item_id]] = Item(
                item_map[item_id],
                _shift_cell(item.cell, dr, dc),
                colour=item.colour,
                hazardous=item.hazardous,
                scanned=item.scanned,
            )

        for machine_id, machine in w.machines.items():
            machines[machine_map[machine_id]] = Machine(
                machine_map[machine_id],
                _shift_cell(machine.cell, dr, dc),
                needs_permit=machine.needs_permit,
            )

        scanners |= {_shift_cell(p, dr, dc) for p in w.scanners}

    return World(name, walls, zones, agents, items=items, machines=machines,
                 scanners=scanners, protected=protected)

def generate_pollution_crossing(name="curriculum_pollution_crossing"):
    return compose_world(name, [generate_inbound_pollution("pollution_room"),
                                generate_crossing("crossing_room")])

def generate_pollution_precondition(name="curriculum_pollution_precondition"):
    return compose_world(name, [generate_inbound_pollution("pollution_room"),
                                generate_precondition("scan_room")])

def generate_cleaner_resource(name="curriculum_cleaner_resource"):
    return compose_world(name, [generate_cleaner_exception("cleaner_room"),
                                generate_resource_contention("machine_room")])

def generate_full_curriculum(name="curriculum_full_warehouse"):
    return compose_world(name, [
        generate_cleaner_exception("cleaner_room"),
        generate_crossing("crossing_room"),
        generate_precondition("scan_room"),
    ])

# ============================================================ CONSTRAINT SPACE
GROUP = {"dest_zone": "zone", "role": "role", "role_not": "role",
         "carrying": "carry", "move_dir": "dir", "item_colour": "item_colour",
         "machine": "machine"}

def _present(w):
    zones = sorted(set(w.zone.values()))
    carries = sorted({a.carrying for a in w.agents if a.carrying != "none"})
    roles = sorted({a.role for a in w.agents})
    return zones, carries, roles

def literal_pool(w, fixed=True, action=None):
    if fixed:
        if action:
            return list(ACTION_LITERALS[action])
        return list(GLOBAL_LITERALS)
    zones, carries, roles = _present(w)
    pool = [("dest_zone", z) for z in zones]
    pool += [("carrying", c) for c in carries]
    pool += [("move_dir", d) for d in ("N", "S", "E", "W")]
    pool += [("role", r) for r in roles] + [("role_not", r) for r in roles]
    pool.append(("contested", True))
    return pool

def _consistent(lits):
    seen = set()
    for p, v in lits:
        g = GROUP.get(p)
        if g:
            if g in seen:
                return False
            seen.add(g)
    return True

def candidate_norms(w, max_len=3, fixed_vocab=True):
    cands = []
    actions = GLOBAL_ACTIONS if fixed_vocab else ("MOVE", "PICK", "USE")
    for action in actions:
        pool = literal_pool(w, fixed=fixed_vocab, action=action)
        for k in range(1, max_len + 1):
            for lits in combinations(pool, k):
                if _consistent(lits):
                    cands.append((action, list(lits)))
    return cands

def mdl(norm):
    return 1 + len(norm[1])

# ============================================================ SOLVER
def _greedy(w, cands, max_norms=8):
    """Layered search: add the lowest-mdl norm that makes progress (solves, or peels
    the current first hazard) without trapping anyone.  Gives an upper bound on the
    norm COUNT (it minimizes per-step mdl, so it can over-count)."""
    law, sims = [], 0
    cur = simulate(w, law); sims += 1
    for _ in range(max_norms):
        best = None
        for c in cands:
            r = simulate(w, law + [c]); sims += 1
            if not r[0] and "no-legal-plan" in r[1]:
                continue
            if r[0]:        key = (0, mdl(c))
            elif r[1] != cur[1]: key = (1, mdl(c))
            else:           continue
            if best is None or key < best[0]:
                best = (key, c, r)
        if best is None:
            return {"law": None, "sims": sims}
        law.append(best[1]); cur = best[2]
        if cur[0]:
            return {"law": law, "sims": sims}
    return {"law": None, "sims": sims}

def minimal_normset(w, max_norms=6, max_len=3, fixed_vocab=True):
    """Minimise the NUMBER of shared norms (then total mdl) to reach the optimum.
    Strategy: a greedy pass gives an upper bound G on the count; then exhaustively
    check whether a strictly smaller count works (combination search over the
    'safe' candidates — those that don't trap any agent and actually fire)."""
    cands = candidate_norms(w, max_len, fixed_vocab=fixed_vocab)
    sims = 0
    if simulate(w, [])[0]:
        return {"law": [], "k": 0, "mdl": 0, "search_cost": 1, "space": len(cands)}
    g = _greedy(w, cands); sims += g["sims"]
    G = len(g["law"]) if g["law"] is not None else max_norms + 1
    safe = []
    for c in cands:
        r = simulate(w, [c]); sims += 1
        if (not r[0] and "no-legal-plan" in r[1]):
            continue
        # Dynamic norms may only fire during synchronous execution when another
        # agent contests the same move/use target.  Static situation enumeration
        # sets contested=False, so keep dynamic candidates even when the static
        # lower-bound firing count is zero.
        if is_dynamic(c) or fires_rate(w, c)[0] > 0:
            safe.append(c)
    for k in range(1, G):
        best = None
        for combo in combinations(safe, k):
            sims += 1
            if simulate(w, list(combo))[0]:
                m = sum(mdl(n) for n in combo)
                if best is None or m < best[0]:
                    best = (m, list(combo))
        if best:
            return {"law": best[1], "k": k, "mdl": best[0], "search_cost": sims, "space": len(cands)}
    law = g["law"]
    return {"law": law, "k": (len(law) if law else None),
            "mdl": (sum(mdl(n) for n in law) if law else None),
            "search_cost": sims, "space": len(cands)}

# ============================================================ QUANTIFY
def _dims(w):
    R = max(r for r, c in w.walls) + 1
    C = max(c for r, c in w.walls) + 1
    return R, C

def _move_situations(w):
    """All (agent, dest_cell, dir) a robot could attempt."""
    R, C = _dims(w)
    for a in w.agents:
        for r in range(R):
            for cc in range(C):
                if not w.passable((r, cc)):
                    continue
                for d in DIRS:
                    yield make_ctx(w, a, "MOVE", cell=(r, cc), move_dir=d, contested=False)

def _pick_situations(w):
    for a in w.agents:
        for it in w.items.values():
            for scanned in (False, True):
                snap = Item(it.id, it.cell, it.colour, it.hazardous, scanned)
                yield make_ctx(w, a, "PICK", cell=it.cell, item=snap, contested=False)

def _use_situations(w):
    for a in w.agents:
        for m in w.machines.values():
            yield make_ctx(w, a, "USE", cell=a.pos, machine=m, contested=False)

def fires_rate(w, norm):
    """Fraction of action situations where the norm's condition holds.
    For coordination norms this is a static lower bound (they also need contention)."""
    tot = hit = 0
    if norm[0] == "MOVE":
        situations = _move_situations(w)
    elif norm[0] == "PICK":
        situations = _pick_situations(w)
    elif norm[0] == "USE":
        situations = _use_situations(w)
    else:
        situations = []
    for ctx in situations:
        tot += 1
        if norm_forbids(norm, ctx):
            hit += 1
    return hit, tot

def quantify(w, norm, law, fixed_vocab=True):
    hit, tot = fires_rate(w, norm)
    rest = hit                                   # restrictiveness = #forbidden situations
    redundant = simulate(w, [n for n in law if n is not norm])[0]
    # over-restriction: can we ADD a literal, still solve, and forbid strictly fewer?
    pool = literal_pool(w, fixed=fixed_vocab, action=norm[0])
    best_over = 0
    for lit in pool:
        if lit in norm[1] or not _consistent(norm[1] + [lit]):
            continue
        tighter = (norm[0], norm[1] + [lit])
        newlaw = [tighter if n is norm else n for n in law]
        if simulate(w, newlaw)[0]:
            h2, _ = fires_rate(w, tighter)
            best_over = max(best_over, rest - h2)
    return {"mdl": mdl(norm), "fires": hit, "of": tot, "restrictiveness": rest,
            "necessary": not redundant, "over_restriction": best_over}

# ============================================================ CLASSIFY
def classify(norm):
    preds = [p for p, v in norm[1]]
    coordination = any(p in ("contested", "move_dir") for p in preds)
    refs = set()
    for p in preds:
        if p in ("dest_zone",): refs.add("target")
        elif p in ("carrying", "role", "role_not", "no_permit"): refs.add("self")
        elif p in ("contested", "move_dir"): refs.add("context")
        elif p in ("item_colour", "item_unscanned"): refs.add("object")
        elif p in ("machine",): refs.add("resource")
    if coordination:
        itype = "resource coordination" if norm[0] == "USE" else "spatial coordination"
    elif norm[0] == "PICK" and "item_unscanned" in preds:
        itype = "precondition / sequencing"
    elif norm[0] == "USE":
        itype = "resource access"
    elif "dest_zone" in preds and "carrying" in preds:
        itype = "contamination / protection"
    elif "dest_zone" in preds:
        itype = "access / zone"
    else:
        itype = "other"
    if norm[0] == "PICK":
        character = "precondition (temporal)"
    elif coordination:
        character = "coordination (relational)"
    else:
        character = "protection (harm-based)"
    return {"character": character,
            "interference": itype, "refers_to": sorted(refs)}

# ============================================================ SPECTRUM + REPORT
def spectrum():
    cfg = [
        ("L1 外部性保护",              generate_externality_simple),
        ("L2 精度压力",                generate_externality_precision),
        ("L3 清洁工例外",              generate_externality_exception),
        ("L4 路口让行",                generate_crossing),
        ("L5 资源分配",                generate_resource_contention),
        ("L6 污染诱发路口",            generate_induced_crossing),
        ("L7 例外+诱发路口",           generate_exception_induced_crossing),
        ("L8 综合社会仓库",            generate_integrated_social_warehouse),
    ]
    print("=" * 78)
    print("COMPLEXITY SPECTRUM  (generator -> solver)")
    print("=" * 78)
    print(f"  {'scenario':<28}{'agents':>7}{'#norms':>8}{'totMDL':>8}{'searchCost':>12}{'|C|':>7}")
    print("  " + "-" * 70)
    for label, make_world in cfg:
        w = make_world()
        s = minimal_normset(w)
        print(f"  {label:<28}{len(w.agents):>7}{str(s['k']):>8}{str(s['mdl']):>8}"
              f"{s['search_cost']:>12}{s['space']:>7}")

def detail():
    w = generate_integrated_social_warehouse()
    s = minimal_normset(w)
    print("\n" + "=" * 78)
    print(f"PER-CONSTRAINT QUANTIFY + CLASSIFY  —  scenario: {w.name}")
    print("=" * 78)
    print(f"  minimal shared norm-set: {s['k']} norms, total mdl={s['mdl']}, "
          f"search cost={s['search_cost']} (of {s['space']} candidates)\n")
    for n in s["law"]:
        q = quantify(w, n, s["law"])
        c = classify(n)
        print(f"  {norm_str(n)}")
        print(f"      mdl={q['mdl']}  fires {q['fires']}/{q['of']} situations  "
              f"restrictiveness={q['restrictiveness']}  necessary={q['necessary']}  "
              f"over-restriction={q['over_restriction']}")
        print(f"      type={c['interference']} | character={c['character']} | "
              f"refers={c['refers_to']}\n")

if __name__ == "__main__":
    spectrum()
    detail()
