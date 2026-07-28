# Constraint 复杂度排序

> **Archived calibration.** 本文记录早期task family与`human_medium`
> 空间。当前V5的精确结果与复杂度轨迹见
> [STUDY_DESIGN_V5.md](STUDY_DESIGN_V5.md)，solver说明见
> [SOLVER_DESIGN.md](SOLVER_DESIGN.md)。

本文档给当前 grid social-norm task 的 constraint 复杂度做一个排序。这里的 constraint 指:

```text
FORBID <action> WHEN <condition conjunction>
```

当前默认 primitive profile 是 `human_medium`:

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

当前搜索空间:

```text
10 condition primitives
63 candidate constraints
每条 constraint 最多 3 个 condition
```

注意:这里要区分两层复杂度。

```text
单条 constraint 复杂度
task / constraint-set 复杂度
```

单条 constraint 复杂度看一条规则本身有多复杂。  
constraint-set 复杂度看一个 task 需要组合几条规则,以及这些规则是否互相诱发新问题。

---

## 1. 单条 Constraint 复杂度排序

### C1. 单条件静态保护

形式:

```text
FORBID MOVE WHEN [dest_zone=cold]
```

中文:

```text
禁止移动进入格子,当目标格是冷链区
```

复杂度:

```text
condition 数 = 1
MDL = 2
不需要理解 agent 角色
不需要理解另一个 agent 的同时意图
```

实验含义:

```text
最容易搜索到
但通常过宽
适合 L1 作为 cached broad rule
```

风险:

```text
它会误伤合法入库工和清洁工
所以不能作为后期 task 的最终好规则
```

当前出现:

```text
L1 外部性保护
```

---

### C2. 两条件静态精确保护

形式:

```text
FORBID MOVE WHEN [dest_zone=cold & carrying=spill]
```

中文:

```text
禁止移动进入格子,当目标格是冷链区 且 机器人带着泄漏物
```

复杂度:

```text
condition 数 = 2
MDL = 3
需要同时考虑 target 属性和 self 属性
仍然不需要理解另一个 agent 的同步动作
```

实验含义:

```text
从宽规则精化到 harm-based rule
测 precision pressure
```

当前出现:

```text
L2 精度压力
L6 污染诱发路口
```

---

### C3. 两条件关系协调

形式:

```text
FORBID MOVE WHEN [move_dir=N & contested=True]
FORBID MOVE WHEN [move_dir=S & contested=True]
FORBID MOVE WHEN [move_dir=E & contested=True]
FORBID MOVE WHEN [move_dir=W & contested=True]
```

中文:

```text
让行,当两个机器人要进同一格 且 本机器人朝某方向行驶
```

复杂度:

```text
condition 数 = 2
MDL = 3
但语义比 C2 更难
因为 contested=True 是 relational / dynamic condition
```

为什么比 C2 难:

```text
C2 只看本机器人和目标格
C3 要理解两个 agent 的同步意图
C3 的方向条件本身没有道德含义,只是破缺对称的约定
```

实验含义:

```text
真正的 coordination norm
测任意但共享的社会约定
也是 silly-looking rule 的来源之一
```

当前出现:

```text
L4 北向让行
L4b 南向让行
L4c 东向让行
L4d 西向让行
L6/L7/L8 的诱发协调部分
```

---

### C4. 两条件资源分配

形式:

```text
FORBID USE WHEN [role=carrier & contested=True]
```

中文:

```text
使用机器时,如果另一个机器人也要用同一机器,搬运工让行
```

复杂度:

```text
condition 数 = 2
MDL = 3
relational / dynamic
同时涉及角色优先级
```

为什么和 C3 不完全一样:

```text
C3 是空间协调
C4 是共享资源分配
C4 不改变路径,改变的是谁先使用容量为 1 的资源
```

实验含义:

```text
测 scarce resource norm
不是安全规则,而是社会优先级规则
```

当前出现:

```text
L5 资源分配
L8/L8b 综合仓库
```

---

### C5. 三条件角色例外保护

形式:

```text
FORBID MOVE WHEN [dest_zone=cold & carrying=spill & role_not=cleaner]
```

中文:

