---
name: neon-replicate
description: Replicate motion effects from reference videos. Use when user wants to copy/clone/replicate an existing motion effect, compare generated effects with originals, or iterate on effect accuracy.
---

# Neon Replicate — 动效复刻工作流

从参考视频分析运动规律，生成 .neon 文件复刻效果，截帧对比迭代优化。

**复刻目标**：形似而非像素级一致。抓住效果的"灵魂特征"，而不是描摹每一个细节。

## Prerequisites

> `{skill_dir}` is the directory where this SKILL.md file is located.

- `neon` skill 已安装（`neon` 命令可用）
- FFmpeg 已安装（`ffmpeg` 命令可用）

验证：
```bash
neon --version && ffmpeg -version | head -1
```

## Workflow Overview

```
1. 准备   → 创建工作目录，放入源视频
2. 分析   → 智能截帧 → 识别阶段灵魂 → 生成分析报告
3. 生成   → 基于报告创建 .neon → neon render
4. 对比   → 按阶段检查灵魂特征 → 定位问题
5. 迭代   → 每轮只修一个阶段 → 重新渲染 → 循环
```

## Step 1: 准备工作目录

```bash
mkdir -p replicate-<效果名>/analysis/frames
```

输入源可以是本地文件或 URL：
```bash
# 本地文件
cp /path/to/effect.mp4 replicate-<效果名>/source.mp4

# URL 下载
curl -L -o replicate-<效果名>/source.mp4 "<url>"
```

## Step 2: 智能截帧分析

### 第一阶段：粗扫描

以 2fps 截取全局概览帧：

```bash
bash {skill_dir}/scripts/extract-frames.sh coarse replicate-<效果名>/source.mp4 replicate-<效果名>/analysis/frames/
```

查看粗扫描帧，建立整体认知：
- 动效分几个阶段？每个阶段的"身份"是什么？
- 哪些时间段需要密集采样？

### 第二阶段：密集采样

对关键区间以 10fps 截帧（start 和 duration 单位为秒）：

```bash
bash {skill_dir}/scripts/extract-frames.sh dense replicate-<效果名>/source.mp4 replicate-<效果名>/analysis/frames/ <start> <duration>
```

可对多个区间分别执行。

### 输出分析报告

查看所有截帧后，将分析写入 `replicate-<效果名>/analysis/report.md`。

---

## 分析报告模板

**核心原则**：先识别"灵魂"（定义效果身份的特征），再补充细节。灵魂必须可量化、可验证。

```markdown
# 动效分析报告

## 基本信息
- 视频时长: Xms
- 分辨率: WxH（分析使用相对值，不依赖绝对分辨率）
- 背景色: #XXXXXX
- 阶段数: N

---

## 效果灵魂（时间线）

### 阶段 1: [阶段名] (0-Xms)

**灵魂特征**（定义这个阶段身份的可观测特征）：
- 运动方向: [具体描述，如"所有元素指向中心，角度误差 < 20°"]
- 运动曲线: [如"easeOutCubic，前 50% 时间完成 80% 位移"]
- 空间变化: [如"半径从 5% cMin 扩展到 25% cMin"]
- 视觉变化: [如"透明度从 100% 线性衰减到 0%"]

**验证方法**：
- [如何在截帧上确认这个特征存在]
- [测量哪几帧的什么数据]

**缺失后果**：
- [如果没有这个特征，效果会变成什么样]

**权重**: 🔴 关键 / 🟡 重要 / 🟢 锦上添花

---

### 阶段 2: [阶段名] (X-Yms)

**灵魂特征**：
- ...

**验证方法**：
- ...

**缺失后果**：
- ...

**权重**: 🔴/🟡/🟢

---

（继续添加更多阶段...）

---

## 特征分级总览

### 🔴 必须对齐（丢了就不是这个效果）
- 阶段 X 的 [具体特征]
- 阶段 Y 的 [具体特征]

### 🟡 尽量接近（影响质感）
- [具体特征]

### 🟢 可自由发挥（随机细节）
- 单个粒子的具体轨迹
- 精确的随机分布位置
- 微小的时间偏移

---

## 技术实现要点

### 渲染模式
- canvas 2D / WebGL / hybrid

### 核心算法
- [生成机制：粒子系统 / 数学曲线 / 噪声场 / 物理模拟]

### 后处理
- [bloom / blur / 混合模式等]

### 关键参数（相对单位）
| 参数 | 值 | 来源 |
|------|-----|------|
| 粒子数量 | ~100 | 从帧 X 密度估算 |
| 扩散速度 | 30% cW/s | 从帧 N→N+1 位移计算 |
| 初始半径 | 5% cMin | 从帧 X 测量 |
| ... | ... | ... |
```

