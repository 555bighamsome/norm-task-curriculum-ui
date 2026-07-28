# Queue / 排队 Task 设计

> **Archived extension idea.** 排队机制不属于当前V5实验，也未进入active
> primitive space或八个shift。

## 1. 结论

排队 task 可以设计,而且很适合研究:

```text
单纯增加 agent 数量什么时候会产生新的 social interaction?
```

但它不能只靠现在的 primitive 硬做。当前默认 primitive 是:

```text
MOVE:
  dest_zone=cold
  carrying=spill
  role_not=cleaner
  move_dir=N / S / E / W
  contested=True

USE:
  role=carrier
  role=operator
  contested=True
```

这套语言能表达:

```text
两个机器人同时抢同一格
两个机器人同时抢同一台机器
```

但它不能表达真正排队需要的关系:

```text
机器已经被占用
谁先到队列
谁在队首
谁前面还有人
等待位置会不会堵住别人
```

所以排队 task 要做得干净,需要加最少量的新机制和 primitive。

---

## 2. 为什么当前版本还不能干净测排队

当前引擎里的 `USE` 是瞬时动作:

```text
机器人使用机器
同一 tick 两个机器人使用同一机器 -> resource-conflict
使用完以后 goal 完成
```

这更像:

```text
同时抢机器
```

还不是:

```text
机器被一个机器人占用一段时间
其他机器人要在外面排队等待
```

如果只增加 agent 数量,会出现两种坏情况:

1. **退化成普通资源冲突**

```text
三个机器人同时用机器
-> 还是 resource-conflict
-> 和两个机器人没本质区别
```

2. **同角色死锁**

例如规则是:

```text
禁止 使用机器 当 机器人是搬运工 且 另一个机器人也要用同一机器
```

如果两个搬运工一起等机器,他们都会被这条规则禁止:

```text
搬运工 A 等
搬运工 B 也等
-> 没有队首概念
-> 死锁
```

这不是好 task,因为失败来自语言缺失,不是人类 norm search 失败。

---

## 3. 排队 task 需要的新机制

### 机制 1:机器服务时间

机器使用不应该是瞬时的,而应该有服务时间:

```text
machine.service_time = 2 或 3 ticks
```

当一个机器人开始使用机器:

```text
machine_busy=True
```

在服务完成前,其他机器人如果直接使用机器,会造成:

```text
resource-conflict / jam
```

### 机制 2:队列顺序

每个等待同一机器的机器人有一个 queue rank:

```text
queue_rank = 0  -> 队首
queue_rank > 0  -> 前面还有人
```

这个 rank 可以按以下方式确定:

```text
到达等待区的先后
或者
离机器更近者优先
```

为了让被试能理解,建议第一版用空间队列:

```text
越靠近机器,越靠前
```

这样 UI 上能看出来谁排在前面。

---

## 4. 建议新增 primitive

### USE 条件

最小新增:

```text
机器正在被使用
本机器人前面还有机器人在等同一机器
```

内部形式:

```text
machine_busy=True
queue_ahead=True
```

中文 UI:

```text
机器正在被使用
前面还有机器人在等这台机器
```

### 为什么不用 `机器是打包机`

排队不是因为机器名字叫打包机,而是因为:

```text
容量为 1
服务需要时间
多个 agent 想用同一资源
```

所以排队 primitive 应该是关系/状态 primitive,不是机器名称 primitive。

---

## 5. 排队规则的候选答案

### Q1. 基础 FIFO 排队

目标:

```text
多个同角色机器人依次使用同一台机器
```

最小规则:

```text
禁止 使用机器 当 前面还有机器人在等这台机器
```

内部:

```text
FORBID USE WHEN [queue_ahead=True]
```

如果机器服务时间也需要明确禁止:

```text
禁止 使用机器 当 机器正在被使用
禁止 使用机器 当 前面还有机器人在等这台机器
```

但更好的引擎设计是:

```text
machine_busy 是环境硬约束/事故条件
queue_ahead 是社会规范
```

这样 task 测的是排队顺序,不是机器物理状态。

