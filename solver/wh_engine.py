"""
Warehouse multi-agent social-norm engine  (full build, part A+B).

A norm is a SHARED, UNIVERSAL constraint:  FORBID <action> WHEN <conjunction of
literals>, applied to every agent that matches.  Agents are greedy/selfish: each
computes the shortest LEGAL plan to its own goal (ignoring others), then they all
execute synchronously; dynamic norms (those referencing other agents) cause
yields at execution time.

Goals:   reach(T) | deliver(item -> T) | operate(machine station)
Hazards (consequences inside the transition, not hand-coded per-rule failures):
   collision | pollution | incident(pick hazardous unscanned) |
   jam(enter a machine station without permit) |
   resource-conflict(two enter one machine station at once)
"""
from __future__ import annotations
from collections import deque
from dataclasses import dataclass, field
from heapq import heappop, heappush
from itertools import count
from types import SimpleNamespace

DIRS = {"N": (-1, 0), "S": (1, 0), "E": (0, 1), "W": (0, -1)}

# ----------------------------------------------------------------- entities
@dataclass
class Item:
    id: str
    cell: tuple
    colour: str = "plain"        # plain | red | blue
    hazardous: bool = False
    scanned: bool = False

@dataclass
class Machine:
    id: str
    cell: tuple
    needs_permit: bool = False
    setup_role: str | None = None

@dataclass
class Goal:
    kind: str                    # reach | deliver | operate
    target: object = None        # cell (reach) | (item_id, dropoff) (deliver) | machine_id (operate)

@dataclass
class Agent:
    id: int
    pos: tuple
    goal: Goal
    role: str = "worker"
    colour: str = "grey"
    carrying: str = "none"       # none | tainted (a contaminant carried from the start)
    tokens: frozenset = frozenset()

@dataclass
class World:
    name: str
    walls: set
    zone: dict                   # cell -> zone tag (e.g. "cold","aisle")
    agents: list
    items: dict = field(default_factory=dict)
    machines: dict = field(default_factory=dict)
    scanners: set = field(default_factory=set)
    protected: list = field(default_factory=lambda: [("cold", "tainted")])
    one_way: dict = field(default_factory=dict)  # cell -> allowed direction
    T: int = 60
    def passable(self, p): return p not in self.walls
    def can_move(self, current, target, direction):
        if not self.passable(target):
            return False
        required = self.one_way.get(current)
        return required is None or required == direction

def zone_of(w, c): return w.zone.get(c, "normal")

# ----------------------------------------------------------------- norm language
# literal = (pred, value[, negated]).  ctx exposes everything a predicate may read.
def unpack_literal(literal):
    if len(literal) == 2:
        pred, val = literal
        return pred, val, False
    pred, val, negated = literal
    return pred, val, bool(negated)

def atom(ctx, pred, val):
    if pred == "target_type":
        if val == "machine":
            return any(machine.cell == ctx.cell for machine in ctx.world.machines.values())
        return zone_of(ctx.world, ctx.cell) == val
    if pred == "dest_zone":        return zone_of(ctx.world, ctx.cell) == val
    if pred == "role":             return ctx.agent.role == val
    if pred == "role_not":         return ctx.agent.role != val
    if pred == "colour":           return ctx.agent.colour == val
    if pred == "carrying":
        if val == "spill":
            return ctx.agent.carrying in ("spill", "tainted")
        return ctx.agent.carrying == val
    if pred == "no_permit":        return "permit" not in ctx.agent.tokens
    if pred == "item_colour":      return ctx.item and ctx.item.colour == val
    if pred == "item_unscanned":   return ctx.item and not ctx.item.scanned
    if pred == "machine":          return ctx.machine and ctx.machine.id == val
    if pred == "move_dir":         return ctx.move_dir == val
    if pred == "contested":        return ctx.contested == bool(val)
    raise ValueError(pred)

def norm_forbids(norm, ctx):
    action, lits = norm
    if action != ctx.action:
        return False
    return all(atom(ctx, p, v) != negated
               for p, v, negated in (unpack_literal(lit) for lit in lits))

def is_dynamic(norm):
    return any(unpack_literal(lit)[0] == "contested" for lit in norm[1])

def norm_str(norm):
    a, lits = norm
    parts = []
    for literal in lits:
        pred, val, negated = unpack_literal(literal)
        parts.append(f"{pred}{'!=' if negated else '='}{val}")
    return f"FORBID {a} WHEN [{' & '.join(parts) or 'always'}]"

# ----------------------------------------------------------------- per-agent planner
# Augmented-state BFS to a goal, pruning STATIC-forbidden actions.  Ignores others.
def make_ctx(world, agent, action, cell=None, item=None, machine=None, move_dir=None, contested=False):
    return SimpleNamespace(world=world, agent=agent, action=action, cell=cell,
                           item=item, machine=machine, move_dir=move_dir, contested=contested)

def static_forbidden(world, agent, static_norms, action, **kw):
    ctx = make_ctx(world, agent, action, **kw)
    return any(norm_forbids(n, ctx) for n in static_norms)

