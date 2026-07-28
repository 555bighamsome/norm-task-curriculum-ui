# 仓库社会规范任务 — v2 设计

> **Archived V2 design.** 当前实验以
> [STUDY_DESIGN_V5.md](STUDY_DESIGN_V5.md)为准；本文不再描述正在运行的
> task、primitive或solver。

## 0. 一句话

研究**有限算力的群体如何发现、复用并精化共享社会规范**。任务不是让被试写仓库操作规程,而是让他们在多智能体互相影响的场景里,找到能让所有 agent 达成目标的共享行为约束。

核心对象:

```text
贪婪 agent 各走各的
→ 一个 agent 的行动会阻碍/伤害/占用另一个 agent 的目标条件
→ 群体需要一条全称、共享、可复用的规范
→ 达成全局成功所需的最少规范数 = 问题的算力难度
```

---

## 1. 重新收紧:什么才算 social norm

本项目里的 norm 必须解决 **agent-agent interdependence**。如果一个规则只是在控制单个 agent 的工艺流程,它不是核心 social norm。

### 保留为核心

| 类型 | 社会性来源 | 示例规范 |
|---|---|---|
| 外部性保护 | A 的动作会破坏 B 依赖的共享状态 | 带泄漏物者不得进入他人依赖的冷链区 |
| 角色例外/精化 | 同一规范需要区分破坏者与修复者 | 带泄漏物者不得进入冷链区,清洁工除外 |
| 空间协调 | 两个 agent 争用同一格/窄通道 | 有争用时,向北行驶者让行 |
| 资源分配 | 两个 agent 争用同一机器/装卸口 | 打包机被争用时,搬运工让操作员先用 |

### 从核心里移出

`未扫描物品不得被拿起` 这类规则更像 safety protocol / workflow rule。它可以作为扩展条件出现,但默认 curriculum 不把它当核心 social norm,除非改写成社会性版本:

```text
未检查货物会污染/阻塞他人依赖的共享区域
或者
抢先取货会占用他人的资源/路径
```

否则它会把研究问题带偏。

---

## 2. 理论链条

研究问题:

```text
有限算力的人如何从简单社会规范开始,
通过缓存、复用、精化,逐步处理更复杂的社会互依?
```

机制假设:

1. 简单场景里,人能发现低阶规范。
2. 复杂场景从零搜索很难,但旧规范可以作为 helper/cache。
3. 新场景会暴露旧规范的过宽、缺例外、缺关系条件。
4. 人把旧规范加条件/加例外/组合起来,形成更复杂的规范系统。
5. 被复用但后来显得多余的旧规范,可能就是 silly rule / 脚手架残留。

因此任务设计不应该只是把小题并排拼起来,而应该制造**规范生长路径**:

```text
粗规范
→ 更精确的规范
→ 带例外的规范
→ 与协调/资源规范组合
→ 在大地图中复用、冲突、再精化
```

---

## 3. 两层语言

### 人类界面语言

被试看到的是自然的 shared rule 模板,不是 solver 谓词:

| 人类规则 | 内部编译 |
|---|---|
| 所有机器人不得进入冷链区 | `FORBID MOVE WHEN dest_zone=cold` |
| 带泄漏物的机器人不得进入冷链区 | `FORBID MOVE WHEN dest_zone=cold & carrying=spill` |
| 带泄漏物的机器人不得进入冷链区,清洁工除外 | `FORBID MOVE WHEN dest_zone=cold & carrying=spill & role_not=cleaner` |
| 有争用时,向北行驶的机器人让行 | `FORBID MOVE WHEN contested=True & move_dir=N` |
| 打包机被争用时,搬运工让操作员先用 | `FORBID USE WHEN contested=True & role=carrier` |

人类层的原则:

- 说的是社会规则,不是代码条件。
- 规则是共享、全称、类型化的,不能点名机器人编号或坐标。
- 允许被试从宽规则开始,再通过条件和例外精化。

### Solver 内部语言

内部仍使用:

```text
FORBID <action> WHEN <predicate conjunction>
```

默认核心动作:

```text
MOVE / USE
```

`PICK` 和 `item_unscanned` 暂时移出默认核心,保留给扩展版 socialized-precondition。

默认实验条件使用 `human_medium` profile。它比最早的 core 更自然,但仍然故意排除坐标、机器人编号、目标格是路口/窄口等局部标签。

默认条件:

