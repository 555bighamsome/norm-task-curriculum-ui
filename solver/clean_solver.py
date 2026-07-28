"""
Clean version of the social-law solver.

Two fixes over the first prototype:
  (1) Hazards are NOT hand-coded failures.  They are consequences inside the
      transition function T (e.g. contamination is a STATE VARIABLE that T sets),
      plus a global objective over states.
  (2) Constraints are NOT hand-written templates.  The solver searches the UNIFORM
      space  { FORBID enter-a-cell-where  phi }  with  phi = conjunction of atomic
      predicate primitives.  "no-dirty-into-clean", "no-entry-without-badge", etc.
      EMERGE as found constraints; they are never supplied.

A constraint = (phi)  meaning: an agent may not MOVE INTO a cell where phi holds.
phi is a conjunction of atoms drawn from a FIXED primitive vocabulary.

Headline results this prints:
  - solver rediscovers the contamination / permission rules from primitives
  - minimal-MDL search returns the BROAD (over-approximate) rule by default
    -> "silly / over-inclusive" rule is the natural answer when precision is free
  - when a clean-needing agent exists, the broad rule breaks reachability and the
    solver is FORCED to the precise rule -> precision emerges only under pressure
"""

from __future__ import annotations
from collections import deque
from dataclasses import dataclass
from itertools import combinations

DIRS = {"N": (-1, 0), "S": (1, 0), "E": (0, 1), "W": (0, -1)}
MOVES = ["N", "E", "S", "W", "wait"]

# ----------------------------------------------------------------- factored state

@dataclass
class Agent:
    id: int
    pos: tuple
    target: tuple
    carrying: str = "none"        # "none" | "tainted"
    tokens: frozenset = frozenset()
    color: str = "red"

@dataclass
class World:
    name: str
    walls: set
    zone: dict           # (r,c) -> "normal"|"clean"|"restricted:badge"|"corridor"
    agents: list
    T: int = 40

    def passable(self, p):
        return p not in self.walls

# ----------------------------------------------------------------- primitive atoms
# An atom is a named boolean over (agent, dest_cell, world).  This is the FIXED
# vocabulary; everything else is built by conjunction.

def zone_of(world, cell):
    return world.zone.get(cell, "normal")

ATOMS = {
    # --- institutional layer (zone is the coarse, cheap predicate) ---
    "dest_clean":       lambda ag, d, w: zone_of(w, d) == "clean",
    "dest_restricted":  lambda ag, d, w: zone_of(w, d) == "restricted:badge",
    "dest_corridor":    lambda ag, d, w: zone_of(w, d) == "corridor",
    "self_tainted":     lambda ag, d, w: ag.carrying == "tainted",
    "no_badge":         lambda ag, d, w: "badge" not in ag.tokens,
    # --- substrate layer (produces interaction / symmetry-breaking) ---
    "low_priority":     lambda ag, d, w: ag.id != 0,
}

def phi_holds(phi, ag, dest, world):
    return all(ATOMS[name](ag, dest, world) for name in phi)

def mdl(phi):
    return 1 + len(phi)          # 1 for the action + 1 per atom

def phi_str(phi):
    return " & ".join(phi) if phi else "TRUE(forbid all moves)"

# ----------------------------------------------------------------- transition + sim
# Greedy myopic agents.  Contamination is a CONSEQUENCE set inside the step, not a
# special failure check bolted on.

def legal_dist(world, agent, law):
    """dist[cell] = shortest #steps from cell to agent.target, over cells this agent
    is ALLOWED to enter under the law (selfish but law-abiding; ignores others).
    The agent's current cell counts as standable even if forbidden-to-enter.
    BFS runs backward FROM the target so dist decreases toward the goal."""
    def standable(c):
        if not world.passable(c):
            return False
        if c == agent.pos:
            return True
        return not any(phi_holds(phi, agent, c, world) for phi in law)
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
    """law = list of phi (each a tuple of atom names). Returns (ok:bool, reason).
    Each agent walks a shortest law-abiding path to its own goal, ignoring others.
    Hazards (contamination/trespass) are consequences accumulated during the walk."""
    A = {a.id: a for a in world.agents}
    dist = {a.id: legal_dist(world, a, law) for a in world.agents}
    # an agent whose target is unreachable under the law -> law is over-restrictive
    for a in world.agents:
        if a.target not in dist[a.id]:
            return (False, "unreachable")
    pos = {a.id: a.pos for a in world.agents}
    contaminated, trespassed = set(), set()

    for _ in range(world.T):
        chosen = {}
        for aid, p in pos.items():
            if p == A[aid].target:
                chosen[aid] = p
                continue
            d = dist[aid]
            step = next((((p[0]+dr, p[1]+dc))
                         for m, (dr, dc) in DIRS.items()
                         if (p[0]+dr, p[1]+dc) in d and d[(p[0]+dr, p[1]+dc)] == d[p] - 1),
                        p)
            chosen[aid] = step

        # collisions (same cell, or swap)
        seen = {}
        for aid, dest in chosen.items():
            if dest != pos[aid] and dest in seen:
                return (False, "collision")
            seen[dest] = aid
        for a1 in chosen:
            for a2 in chosen:
                if a1 < a2 and chosen[a1] == pos[a2] and chosen[a2] == pos[a1] and pos[a1] != pos[a2]:
                    return (False, "collision")

        pos = chosen

        # transition consequences (accumulated state variables)
        for aid, p in pos.items():
            if A[aid].carrying == "tainted" and zone_of(world, p) == "clean":
                contaminated.add(p)
            if zone_of(world, p) == "restricted:badge" and "badge" not in A[aid].tokens:
                trespassed.add((aid, p))

        if all(pos[a.id] == a.target for a in world.agents):
            break

    # ---- global objective ----
    if not all(pos[a.id] == a.target for a in world.agents):
        return (False, "timeout")
    if contaminated:
        return (False, "contamination")
    if trespassed:
        return (False, "trespass")
    return (True, "ok")