---

### Q2. 角色优先队列

目标:

```text
操作员和搬运工都要用机器
操作员任务更紧急
搬运工需要让操作员先用
同角色之间仍按队列顺序
```

可能规则:

```text
禁止 使用机器 当 机器人是搬运工 且 另一个机器人也要用同一机器
禁止 使用机器 当 前面还有机器人在等这台机器
```

内部:

```text
FORBID USE WHEN [role=carrier & contested=True]
FORBID USE WHEN [queue_ahead=True]
```

实验意义:

```text
资源优先级 + 队列顺序组合
```

---

### Q3. 排队外溢堵路

目标:

```text
多个机器人排队等待机器
如果后来的机器人停在主通道,会挡住其他机器人完成目标
```

这需要额外 MOVE primitive:

```text
目标格是等待区
目标格是主通道
前方队列已满
```

第一版不建议做 Q3,因为它会把 primitive 空间拉大,也更难让人直观看懂。

---

## 6. 推荐的第一版 Queue Curriculum

### Q1: 两人抢机器,无队列

现有 L5 已覆盖:

```text
FORBID USE WHEN [role=carrier & contested=True]
```

这是资源分配,不是排队。

### Q2: 三人同机排队

场景:

```text
3 个搬运工都要使用同一台机器
机器 service_time = 2
等待位排成一条线
```

无规则:

```text
后面的机器人抢用忙碌机器 / 插队
```

需要:

```text
禁止 使用机器 当 前面还有机器人在等这台机器
```

测量:

```text
agent 数量从 2 增到 3 后,
同角色之间需要 queue order,
不是简单 role priority。
```

### Q3: 优先级 + 排队

场景:

```text
1 个操作员
2 个搬运工
同一机器
机器 service_time = 2
```

需要:

```text
禁止 使用机器 当 机器人是搬运工 且 另一个机器人也要用同一机器
禁止 使用机器 当 前面还有机器人在等这台机器
```

测量:

```text
人是否能把资源优先级 rule 和 queue rule 组合起来。
```

### Q4: 综合 queue warehouse

场景:

```text
冷链例外
路口让行
机器排队
```

需要:

```text
冷链例外 norm
让行 norm
队列 norm
```

这可以作为 L9,但不应该在没验证 Q2/Q3 前直接加入。

---

## 7. 为什么这是 social norm

排队不是单个 agent 的工艺流程,而是社会互依:

```text
我现在插队使用机器
会让已经等待的人失去公平顺序
也可能让资源冲突/拥堵发生
```

它满足本实验的 social norm 标准:

```text
共享
全称
类型化
跨场景可复用
由多 agent 互相影响产生
```

---

## 8. 不建议的排队设计

### 不建议 1:只加更多机器人抢机器

问题:

```text
这只是更大的 resource-conflict
不是排队
```

### 不建议 2:用机器人编号决定顺序

例如:

```text
机器人 0 先用
```

问题:

```text
不能跨场景复用
不是 type-level norm
```

### 不建议 3:用机器名称决定排队

例如:

```text
禁止 使用机器 当 机器是打包机
```

问题:

```text
这会封掉资源
不是排队规则
```

---

## 9. 实现清单

要把 queue task 真正加入项目,需要改:

```text
solver/wh_engine.py
  - Machine 加 service_time / busy_until 或 remaining_use_time
  - simulate 中处理机器占用
  - USE context 增加 machine_busy / queue_ahead

engine.js
  - 同步机器占用和 queue_ahead 逻辑
  - 每帧显示机器 busy 状态
  - agent panel 显示 waiting/queue 状态

solver/lab.py
  - primitive profile 加 queue_ahead
  - 生成 Q2/Q3/Q4 queue worlds

solver/task_generator.py
  - 新增 queue task specs
  - solver 验证 minimal norms

app.js
  - UI label:
    前面还有机器人在等这台机器
    机器正在被使用
```

建议先只实现:

```text
queue_ahead=True
service_time=2
Q2 三人同机排队
```

确认人类能看懂后,再扩到 Q3/Q4。