| 动作 | 条件池 |
|---|---|
| `MOVE` | `dest_zone=cold`, `carrying=spill`, `role_not=cleaner`, `move_dir=N`, `move_dir=S`, `move_dir=E`, `move_dir=W`, `contested=True` |
| `USE` | `role=carrier`, `role=operator`, `contested=True` |

候选空间:

- 每条 norm 最多 3 个条件;
- 条件只从该 action 的条件池中选;
- 同组条件不能冲突,例如一条规则里不能同时有 `move_dir=N` 和 `move_dir=S`;
- 所有 trial 使用同一个默认搜索空间,这样 solver search cost 可比;
- 当前 `human_medium` 空间是 10 个条件 primitive、63 个候选规范。这个大小比旧 core 更适合人类搜索,但仍能做 exact enumeration。

---

## 4. 任务生成原则

### 错误路线

旧版后期任务的问题:

```text
污染房间 + 路口房间 + 扫描房间
```

这只是并排组合。它会让 solver 的 norm 数增加,但对人类不像一个社会制度在变复杂,也不能很好测试 cache/refinement。

### 新路线

后期任务必须是**同一张更大仓库地图中的互相诱发**:

```text
冷链规范改变路径
→ 被绕开的路线挤到同一窄口
→ 产生让行规范
→ 让行/绕路改变到达机器的时间
→ 产生资源分配规范
→ 清洁工出现后,旧污染规范需要例外
```

复杂度来自规范之间的相互作用,不是来自把多个小地图贴在一起。

高阶任务还必须通过 **partial-law failure chain** 检查:

```text
无规范 → 失败 A
只加第一个局部规范 → 暴露/诱发失败 B
再加第二个规范 → 暴露/诱发失败 C
加完整规范系统 → 成功
```

如果每个失败都能在地图的不同角落独立解决,那就是局部拼接,不能作为默认高阶任务。

### Generator 应输出的结构

每个 task 除了 world 和 solver 解,还应标注:

```text
social_pressure: 这关的社会互依是什么
cached_from: 可以复用哪些旧规范
refines: 这关是否要求精化旧规范
new_norm_family: 本关新增规范类型
failure_without_norm: 无规范时谁伤害/阻塞了谁
failure_with_cached_norm: 只用旧规范时哪里不够
```

这样才能把人类行为和理论机制连上。

---

## 5. 人类友好的反馈约束

时序型 task 不能让被试靠猜。只要 task 中存在绕路、等待、资源争用、例外角色或多步目标,界面必须把每个 agent 的状态显式化:

```text
agent 当前是否完成目标
agent 下一步打算做什么
agent 是被规则挡住、还在进行、已经完成,还是卷入失败
失败涉及哪些 agent
当前动画是第几步
```

这不是降低难度,而是把难度放回规范搜索本身。被试应该困难在:

```text
我要写哪条共享规则?
这条规则应该多宽/多窄?
旧规则是否要缓存、复用或精化?
```

不应该困难在:

```text
刚才是谁完成了?
谁没完成?
为什么这次失败?
是不是动画太快我没看清?
```

因此前端必须支持逐步查看,并且每一帧都显示 agent-level goal status。后台记录也应保存最终 agent_report,方便之后分析人类尝试到底卡在哪类失败上。

---

## 6. 新 curriculum

### L1 外部性:粗保护规则可行

场景:

- A 带泄漏物穿过冷链区会污染共享冷链。
- B 依赖冷链区完成入库。
- 这一关没有合法进入冷链的其他角色。

可能解:

```text
所有机器人不得进入冷链区
```

或更精确:

```text
带泄漏物者不得进入冷链区
```

设计目的:

- 让人形成第一个可缓存的保护规范。
- 允许 over-approximation 出现,因为它在简单环境里有效。

### L2 精度压力:宽规则误伤合法 agent

新增:

- B 必须进入冷链区完成合法入库。

只用 L1 的宽规则会失败:

```text
所有机器人不得进入冷链区
→ B 无法完成目标
```

需要精化:

```text
带泄漏物者不得进入冷链区
```

设计目的:

- 测试被试是否把 cached 宽规则精化,而不是完全重来。

### L3 角色例外:修复者合法违反表面规则

新增:

- 清洁工 C 也带泄漏物,但它进入冷链区是为了清理/修复共享状态。

只用 L2 精确规则会失败:

