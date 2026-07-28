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
- eleven scenes arranged as three foundation branches, refinements, pairwise combinations, and one integrated workflow;
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
minimum rulebook size        3
minimum total MDL            8 conditions
minimum-MDL rulebooks        2
compositional search cost    5,739 rulebooks enumerated
```

The minimum systems contain three rules. The theory-guided reference system
also has three rules but MDL 9; the shorter systems use a valid route-shaping
shortcut, which is retained as behavioral evidence.

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
