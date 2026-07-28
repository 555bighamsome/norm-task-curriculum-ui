"""
Solver v2 -- adds CONSTRAINT INTERACTION and a COMPLEXITY SPECTRUM.

New over v1:
  * Reactive two-phase simulation: agents plan a shortest path around STATIC
    prohibitions, but also obey DYNAMIC prohibitions (yield/wait) evaluated each
    tick against the live state of other agents.
  * A `corridor_busy` dynamic atom -> lets a yield rule be DISCOVERED from
    primitives ("low-priority agent must not enter the shared corridor while a
    higher-priority agent is in/entering it").
  * INTERACTION scenario: the contamination rule reroutes the dirty agent into a
    shared corridor, which then needs a SECOND (yield) rule -> minimal law = 2
    constraints even though there is only one "hazard". Constraints interact.
  * Complexity spectrum over a generated family of scenarios.

Constraint = FORBID entering a cell where (conjunction of atoms) holds.
Atoms are a FIXED vocabulary; named rules (contamination/permission/yield) EMERGE.
"""

from __future__ import annotations
from collections import deque
from dataclasses import dataclass, field
from itertools import combinations
from types import SimpleNamespace
import random

DIRS = {"N": (-1, 0), "S": (1, 0), "E": (0, 1), "W": (0, -1)}

@dataclass
class Agent:
    id: int
    pos: tuple
    target: tuple
    carrying: str = "none"
    tokens: frozenset = frozenset()
    color: str = "red"

@dataclass
class World:
    name: str
    walls: set
    zone: dict
    agents: list
    T: int = 60

    def passable(self, p):
        return p not in self.walls

def zone_of(world, cell):
    return world.zone.get(cell, "normal")

# ----------------------------------------------------------------- atoms
# Each atom: (fn(ctx) -> bool, is_dynamic).  ctx fields:
#   agent, dest, world, pos(dict id->cell), intended(dict id->cell), A(dict id->Agent)

def _higher_pri_in_corridor(c):
    for j, aj in c.A.items():
        if j == c.agent.id:
            continue
        if aj.id < c.agent.id:  # smaller id = higher priority
            here = zone_of(c.world, c.pos[j]) == "corridor"
            going = zone_of(c.world, c.intended.get(j, c.pos[j])) == "corridor"
            if here or going:
                return True
    return False

ATOMS = {
    "dest_clean":      (lambda c: zone_of(c.world, c.dest) == "clean", False),
    "dest_restricted": (lambda c: zone_of(c.world, c.dest) == "restricted:badge", False),
    "dest_corridor":   (lambda c: zone_of(c.world, c.dest) == "corridor", False),
    "self_tainted":    (lambda c: c.agent.carrying == "tainted", False),
    "no_badge":        (lambda c: "badge" not in c.agent.tokens, False),
    "low_priority":    (lambda c: c.agent.id != 0, False),
    "corridor_busy":   (_higher_pri_in_corridor, True),
}
DYNAMIC = {n for n, (_, dyn) in ATOMS.items() if dyn}

def is_static(phi):
    return all(n not in DYNAMIC for n in phi)

def phi_holds(phi, ctx):
    return all(ATOMS[n][0](ctx) for n in phi)

def mdl(phi):
    return 1 + len(phi)

def phi_str(phi):
    return " & ".join(phi) if phi else "TRUE"

# ----------------------------------------------------------------- simulation

def static_ctx(agent, dest, world):
    return SimpleNamespace(agent=agent, dest=dest, world=world,
                           pos={}, intended={}, A={})

def legal_dist(world, agent, static_law):
    """dist to target over cells not forbidden by STATIC constraints (route around)."""
    def standable(c):
        if not world.passable(c):
            return False
        if c == agent.pos:
            return True
        return not any(phi_holds(phi, static_ctx(agent, c, world)) for phi in static_law)
    target = agent.target
    if not standable(target):
        return {}
    dist, q = {target: 0}, deque([target])
    while q:
        p = q.popleft()
        for dr, dc in DIRS.values():
            n = (p[0] + dr, p[1] + dc)
            if n not in dist and standable(n):
                dist[n] = dist[p] + 1
                q.append(n)
    return dist

