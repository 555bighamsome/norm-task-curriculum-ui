"""Part C: enumerate the constraint space, search for the minimal shared norm-set,
report SEARCH COST (= the advisor's 'computational power' proxy)."""
from itertools import combinations
from wh_engine import *
from wh_scenarios import (scen_spatial, scen_pollution, scen_resource,
                          scen_precondition, border)

NSEW = ["N", "S", "E", "W"]

def present_values(w):
    zones   = sorted(set(w.zone.values()))
    roles   = sorted({a.role for a in w.agents})
    colours = sorted({a.colour for a in w.agents})
    icolours= sorted({it.colour for it in w.items.values()})
    machines= sorted(w.machines)
    tainted = any(a.carrying == "tainted" for a in w.agents)
    hazitem = any(it.hazardous for it in w.items.values())
    permitM = any(m.needs_permit for m in w.machines.values())
    return locals()

def literal_pool(action, w):
    v = present_values(w)
    pool = []
    if action == "MOVE":
        pool += [("dest_zone", z) for z in v["zones"]]
        if v["tainted"]: pool.append(("carrying", "tainted"))
        pool += [("move_dir", d) for d in NSEW]
    if action == "WAIT":
        pool += [("dest_zone", z) for z in v["zones"]]
    if action == "PICK":
        pool += [("item_colour", c) for c in v["icolours"]]
        if v["hazitem"]: pool.append(("item_unscanned", True))
    if action == "USE":
        pool += [("machine", m) for m in v["machines"]]
        if v["permitM"]: pool.append(("no_permit", True))
    # self-/context- literals available to every action:
    pool += [("role", r) for r in v["roles"]]
    pool += [("role_not", r) for r in v["roles"]]
    pool += [("colour", c) for c in v["colours"]]
    pool.append(("contested", True))
    return pool

GROUP = {"dest_zone": "zone", "role": "role", "role_not": "role", "colour": "col",
         "move_dir": "dir", "item_colour": "ic", "machine": "mc"}

def consistent(lits):
    seen = {}
    for p, val in lits:
        g = GROUP.get(p)
        if g:
            if g in seen: return False        # at most one literal per group
            seen[g] = True
    return True

def candidate_norms(w, max_len=3):
    cands = []
    for action in ("MOVE", "WAIT", "PICK", "USE"):
        pool = literal_pool(action, w)
        for k in range(1, max_len + 1):
            for lits in combinations(pool, k):
                if consistent(lits):
                    cands.append((action, list(lits)))
    return cands

def mdl(norm): return 1 + len(norm[1])

def minimal_normset(w, max_norms=5, max_len=3):
    """Layered search: repeatedly add the lowest-MDL norm that makes progress
    (solves, or peels off the current first hazard).  Robust to hazard masking,
    and mirrors how a bounded agent would build a norm-set incrementally."""
    cands = candidate_norms(w, max_len)
    law, sims = [], 0
    cur = simulate(w, law); sims += 1
    if cur[0]:
        return ([], 0, 0), len(cands), sims
    for _ in range(max_norms):
        best = None                      # (priority, mdl, norm, result)
        for c in cands:
            r = simulate(w, law + [c]); sims += 1
            if r[0]:
                key = (0, mdl(c))
            elif r[1] != cur[1]:         # advanced: different failure surfaces
                key = (1, mdl(c))
            else:
                continue
            if best is None or key < best[0]:
                best = (key, c, r)
        if best is None:
            return None, len(cands), sims
        law.append(best[1]); cur = best[2]
        if cur[0]:
            return (len(law), sum(mdl(n) for n in law), list(law)), len(cands), sims
    return None, len(cands), sims

def scen_combined():
    """Two disjoint bands in one grid: a pollution sub-problem (top) and a
    precondition sub-problem (bottom).  Needs TWO shared norms."""
    walls = border(9, 7) | {(4, c) for c in range(1, 6)}     # divider row 4
    zone = {(1, 3): "cold"}
    item = Item("pkg", (5, 3), colour="red", hazardous=True)
    a0 = Agent(0, (1, 1), Goal("reach", (1, 5)), role="carrier", carrying="tainted")
    a1 = Agent(1, (5, 1), Goal("deliver", ("pkg", (5, 5))), role="carrier")
    return World("COMBINED", walls, zone, [a0, a1], items={"pkg": item}, scanners={(7, 3)})

def report(name, w):
    (best, ncand, sims) = minimal_normset(w)
    print(f"\n{name}")
    print(f"   constraint space |C| = {ncand} candidate norms")
    if best is None:
        print("   no norm-set found within search bounds"); return
    k, cost, law = best
    print(f"   norm-set found: {k} norm(s), total mdl={cost}")
    for n in law:
        print(f"       {norm_str(n)}")
    print(f"   SEARCH COST (norm-sets simulated to find it) = {sims}")

def main():
    print("=" * 72)
    print("CONSTRAINT-SPACE SEARCH -- solver discovers norms; reports search cost")
    print("=" * 72)
    report("1. SPATIAL",       scen_spatial())
    report("2. POLLUTION",     scen_pollution())
    report("3. RESOURCE",      scen_resource())
    report("4. PRECONDITION",  scen_precondition())
    report("5. COMBINED (pollution + precondition)", scen_combined())

if __name__ == "__main__":
    main()
