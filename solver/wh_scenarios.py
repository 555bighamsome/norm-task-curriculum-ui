"""Part B: the four interference types, each as a minimal scenario, plus a
combined scenario.  Each is solvable by a SHARED norm (or a few)."""
from wh_engine import *

def border(rows, cols):
    return {(r, c) for r in range(rows) for c in range(cols)
            if r in (0, rows - 1) or c in (0, cols - 1)}

# --- 1. SPATIAL EXCLUSION: two agents cross a 1-wide intersection -------------
def scen_spatial():
    walls = border(6, 7)
    for c in (1, 2, 4, 5):
        walls |= {(1, c), (3, c), (4, c)}
    zone = {(2, 3): "intersection"}
    a0 = Agent(0, (2, 1), Goal("reach", (2, 5)), role="carrier", colour="red")
    a1 = Agent(1, (4, 3), Goal("reach", (1, 3)), role="carrier", colour="blue")
    return World("SPATIAL", walls, zone, [a0, a1])

NORM_YIELD = ("MOVE", [("dest_zone", "intersection"), ("contested", True), ("move_dir", "N")])

# --- 2. SHARED-STATE POLLUTION: tainted carrier crosses a cold zone -----------
def scen_pollution():
    walls = border(5, 6)                             # rows0-4; interior rows1,2,3
    zone = {(1, 2): "cold"}                           # cold cell on a0's straight path
    a0 = Agent(0, (1, 1), Goal("reach", (1, 4)), role="carrier", carrying="tainted")
    a1 = Agent(1, (3, 1), Goal("reach", (3, 4)), role="carrier")   # coexisting agent
    return World("POLLUTION", walls, zone, [a0, a1])

NORM_NOPOLLUTE = ("MOVE", [("dest_zone", "cold"), ("carrying", "tainted")])

# --- 3. RESOURCE CONTENTION: two agents share one capacity-1 machine ----------
def scen_resource():
    walls = border(5, 7) | {(2, 3)}                  # (2,3) = machine station (wall)
    M = Machine("packer", (2, 3))
    a0 = Agent(0, (1, 1), Goal("operate", "packer"), role="operator", tokens=frozenset({"permit"}))
    a1 = Agent(1, (3, 5), Goal("operate", "packer"), role="carrier",  tokens=frozenset({"permit"}))
    return World("RESOURCE", walls, {}, [a0, a1], machines={"packer": M})

NORM_PRIORITY = ("USE", [("contested", True), ("role", "carrier")])

# --- 4. PRECONDITION: a hazardous package must be scanned before pickup --------
def scen_precondition():
    walls = border(5, 7)
    item = Item("pkg", (1, 3), colour="red", hazardous=True, scanned=False)
    a0 = Agent(0, (1, 1), Goal("deliver", ("pkg", (1, 5))), role="carrier")
    return World("PRECONDITION", walls, {}, [a0],
                 items={"pkg": item}, scanners={(3, 3)})

NORM_SCANFIRST = ("PICK", [("item_colour", "red"), ("item_unscanned", True)])

def main():
    cases = [
        ("1. SPATIAL EXCLUSION",  scen_spatial,      NORM_YIELD),
        ("2. SHARED POLLUTION",   scen_pollution,    NORM_NOPOLLUTE),
        ("3. RESOURCE CONTENTION", scen_resource,    NORM_PRIORITY),
        ("4. PRECONDITION",       scen_precondition, NORM_SCANFIRST),
    ]
    print("=" * 70)
    print("FOUR INTERFERENCE TYPES -- each solved by one shared norm")
    print("=" * 70)
    for name, mk, norm in cases:
        w = mk()
        before = simulate(mk(), [])
        after = simulate(mk(), [norm])
        print(f"\n{name}")
        print(f"   no norm : {before}")
        print(f"   + {norm_str(norm)}")
        print(f"           : {after}")

if __name__ == "__main__":
    main()