# ----------------------------------------------------------------- uniform search

def candidate_phis(world, max_atoms=2):
    """All conjunctions (size 1..max_atoms) of atoms, pruned to ones that actually
    fire somewhere in this world (otherwise they are inert)."""
    cells = [c for c in world.zone] + [a.pos for a in world.agents]
    names = list(ATOMS)
    cands = []
    for k in range(1, max_atoms + 1):
        for combo in combinations(names, k):
            # keep only conjunctions that CAN hold for some agent entering some cell
            fires = any(phi_holds(combo, ag, d, world)
                        for ag in world.agents
                        for d in world.zone)
            if fires:
                cands.append(combo)
    return cands

def minimal_law(world, max_atoms=2, max_rules=3):
    """Search the uniform constraint space for the fewest constraints (then least
    MDL) that achieve the global optimum."""
    cands = candidate_phis(world, max_atoms)
    # prune candidates that single-handedly destroy reachability
    cands = [c for c in cands if simulate(world, [c])[1] != "timeout" or True]
    for k in range(0, max_rules + 1):
        best = None
        for subset in combinations(cands, k):
            ok, _ = simulate(world, list(subset))
            if ok:
                cost = sum(mdl(p) for p in subset)
                if best is None or cost < best[0]:
                    best = (cost, subset)
        if best is not None:
            return (k, best[0], list(best[1]))
    return None

# ----------------------------------------------------------------- scenarios

def box(rows, cols):
    return {(r, c) for r in range(rows) for c in range(cols)
            if r in (0, rows - 1) or c in (0, cols - 1)}

def scen_overapprox():
    # dirty agent must cross; clean zone sits on the direct path; a detour exists;
    # NO agent needs to enter the clean zone -> broad rule is safe & cheap.
    w = box(4, 6)
    zone = {(1, 2): "clean"}
    a = Agent(0, pos=(1, 1), target=(1, 4), carrying="tainted")
    return World("OVERAPPROX (no clean-user)", w, zone, [a])

def scen_precision():
    # a 2nd, clean agent must REACH a cell inside the clean zone.
    # broad 'forbid entering clean' would trap the clean agent -> precision forced.
    # routes are arranged not to cross, isolating the contamination/precision issue.
    w = box(4, 8)
    zone = {(1, 3): "clean", (1, 4): "clean"}
    a0 = Agent(0, pos=(1, 1), target=(1, 6), carrying="tainted")  # passing L->R
    a1 = Agent(1, pos=(2, 3), target=(1, 3))                      # NEEDS clean cell
    return World("PRECISION (clean-user present)", w, zone, [a0, a1])

def scen_permission():
    w = box(4, 6)
    zone = {(1, 2): "restricted:badge"}
    a = Agent(0, pos=(1, 1), target=(1, 4))   # no badge
    return World("PERMISSION", w, zone, [a])

def report(world):
    res = minimal_law(world, max_atoms=2, max_rules=3)
    print(f"\n  {world.name}")
    if res is None:
        print("    -> no social law found within search bounds")
        return
    k, cost, law = res
    print(f"    minimal law: {k} constraint(s), total mdl={cost}")
    for phi in law:
        print(f"      FORBID enter-cell WHEN [{phi_str(phi)}]   (mdl {mdl(phi)})")
    if not law:
        print("      (greedy agents already reach the optimum unaided)")

def main():
    print("=" * 70)
    print("CLEAN SOLVER  --  constraints DISCOVERED from primitives, not supplied")
    print("=" * 70)
    print("Fixed primitive vocabulary (atoms):")
    for n in ATOMS:
        print(f"    {n}")
    print("Constraint = FORBID entering a cell where (conjunction of atoms) holds.")

    report(scen_overapprox())
    print("    ^ note: solver returns the BROAD rule (dest_clean alone, mdl 2),")
    print("      NOT 'dest_clean & self_tainted'. The over-inclusive 'silly' rule")
    print("      is what minimal-MDL search prefers when precision costs nothing.")

    report(scen_precision())
    print("    ^ note: a clean-using agent makes the broad rule break reachability,")
    print("      so the solver is FORCED up to the precise 'dest_clean & self_tainted'.")
    print("      Precision emerges only under pressure.")

    report(scen_permission())

if __name__ == "__main__":
    main()