```text
带泄漏物者不得进入冷链区
→ 清洁工无法完成目标
```

需要:

```text
带泄漏物者不得进入冷链区,清洁工除外
```

设计目的:

- 规范不是越宽越好,也不是越“物理安全”越好;它要表达社会角色和合法例外。

### L3b 多机器人冷链:agent 数量增加但规范压缩

新增:

- 同一张更大的冷链地图。
- 两个带泄漏物搬运工从不同方向经过冷链。
- 一个合法入库工必须进入冷链。
- 一个清洁工带泄漏物进入冷链是合法修复行为。
- 另有一个无污染搬运工在地图中移动,增加视觉和路径复杂度。

需要的最小规范仍然是:

```text
带泄漏物者不得进入冷链区,清洁工除外
```

设计目的:

- 测试 **scale compression**:agent 数量增加、地图变大,但如果社会互依类型不变,最少规范数不应该增长。
- 防止复杂度被误解成“机器人越多就需要越多规则”;本项目真正关心的是干扰类型和规范结构。
- 给后续大地图一个过渡,让被试先看到“同一条类型化规范能管多个 agent”。

### L3c 规模冷链生成:参数化 scale task

这是由 generator 生成的更大冷链图:

- 7 个 agent。
- 两个带泄漏物搬运工从不同路径穿越冷链。
- 两个合法入库工必须进入冷链。
- 一个清洁工带泄漏物进入冷链是合法例外。
- 两个无污染搬运工增加地图规模和视觉复杂度。

最小规范仍然是:

```text
带泄漏物者不得进入冷链区,清洁工除外
```

设计目的:

- 明确区分 **规模复杂度** 和 **规范结构复杂度**。
- 当互依类型不变时,agent 数、路径数、地图大小增加不应自动增加最少规范数。
- 这类 task 可以由 generator 继续按参数扩展,用于测量人类是否会被视觉/规模复杂度误导。

### L4 对称协调:任意但共享的让行

场景:

- 两个同型机器人同时争用一个窄口。
- 它们没有可用身份差异。

需要:

```text
有争用时,向北行驶者让行
```

或 counterbalanced 版本:

```text
有争用时,向南行驶者让行
有争用时,向东行驶者让行
有争用时,向西行驶者让行
```

设计目的:

- 展示 coordination norm 的任意性。
- silly-looking 内容的来源:朝向本身不道德,但它能破缺对称。
- 防止被试只缓存“北向让行”这个表面答案;真正要测的是是否理解“争用 + 关系性破缺”的 norm 形式。

### L5 资源分配:共享机器/装卸口优先级

场景:

- 两个 agent 同时使用同一台机器或装卸口会冲突。
- 角色不同,但都合法需要该资源。

需要:

```text
打包机被争用时,搬运工让操作员先用
```

设计目的:

- 引入资源分配 norm。
- 区分保护型 norm 与协调/分配型 norm。

### L6 诱发型大地图:污染规范制造新路口冲突

同一张地图:

- A 带泄漏物需要绕开冷链区。
- 绕开的唯一短路经过中央窄口。
- D 也要通过中央窄口。

只用污染规范:

```text
带泄漏物者不得进入冷链区
→ A 绕路
→ A 和 D 在窄口相撞
```

需要组合:

```text
带泄漏物者不得进入冷链区
有争用时,向北行驶者让行
```

设计目的:

- 复杂度来自旧规范改变路径后诱发新社会冲突。
- 这是比“污染房间 + 路口房间”更合理的大地图。

### L7 例外 + 诱发协调

同一张地图加入清洁工:

- 污染规范必须是带例外版本。
- 绕路/通道仍会制造协调冲突。

需要:

```text
带泄漏物者不得进入冷链区,清洁工除外
有争用时,向北行驶者让行
```

设计目的:

- 测试被试能否把 L3 的 refined norm 带入 L6 型大地图。
- L7b 是镜像生成版本:共享冷链例外不变,但让行方向变成南向,用于测试复用的是 norm 结构而不是“北向”表面答案。

### L8 综合资源分配

同一张更大地图:

- 冷链保护导致绕路。
- 绕路和让行改变到达装卸口/打包机的时序。
- 两个角色争用同一资源。

需要:

```text
带泄漏物者不得进入冷链区,清洁工除外
有争用时,向北行驶者让行
打包机被争用时,搬运工让操作员先用
```

设计目的:

