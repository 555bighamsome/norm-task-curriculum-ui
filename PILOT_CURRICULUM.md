# Pilot Curriculum: V6

The active pilot contains eleven scenes. The participant maintains one shared
rulebook throughout the curriculum. All scenes are open in the current test
build, so participants can choose their own order. The dependency-frontier
version remains available with `?order=curriculum`.

| Scene | Stage | Function | Intended evidence |
|---|---|---|---|
| T1 | Foundation | Safety discovery | one spill externality makes a broad protective rule plausible |
| T2 | Foundation | Road coordination | two robots need a shared direction-based convention |
| T3 | Foundation | Machine priority | operator setup makes role priority meaningful |
| T4 | Refinement | Safety precision | a clean delivery rejects the broad safety rule |
| T5 | Refinement | Role exception | cleaner access makes `IS NOT cleaner` useful |
| T6 | Refinement | Road reuse | the same convention must work in a new layout |
| T7 | Refinement | Machine reuse | the same priority must work at a new station |
| T8 | Combination | Safety + road | a safety detour causes a later traffic conflict |
| T9 | Combination | Safety + machine | safety and machine access are coupled in one route |
| T10 | Combination | Scope refinement | the road convention must not control machine setup |
| T11 | Integration | Full workflow | one route links all three norm functions |

## Why this order

The order is not a simple difficulty ladder. T1-T3 provide three independent
opportunities to discover basic rules. T4-T7 provide counterexamples and new
layouts that test whether those rules are retained and refined. T8-T10 require
previous rules to operate together or to be scoped correctly. T11 is a single
causal workflow, not three separate puzzles placed next to each other.

Within each layer, participants can choose the order. This preserves freedom
to learn while preventing a participant from starting with the final integrated
scene and immediately writing an overly specific rule.

## Test modes

- Default: all scenes unlocked for test builds and solver calibration.
- `?order=curriculum`: dependency-frontier curriculum; prerequisites control availability.
- `?debug=1`: all scenes unlocked and researcher diagnostics are shown.

## Reference answers

The reference system is a three-rule rulebook. The exact flat baseline starts
with a uniform distribution over the canonical single-rule space, grounds rules
that solve at least one foundation or refinement scene, and enumerates grounded
multi-rule systems by rule count and MDL. It finds two valid minimum systems
with three rules and MDL 8; the theory-guided reference is retained for
interpretation rather than forced as the only answer.

The interface accepts every behaviorally successful rulebook. A participant's
shortcut is data about how they restructure the search problem.