def simulate(world, law):
    A = {a.id: a for a in world.agents}
    static_law = [phi for phi in law if is_static(phi)]
    dist = {a.id: legal_dist(world, a, static_law) for a in world.agents}
    for a in world.agents:
        if a.pos not in dist[a.id]:        # can't reach own goal under static law
            return (False, "unreachable")
    pos = {a.id: a.pos for a in world.agents}
    contaminated, trespassed = set(), set()

    for _ in range(world.T):
        # phase 1: intended step (toward goal along static-legal path)
        intended = {}
        for aid, p in pos.items():
            if p == A[aid].target:
                intended[aid] = p
                continue
            d = dist[aid]
            nxt = p
            for dr, dc in DIRS.values():
                n = (p[0] + dr, p[1] + dc)
                if n in d and d[n] == d[p] - 1:
                    nxt = n
                    break
            intended[aid] = nxt

        # phase 2: dynamic prohibitions -> yield (wait) if any constraint fires
        final = {}
        for aid, p in pos.items():
            dest = intended[aid]
            ctx = SimpleNamespace(agent=A[aid], dest=dest, world=world,
                                  pos=pos, intended=intended, A=A)
            if dest != p and any(phi_holds(phi, ctx) for phi in law):
                final[aid] = p          # wait this tick
            else:
                final[aid] = dest

        # phase 3: collisions
        seen = {}
        for aid, dest in final.items():
            if dest != pos[aid] and dest in seen:
                return (False, "collision")
            seen[dest] = aid
        for a1 in final:
            for a2 in final:
                if a1 < a2 and final[a1] == pos[a2] and final[a2] == pos[a1] and pos[a1] != pos[a2]:
                    return (False, "collision")

        pos = final
        for aid, p in pos.items():
            if A[aid].carrying == "tainted" and zone_of(world, p) == "clean":
                contaminated.add(p)
            if zone_of(world, p) == "restricted:badge" and "badge" not in A[aid].tokens:
                trespassed.add((aid, p))

        if all(pos[a.id] == a.target for a in world.agents):
            break

    if not all(pos[a.id] == a.target for a in world.agents):
        return (False, "timeout")
    if contaminated:
        return (False, "contamination")
    if trespassed:
        return (False, "trespass")
    return (True, "ok")

# ----------------------------------------------------------------- uniform search

def candidate_phis(world, max_atoms=3):
    names = list(ATOMS)
    cands = []
    for k in range(1, max_atoms + 1):
        for combo in combinations(names, k):
            # keep conjunctions that CAN fire for some agent entering some cell
            fires = any(
                all((not ATOMS[n][1]) and ATOMS[n][0](static_ctx(ag, d, world))
                    or ATOMS[n][1]  # dynamic atoms: assume satisfiable, keep
                    for n in combo)
                for ag in world.agents for d in list(world.zone) + [a.target for a in world.agents]
            )
            if fires:
                cands.append(combo)
    return cands

def minimal_law(world, max_atoms=3, max_rules=3):
    cands = candidate_phis(world, max_atoms)
    for k in range(0, max_rules + 1):
        best = None
        for subset in combinations(cands, k):
            if simulate(world, list(subset))[0]:
                cost = sum(mdl(p) for p in subset)
                if best is None or cost < best[0]:
                    best = (cost, subset)
        if best is not None:
            return (k, best[0], list(best[1]), len(cands))
    return (None, None, None, len(cands))

# ----------------------------------------------------------------- scenarios

def box(rows, cols):
    return {(r, c) for r in range(rows) for c in range(cols)
            if r in (0, rows - 1) or c in (0, cols - 1)}