### 灵魂特征的量化标准

**好的灵魂描述**（可验证）：
| 特征类型 | 量化示例 |
|----------|----------|
| 弹性回弹 | 过冲到目标的 80-90%，回弹到 105-115%，稳定在 98-102% |
| 向心运动 | 所有元素方向指向中心（误差 < 20°），速度随接近中心递减 |
| 呼吸扩散 | 半径 300ms 内从 5% 到 25% cMin，easeOutCubic（前半段完成 70%） |
| 脉冲闪烁 | 透明度在 100ms 内从 30% 跳到 100% 再回到 30%，每 500ms 重复 |
| 微浮动 | 振幅 2% cMin，周期 500ms 的正弦波动 |

**差的灵魂描述**（无法验证）：
- ❌ "Q弹感" → ✅ "过冲 15%，回弹 10%，200ms 内稳定"
- ❌ "吸引力感" → ✅ "方向指向中心，速度 easeOut 递减"
- ❌ "呼吸感" → ✅ "半径扩展曲线 easeOutCubic"
- ❌ "活着的感觉" → ✅ "振幅 2% cMin、周期 500ms 的微浮动"

### 自检 Refine（必须）

写完 report.md 初稿后，执行自检：

1. **灵魂可验证吗**：每个灵魂特征是否有具体数值和验证方法？能否在截帧上测量确认？
2. **权重合理吗**：🔴 标记的特征真的是"丢了就不是这个效果"吗？
3. **阶段划分对吗**：是否有遗漏的阶段？阶段边界是否准确？

### 用户确认（必须）

将 report.md 的阶段灵魂展示给用户，询问：

- 阶段划分是否准确？
- 灵魂特征是否抓对了？有无需要调整的权重？
- 有无额外的设计意图或实现提示？

将用户反馈合并到 report.md 末尾：

```markdown
## 用户补充
- [用户提供的额外信息、纠正、权重调整]
```

**report.md 经过自检 + 用户确认后，才可进入 Step 3。**

## Step 3: 生成初版效果

使用 `neon` skill 基于分析报告创建 .neon 文件：

```bash
# 创建本轮目录
mkdir -p replicate-<效果名>/round-01/comparison

# 生成 .neon 文件（按 neon skill 规范）
# → replicate-<效果名>/round-01/effect.neon

# 验证 + 渲染
neon validate replicate-<效果名>/round-01/effect.neon
neon render replicate-<效果名>/round-01/effect.neon -o replicate-<效果名>/round-01/output.mp4
```

## Step 4: 按阶段对比

### 生成对比图

```bash
bash {skill_dir}/scripts/extract-frames.sh compare \
  replicate-<效果名>/source.mp4 \
  replicate-<效果名>/round-01/output.mp4 \
  replicate-<效果名>/round-01/comparison/
```

### 按阶段检查灵魂

将对比分析写入 `replicate-<效果名>/round-01/notes.md`。

**对比原则**：
1. 先整体播放，获得第一印象
2. 按阶段逐个检查灵魂特征
3. 只关注 🔴 和 🟡 特征，忽略 🟢 细节
4. 每轮只定位一个最关键的问题

---

## 对比报告模板

