# Shared Rulebook V6: Constructing Norm Systems Through Curriculum

## Research question

Can people build a shared normative system by retaining successful simple
rules, refining them when counterexamples appear, and reusing them when several
social pressures become coupled in one situation?

The task isolates one part of norm creation: constructing candidate rules for a
shared world. It does not claim to model the full social emergence of norms,
including negotiation, sanctioning, or population-level adoption.

## Participant task

Participants maintain one rulebook that applies to every robot in every scene:

```text
IF condition AND condition ...
THEN do not move into the square
```

The rulebook persists across all eleven scenes. Participants can revisit earlier
scenes and must eventually make the same rulebook work for the whole curriculum.

The current test build exposes all scenes, so participants can choose their own
order and revisit earlier scenes. A dependency-frontier version is available
with `?order=curriculum`; it opens the three foundation scenes first and then
uses the prerequisite graph. This preserves both the free-order pilot and the
theory-guided curriculum mode.

## Ground-truth learning path

The intended path is a set of inference opportunities, not a forced answer:

```text
T1  broad safety rule
T4  safety rule becomes spill-sensitive
T5  safety rule gains a cleaner exception

T2  contested-road convention
T6  the standard layout creates successive carrier/operator and operator/cleaner conflicts

T3  machine priority rule
T7  machine priority is reused at a new station

T8  safety detour induces a road conflict
T9  safety detour induces a machine conflict
T10 road and machine rules must be scoped to their contexts
T11 all three pressures occur in one causal workflow
```

The three foundation branches can be learned in any order. The later scenes
make old rules useful but also create reasons to revise them. This is the
important distinction from simply putting independent subproblems on one large
map.

## Why the environment contains these elements

| Element | Cognitive function |
|---|---|
| Spill and cold storage | Makes a shared externality visible and supports an initial broad rule. |
| Clean delivery | Counterexample to banning every robot from cold storage. |
| Cleaner with a spill | Legitimate exception that can motivate a compact negated condition. |
| Contested target square | Makes the same coordination primitive apply to road and machine conflicts. |
| Direction | Provides a public, identity-free way to break symmetry. |
| Operator and carrier roles | Makes machine priority behaviorally meaningful rather than arbitrary. |
| Setup machine | Creates a temporal access order: operator first, carrier later. |
| Walls and detours | Couple consequences: avoiding one hazard changes which conflict occurs next. |
| Same 10 x 10 board | Controls visual scale while the causal structure changes. |

Roles and obstacles are therefore diagnostic manipulations. Their purpose is to
create a specific counterexample or dependency, not simply to increase task
difficulty.

## Solver baseline

The exact baseline enumerates the same canonical rule language available to the
participant. It uses a flat prior before evidence. A candidate becomes grounded
only if it independently solves at least one T1-T7 learning scene. Grounded
rulebooks are then enumerated in increasing rule count and MDL and simulated on
all eleven scenes.

Search cost is the number of canonical rulebooks enumerated, not the number of
participant attempts. The solver is exact only for its stated grounded,
three-rule hypothesis space; every participant rulebook is nevertheless
evaluated directly by the engine.

## Main measures

- which foundation branch is chosen first;
- first rule and first successful rule in each branch;
- additions versus edits to an existing rule;
- reuse of a previously successful rule;
- adoption of `IS NOT` after a counterexample;
- time and attempts to solve each newly available layer;
- whether a prior rule is over-reused after its scope becomes harmful;
- final rule count, MDL, and behavioral success across the whole curriculum.

The primary bootstrapping prediction is that a rule that succeeded earlier will
be proposed or edited earlier in a later dependent scene. The main path-
dependence prediction is that the same cached rule can reduce search in one
context but bias participants toward an over-broad or misplaced reuse in
another context.
