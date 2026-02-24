---
name: neon
description: Generate .neon motion definition files and render them to MP4/WebP video. Use when creating motion graphics, visual effects, animation videos, or when user mentions neon, .neon files, motion effects, or video rendering.
---

# Neon — Motion Effect Production

Generate `.neon` files (JSON motion definitions) and render them to video using a headless browser renderer.

## Prerequisites

> `{skill_dir}` is the directory where this SKILL.md file is located.

```bash
cd {skill_dir}/scripts && npm install && npm link
```

After setup, `neon` is available globally. Requires Node.js 18+ and Chromium (installed by Playwright or system Chrome).

## Mandatory Reading Before Implementation

> **STOP — Before writing ANY code, you MUST read the relevant guide files.**
>
> This is NOT optional. Do NOT rely on general knowledge or common conventions.

| If you're implementing... | You MUST first read |
|---------------------------|---------------------|
| Canvas 2D effects | [CANVAS-GUIDE.md](CANVAS-GUIDE.md) |
| WebGL / 3D effects | [WEBGL-GUIDE.md](WEBGL-GUIDE.md) |
| Post-processing (bloom, blur, etc.) | [POSTPROCESS-GUIDE.md](POSTPROCESS-GUIDE.md) |
| Image/video/model parameters | [PARAMETERS.md](PARAMETERS.md) |

**Why this matters:** This framework has specific variable names, conventions, and APIs that differ from common standards. For example:
- Post-process uses `vUv`, `uTexture`, `uResolution` — NOT `v_texCoord`, `u_texture`, `u_resolution`
- Shaders fail silently with wrong names

**Workflow:**
1. Identify which features you need (Canvas? WebGL? Post-process?)
2. Read the corresponding guide file(s) FIRST
3. Then write code following the guide's exact conventions

## Workflow

### Generate → Validate → Render

```
1. Read relevant guide file(s) based on features needed
2. Generate .neon file (JSON matching MotionDefinition interface)
3. neon validate <file.neon>
4. neon render <file.neon> -o output.mp4
```

### Iteration

Modify the `.neon` file (adjust parameters, code, or settings), then re-render.

## .neon File Format

Neon Lab exports `.neon` files with a wrapper structure:

```json
{
  "version": "0.1.0",
  "exportedAt": 1770198455346,
  "conversation": {
    "id": "conversation-uuid",
    "title": "效果名称",
    "messages": [
      {
        "id": "msg-1",
        "role": "assistant",
        "content": "效果描述和实现说明",
        "timestamp": 1770198455346
      }
    ],
    "motion": { /* MotionDefinition — the actual renderable data */ },
    "createdAt": 1770193633865,
    "updatedAt": 1770193633865
  }
}
```

The CLI extracts `conversation.motion` automatically. Bare MotionDefinition JSON (without wrapper) is also accepted.

### Messages

`conversation.messages` MUST contain at least one assistant message describing the effect. Content should include:
1. **效果描述** — 一句话说明视觉效果是什么
2. **实现概要** — 用了什么技术手段（Canvas/WebGL、关键算法、后处理等）

示例：
```
"content": "圆形光波扩散效果：以中心点为原点，多层圆环随时间向外扩散并渐隐。使用 Canvas 2D 逐帧绘制圆环，通过 easeOutCubic 控制扩散节奏，配合 lighter 混合模式实现辉光叠加，后处理添加 bloom 增强发光质感。"
```

### MotionDefinition Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier |
| `renderMode` | "canvas" \| "webgl" \| "hybrid" | Yes | Rendering mode |
| `duration` | number | Yes | Duration in milliseconds |
| `width` | number | Yes | Default canvas width |
| `height` | number | Yes | Default canvas height |
| `backgroundColor` | string | Yes | Background color (hex) |
| `code` | string | Yes | Render function code |
| `elements` | array | Yes | Element metadata (usually `[]`) |
| `parameters` | array | Yes | Adjustable parameters |
| `createdAt` | number | Yes | Creation timestamp (ms) |
| `updatedAt` | number | Yes | Last update timestamp (ms) |
| `postProcessCode` | string | No | Post-processing shader code |
| `durationCode` | string | No | Dynamic duration calculation |
| `sceneConfig` | object | No | 3D scene config for WebGL |

`width` and `height` are defaults only. Code MUST use `canvas.width` / `canvas.height` for actual dimensions.

## Render Function — Canvas 2D

```javascript
function render(ctx, time, params, canvas) {
  // ctx: CanvasRenderingContext2D
  // time: milliseconds (0 to duration)
  // params: parameter values keyed by id
  // canvas: { width, height }
}
window.__motionRender = render;
```

