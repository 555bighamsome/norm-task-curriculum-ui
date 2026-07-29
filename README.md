# Shared Rules Curriculum

A browser experiment about how people build and reuse shared rules while moving
through a sequence of increasingly difficult warehouse scenes.

Open the experiment:

```text
file:///Users/kiki/Agent%20social/norm-task/index.html
```

## Active design

- controlled `10 x 10` warehouse maps;
- only the robots relevant to each contrast are shown;
- ten scenes arranged as foundations, refinements, reuse tests, and one integrated final scene;
- one scene-specific rule set that is preserved when a scene is revisited;
- an optional saved-rule library that can be reused in later scenes;
- one action frame: `IF conditions THEN do not move into the square`;
- typed conditions with `IS`, `IS NOT`, and `AND`;
- an exact compositional baseline over the same grammar shown to participants.

The curriculum unlocks one scene at a time, moving from independent rule
discovery to counterexample-driven refinement and later reuse. Each scene is
tested on its own; the task does not require a single rulebook to solve every
scene.

Current exact calibration:

```text
canonical single rules       5,669
T10 minimum reusable rules   3
T10 minimum reusable MDL     9 conditions
T10 reusable pairs tested    72,771; 0 solutions
T10 lower-MDL triples tested 82,948; 0 solutions
explicit T10 shortcut        5 rules, MDL 17
```

The T10 reference contains the precise safety rule, the road direction
convention scoped away from machines, and the operator-first machine rule.
Each component has successful evidence in earlier scenes. The task never asks
one rulebook to solve all ten scenes.

## Source of truth

- [STUDY_DESIGN_V6.md](STUDY_DESIGN_V6.md): scientific rationale and curriculum
- [SOLVER_DESIGN.md](SOLVER_DESIGN.md): solver logic, pseudocode, and cost
- [PILOT_CURRICULUM.md](PILOT_CURRICULUM.md): scene-by-scene evidence structure
- [solver/README.md](solver/README.md): implementation entry points

Older design files are retained as historical exploration and are not active
specifications.

## Regenerate and validate

```bash
python3 solver/task_generator.py
python3 solver/validate_tasks.py
```

For interface-only work without rerunning exact calibration:

```bash
python3 solver/task_generator.py --skip-solver
```

Generated browser data:

- `data/tasks.json`
- `data/tasks.generated.js`

Use `index.html?debug=1` for researcher controls and event-log export. The
default page uses linear curriculum order. Use
`index.html?order=free` to expose every scene for test calibration.
