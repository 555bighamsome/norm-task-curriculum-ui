# Shared Rulebook V3: Ground-Truth Curriculum

> **Archived V3 design.** The active specification is
> [STUDY_DESIGN_V5.md](STUDY_DESIGN_V5.md).

## 1. Research question

How do people construct a compact shared rule system from experience?

The experiment isolates three related processes:

1. **Refinement**: a rule that works in a simple situation is made more precise
   when a counterexample appears.
2. **Compression by negation**: several positively enumerated cases can be
   replaced by one shorter exception rule.
3. **Reuse**: a coordination rule learned in one setting can be retrieved in a
   different setting that has the same relational structure.

The task is not intended to model the complete emergence of a social norm.
It studies one cognitive input to norm creation: constructing candidate shared
rules that every agent must follow.

## 2. Experimental unit

The experiment contains one facility and a sequential curriculum of
**shifts**, not independent puzzles.

- Every shift uses the same 10 x 10 map.
- The same four robot identities and roles appear in every shift.
- Robots without work in a shift remain parked and are visibly marked off duty.
- The active workload progresses from one robot, to two interacting robots,
  and finally to all four robots.
- The same rule language is available in every shift.
- One persistent shared rulebook is applied to every shift.
- Shift 1 is available first. A new shift unlocks only when the current
  rulebook solves the complete curriculum prefix seen so far.
- Participants may revisit every previously unlocked shift.
- A rulebook succeeds only when it solves the complete shift library.

Keeping one world and one rulebook makes a shift a piece of evidence about the
same normative system, rather than a new puzzle with a new answer.

## 3. Fixed rule language

Every rule has the form:

```text
FORBID MOVE INTO A SQUARE WHEN
<condition>
AND <condition>
...
```

Only conjunction and negation are available. There is no `OR`.

Participant-facing condition menu:

```text
Target square [IS / IS NOT]
              [cold storage /
               a machine station /
               being entered by multiple robots]

Robot        [IS / IS NOT]
              [a carrier /
               a cleaner /
               an operator /
               carrying a spill]

Movement     [IS / IS NOT]
              [northbound / southbound / eastbound / westbound]
```

The interface accepts up to eight conditions. The exact solver canonicalizes
logically equivalent descriptions before calculating minimum description
length.

`being entered by multiple robots` is a relational derived primitive:

```text
count(robots intending to enter the target square this step) >= 2
```

It is shown transparently to participants; the implementation may store it as
`contested=true`.

## 4. Functional role of each design element

| Element | Experimental function |
|---|---|
| Cold storage | Creates a shared externality: one robot can damage a shared environment. |
| Spill | Separates harmful entry from otherwise legitimate entry. |
| Carrier | Supplies the first plausible positive role-specific rule. |
| Cleaner | Supplies a legitimate exception and makes unrestricted spill rules too broad. |
| Operator | Shows that harmful actors are not limited to carriers and creates pressure to replace role enumeration with `not cleaner`. It also supplies a plausible local shortcut in machine conflicts. |
| Machine station | Tests whether a relational yielding rule is reused outside an ordinary road conflict. It is entered like any other square and is released after one time step. |
| Fixed shelves/walls | Hold routes and arrival times stable. They are not a difficulty manipulation. |
| Movement direction | Supplies a shared arbitrary convention for breaking symmetry. |
| Multiple intended entrants | Makes a prohibition temporary: a robot yields only during a live conflict. |
| Off-duty robots | Keep identities and roles constant while reducing early visual and working-memory load. |
| Active workload | Creates a visible curriculum: one active robot, then a two-robot contrast, then a four-robot coupled system. |

The facility always contains four robots, but the number assigned work is an
intentional curriculum manipulation.

## 5. Ground-truth compact rulebook

The generator is calibrated against the following compact functional system:

```text
R-PROTECT
FORBID MOVE INTO A SQUARE WHEN
Target square IS cold storage
AND Robot IS carrying a spill
AND Robot IS NOT a cleaner

R-YIELD
FORBID MOVE INTO A SQUARE WHEN
Target square IS being entered by multiple robots
AND Movement IS northbound
```

These rules are hidden from participants. Alternative successful systems are
allowed and reported by the solver.

## 6. Ground-truth curriculum

The recommended curriculum is derived from a sequence of hypotheses, not from
increasing map size.

### Stage P1: broad protection

Workload: one active robot.

Evidence: harmful entry into cold storage; no legitimate cold entry is needed.

Compatible simple hypothesis:

```text
Target square IS cold storage
```

### Stage P2: cargo refinement

Workload: two active robots.

New evidence: a robot without a spill must enter cold storage.

The broad rule now blocks a legitimate goal. A more precise hypothesis is:

```text
Target square IS cold storage
AND Robot IS carrying a spill
```

### Stage P2B: mirrored evidence

Workload: two active robots with reversed approach directions.

The same cargo contrast is shown with harmful entry from the opposite
direction. A direction-based shortcut may fit either P2 example alone, but it
cannot explain both. The pair makes `carrying a spill` the compact shared
feature without removing direction primitives from the participant's search
space.

### Stage P3: positive role patch

Workload: a spill carrier and a spill-carrying cleaner.

New evidence: a cleaner carrying a spill must enter safely.

A locally successful response is:

```text
Target square IS cold storage
AND Robot IS carrying a spill
AND Robot IS a carrier
```

### Stage P4: negation compression trigger

Workload: a spill-carrying cleaner and a spill-carrying operator.

New evidence: an operator carrying a spill is also harmful, while the cleaner
remains a legitimate exception.

Positive enumeration requires two rules:

```text
... Robot IS a carrier
... Robot IS an operator
```

The compact generalization is one rule:

```text
... Robot IS NOT a cleaner
```

This shift is the planned trigger for the negation insight.

### Stage C1: relational coordination

Workload: two active robots in an ordinary aisle.

Two robots approach one ordinary square simultaneously. The robots also make
uncontested movements, so a permanent direction ban is not viable.

```text
Target square IS being entered by multiple robots
AND Movement IS northbound
```

### Stage C2: structural reuse

Workload: two active robots approaching the machine.

Two robots approach a machine station simultaneously. The same relational
yielding rule works, although a machine-specific role rule is an attractive
local alternative.

### Stage X: coupled evidence

Workload: all four robots are active. A harmful carrier, a clean carrier, a
spill-carrying cleaner, and an operator each have distinct work.

The protective rule changes a spill carrier's route. The new route then creates
a machine-entry conflict. Either rule alone fails; the two-rule system succeeds.

This shift makes the functional components causally dependent rather than
visually juxtaposed.

## 7. Generator contracts

The shift generator creates parameterized variants on the fixed map and retains
only variants with the required behavioral signature.

Examples:

```text
P1:
no rules -> pollution
broad protection -> success

P2:
broad protection -> no legal plan
cargo-sensitive protection -> success

P3:
cargo-sensitive protection -> no legal plan for cleaner
carrier-specific patch -> success
negated exception -> success

P4:
carrier-specific patch -> pollution by operator
carrier + operator enumeration -> success
negated exception -> success

X:
no rules -> pollution
R-PROTECT only -> resource conflict
R-YIELD only -> pollution
R-PROTECT + R-YIELD -> success
```

When several variants satisfy a contract, selection minimizes nuisance
differences such as maximum path length and arrival-time imbalance.

## 8. Exact solver

The solver:

1. generates every canonical single rule licensed by the fixed grammar;
2. evaluates each rule against every generated shift;
3. searches rulebooks by number of rules;
4. within the minimum rule-count layer, searches by total condition count
   (MDL);
5. returns every minimum-MDL solution, not only the first one encountered;
6. reports the number of rulebooks and simulations enumerated.

Human runs are attempts. Solver search cost is the number of candidate
rulebooks enumerated by the exact search. These are different quantities.

## 9. Main behavioral measures

- first rule and first condition;
- conditions added, removed, negated, or replaced;
- first use of `IS NOT`;
- whether negation follows the planned P4 trigger;
- replacement of two positive role rules by one negated rule;
- rule count and MDL before and after compression;
- unchanged rule reuse from road to machine conflict;
- machine-specific shortcut use;
- regressions on previously solved shifts;
- redundant rules retained in the final rulebook;
- attempts and time to complete the full rulebook.

## 10. Curriculum predictions

In the ground-truth simple-to-complex order, participants should be more likely
to:

- begin with short, broad rules;
- refine by adding or replacing one condition at a time;
- use negation after the operator counterexample;
- retrieve the road yielding rule in the machine shift;
- reach a compact final rulebook with fewer deletions.

The active task implements the ground-truth order directly. Researcher test
mode may expose every shift, but it is not a participant condition. A later
confirmatory experiment can compare this curriculum with a matched
non-curricular sequence while keeping the shift set, total exposure, interface,
and rule language identical.
