# Shared Rulebook V4

> **Archived.** The active specification is
> [STUDY_DESIGN_V5.md](STUDY_DESIGN_V5.md).

## Research question

How do people construct a reusable system of shared norms when later social
problems require more precise and more compositional rules?

The task isolates one early part of norm formation: generating candidate rule
content. It does not claim to model complete norm emergence, agreement,
enforcement, or transmission.

The main hypothesis is that a rule that previously solved a simple problem
becomes easier to retrieve in later problems. The same cache can help search,
but it can also preserve redundant rules when a shorter representation becomes
available.

## Fixed rule language

Every rule has the same form:

```text
FORBID [MOVE INTO A SQUARE] WHEN condition AND condition ...
```

Conditions are built from the fixed typed vocabulary:

| Object | Values |
|---|---|
| Target square | cold storage; machine station; being entered by multiple robots |
| Robot | carrier; cleaner; operator; carrying a spill |
| Movement | northbound; southbound; eastbound; westbound |

Each condition may use `IS` or `IS NOT`. The interface accepts up to eight
conditions. The exact solver canonicalizes equivalent categorical
descriptions, producing 5,669 candidate single rules.

## Why each world element exists

| Element | Experimental function |
|---|---|
| Cold storage and spill | Creates a shared externality, so a rule must protect something beyond one robot's own target. |
| Clean cargo | Provides a counterexample to an over-broad ban on cold-storage entry. |
| Cleaner role | Creates a legitimate exception and makes negation useful. |
| Operator role | Shows that listing only carriers is too narrow; the useful category is "not cleaner." |
| Repeated aisle encounters | Distinguishes a temporary contested-square convention from a permanent direction ban. |
| Machine station | Tests whether a cached relational convention is reused in a new surface context. It does not introduce a new action primitive. |
| Walls and corridors | Fix shortest routes and encounter timing so behavioral contrasts are reproducible. They are not added merely to make a map harder. |
| Variable active robot count | Uses the minimum number of visible robots needed for each logical contrast. Counts are identical between experimental conditions and are not treated as the complexity measure. |

All shifts use the same 10 x 10 facility, planner, transition rules, visual
language, rule vocabulary, and time limit.

## Ground-truth curriculum

| Shift | Evidence introduced | Best cumulative system |
|---|---|---|
| 1 | A spill carrier contaminates cold storage. | 1 rule, MDL 1: broad cold-storage ban |
| 2 | A clean carrier must enter cold storage. | 1 rule, MDL 2: add spill condition |
| 3 | The routes are mirrored. | 1 rule, MDL 2: cargo rule becomes the unique compact solution |
| 4 | A cleaner may enter safely while an operator remains harmful. | 1 rule, MDL 3: add `robot IS NOT cleaner` |
| 5 | Two linked encounters require northbound robots to yield. | 2 rules, MDL 5 |
| 6 | A disjoint pair of encounters requires westbound robots to yield. | 2 rules, MDL 6 after compression |
| 7 | The westbound convention is reused at a machine. | 2 rules, MDL 6 |
| 8 | Protection changes a route, creating a machine conflict and then an aisle conflict. | 2 rules, MDL 6 |

The curriculum is therefore not "the same map plus one more local problem."
Its representational progression is:

```text
one broad condition
-> two-condition refinement
-> three-condition exception
-> a second relational rule
-> compression of two learned conventions
-> causal composition in the final shift
```

## Two successful final strategies

An incremental participant can retain three cached rules:

```text
1. cold storage AND spill AND NOT cleaner
2. contested AND northbound
3. contested AND westbound
```

This system has three rules and MDL 7.

The exact minimum system compresses the two direction conventions:

```text
1. cold storage AND spill AND NOT cleaner
2. contested AND NOT southbound AND NOT eastbound
```

Because movement has exactly four possible directions, the second rule applies
to northbound and westbound movement. This system has two rules and MDL 6.

The contrast creates a direct behavioral measure of representational change:
participants may reuse cached rules unchanged, or discover that negation
compresses them into a more abstract rule.

## Final-shift causal chain

The final shift is intentionally not three separated mini-puzzles.

1. Without the protection rule, the spill carrier contaminates cold storage.
2. Protection reroutes that robot through the machine station, creating a
   south/west contention event.
3. Westbound yielding resolves the machine event and allows a robot to continue.
4. That continuing robot later creates a northbound aisle contention event.
5. Northbound yielding resolves the final event.

Removing any learned component exposes a different failure. Both the
incremental and compressed rulebooks complete the chain.

## Primary behavioral measures

- first submitted rulebook on each shift;
- order in which conditions and rules are constructed;
- number of submitted rulebooks;
- time to first successful rulebook;
- whether a previously successful rule is retrieved before a novel rule;
- over-reuse of an old rule when it is irrelevant;
- final rule count and MDL;
- use of positive enumeration versus negation-based compression;
- regressions, where a new edit breaks an earlier shift.

Human attempts are behavioral data. Solver search cost is a separate
computational baseline and is never defined as the number of times a
participant presses Run.
