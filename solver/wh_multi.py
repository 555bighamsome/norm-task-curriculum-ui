"""Genuinely multi-agent (social) scenarios: one robot's violation harms another's
goal.  Verify in the tested Python engine before porting to the interface."""
from wh_engine import *
from wh_scenarios import border

def show(w):
    R = max(r for r, c in w.walls) + 1
    C = max(c for r, c in w.walls) + 1
    ag = {tuple(a.pos): str(a.id) for a in w.agents}
    tg = {}
    for a in w.agents:
        t = a.goal.target if a.goal.kind == "reach" else a.goal.target[1]
        tg[tuple(t)] = "abcd"[a.id]
    for r in range(R):
        row = ""
        for c in range(C):
            p = (r, c)
            if p in w.walls: row += "#"
            elif p in ag: row += ag[p]
            elif p in tg: row += tg[p]
            elif zone_of(w, p) == "cold": row += "C"
            elif zone_of(w, p) == "intersection": row += "+"
            else: row += "."
        print("   " + row)

# --- SA: contamination is social. B stocks the cold room; A would pollute it. ---
def scen_SA():
    w = border(5, 7)
    zone = {(2, 3): "cold", (3, 3): "cold"}
    a0 = Agent(0, (2, 1), Goal("reach", (2, 5)), role="carrier", carrying="tainted")
    a1 = Agent(1, (3, 1), Goal("reach", (3, 3)), role="carrier")  # stocks the cold room
    return World("SA", w, zone, [a0, a1])

# --- SB: add a cleaner C who MUST bring a spill into the cold room (to clean). ---
def scen_SB():
    w = border(5, 7)
    zone = {(2, 3): "cold", (3, 3): "cold"}
    a0 = Agent(0, (2, 2), Goal("reach", (2, 5)), role="carrier", carrying="tainted")
    a1 = Agent(1, (3, 1), Goal("reach", (3, 3)), role="carrier")
    a2 = Agent(2, (2, 5), Goal("reach", (2, 3)), role="cleaner", carrying="tainted")
    return World("SB", w, zone, [a0, a1, a2])

BROAD   = ("MOVE", [("dest_zone", "cold")])
CARRY   = ("MOVE", [("dest_zone", "cold"), ("carrying", "tainted")])
ROLEEXC = ("MOVE", [("dest_zone", "cold"), ("carrying", "tainted"), ("role_not", "cleaner")])

def run(name, mk, norms):
    print(f"\n{name}")
    show(mk())
    print(f"   no norm                         : {simulate(mk(), [])}")
    for label, n in norms:
        print(f"   {label:<30}: {simulate(mk(), [n])}")

if __name__ == "__main__":
    print("=" * 64)
    print("SOCIAL contamination: violation harms ANOTHER agent")
    print("=" * 64)
    run("SA  (A spill-carrier vs B stocking the cold room)", scen_SA,
        [("broad  no-move-into-cold", BROAD), ("precise  ...when carrying spill", CARRY)])
    run("SB  (+ C cleaner must bring a spill into cold)", scen_SB,
        [("broad  no-move-into-cold", BROAD), ("precise  ...carrying spill", CARRY),
         ("role-exc ...& not a cleaner", ROLEEXC)])
