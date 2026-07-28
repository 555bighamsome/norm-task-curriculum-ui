# V7 Solver Pipeline

```text
experiment_v2.py
  fixed atomic grammar, dependency curriculum, behavioral contracts, and
  later interaction scenes

wh_engine.py
  shortest legal planning and synchronous multi-robot transitions

norm_solver.py
  exact flat enumeration ordered by rule count and MDL, plus a shortcut audit

task_generator.py
  contract selection and browser-data export

validate_tasks.py
  map-size, engine, contract, and serialized-solution checks
```

Run:

```bash
python3 solver/task_generator.py
python3 solver/task_generator.py --include-prefixes
python3 solver/validate_tasks.py
```

Active calibration:

```text
scenes                       10
map size                     controlled 10 x 10
canonical single rules       5,669
minimum global rules         3
minimum global MDL           9
minimum-MDL rulebooks        2
compositional search cost    6,397
late-trial single-rule       T6 has 240 canonical single-rule solutions; T7--T10 have 0
```

The first five scenes establish precise cold-storage protection, a road
convention, and machine-scoped carrier priority. In T6, the standard warehouse
layout creates two successive pairwise conflicts: carrier/operator at the
first junction, then operator/cleaner at the second. Its local reference solution is
the compact role rule `contested AND robot IS NOT operator`; the exact solver
also reports all other successful single-rule alternatives. T7--T9 are the
original interaction and integrated scenes, and T10 remains the full
integrated scene.

The solver's global optimum is a calibration target, not the participant's
answer key. Participants may submit any rulebook that the engine accepts. The
important distinction is between solving the current scene with active rules
and checking the saved library across all scenes.

`analyze_submitted_rulebook(...)` scores arbitrary participant rulebooks,
including systems outside the compositional baseline. The older solvers remain
historical prototypes and do not generate the active experiment.
