# Pilot Stimulus Design

> **Archived V2 stimulus plan.** 当前八个shift的设计与behavioral contracts
> 见[STUDY_DESIGN_V5.md](STUDY_DESIGN_V5.md)和
> [PILOT_CURRICULUM.md](PILOT_CURRICULUM.md)。

这份文档说明当前 pilot task 的地图设计逻辑。核心原则是:

```text
先确定想测的 rule family
再放置能制造失败/反驳过宽规则/逼出例外的 agent
最后用 exact solver 验证最小规则数
```

## Global Controls

当前 8 个 pilot task 都使用同一外框:

```text
9 x 9 grid
```

固定不变的内容:

- 同一套 primitive space: `human_medium`
- 同一条 rule grammar: `FORBID action WHEN condition conjunction`
- 不提供 robot ID、坐标、目标格、路口标签作为 rule primitive
- 每题都先保证 no-rule baseline 会失败
- 每题都用 solver 验证最小规则数和多解数量

地图大小已经统一，但 agent 数量仍然是 curriculum 的一部分:

```text
T1-T2: 2 agents
T3/T6: 3 agents
T7: 4 agents
T8: 6 agents
```

所以 T8 不能直接解释成“地图更大导致更难”；它的难度来自同一张 9x9 地图里需要组合更多 rule families。

## Agent Function Principle

每个 agent 都必须有实验功能。判断标准是:

```text
如果删掉这个 agent，最小答案或失败链会不会改变？
```

如果不会改变，它大概率只是视觉噪音。

常见 agent 功能:

- `harm witness`: 没有规则时制造污染/碰撞/资源冲突。
- `over-broad counterexample`: 反驳太宽的规则。
- `exception witness`: 逼出角色例外。
- `coordination witness`: 逼出 relational / contested rule。
- `resource witness`: 逼出 scarce-resource priority rule。

## Current Pilot Tasks

### T1: Practice Shared Area

Target rule:

```text
FORBID MOVE WHEN dest_zone=cold
```

Agents:

| Agent | Role | Start -> Target | Function |
|---|---|---|---|
| 0 | carrier, carrying spill | `(4,1) -> (4,7)` | harm witness: no rule leads to cold-chain pollution |
| 1 | carrier, no spill | `(2,1) -> (2,7)` | visual/control filler with a real goal, not a counterexample yet |

Interpretation:

```text
This is practice. It teaches that a shared area can be harmed.
```

### T2: Precision Pressure

Target rule:

```text
FORBID MOVE WHEN dest_zone=cold AND carrying=spill
```

Agents:

| Agent | Role | Start -> Target | Function |
|---|---|---|---|
| 0 | carrier, carrying spill | `(4,1) -> (4,7)` | harm witness: no rule causes pollution |
| 1 | carrier, no spill | `(1,7) -> (4,4)` | over-broad counterexample: broad cold-entry ban blocks legitimate access |

Failure checks:

```text
no rules -> pollution:cold
FORBID MOVE WHEN dest_zone=cold -> agent1:no-legal-plan
target rule -> ok
```

### T3: Role Exception

Target rule:

```text
FORBID MOVE WHEN dest_zone=cold AND carrying=spill AND role_not=cleaner
```

Agents:

| Agent | Role | Start -> Target | Function |
|---|---|---|---|
| 0 | carrier, carrying spill | `(4,1) -> (4,7)` | harm witness |
| 1 | carrier, no spill | `(1,7) -> (4,4)` | over-broad counterexample |
| 2 | cleaner, carrying spill | `(7,1) -> (4,3)` | exception witness: spill-carrying cleaner must be allowed into cold storage |

Failure checks:

```text
no rules -> pollution:cold
FORBID MOVE WHEN dest_zone=cold AND carrying=spill -> agent2:no-legal-plan
target rule -> ok
```

### T4: Crossing Convention

Target rule family:

```text
FORBID MOVE WHEN move_dir=<direction> AND contested=True
```

Agents:

| Agent | Role | Start -> Target | Function |
|---|---|---|---|
| 0 | carrier | `(4,1) -> (4,7)` | coordination witness: contests central square |
| 1 | carrier | `(7,4) -> (1,4)` | coordination witness: same role, no identity/role shortcut |

Failure checks:

```text
no rules -> collision
direction + contested yield rule -> ok
```

There are multiple equally good conventions in the current geometry. This is acceptable for pilot and is recorded in `best_mdl_solutions`.

### T5: Shared Machine

Target rule family:

```text
FORBID USE WHEN role=<one role> AND contested=True
```

Agents:

| Agent | Role | Start -> Target | Function |
|---|---|---|---|
| 0 | operator | `(1,1) -> use packer` | resource witness |
| 1 | carrier | `(7,7) -> use packer` | resource witness |

Failure checks:

```text
no rules -> resource-conflict
role + contested machine rule -> ok
```

Both priority conventions are valid:

```text
carrier yields
operator yields
```

### T6: Protection + Crossing

Target rules:

```text
FORBID MOVE WHEN dest_zone=cold AND carrying=spill
FORBID MOVE WHEN move_dir=<direction> AND contested=True
```

Agents:

| Agent | Role | Start -> Target | Function |
|---|---|---|---|
| 0 | carrier, carrying spill | `(4,1) -> (4,7)` | harm witness; protective rule reroutes it |
| 1 | carrier, no spill | `(1,7) -> (4,5)` | over-broad counterexample; legitimate cold access |
| 2 | carrier, carrying spill | `(7,4) -> (1,4)` | induced coordination witness; collides after protective reroute |

Failure checks:

```text
no rules -> pollution:cold
precise protection only -> collision
precise protection + yield -> ok
```

### T7: Exception + Crossing

Target rules:

```text
FORBID MOVE WHEN dest_zone=cold AND carrying=spill AND role_not=cleaner
FORBID MOVE WHEN move_dir=<direction> AND contested=True
```

Agents:

| Agent | Role | Start -> Target | Function |
|---|---|---|---|
| 0 | carrier, carrying spill | `(4,1) -> (4,7)` | harm witness |
| 1 | carrier, no spill | `(1,7) -> (4,5)` | over-broad counterexample |
| 2 | carrier, carrying spill | `(7,4) -> (1,4)` | induced coordination witness |
| 3 | cleaner, carrying spill | `(7,1) -> (4,3)` | exception witness |

Failure checks:

```text
no rules -> pollution:cold
exception rule only -> collision
exception rule + yield -> ok
```

### T8: Integrated Warehouse

Target rules:

```text
FORBID MOVE WHEN dest_zone=cold AND carrying=spill AND role_not=cleaner
FORBID MOVE WHEN move_dir=<direction> AND contested=True
FORBID USE WHEN role=<one role> AND contested=True
```

Agents:

| Agent | Role | Start -> Target | Function |
|---|---|---|---|
| 0 | carrier, carrying spill | `(4,1) -> (4,7)` | harm witness |
| 1 | carrier, no spill | `(1,5) -> (4,5)` | over-broad counterexample |
| 2 | carrier, carrying spill | `(7,4) -> (1,4)` | induced coordination witness |
| 3 | cleaner, carrying spill | `(6,1) -> (4,3)` | exception witness |
| 4 | operator | `(1,7) -> use packer` | resource witness |
| 5 | carrier | `(7,1) -> use packer` | resource witness |

Failure checks:

```text
no rules -> pollution:cold
exception rule only -> collision
exception rule + yield -> resource-conflict
exception rule + yield + machine priority -> ok
```

This is the ceiling task. It is not intended to isolate one new primitive. It tests whether participants can compose previously cached rule families in one controlled map.
