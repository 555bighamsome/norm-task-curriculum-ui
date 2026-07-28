"""
Warehouse social-norm solver -- design demo.

Demonstrates two things the design hinges on:
  (1) AGENT GOALS: each agent has start + target (+ optional carried item); the
      global objective is "all agents reach their targets with no hazard".
  (2) IDENTICAL AGENTS & symmetry breaking: when two agents are the SAME type,
      a norm that references intrinsic identity (role) CANNOT separate them
      (both yield -> deadlock).  Only a RELATIONAL norm (direction of approach)
      or an ARBITRARY label (colour convention) can break the symmetry.

Norms are SHARED, UNIVERSAL constraints:  FORBID <action> WHEN <condition>,
applied to every agent that matches the condition.  Agents are greedy/selfish.
"""

from __future__ import annotations
from collections import deque
from dataclasses import dataclass
from types import SimpleNamespace

DIRS = {"N": (-1, 0), "S": (1, 0), "E": (0, 1), "W": (0, -1)}
OPP = {"N": "S", "S": "N", "E": "W", "W": "E"}

@dataclass
class Agent:
    id: int
    pos: tuple
    target: tuple
    role: str = "worker"
    colour: str = "grey"
    carrying: str = "none"

@dataclass
class World:
    name: str
    walls: set
    zone: dict                 # cell -> zone tag
    agents: list
    T: int = 40

    def passable(self, p):
        return p not in self.walls

def zone_of(w, c):
    return w.zone.get(c, "normal")

# --------------------------------------------------------------- norm vocabulary
# A literal is a (predicate, value) test on a ctx. ctx exposes: agent, dest,
# move_dir (direction agent is stepping), world, contested (another agent also
# wants `dest` this tick).  A norm = (action, [literals]).

def atom(ctx, pred, val):
    if pred == "dest_zone":   return zone_of(ctx.world, ctx.dest) == val
    if pred == "role":        return ctx.agent.role == val
    if pred == "colour":      return ctx.agent.colour == val
    if pred == "move_dir":    return ctx.move_dir == val            # relational/geometric
    if pred == "contested":   return ctx.contested                 # relational/timing
    raise ValueError(pred)

def forbids(norm, ctx):
    action, lits = norm
    if action != "MOVE":            # this demo only forbids MOVE
        return False
    if ctx.dest == ctx.agent.pos:   # never forbid staying put
        return False
    return all(atom(ctx, p, v) for (p, v) in lits)

def norm_str(norm):
    action, lits = norm
    cond = " & ".join(f"{p}={v}" for p, v in lits) or "always"
    return f"FORBID {action} WHEN [{cond}]"

# --------------------------------------------------------------- reactive sim

def dist_to(world, target):
    d, q = {target: 0}, deque([target])
    while q:
        p = q.popleft()
        for dr, dc in DIRS.values():
            n = (p[0] + dr, p[1] + dc)
            if world.passable(n) and n not in d:
                d[n] = d[p] + 1
                q.append(n)
    return d

def simulate(world, law):
    A = {a.id: a for a in world.agents}
    dist = {a.id: dist_to(world, a.target) for a in world.agents}
    pos = {a.id: a.pos for a in world.agents}
    for _ in range(world.T):
        # phase 1: greedy intended step toward own goal
        intended = {}
        for aid, p in pos.items():
            if p == A[aid].target:
                intended[aid] = p; continue
            best = p
            for d, (dr, dc) in DIRS.items():
                n = (p[0] + dr, p[1] + dc)
                if n in dist[aid] and dist[aid][n] == dist[aid][p] - 1:
                    best = n; break
            intended[aid] = best
        # phase 2: apply shared norms -> yield (wait) if forbidden
        final = {}
        for aid, p in pos.items():
            dest = intended[aid]
            move_dir = next((d for d, (dr, dc) in DIRS.items()
                             if (p[0] + dr, p[1] + dc) == dest), None)
            contested = any(intended[j] == dest for j in intended if j != aid)
            ctx = SimpleNamespace(agent=A[aid], dest=dest, move_dir=move_dir,
                                  world=world, contested=contested)
            final[aid] = p if (dest != p and any(forbids(n, ctx) for n in law)) else dest
        # phase 3: collisions
        seen = {}
        for aid, dest in final.items():
            if dest != pos[aid] and dest in seen:
                return (False, "collision")
            seen[dest] = aid
        for i in final:
            for j in final:
                if i < j and final[i] == pos[j] and final[j] == pos[i] and pos[i] != pos[j]:
                    return (False, "collision")
        pos = final
        if all(pos[a.id] == a.target for a in world.agents):
            return (True, "ok")
    return (False, "deadlock/timeout")

# --------------------------------------------------------------- scenario

def crossing(identical=True):
    """Two agents cross a 1-wide intersection (2,3) perpendicularly, tuned to
    arrive on the SAME tick -> guaranteed symmetric collision.
    a0 goes EAST (approaches from the west); a1 goes NORTH (approaches from south)."""
    walls = {(r, c) for r in range(6) for c in range(7)
             if r in (0, 5) or c in (0, 6)}
    for c in (1, 2, 4, 5):
        walls |= {(1, c), (3, c), (4, c)}        # force a1 through col 3
    zone = {(2, 3): "intersection"}
    if identical:
        a0 = Agent(0, (2, 1), (2, 5), role="worker", colour="grey")
        a1 = Agent(1, (4, 3), (1, 3), role="worker", colour="grey")
    else:
        a0 = Agent(0, (2, 1), (2, 5), role="carrier",    colour="red")
        a1 = Agent(1, (4, 3), (1, 3), role="maintenance", colour="blue")
    return World("crossing", walls, zone, [a0, a1])

def main():
    print("=" * 70)
    print("AGENT GOALS + IDENTICAL-AGENT SYMMETRY")
    print("=" * 70)
    w = crossing(identical=True)
    print("Two IDENTICAL agents (both role=worker, colour=grey).")
    print("Goals: a0 reach (2,5) going east; a1 reach (1,3) going north.")
    print("They hit the intersection (2,3) on the same tick.\n")
    print(f"  {'no law':<46}: {simulate(w, [])}")

    # a real yield norm is RELATIONAL: yield only WHEN the cell is contested.
    role_norm = ("MOVE", [("dest_zone", "intersection"), ("contested", True), ("role", "worker")])
    geom_norm = ("MOVE", [("dest_zone", "intersection"), ("contested", True), ("move_dir", "N")])

    print(f"  identity norm: {norm_str(role_norm)}")
    print(f"      -> {simulate(w, [role_norm])}   (both are workers: both yield -> nobody moves)\n")
    print(f"  relational norm: {norm_str(geom_norm)}")
    print(f"      -> {simulate(w, [geom_norm])}   (only the northbound one yields; works on identical agents)\n")

    print("Now make the two agents DISTINGUISHABLE (different role & colour):")
    w2 = crossing(identical=False)
    colour_norm = ("MOVE", [("dest_zone", "intersection"), ("contested", True), ("colour", "blue")])
    rn          = ("MOVE", [("dest_zone", "intersection"), ("contested", True), ("role", "maintenance")])
    print(f"  arbitrary-label norm: {norm_str(colour_norm)}")
    print(f"      -> {simulate(w2, [colour_norm])}   (blue yields -- a pure convention)")
    print(f"  identity norm now works too: {norm_str(rn)}")
    print(f"      -> {simulate(w2, [rn])}   (the lone maintenance robot yields)")

if __name__ == "__main__":
    main()
