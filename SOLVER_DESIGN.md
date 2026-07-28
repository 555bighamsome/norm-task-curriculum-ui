# Solver Design: V6

## What the solver answers

The solver is a no-learning baseline. It asks:

> If all canonical rules are initially unweighted, how many candidate rule
> systems must be enumerated before a minimum system is found?

Participant runs are not solver search cost.

## Inputs

- the fixed typed rule grammar;
- the eleven generated scenes;
- the same Python transition engine used to generate animation traces;
- three diagnostic bundles:
  - foundation and refinement: T1-T7;
  - cross-context combinations: T8-T10;
  - integrated workflow: T11.

## Algorithm

```text
CANDIDATES = every canonical single rule

for each rule r in CANDIDATES:
    test r on the safety diagnostic scenes
    test r on the road diagnostic scene
    test r on the machine diagnostic scenes
    record which function(s) r solves by itself

search the empty system
search all single rules

for k = 2, then 3:
    generate every k-rule system that covers all three functions
    order systems by total number of conditions (MDL)

    for each MDL layer:
        simulate every system in that layer on all eleven scenes
        if any systems solve all scenes:
            return every successful system in this first layer
```

## Why diagnostic pools are used

The research hypothesis is compositional reuse: a cached rule should have
demonstrated a useful function before it is reused. The solver therefore
searches the compositional hypothesis space in which every included rule solves
at least one diagnostic function on its own.

This restriction is explicit. The result is exact for that compositional
space, not a claim about every possible synergistic set of arbitrary rules.
Human rulebooks are always tested directly in the engine, including systems
outside the model space.

## Current calibration

```text
canonical single rules: 5,669
safety pool: 4
road pool: 128
machine pool: 56

minimum rule count: 3
minimum MDL: 8
minimum systems: 2
enumerated rule systems: 5,739
```

The two minimum systems differ in whether the machine route-shaping rule says
`Robot IS a carrier` or `Robot IS NOT an operator`.

The theory-guided reference system also has three rules but MDL 9. This
difference is retained because it identifies a legitimate shortcut strategy.

## Search cost versus MDL

- `search cost` is the number of candidate rule systems enumerated before the
  first successful MDL layer is exhausted;
- `MDL` is the description length of one rulebook, currently the total number
  of conditions;
- `k` is the number of rules.

They answer different questions. Search cost concerns computational effort;
MDL concerns the compactness of the resulting representation.

## Submission analysis

For any human rulebook, the solver reports:

- scenes solved;
- rule count;
- MDL;
- functional class of each rule;
- rules that can be removed without changing solved scenes;
- whether the complete scene library is solved.
