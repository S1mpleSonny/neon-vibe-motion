# Neon - AI 驱动的参数化动效生成平台

Neon 是一个基于 LLM 的动效生成与实时控制平台。用户通过自然语言描述生成 Canvas 2D 动效，AI 同时输出可执行渲染代码与可调参数声明，用户在参数面板实时驱动画面变化，实现"生成即可控"的动效生产流程。

> "If it compiles, it is good; if it boots up, it is perfect."

[English](./README.md)

![Neon Demo](./assets/demo.gif)

## 为什么开源

Neon 是目前首个开源的、支持实时参数控制的 AI 动效设计工具（参考 [Higgsfield](https://higgsfield.ai) 对 Vibe Motion 的定义；如有不准确之处，欢迎提 Issue，我会尽快修正）。

开源的契机是看到 Higgsfield 发布了 Vibe Motion 产品——与我近几周在 [BILIBILI](https://bilibili.com/) 上做的工作方向不谋而合。实际体验后发现，Higgsfield 的 Vibe Motion 产品与其宣传描述大相径庭，作为付费产品未达到合格水平，也不能代表 Vibe Motion 这个方向的天花板。

因此我整理了近期的工作，将 Neon 基础版本开源，希望能和社区一起探索 Vibe Motion 的可能性。

推荐搭配 **Gemini 3.0 Flash / Gemini 3.1 Pro** 或其他具备多模态能力的大模型使用，have fun!

> **关于技术栈**：本项目是纯前端应用，后端仅用于代理 LLM API 请求以绕过浏览器 CORS 限制。本人并非专业前端工程师，如果你有更优雅的方案，欢迎随时提 PR。

## 当前思考

目前此项目的最佳实践是通过 Claude Code 直接生成 `.neon` 草稿文件，然后逐步调优。Claude Code 的上下文工程能力非常出色，最近一直在编写各种 skill 进行探索。

总体来看，Vibe Motion 整个方向目前仍处于玩具阶段，尚未达到可发布产品的质量。以下是一些零散的想法和实践经验：

1. **渲染能力的天花板太低** — 纯 Canvas 2D + WebGL 后处理的效果还是太 naive。如果引入 Remotion 和 SVG 的支持，知识科普类动画的上限会高出不少。
2. **3D 效果不及预期** — 之前尝试过 Three.js，生成出来的东西纯属玩具，没有任何惊艳感。
3. **缺乏上下文管理** — 比如让 LLM 按需加载预设风格、维护迭代记忆等。不过 Claude Code 的 skill 机制也许可以完美替代这个流程。
4. **高精度复刻不是正确方向** — skill 里的 Motion 复刻流程玩了一段时间，感觉前景有限。LLM 的价值不应局限于高精度还原，而是以量取胜——快速生成大量变体，再从中筛选。
5. **缺少分阶段绘制能力** — 目前 Neon 很难自发形成分阶段绘制动效的概念，导致提示词单一时效果比较单调。
6. **流体模拟效果差** — 当前的流体模拟表现不佳。

---

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装与启动

```bash
pnpm install
pnpm dev
```

访问 http://localhost:5173 打开应用。

### 其他命令

```bash
pnpm build       # 构建生产版本
pnpm lint        # 代码检查
pnpm test        # 运行测试
pnpm typecheck   # 类型检查
pnpm preview     # 预览生产构建
```

### 首次使用

1. 点击"设置"配置 LLM API（支持 OpenAI 兼容接口）
2. 在对话面板输入动效描述，如"一个赛博朋克风格的数据增长柱状图，柱体从底部弹入"
3. 画布实时预览生成的动效
4. 在右侧参数面板调整颜色、速度、素材等参数
5. 导出为视频、HTML 资产包或 `.neon` 会话存档

---

## 特性概览

### 结构化生成

与传统 AI 视频工具直接输出不可编辑的视频文件不同，Neon 的 LLM 输出的是一份 **结构化动效定义（MotionDefinition）**——包含可执行的渲染函数、可调参数声明、时长配置和后处理链。每一次生成的结果都是"活的"：用户拿到的不是死文件，而是一个可实时操控的动效程序。

- **智能澄清** — Prompt 模糊时 AI 主动提问，减少无效生成
- **自动错误修复** — 运行时异常自动调用 LLM 修复代码，最多 3 次自愈

```
自然语言描述 → [智能澄清] → LLM 生成 MotionDefinition → 渲染引擎实时渲染
                                       ↓
                              参数面板 ← 可调参数声明
                                       ↓
                              用户调参 → 画面实时更新 → 导出视频 / HTML / 会话存档
```

### 渲染引擎

**Canvas 2D** — 基于 HTML5 Canvas 2D API，适用于平面动态图形、数据可视化、文字动效、粒子系统等场景。

- `requestAnimationFrame` 驱动 60fps 实时渲染
- 内置确定性随机数生成器（Seeded PRNG），同一参数下动效逐帧可复现
- 支持图片、视频素材的预加载与画面合成

**后处理（GLSL）** — 支持全屏后处理着色器链，可叠加辉光、模糊、色彩校正、畸变等效果。

### 参数类型

LLM 根据动效语义智能声明可调参数，用户在参数面板实时调节：

| 类型 | 用途 | 典型场景 |
|------|------|----------|
| `number` | 数值滑块 | 速度、大小、透明度 |
| `color` | 颜色选择器 | 主色调、背景色、描边色 |
| `select` | 下拉选择 | 动画模式、字体风格 |
| `boolean` | 开关 | 显示/隐藏元素、启用特效 |
| `string` | 文本输入 | 标题文字、标签内容 |
| `image` | 图片上传 | 背景图、Logo、贴图素材 |
| `video` | 视频上传 | 背景视频、画中画 |

动效时长不是固定值——LLM 可生成 `durationCode` 表达式，根据参数值（如视频长度）动态计算总时长，确保多素材协同时时间轴始终准确。

---

## 导出

### 视频

| 格式 | 模式 | 输出 |
|------|------|------|
| MP4 | RGB | 单个 .mp4 文件 |
| MP4 | RGB + Alpha | ZIP 包含 RGB.mp4 + Alpha.mp4，可直接用于 AE/Premiere 合成 |
| WebM | RGB | 单个 .webm 文件 |

- 分辨率：720p / 1080p / 4K
- 帧率：24 / 30 / 60 fps
- 基于 h264-mp4-encoder 逐帧编码，非实时录屏

### HTML 资产包

一键导出零依赖的 `.html` 文件，内嵌渲染代码和资源，用户可选择导出哪些参数。可直接部署到网页或分享给开发者集成。

### 会话存档

整个对话过程（Prompt、参数快照、附件）可导出为 `.neon` 文件，支持跨设备迁移、团队共享和版本备份。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 18.3 + TypeScript 5.6 |
| 状态管理 | Zustand 5.0 |
| 构建工具 | Vite 6.0 |
| 样式 | Tailwind CSS 3.4 |
| 2D 渲染 | Canvas 2D API |
| 视频编码 | h264-mp4-encoder 1.0 |
| 路由 | React Router DOM 7.12 |
| 存储 | localStorage + IndexedDB |
| LLM 接口 | OpenAI 兼容 API |

## 项目结构

```
src/
├── components/              # UI 组件
│   ├── common/              # 通用组件 (Button, Input, Slider, Toast...)
│   ├── ChatPanel/           # 对话面板（含澄清流程、错误自修复、多模态附件）
│   ├── PreviewCanvas/       # 实时预览画布（含播放控制、性能监控）
│   ├── ParameterPanel/      # 参数调整面板
│   ├── DemoGallery/         # 效果展示画廊
│   ├── SettingsDialog/      # LLM 配置对话框
│   └── ExportDialog/        # 导出对话框（视频/资产包）
├── services/                # 业务服务
│   ├── llm/                 # LLM 客户端、Prompt 工程、澄清流程、错误修复
│   ├── renderer/            # 渲染引擎（Canvas 2D / GLSL 后处理）
│   ├── parameter/           # 资源预加载（图片、视频、序列帧）
│   ├── exporter/            # 导出管线（逐帧编码 → H.264 → MP4）
│   └── storage/             # 持久化（localStorage + IndexedDB）
├── stores/                  # Zustand 状态管理
│   └── appStore.ts          # 应用全局状态
├── hooks/                   # 自定义 Hooks
├── utils/                   # 工具函数（确定性随机、代码校验）
├── types/                   # TypeScript 类型定义
└── App.tsx                  # 应用入口
```

## 参与贡献

见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

[BSD 3-Clause](./LICENSE)