```text
禁止移动进入格子,
当目标格是冷链区 且 机器人带着泄漏物 且 清洁工除外
```

复杂度:

```text
condition 数 = 3
MDL = 4
需要 target + self + role exception
```

为什么更复杂:

```text
不是简单地“越危险越禁止”
而是要区分 harmful actor 和 legitimate repair role
同一表面动作对搬运工有害,对清洁工合法
```

实验含义:

```text
测 refinement / exception
也测人是否能从 cached precise rule 继续加例外
```

当前出现:

```text
L3 清洁工例外
L3b 多机器人冷链
L3c 规模冷链生成
L7/L7b/L8/L8b
```

---

## 2. 当前单条 Constraint 的推荐复杂度顺序

从简单到复杂:

```text
1. FORBID MOVE WHEN [dest_zone=cold]

2. FORBID MOVE WHEN [dest_zone=cold & carrying=spill]

3. FORBID MOVE WHEN [move_dir=N/S/E/W & contested=True]

4. FORBID USE WHEN [role=carrier & contested=True]

5. FORBID MOVE WHEN [dest_zone=cold & carrying=spill & role_not=cleaner]
```

说明:

```text
3 和 4 的 MDL 都是 3,但语义上都比静态精确保护更难。
5 的 MDL 最高,而且包含 role exception,所以是当前单条 constraint 中最复杂的。
```

---

## 3. Constraint-Set / Task 复杂度排序

这里排序的是一个 task 最少需要几条 constraints,以及这些 constraints 是否互相诱发新冲突。

### T1. 单条宽保护

最小 constraint-set:

```text
FORBID MOVE WHEN [dest_zone=cold]
```

复杂度:

```text
1 条 constraint
无例外
无关系协调
无资源分配
```

当前 task:

```text
L1 外部性保护
```

---

### T2. 单条精确保护

最小 constraint-set:

```text
FORBID MOVE WHEN [dest_zone=cold & carrying=spill]
```

复杂度:

```text
1 条 constraint
2 个 condition
解决 over-broad rule 的误伤
```

当前 task:

```text
L2 精度压力
```

---

### T3. 单条关系协调 / 资源分配

最小 constraint-set:

```text
FORBID MOVE WHEN [move_dir=N/S/E/W & contested=True]
```

或:

```text
FORBID USE WHEN [role=carrier & contested=True]
```

复杂度:

```text
1 条 constraint
但需要理解 contested=True
不是静态属性规则
```

当前 task:

```text
L4/L4b/L4c/L4d 路口让行
L5 资源分配
```

---

### T4. 单条三条件例外

最小 constraint-set:

```text
FORBID MOVE WHEN [dest_zone=cold & carrying=spill & role_not=cleaner]
```

复杂度:

```text
1 条 constraint
3 个 condition
包含 exception
```

当前 task:

```text
L3 清洁工例外
L3b 多机器人冷链
L3c 规模冷链生成
```

重要:

```text
L3b/L3c 的 agent 数量更多,地图更大,但 constraint-set 复杂度没有增加。
这类 task 测的是 scale compression,不是 norm count 增长。
```

---

### T5. 两条 constraints:保护 + 诱发协调

最小 constraint-set:

```text
FORBID MOVE WHEN [dest_zone=cold & carrying=spill]
FORBID MOVE WHEN [move_dir=N & contested=True]
```

复杂度:

```text
2 条 constraints
第一条保护共享状态
第一条改变路径后诱发第二个空间协调问题
```

当前 task:

```text
L6 污染诱发路口
```

为什么比 T4 难:

```text
难点不是单条规则更长
而是旧规则解决一个问题后制造/暴露另一个问题
```

---

### T6. 两条 constraints:例外保护 + 诱发协调

最小 constraint-set:

```text
FORBID MOVE WHEN [dest_zone=cold & carrying=spill & role_not=cleaner]
FORBID MOVE WHEN [move_dir=N/S & contested=True]
```

复杂度:

```text
2 条 constraints
包含三条件 exception
包含 relational coordination
包含 cached norm refinement
```

当前 task:

```text
L7 例外 + 诱发路口
L7b 例外 + 南向诱发
```

---