### Three Critical Rules

1. **MUST end with** `window.__motionRender = render;`
2. **MUST use `canvas.width` / `canvas.height`** — never hardcode sizes
3. **MUST be deterministic** — no `Math.random()`, use `window.__motionUtils`

### Relative Sizing

```javascript
const size = Math.min(canvas.width, canvas.height) * 0.1;  // 10% of short edge
```

NEVER hardcode pixel values. All sizes relative to canvas dimensions.

### Deterministic Random

```javascript
const { seededRandom, createRandomSequence } = window.__motionUtils;
const next = createRandomSequence(42);  // seed-based
const x = next() * canvas.width;
const y = next() * canvas.height;
```

**Full Canvas guide**: See [CANVAS-GUIDE.md](CANVAS-GUIDE.md) for image/video params, sizing patterns, and more.

**WebGL/Three.js guide**: See [WEBGL-GUIDE.md](WEBGL-GUIDE.md) for 3D rendering.

## Post-Processing (Optional)

> ⚠️ **MUST read [POSTPROCESS-GUIDE.md](POSTPROCESS-GUIDE.md) before implementing post-processing.**

For pixel-level effects (bloom, blur, color grading) applied after rendering.

**Auto-injected variables (use these exact names):**
| Variable | Type | Description |
|----------|------|-------------|
| `vUv` | vec2 | UV coordinates (0-1) |
| `uTexture` | sampler2D | Previous pass output |
| `uOriginal` | sampler2D | Original render (for combine pass) |
| `uResolution` | vec2 | Canvas size |
| `uTime` | float | Current time (ms) |

```javascript
function postProcess(params, time) {
  return [
    { name: 'effect', shader: `void main() { gl_FragColor = texture2D(uTexture, vUv); }`, uniforms: {} }
  ];
}
window.__motionPostProcess = postProcess;
```

**Full guide**: See [POSTPROCESS-GUIDE.md](POSTPROCESS-GUIDE.md)

## Parameter Types

Each parameter needs: `id`, `name`, `type`, `path` (e.g., `"params.myParam"`)

| Type | Value Field | Description |
|------|-------------|-------------|
| number | `value` | Numeric slider (`min`, `max`, `step`) |
| color | `colorValue` | Color picker (hex) |
| select | `selectedValue` | Dropdown (`options: [{label, value}]`) |
| boolean | `boolValue` | Toggle |
| string | `stringValue` | Text input |
| image | `imageValue` | Image upload |
| video | `videoValue` | Video upload |
| model | `modelValue` | 3D model (GLB) |
| texture | `textureValue` | Texture map |
| sequence | `sequenceFrames` | Frame sequence |

**Full reference with examples**: See [PARAMETERS.md](PARAMETERS.md)

## CLI Commands

### Render

```bash
neon render <file.neon> -o <output.mp4> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output file path | (required) |
| `--format <format>` | Output format | mp4 |
| `--fps <number>` | Frame rate (24, 30, 60) | 30 |
| `--width <number>` | Override width | — |
| `--height <number>` | Override height | — |
| `--alpha` | Alpha channel export | false |
| `--param <key=value>` | Override parameter (repeatable) | — |
| `--resolution <res>` | 720p, 1080p, 4k | 1080p |
| `--aspect-ratio <ratio>` | 16:9, 9:16, 1:1 | 16:9 |

### Validate

```bash
neon validate <file.neon>
```

Checks syntax, required fields, and parameter definitions.

## Dynamic Duration

For multi-video effects:

```json
{
  "duration": 5000,
  "durationCode": "params.video1.videoDuration + params.video2.videoDuration"
}
```

Result clamped to 1000-60000ms. Falls back to `duration` on error.

## Complete Examples

See [EXAMPLES.md](EXAMPLES.md) for full working examples:
- Particle Burst (Canvas)
- Text Wave (Canvas)
- Rotating Model (WebGL)

## Important Rules

1. **Field Name Accuracy**: Use `value` for numbers, `colorValue` for colors, `boolValue` for booleans. The `.neon` format matches `MotionDefinition` exactly.
2. **Canvas Dimensions**: MUST use `canvas.width` / `canvas.height`, never hardcoded sizes.
3. **Path Field**: Every parameter needs `"path": "params.<id>"`.
4. **Global Assignment**: MUST end with `window.__motionRender = render;` or `window.__motionPostProcess = postProcess;`.
5. **Deterministic Rendering**: Never `Math.random()` — use `window.__motionUtils`.
6. **Relative Sizing**: All element sizes relative to canvas dimensions.
