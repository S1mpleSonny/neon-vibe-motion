# Neon - AI-Driven Parametric Motion Generation Platform

Neon is an LLM-based motion graphics generation and real-time control platform. Describe effects in natural language, get Canvas 2D motion graphics with executable rendering code and adjustable parameter declarations. Tweak parameters in real time, export as video or standalone HTML — "generate and control" in one workflow.

> "If it compiles, it is good; if it boots up, it is perfect."

[中文文档](./README.zh-CN.md)

![Neon Demo](./assets/demo.gif)

## Why Open Source

Neon is the first open-source AI motion design tool with real-time parameter control (referencing [Higgsfield](https://higgsfield.ai)'s definition of Vibe Motion; if this claim is inaccurate, please open an Issue and I'll correct it promptly).

The catalyst was [Higgsfield](https://higgsfield.ai) releasing their Vibe Motion product — which turned out to be remarkably aligned with the work I'd been doing on [BILIBILI](https://space.bilibili.com/) over the past couple of weeks. After trying it, I found the actual experience fell far short of the marketing claims. As a paid product, it was nowhere near acceptable, and certainly doesn't represent the ceiling of what Vibe Motion can be.

So I open-sourced the base version of my recent work, hoping to explore the future of Vibe Motion together with the community.

Recommended models: **Gemini 3.0 Flash / Gemini 3.1 Pro** or other multimodal-capable LLMs. Have fun!

> **On the tech stack**: This is a pure frontend app. The backend exists solely to proxy LLM API requests around browser CORS restrictions. I'm not a professional frontend engineer — if you have a cleaner solution, PRs are always welcome.

## Current Thoughts

The best workflow right now is using Claude Code to generate `.neon` draft files directly, then iterating from there. Claude Code's context engineering is excellent — I've been writing various skills to explore this.

Overall, Vibe Motion as a category is still at the toy stage — nowhere near shippable product quality. Some scattered observations and lessons learned:

1. **The rendering ceiling is too low** — Pure Canvas 2D + WebGL post-processing is still too naive. Adding Remotion and SVG support could significantly raise the bar for educational/explainer animations.
2. **3D results are underwhelming** — Tried Three.js earlier; the output was pure toy, nothing impressive.
3. **No context management** — Things like on-demand preset style loading, iteration memory, etc. are missing. That said, Claude Code's skill system might be a perfect substitute for this workflow.
4. **Pixel-perfect replication is the wrong goal** — Spent time on motion replication skills; limited upside. LLM value shouldn't be in high-fidelity reproduction — it should be in volume: generate many variants fast, then curate.
5. **Lacks staged rendering** — Neon currently struggles to form a concept of phased/staged effect drawing on its own, making output monotonous when prompts are simple.
6. **Poor fluid simulation** — Fluid simulation results are underwhelming.

---

## Quick Start

### Requirements

- Node.js >= 18
- pnpm >= 8

### Install & Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173 to launch the app.

### Other Commands

```bash
pnpm build       # Production build
pnpm lint        # Lint
pnpm test        # Test
pnpm typecheck   # Type check
pnpm preview     # Preview production build
```

### First Use

1. Click "Settings" to configure your LLM API (any OpenAI-compatible endpoint)
2. Type a motion description in the chat panel, e.g. "A cyberpunk-style bar chart with bars bouncing in from the bottom"
3. The canvas previews the generated effect in real time
4. Adjust colors, speed, assets, and more in the parameter panel
5. Export as video, HTML asset pack, or `.neon` session archive

---

## Features

### Structured Generation

Unlike traditional AI video tools that output static, uneditable video files, Neon's LLM produces a **structured motion definition (MotionDefinition)** — containing executable render functions, adjustable parameter declarations, duration config, and a post-processing chain. Every generation result is "alive": what users get is not a dead file, but a real-time controllable motion program.

- **Smart Clarification** — When a prompt is vague, the AI asks targeted questions before generating, cutting wasted cycles
- **Auto Error Recovery** — Runtime exceptions trigger automatic LLM-based code repair, up to 3 self-healing attempts

```
Natural language prompt → [Smart Clarification] → LLM generates MotionDefinition → Render engine plays in real time
                                                          ↓
                                                Parameter panel ← Adjustable parameter declarations
                                                          ↓
                                                User tunes params → Live update → Export video / HTML / session archive
```

### Rendering Engine

**Canvas 2D** — Built on the HTML5 Canvas 2D API. Ideal for flat motion graphics, data visualization, text animations, and particle systems.

- `requestAnimationFrame`-driven 60fps real-time rendering
- Built-in seeded PRNG — same parameters produce frame-identical output
- Image and video asset preloading with compositing

**Post-Processing (GLSL)** — Full-screen shader chain supporting bloom, blur, color correction, distortion, and more.

### Parameter Types

The LLM intelligently declares adjustable parameters based on effect semantics. Users tweak them in real time via the parameter panel:

| Type | Control | Typical Use |
|------|---------|-------------|
| `number` | Slider | Speed, size, opacity |
| `color` | Color picker | Primary color, background, stroke |
| `select` | Dropdown | Animation mode, font style |
| `boolean` | Toggle | Show/hide elements, enable effects |
| `string` | Text input | Title text, label content |
| `image` | Image upload | Background, logo, texture assets |
| `video` | Video upload | Background video, picture-in-picture |

Effect duration is not fixed — the LLM can generate a `durationCode` expression that computes total duration from parameter values (e.g., video length), keeping the timeline accurate when multiple assets are combined.

---

## Export

### Video

| Format | Mode | Output |
|--------|------|--------|
| MP4 | RGB | Single .mp4 file |
| MP4 | RGB + Alpha | ZIP containing RGB.mp4 + Alpha.mp4, ready for AE/Premiere compositing |
| WebM | RGB | Single .webm file |

- Resolution: 720p / 1080p / 4K
- Frame rate: 24 / 30 / 60 fps
- Frame-by-frame encoding via h264-mp4-encoder, not screen recording

### HTML Asset Pack

One-click export to a zero-dependency `.html` file with embedded render code and assets. Users choose which parameters to expose. Deploy directly to the web or hand off to developers for integration.

### Session Archive

The entire conversation (prompts, parameter snapshots, attachments) can be exported as a `.neon` file for cross-device migration, team sharing, and version backup.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.3 + TypeScript 5.6 |
| State | Zustand 5.0 |
| Build | Vite 6.0 |
| Styling | Tailwind CSS 3.4 |
| 2D Rendering | Canvas 2D API |
| Video Encoding | h264-mp4-encoder 1.0 |
| Routing | React Router DOM 7.12 |
| Storage | localStorage + IndexedDB |
| LLM Interface | OpenAI-compatible API |

## Project Structure

```
src/
├── components/              # UI components
│   ├── common/              # Shared (Button, Input, Slider, Toast...)
│   ├── ChatPanel/           # Chat panel (clarification, auto-fix, multimodal attachments)
│   ├── PreviewCanvas/       # Live preview canvas (playback controls, performance monitoring)
│   ├── ParameterPanel/      # Parameter panel
│   ├── DemoGallery/         # Effect demo gallery
│   ├── SettingsDialog/      # LLM config dialog
│   └── ExportDialog/        # Export dialog (video / asset pack)
├── services/                # Core services
│   ├── llm/                 # LLM client, prompt engineering, clarification, error repair
│   ├── renderer/            # Render engine (Canvas 2D / GLSL post-processing)
│   ├── parameter/           # Asset preloading (image, video, sequence)
│   ├── exporter/            # Export pipeline (frame-by-frame → H.264 → MP4)
│   └── storage/             # Persistence (localStorage + IndexedDB)
├── stores/                  # Zustand state management
│   └── appStore.ts          # Global app state
├── hooks/                   # Custom hooks
├── utils/                   # Utilities (seeded PRNG, code validation)
├── types/                   # TypeScript type definitions
└── App.tsx                  # Entry point
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[BSD 3-Clause](./LICENSE)
