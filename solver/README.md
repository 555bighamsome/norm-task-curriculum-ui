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
late-trial single-rule       0 for T7--T10
```

The first six scenes establish the three reusable rule contents: precise
cold-storage protection, an eastbound road convention, and machine-scoped
carrier priority. T7--T9 are pairwise interaction tests: each puts two
previously useful ideas into one causal situation. T10 is the integrated scene
that requires all three. The removed cross-context refinement is reserved for
an optional exploratory negative-transfer study rather than the core pilot.

The solver's global optimum is a calibration target, not the participant's
answer key. Participants may submit any rulebook that the engine accepts. The
important distinction is between solving the current scene with active rules
and checking the saved library across all scenes.

`analyze_submitted_rulebook(...)` scores arbitrary participant rulebooks,
including systems outside the compositional baseline. The older solvers remain
historical prototypes and do not generate the active experiment.