### T7. 三条 constraints:综合社会系统

最小 constraint-set:

```text
FORBID MOVE WHEN [dest_zone=cold & carrying=spill & role_not=cleaner]
FORBID MOVE WHEN [move_dir=N/S & contested=True]
FORBID USE WHEN [role=carrier & contested=True]
```

复杂度:

```text
3 条 constraints
保护共享状态
空间协调
资源分配
三类 social interdependence 同时存在
```

当前 task:

```text
L8 综合社会仓库
L8b 综合仓库镜像
```

这是当前 curriculum 最高复杂度。

---

## 4. 当前 Task 按 Constraint 复杂度排序

同一复杂度、同一机制的 counterbalanced variants 会合并显示,例如 L4/L4b/L4c/L4d。

| 排序 | task | agents | 最少 constraints | total MDL | solver search cost | 复杂度类型 |
|---:|---|---:|---:|---:|---:|---|
| 1 | L1 外部性保护 | 2 | 1 | 2 | 127 | 单条件宽保护 |
| 2 | L2 精度压力 | 2 | 1 | 3 | 127 | 两条件精确保护 |
| 3 | L4/L4b/L4c/L4d 路口让行 | 2 | 1 | 3 | 127 | 关系协调 |
| 4 | L5 资源分配 | 2 | 1 | 3 | 127 | 资源协调 |
| 5 | L3 清洁工例外 | 3 | 1 | 4 | 127 | 三条件例外 |
| 6 | L3b 多机器人冷链 | 5 | 1 | 4 | 127 | scale compression |
| 7 | L3c 规模冷链生成 | 7 | 1 | 4 | 127 | generated scale compression |
| 8 | L6 污染诱发路口 | 3 | 2 | 6 | 234 | 保护 + 诱发协调 |
| 9 | L7b 例外 + 南向诱发 | 4 | 2 | 7 | 1199 | 例外 + 镜像诱发协调 |
| 10 | L7 例外 + 诱发路口 | 4 | 2 | 7 | 1262 | 例外 + 诱发协调 |
| 11 | L8 综合社会仓库 | 6 | 3 | 10 | 13666 | 保护 + 空间协调 + 资源分配 |
| 12 | L8b 综合仓库镜像 | 6 | 3 | 10 | compositional | 镜像综合系统 |

说明:

```text
L3b/L3c 的地图更大、agent 更多,但 constraint complexity 不比 L3 更高。
这正是它们的实验价值:区分视觉/规模复杂度和规范结构复杂度。
```

---

## 5. 已删除或不应进入默认空间的 Primitive

### `machine=packer`

删除原因:

```text
当前只有一类机器 packer
单独写 FORBID USE WHEN [machine=packer] 等于永远禁止使用机器
没有社会协调含义
```

除非以后加入多种机器:

```text
packer / charger / sanitizer / dock
```

否则 `machine=packer` 不应该是默认 primitive。

### `dest_zone=intersection`

不进入默认空间的原因:

```text
它会让人写出“禁止进入路口”这种局部封路规则
这不是社会规范,而是地图补丁
```

我们希望路口协调来自:

```text
move_dir + contested
```

而不是:

```text
target cell is intersection
```

### 坐标 / 机器人编号

不进入默认空间的原因:

```text
不能跨场景复用
会破坏 type-level social norm
会让实验变成记地图/点名机器人
```

---

## 6. 推荐 Curriculum 顺序

如果按 constraint 复杂度安排实验,推荐顺序是:

```text
L1
L2
L3
L3b 或 L3c
L4 系列中的一个方向
L4 counterbalanced 方向
L5
L6
L7 或 L7b
L8 或 L8b
```

如果想测缓存复用:

```text
L1 -> L2 -> L3 -> L3c -> L7 -> L8
```

如果想测任意协调 / silly-looking convention:

```text
L4 -> L4b -> L4c -> L4d -> L7b -> L8b
```

如果想测规模误导:

```text
L3 -> L3b -> L3c
```

核心判断:

```text
agent 数量和地图大小可以增加视觉难度,
但只有当最少 constraint 数、condition 数、或 constraint 之间的诱发关系增加时,
才算规范结构复杂度增加。
```
