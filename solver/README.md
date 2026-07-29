# V7 Solver Pipeline

```text
experiment_v2.py
  fixed atomic grammar, dependency curriculum, behavioral contracts, and
  later interaction scenes

wh_engine.py
  shortest legal planning and synchronous multi-robot transitions

norm_solver.py
  per-trial exact enumeration and final-trial reuse audit

task_generator.py
  contract selection and browser-data export

validate_tasks.py
  map-size, engine, contract, and serialized-solution checks
```

Run:

```bash
python3 solver/task_generator.py
python3 solver/validate_tasks.py
```

Active calibration:

```text
scenes                       10
map size                     controlled 10 x 10
canonical single rules       5,669
T6 reusable optimum          1 rule, MDL 3
T7 reusable optimum          1 rule, MDL 2
T8 reusable optimum          1 rule, MDL 2
T9 reusable optimum          2 rules, MDL 6
T10 reusable optimum         3 rules, MDL 9
T10 canonical singles        5,669 tested; 0 solutions
T10 reusable pairs           72,771 tested; 0 solutions
T10 lower-MDL triples        82,948 tested; 0 solutions
T10 explicit shortcut        5 rules, MDL 17
```

T1--T5 introduce and refine safety, road, and machine rules. T6--T8 make
those rules useful again in new layouts. T9 requires the road and machine
rules to be scoped to their proper contexts. T10 contains safety events, two
ordinary conflicts, and two machine conflicts. Its minimum reusable solution
retrieves the three MDL-3 rules learned earlier.

Scenes are solved independently. The saved library is optional external memory,
not a global rulebook that must solve the whole curriculum. Participants may
submit any rulebook that the engine accepts for the current scene.

For T10, the single-rule audit is exact over the complete canonical grammar.
The pair and lower-MDL triple audits are exact over the 382 rules with positive
single-rule evidence in T1--T9; this is the operational hypothesis space for
library reuse. The explicit five-rule shortcut confirms that enumeration can
still solve the scene, but at a higher construction cost.