def plan(world, agent, static_norms):
    """Return a minimum-step, minimum-turn legal plan, or None.

    Step count is optimized first. Among equally short plans, robots prefer the
    route with fewer turns. This makes route choice stable without exposing an
    arbitrary direction-enumeration order to participants.

    A robot operates a machine by moving onto its station.
    step = ('move', cell) | ('scan', item_id) | ('pick', item_id)."""
    g = agent.goal
    # snapshot scanned state of the relevant item
    item = world.items.get(g.target[0]) if g.kind == "deliver" else None
    scanned0 = item.scanned if item else False

    def goal_test(s):
        cell, has_item, used, _, _ = s
        if g.kind == "reach":   return cell == g.target
        if g.kind == "deliver": return has_item and cell == g.target[1]
        if g.kind == "operate": return cell == world.machines[g.target].cell
        return False

    # state = (cell, has_item, used, scanned, previous_move_direction)
    init = (agent.pos, False, False, scanned0, None)
    serial = count()
    best = {init: (0, 0)}
    prev = {init: None}
    q = [(0, 0, next(serial), init)]
    goal_state = None
    while q:
        steps_so_far, turns_so_far, _, s = heappop(q)
        if best.get(s) != (steps_so_far, turns_so_far):
            continue
        cell, has_item, used, scanned, heading = s
        if goal_test(s):
            goal_state = s; break
        succ = []
        # moves
        for d, (dr, dc) in DIRS.items():
            n = (cell[0] + dr, cell[1] + dc)
            if world.can_move(cell, n, d) and not static_forbidden(world, agent, static_norms,
                                                           "MOVE", cell=n, move_dir=d):
                turn = int(heading is not None and heading != d)
                succ.append((("move", n), (n, has_item, used, scanned, d), turn))
        # scan (deliver only): at a scanner, mark item scanned
        if g.kind == "deliver" and cell in world.scanners and not scanned:
            succ.append((("scan", item.id), (cell, has_item, used, True, heading), 0))
        # pick (deliver only): at item cell, if allowed given scanned state
        if g.kind == "deliver" and not has_item and cell == item.cell:
            snap = Item(item.id, item.cell, item.colour, item.hazardous, scanned)
            if not static_forbidden(world, agent, static_norms, "PICK", cell=cell, item=snap):
                succ.append((("pick", item.id), (cell, True, used, scanned, heading), 0))
        for step, ns, added_turn in succ:
            new_cost = (steps_so_far + 1, turns_so_far + added_turn)
            if ns not in best or new_cost < best[ns]:
                best[ns] = new_cost
                prev[ns] = (s, step)
                heappush(q, (*new_cost, next(serial), ns))
    if goal_state is None:
        return None
    steps = []
    s = goal_state
    while prev[s] is not None:
        ps, step = prev[s]
        steps.append(step)
        s = ps
    steps.reverse()
    return steps