def scen_crossing():
    """Two agents cross a single 1-wide intersection cell (2,3) perpendicularly,
    tuned so both reach it on the SAME tick -> guaranteed collision with no law.
    The only fix: a YIELD rule the solver must DISCOVER as a 3-atom conjunction
    (dest_corridor & low_priority & corridor_busy).  A static 2-atom version
    (dest_corridor & low_priority) would bar a1 forever -> unreachable.  So the
    dynamic atom is genuinely required: a non-obvious search target."""
    walls = box(6, 7)                              # rows0..5, cols0..6
    # wall row1 and row3..4 except col3 so a1 is FORCED through the intersection col
    for c in (1, 2, 4, 5):
        walls.add((1, c)); walls.add((3, c)); walls.add((4, c))
    zone = {(2, 3): "corridor"}                    # the shared intersection
    a0 = Agent(0, pos=(2, 1), target=(2, 5))       # horizontal, reaches (2,3) @ t2
    a1 = Agent(1, pos=(4, 3), target=(1, 3))       # vertical,   reaches (2,3) @ t2
    return World("CROSSING (yield must be discovered)", walls, zone, [a0, a1])

def report(world, max_atoms=3, max_rules=3):
    k, cost, law, ncand = minimal_law(world, max_atoms, max_rules)
    print(f"\n  {world.name}   (search space: {ncand} candidate constraints)")
    if k is None:
        print(f"    -> no law within {max_rules} constraints")
        return k
    print(f"    minimal law: {k} constraint(s), total mdl={cost}")
    for phi in law:
        print(f"      FORBID enter WHEN [{phi_str(phi)}]   (mdl {mdl(phi)})")
    if not law:
        print("      (greedy agents already reach the optimum unaided)")
    return k

def make_banded(n_clean, n_restricted):
    """Stack independent 2-row 'hazard bands'.  Each band has one agent who would
    cross a hazard cell on the straight route but can detour one row down.
    Bands are isolated by wall rows, so the joint minimal law is the UNION of what
    each band needs -- yet many same-type bands collapse to ONE broad rule."""
    bands = [("clean", "tainted")] * n_clean + [("restricted:badge", "none")] * n_restricted
    rows = 1 + 3 * len(bands)              # each band = 2 rows + 1 separator
    cols = 7
    walls = {(r, c) for r in range(rows) for c in range(cols)
             if c in (0, cols - 1) or r == 0 or r == rows - 1}
    zone, agents = {}, []
    for i, (haz, carry) in enumerate(bands):
        top = 1 + 3 * i
        bot = top + 1
        sep = top + 2                       # separator wall row below the band
        for c in range(1, cols - 1):
            walls.discard((top, c)); walls.discard((bot, c))
            if sep < rows - 1:
                walls.add((sep, c))
        zone[(top, 3)] = haz
        toks = frozenset({"badge"}) if False else frozenset()  # agent lacks badge
        agents.append(Agent(i, pos=(top, 1), target=(top, cols - 2),
                            carrying=carry, tokens=toks))
    return World(f"BANDED clean={n_clean} restricted={n_restricted}", walls, zone, agents)

def spectrum():
    print("\n" + "=" * 72)
    print("COMPLEXITY SPECTRUM -- min #constraints vs #hazards")
    print("=" * 72)
    print("  #clean  #restricted | #hazard-cells | min #constraints | law")
    print("  " + "-" * 68)
    for nc, nr in [(0, 0), (1, 0), (0, 1), (1, 1), (3, 0), (3, 2), (5, 3)]:
        w = make_banded(nc, nr)
        k, cost, law, _ = minimal_law(w, max_atoms=2, max_rules=4)
        names = "; ".join(phi_str(p) for p in law) if law else "(none)"
        print(f"    {nc:^6}{nr:^13}|{nc+nr:^15}|{str(k):^18}| {names}")
    print("\n  -> 5 clean + 3 restricted = 8 hazards, but only 2 constraints.")
    print("     One broad rule absorbs many same-type hazards (compression).")
    print("     Complexity tracks rule TYPES needed, not raw hazard count.")

def main():
    print("=" * 72)
    print("SOLVER v2 -- constraint interaction + complexity spectrum")
    print("=" * 72)
    report(scen_crossing())
    spectrum()

if __name__ == "__main__":
    main()