- 终点不是更多房间,而是一个社会制度:保护共享状态、空间协调、资源分配三类 norm 在同一地图里互相作用。
- L8b 是 generator 镜像版本:同一综合系统在南向让行情境下重现。它使用 compositional verification,避免每次生成都重复昂贵的 3-norm exact enumeration。

---

## 7. 缓存操纵实验

核心 manipulation:

### 条件 A:无缓存

被试直接面对 L6/L7/L8,从空规则开始。

### 条件 B:自然缓存

被试先做 L1-L5,后面可以看到/复用自己之前写过的规则。

### 条件 C:预载缓存

后期任务开始时系统预填若干旧规则:

```text
所有机器人不得进入冷链区
带泄漏物者不得进入冷链区
有争用时,向北行驶者让行
```

其中有些会有用,有些会在新任务里过宽或冗余。

测量:

- 成功率;
- human attempts;
- 是否直接复用旧规则;
- 是否把旧规则加条件/加例外;
- 是否保留冗余旧规则;
- 冗余旧规则是否正好是早期有效的 cached helper。

这才是 silly rule 的行为证据。

---

## 8. 量化指标

对每个 task:

```text
min_norm_count
solver_search_cost
candidate_space_size
minimal_mdl
calibration_type
```

对每条 norm:

```text
mdl
trigger_rate
necessity
over_restriction
family: externality / exception / coordination / resource
points_to: target / self / relation / role
status: necessary / redundant / cached_scaffold
```

对人类轨迹:

```text
attempt_index
submitted_rules
compiled_norms
success/failure reason
time
reuse_from_previous_task
refinement_operation: add-condition / add-exception / replace / delete
redundant_cached_rule_present
```

---

## 9. 当前落地状态

已完成:

1. 默认 core task library 已移除 `scan_before_pick`。
2. 默认 primitive 已改为 `MOVE/USE`,不包含 `PICK/item_unscanned`。
3. 扫描相关引擎代码保留为扩展,但不进入默认实验。
4. `TASK_SPECS` 已重做为 8 关 social curriculum:
   - L1 外部性粗保护
   - L2 精度压力
   - L3 清洁工例外
   - L4 路口让行
   - L5 资源争用
   - L6 污染诱发路口
   - L7 例外 + 诱发路口
   - L8 综合社会仓库
5. 每个 task 已导出 `social_pressure/cached_from/refines/new_norm_family`。
6. 前端规则模板已删除“扫描前置”,保留:
   - 进入冷链区;
   - 路口让行;
   - 机器优先级。
7. 当前默认库:8 个 task,7 个条件 primitive,候选空间 `|C|=39`,全部为 `exact_exhaustive` 标定。

### Generator 状态

默认后期任务不再用 `compose_world` 并排拼房间。已新增 integrated generators:

```text
generate_externality_simple
generate_externality_precision
generate_externality_exception
generate_induced_crossing
generate_exception_induced_crossing
generate_integrated_social_warehouse
```

后期地图要满足:

- 同一仓库;
- 同一路径系统;
- 冷链区、窄口、机器在同一拓扑中;
- 旧规范会改变 agent 路径或时序;
- 改变后诱发新的社会冲突。

### 后续再接后台

`client.html/server.py` 不是当前最重要的 blocker。先把理论设计和默认 task library 改正确,再接后台。否则只是把偏掉的任务接得更稳。

---

## 10. 成功标准

一个 task 只有满足下面条件,才进入默认实验:

1. 无规范时失败原因是 agent-agent interdependence。
2. 最小解是共享、全称、类型化规范,不是坐标/身份补丁。
3. 宽规则/旧规则在后续任务中会产生可解释的失败或冗余。
4. 后期任务不是小地图拼接,而是旧规范改变路径/时序后诱发新冲突。
5. 高阶任务必须有 partial-law failure chain,不能只是多个局部失败并列。
6. solver 能报告最小 norm 数和 search cost;如果暂时不能 exact exhaustive,必须标注 calibration,不能伪造。

---

## 11. 当前判断

旧版已经证明引擎和 solver 能工作;v2 已把默认实验收紧到 social norm:

- `scan_before_pick` 已移出核心;
- 后期默认任务已不再使用分区拼接;
- human-facing shared rule 只覆盖真正社会规范;
- 下一步是做缓存操纵 UI/日志,以及把 `server.py/client.html` 接到这套 v2 task library。
