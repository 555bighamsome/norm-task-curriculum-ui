# Shared Rulebook V5: Function-First Curriculum

## Research question

When people construct a shared norm system, how do successful rules become
reusable hypotheses, and how do later counterexamples make people refine the
scope of those cached rules?

The study does not model complete norm emergence. It isolates one cognitive
component of norm creation: constructing a compact set of universal behavioral
constraints that must work for several agents and situations.

## Participant objective

Participants build one persistent rulebook. Every rule applies to every robot
in every scene:

```text
FORBID [MOVE INTO A SQUARE] WHEN condition AND condition ...
```

All scenes are available in the test build. Participants may choose their own
order, revisit scenes, and discover which rules are worth retaining. A rulebook
is complete only when it solves the whole scene library.

## Fixed hypothesis language

```text
Target square [IS / IS NOT]
  cold storage
  a machine station
  being entered by multiple robots

Robot [IS / IS NOT]
  a carrier
  a cleaner
  an operator
  carrying a spill

Movement [IS / IS NOT]
  northbound
  southbound
  eastbound
  westbound
```

The interface permits up to eight conjunctive conditions. The exact solver
canonicalizes logically equivalent categorical descriptions, producing 5,669
candidate single rules.

## Why each design element exists

| Element | Experimental function |
|---|---|
| Cold storage and spill | Creates a visible negative externality and an initial broad protective rule |
| Clean cargo user | Provides a counterexample to "nobody may enter cold storage" |
| Cleaner carrying a spill | Creates a legitimate role exception and makes negation useful |
| Operator carrying a spill | Prevents the exception from becoming "only carriers are dangerous" |
| Junction and stopping target | Creates a genuine coordination problem in which one direction must yield |
| Machine station | Changes the social function from road coordination to resource access |
| Operator setup requirement | Makes role priority behaviorally meaningful; direction alone is not the intended explanation |
| Obstacles | Control which action is attempted and when, so a scene supplies a specific counterexample |
| Same 10 x 10 size | Controls visual scale and board familiarity across scenes |

Obstacles and roles are therefore not general difficulty manipulations. Each
one makes a particular hypothesis succeed or fail.

## Scene curriculum

| Scene | Norm function | Evidence supplied | Expected rule development |
|---|---|---|---|
| 1 | Safety discovery | A spill carrier contaminates cold storage | A broad cold-storage prohibition is reasonable |
| 2 | Safety refinement | A clean carrier legitimately needs cold storage | Add the spill condition |
| 3 | Exception and negation | A cleaner with a spill is safe, but an operator with a spill is harmful | Add `Robot IS NOT Cleaner`, or enumerate harmful roles with more rules |
| 4 | Coordination convention | An eastbound robot parking in a junction blocks another route | Add an eastbound yielding convention |
| 5 | Resource priority | A machine needs operator setup before carrier use | Add a provisional carrier-yields rule for machine access |
| 6 | Cross-context refinement | The cached eastbound road rule blocks the operator at a machine | Scope road and machine rules to their proper contexts |
| 7 | Integrated system | One detour produces a road conflict and then a machine conflict | Retrieve and jointly apply all three norm functions |

Scenes 1-3 intentionally revisit one externality because they form a clean
counterexample sequence. Scenes 4-6 do not merely repeat that behavior: they
introduce coordination, resource priority, and interference between cached
norms. Scene 7 makes the three rules operate in one causal workflow rather
than presenting three disconnected mini-puzzles.

## Reference rulebook

The theory-guided reference system is:

```text
1. FORBID MOVE INTO A SQUARE WHEN
   Target square IS cold storage
   AND Robot IS carrying a spill
   AND Robot IS NOT a cleaner

2. FORBID MOVE INTO A SQUARE WHEN
   Target square IS NOT a machine station
   AND Target square IS being entered by multiple robots
   AND Movement IS eastbound

3. FORBID MOVE INTO A SQUARE WHEN
   Target square IS a machine station
   AND Target square IS being entered by multiple robots
   AND Robot IS a carrier
```

This system has three rules and MDL 9. It is a reference learning path, not a
forced answer.

## Multiple solutions and shortcuts

The current solver finds two minimum systems with three rules and MDL 8. They
use a machine-specific route-shaping rule that makes the carrier approach from
a direction compatible with the cached road convention. This is shorter than
the theory-guided reference rulebook.

The task deliberately accepts this. A participant-discovered shortcut is
scientifically useful evidence about how people restructure a search problem.
The solver reports it rather than deleting it to preserve a unique answer.

## Main behavioral measures

- first rule attempted in each scene;
- order in which scenes are selected;
- time and runs until first successful rulebook;
- number of rule additions, deletions, and condition edits;
- when a previously successful rule is retrieved;
- when a cached rule is refined with an added scope condition;
- rule count and MDL of submitted systems;
- over-reuse: retaining a cached rule after it becomes irrelevant or harmful;
- strategy class: reference norm, positive enumeration, route-shaping shortcut,
  or other behaviorally valid system.

## Main predictions

1. After a rule succeeds, participants will retrieve it earlier in later
   scenes than an uncached alternative.
2. Counterexamples will initially cause local patches, followed by scope
   refinement in some participants.
3. Negation will be adopted when it compresses several positive role cases.
4. Self-chosen curriculum order will predict whether participants form broad
   rules first or jump directly to narrow rules.
5. The same caching mechanism that reduces search may produce over-reuse when
   a rule crosses from road coordination into machine access.