```markdown
# 对比报告 - Round 01

## 第一印象

并排播放两个视频（不暂停），回答：
- 它们"感觉"像同一个效果吗？ [是/否]
- 如果不像，第一反应哪里不对？ [简短描述]

---

## 阶段检查

### 阶段 1: [阶段名] (0-Xms)

**灵魂特征**: [从 report.md 复制]

**原始测量**:
- 帧 N (Xms): [测量值]
- 帧 N+1 (Yms): [测量值]
- 帧 N+2 (Zms): [测量值]

**生成测量**:
- 帧 N (Xms): [测量值]
- 帧 N+1 (Yms): [测量值]
- 帧 N+2 (Zms): [测量值]

**结论**: ✅ 灵魂对了 / ❌ 灵魂不对

**问题**（如果不对）: [具体描述差异]

---

### 阶段 2: [阶段名] (X-Yms)

...

---

## 本轮修复

### 最关键的问题
- 阶段: [哪个阶段]
- 灵魂特征: [哪个特征不对]
- 具体差异: [原始 vs 生成的测量值]
- 修复方案: [代码层面怎么改]

### 暂不修复
- [列出发现但本轮不修的问题，留待后续]

---

## 迭代决策

### 🔴 重写（灵魂完全错了）
当阶段的核心运动方式就是错的，无法通过调参修复。
- 例：目标是"向心汇聚"，当前是"随机飘散"

### 🟡 重构（灵魂方向对，实现有缺陷）
运动方向对，但缺少关键特征或节奏不对。
- 例：有向心运动，但缺少 easeOut 减速

### 🟢 调参（灵魂对了，数值偏差）
特征都在，只是参数不够精确。
- 例：过冲幅度是 10% 而不是 15%

**选择**: 🔴/🟡/🟢
**依据**: [具体说明]
```

## Step 5: 迭代优化

**核心原则**：每轮只修一个阶段的一个问题。

### 5.1 执行修复

**🔴 重写**：从 report.md 重新生成该阶段的代码逻辑。

```bash
mkdir -p replicate-<效果名>/round-02/comparison
# 重写 effect.neon 中对应阶段的代码
```

**🟡 重构**：保留正确部分，重写问题代码段。

```bash
mkdir -p replicate-<效果名>/round-02/comparison
cp replicate-<效果名>/round-01/effect.neon replicate-<效果名>/round-02/effect.neon
# 重构有问题的代码段
```

**🟢 调参**：只修改参数值。

```bash
mkdir -p replicate-<效果名>/round-02/comparison
cp replicate-<效果名>/round-01/effect.neon replicate-<效果名>/round-02/effect.neon
# 调整参数数值
```

### 5.2 渲染 + 对比

```bash
neon validate replicate-<效果名>/round-02/effect.neon
neon render replicate-<效果名>/round-02/effect.neon -o replicate-<效果名>/round-02/output.mp4
bash {skill_dir}/scripts/extract-frames.sh compare \
  replicate-<效果名>/source.mp4 \
  replicate-<效果名>/round-02/output.mp4 \
  replicate-<效果名>/round-02/comparison/
```

### 5.3 落盘 notes.md（必须）

将对比分析写入 `replicate-<效果名>/round-02/notes.md`。

**notes.md 是必须产出物**，每轮的 notes.md 是下一轮迭代的输入依据。

### 停止条件

1. **所有 🔴 阶段的灵魂都对了** → 可以停止
2. **用户满意** → 停止
3. **达到 5 轮上限** → 停止或与用户讨论

### 停滞检测

如果连续 2 轮选择 🟢 调参但改进不明显：
- 可能触及实现上限，需要 🟡 重构或 🔴 重写
- 或者当前效果已经足够好，可以停止

## 文件结构

```
replicate-<效果名>/
├── source.mp4
├── analysis/
│   ├── frames/        # coarse_*.jpg + dense_*.jpg
│   └── report.md      # 包含阶段灵魂定义
├── round-01/
│   ├── effect.neon
│   ├── output.mp4
│   ├── comparison/    # compare_*.jpg
│   └── notes.md       # 按阶段的对比报告
└── round-N/
```

## Important Rules

1. **灵魂优先于细节**：先确保每个阶段的灵魂特征对了，再考虑细节。🟢 细节可以不同，🔴 灵魂必须对。

2. **灵魂必须可量化**：每个灵魂特征都要有具体数值和验证方法。"Q弹感"不是灵魂，"过冲 15%，回弹 10%"才是灵魂。

3. **每轮只修一个问题**：不要试图一次修复所有问题。修一个，验证，再修下一个。

4. **第一印象很重要**：并排播放时的直觉判断往往比逐帧分析更能反映真实差距。

5. **停止条件是"灵魂对了"**：不是"完全一致"。如果所有 🔴 特征都对了，细节有差异也可以接受。

6. **相对单位**：全部使用 `% cW`、`% cH`、`% cMin`。禁止 px 绝对值。

7. **每轮独立保存**：不覆盖历史轮次，保留迭代过程。

8. **.neon 遵循 neon skill 规范**：deterministic、relative sizing、canvas.width/height 等。