# ----------------------------------------------------------------- simulation
def simulate(world, law, trace=False):
    static_norms = [n for n in law if not is_dynamic(n)]
    dyn_norms = [n for n in law if is_dynamic(n)]
    plans, ptr = {}, {}
    # fresh item scanned-state per run
    items = {k: Item(v.id, v.cell, v.colour, v.hazardous, v.scanned) for k, v in world.items.items()}
    w = World(
        name=world.name,
        walls=world.walls,
        zone=world.zone,
        agents=world.agents,
        items=items,
        machines=world.machines,
        scanners=world.scanners,
        protected=world.protected,
        one_way=world.one_way,
        T=world.T,
    )
    for a in w.agents:
        p = plan(w, a, static_norms)
        if p is None:
            if trace:
                f0 = {"pos": {ag.id: list(ag.pos) for ag in w.agents},
                      "carry": {ag.id: ag.carrying for ag in w.agents}, "event": None}
                return (False, f"agent{a.id}:no-legal-plan", [f0])
            return (False, f"agent{a.id}:no-legal-plan")
        plans[a.id] = p; ptr[a.id] = 0
    A = {a.id: a for a in w.agents}
    pos = {a.id: a.pos for a in w.agents}
    carrying = {a.id: a.carrying for a in w.agents}
    released = set()
    prepared_machines = set()
    frames = []
    def snap(ev=None):
        return {"pos": {aid: list(pos[aid]) for aid in pos},
                "carry": {aid: carrying[aid] for aid in pos},
                "released": sorted(released),
                "prepared_machines": sorted(prepared_machines),
                "event": ev}
    def out(ok, reason, ev=None):
        if trace:
            frames.append(snap(ev))
            return (ok, reason, frames)
        return (ok, reason)
    if trace:
        frames.append(snap())

    def done(aid): return ptr[aid] >= len(plans[aid])

    for tick in range(w.T):
        if all(done(aid) for aid in plans):
            return out(True, "ok")
        # A completed machine operation occupies the station for its entry step,
        # then releases it before the next robot moves.
        for aid in plans:
            if done(aid) and A[aid].goal.kind == "operate":
                machine = w.machines[A[aid].goal.target]
                if pos[aid] == machine.cell:
                    released.add(aid)
        # phase 1: each agent's intended step + target
        intend = {}
        for aid in plans:
            if done(aid):
                intend[aid] = ("stay", pos[aid], None); continue
            step = plans[aid][ptr[aid]]
            if step[0] == "move":
                d = next(dd for dd, (dr, dc) in DIRS.items()
                         if (pos[aid][0]+dr, pos[aid][1]+dc) == step[1])
                intend[aid] = ("move", step[1], d)
            else:                              # act in place: scan/pick
                intend[aid] = (step[0], pos[aid], None)
        # A move is contested when another robot intends to enter the same square.
        def target_key(aid):
            kind, cell, d = intend[aid]
            if kind == "move": return ("cell", cell)
            return ("self", aid)
        keys = {aid: target_key(aid) for aid in plans}
        # phase 2: dynamic norms -> yield
        act_block = set()
        for aid in plans:
            if done(aid): continue
            kind, cell, d = intend[aid]
            contested = any(keys[j] == keys[aid] and j != aid for j in plans)
            it = mc = None
            step = plans[aid][ptr[aid]]
            if step[0] in ("pick", "scan"): it = items[step[1]]
            act = {"move": "MOVE", "pick": "PICK", "scan": "SCAN", "stay": "MOVE"}[kind]
            ctx = make_ctx(w, A[aid], act, cell=cell, item=it, machine=mc,
                           move_dir=d, contested=contested)
            if any(norm_forbids(n, ctx) for n in dyn_norms):
                act_block.add(aid)
        # phase 3: resolve moves
        final = dict(pos)
        for aid in plans:
            if done(aid) or aid in act_block: continue
            kind, cell, d = intend[aid]
            if kind == "move":
                final[aid] = cell
        # A machine is operated by entering its station. Two simultaneous entries
        # are a resource conflict, while the same event on ordinary floor is a collision.
        machine_cells = {machine.cell for machine in w.machines.values()}
        entries = {}
        for aid in plans:
            if done(aid) or aid in act_block:
                continue
            kind, cell, _ = intend[aid]
            if kind == "move" and cell in machine_cells:
                entries.setdefault(cell, []).append(aid)
        contested_machine = next((cell for cell, ids in entries.items() if len(ids) > 1), None)
        if contested_machine is not None:
            return out(False, "resource-conflict",
                       {"type": "resource-conflict", "cell": list(contested_machine),
                        "agents": entries[contested_machine]})
        # Any simultaneous co-occupancy is a collision when at least one robot
        # entered the square this step. Check groups rather than insertion order
        # so moving into a stationary robot is handled consistently for all IDs.
        occupants = {}
        for aid, cell in final.items():
            if aid not in released:
                occupants.setdefault(cell, []).append(aid)
        collision_cell = next(
            (
                cell
                for cell, ids in occupants.items()
                if len(ids) > 1 and any(final[aid] != pos[aid] for aid in ids)
            ),
            None,
        )
        if collision_cell is not None:
            return out(
                False,
                "collision",
                {
                    "type": "collision",
                    "cell": list(collision_cell),
                    "agents": occupants[collision_cell],
                },
            )
        for i in plans:
            for j in plans:
                if i in released or j in released:
                    continue
                if i < j and final[i] == pos[j] and final[j] == pos[i] and pos[i] != pos[j]:
                    return out(False, "collision", {"type": "collision", "cell": list(final[i])})
        pos = final
        # phase 4: perform acts + advance + hazards
        for aid in plans:
            if done(aid) or aid in act_block: continue
            step = plans[aid][ptr[aid]]
            if step[0] == "move":
                if pos[aid] == step[1]:
                    machine = next((m for m in w.machines.values() if m.cell == pos[aid]), None)
                    if machine and machine.needs_permit and "permit" not in A[aid].tokens:
                        return out(False, "jam", {"type": "jam", "cell": list(pos[aid])})
                    if machine and machine.setup_role:
                        if (
                            machine.id not in prepared_machines
                            and A[aid].role != machine.setup_role
                        ):
                            return out(
                                False,
                                "machine-order",
                                {
                                    "type": "machine-order",
                                    "cell": list(pos[aid]),
                                    "agent": aid,
                                    "machine": machine.id,
                                    "required_role": machine.setup_role,
                                },
                            )
                        if A[aid].role == machine.setup_role:
                            prepared_machines.add(machine.id)
                    ptr[aid] += 1
            elif step[0] == "scan":
                items[step[1]].scanned = True; ptr[aid] += 1
            elif step[0] == "pick":
                it = items[step[1]]
                if it.hazardous and not it.scanned:
                    return out(False, "incident", {"type": "incident", "cell": list(pos[aid])})
                carrying[aid] = "item"; ptr[aid] += 1
        # pollution: a non-cleaner carrying a protected contaminant onto its zone
        # (a cleaner carrying it into the zone is cleaning, not polluting)
        for aid in plans:
            for ztag, ctag in w.protected:
                if (A[aid].carrying == ctag and A[aid].role != "cleaner"
                        and zone_of(w, pos[aid]) == ztag):
                    return out(False, "pollution:" + ztag,
                               {"type": "pollution", "cell": list(pos[aid])})
        if trace:
            frames.append(snap())
    return out(False, "timeout")
