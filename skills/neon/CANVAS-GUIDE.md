# Canvas 2D Rendering Guide

## Function Signature

```javascript
function render(ctx, time, params, canvas) {
  // ctx: CanvasRenderingContext2D
  // time: current time in milliseconds (0 to duration)
  // params: object with parameter values (keyed by id)
  // canvas: { width, height } - actual canvas dimensions
}
window.__motionRender = render;
```

## Critical Requirements

1. **MUST end with** `window.__motionRender = render;`
2. **MUST use `canvas.width` and `canvas.height`** — never hardcode dimensions
3. **MUST be deterministic** — same inputs produce same output
4. **MUST NOT use `Math.random()`** — use `window.__motionUtils` instead
5. **MUST NOT rely on system time** — use `time` parameter only

## Coordinate System

```
(0, 0) ─────────────────────► X (canvas.width)
   │
   │     Canvas 原点在左上角
   │     X 轴向右为正
   │     Y 轴向下为正
   │
   ▼
   Y (canvas.height)
```

| 方向 | 坐标变化 |
|------|----------|
| 从左到右 | X 从 0 → canvas.width |
| 从右到左 | X 从 canvas.width → 0 |
| 从上到下 | Y 从 0 → canvas.height |
| 从下到上 | Y 从 canvas.height → 0 |
| 中心点 | (canvas.width/2, canvas.height/2) |

## Canvas Dimensions

```javascript
const { width, height } = canvas;
const centerX = width / 2;
const centerY = height / 2;
const minDim = Math.min(width, height);
```

## Element Sizing

**NEVER hardcode pixel values.** All sizes relative to canvas:

```javascript
// Good — scales with canvas
const size = Math.min(canvas.width, canvas.height) * 0.1;
const lineWidth = Math.min(canvas.width, canvas.height) * 0.01;
const fontSize = Math.min(canvas.width, canvas.height) * 0.05;
const radius = Math.min(canvas.width, canvas.height) * 0.2;

// Bad — breaks on different resolutions
const size = 50;
const lineWidth = 2;
const fontSize = 24;
```

## Deterministic Random Numbers

```javascript
const { seededRandom, seededRandomInt, seededRandomRange, createRandomSequence } = window.__motionUtils;

// Single random value based on seed
const random = seededRandom(time);
const x = random() * canvas.width;

// Random integer [min, max]
const count = seededRandomInt(time, 5, 10);

// Random float [min, max)
const size = seededRandomRange(time, 10, 50);

// Multiple random values in same frame
const next = createRandomSequence(time);
const x1 = next() * canvas.width;
const y1 = next() * canvas.height;
```

---

## Image Parameters

Image parameters are preloaded as `HTMLImageElement`:

```javascript
const img = params.logoImage;
if (img instanceof HTMLImageElement) {
  ctx.drawImage(img, x, y, width, height);
}
```

### Image Fill Mode (Cover)

将图片填满画布，保持宽高比，可能裁剪：

```javascript
const img = params.image;
if (img instanceof HTMLImageElement) {
  const imgAspect = img.width / img.height;
  const canvasAspect = canvas.width / canvas.height;
  let drawWidth, drawHeight, drawX, drawY;

  if (imgAspect > canvasAspect) {
    // 图片更宽，以高度为准
    drawHeight = canvas.height;
    drawWidth = drawHeight * imgAspect;
  } else {
    // 图片更高，以宽度为准
    drawWidth = canvas.width;
    drawHeight = drawWidth / imgAspect;
  }
  drawX = (canvas.width - drawWidth) / 2;
  drawY = (canvas.height - drawHeight) / 2;

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}
```

### Image Contain Mode

将图片完整显示在画布内，保持宽高比，可能留白：

```javascript
const img = params.image;
if (img instanceof HTMLImageElement) {
  const imgAspect = img.width / img.height;
  const canvasAspect = canvas.width / canvas.height;
  let drawWidth, drawHeight, drawX, drawY;

  if (imgAspect > canvasAspect) {
    // 图片更宽，以宽度为准
    drawWidth = canvas.width;
    drawHeight = drawWidth / imgAspect;
  } else {
    // 图片更高，以高度为准
    drawHeight = canvas.height;
    drawWidth = drawHeight * imgAspect;
  }
  drawX = (canvas.width - drawWidth) / 2;
  drawY = (canvas.height - drawHeight) / 2;

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}
```

### Image with Position/Scale Parameters

配合关联参数（logoX, logoY, logoScale, logoOpacity, logoRotation）使用：

```javascript
const img = params.logoImage;
if (img instanceof HTMLImageElement) {
  const { width, height } = canvas;

  // 位置参数是归一化的 (0-1)，转换为像素
  const x = params.logoX * width;
  const y = params.logoY * height;

  // 尺寸基于画布短边
  const baseSize = Math.min(width, height) * 0.2;
  const size = baseSize * params.logoScale;

  ctx.save();
  ctx.globalAlpha = params.logoOpacity;
  ctx.translate(x, y);
  ctx.rotate(params.logoRotation * Math.PI / 180);
  ctx.drawImage(img, -size/2, -size/2, size, size);
  ctx.restore();
}
```

---

## Video Parameters

Video parameters are `HTMLVideoElement` objects:

```javascript
const video = params.backgroundVideo;
if (video instanceof HTMLVideoElement && video.readyState >= 2) {
  ctx.drawImage(video, x, y, width, height);
}
```

### Video Fill Mode (Cover)

```javascript
const video = params.backgroundVideo;
if (video instanceof HTMLVideoElement && video.readyState >= 2) {
  const videoAspect = video.videoWidth / video.videoHeight;
  const canvasAspect = canvas.width / canvas.height;
  let drawWidth, drawHeight, drawX, drawY;

  if (videoAspect > canvasAspect) {
    drawHeight = canvas.height;
    drawWidth = drawHeight * videoAspect;
  } else {
    drawWidth = canvas.width;
    drawHeight = drawWidth / videoAspect;
  }
  drawX = (canvas.width - drawWidth) / 2;
  drawY = (canvas.height - drawHeight) / 2;

  ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
}
```

---

## Sequence Frame Parameters

Sequence parameters are `HTMLImageElement` (current frame):

```javascript
const frame = params.frameAnimation;
if (frame instanceof HTMLImageElement) {
  ctx.drawImage(frame, x, y, width, height);
}
```

系统根据 `sequenceFps` 自动切换帧，代码只需绘制当前帧。

---

## Movement Animation Examples

### 从左到右移动

```javascript
function render(ctx, time, params, canvas) {
  const { width, height } = canvas;
  const progress = time / 3000;  // 0 → 1

  const size = Math.min(width, height) * 0.15;
  const x = progress * (width + size) - size/2;  // 从左边界外到右边界外
  const y = height / 2;

  ctx.fillStyle = params.color || '#3498db';
  ctx.fillRect(x - size/2, y - size/2, size, size);
}
window.__motionRender = render;
```

### 从上到下移动

```javascript
const x = width / 2;
const y = progress * (height + size) - size/2;  // 从顶部外到底部外
```

### 圆周运动

```javascript
const angle = progress * Math.PI * 2;  // 一圈
const radius = Math.min(width, height) * 0.3;
const x = centerX + Math.cos(angle) * radius;
const y = centerY + Math.sin(angle) * radius;
```

---

## State Initialization

如需在 render 函数外初始化状态（如粒子数组），使用归一化坐标：

```javascript
// 初始化时不知道画布尺寸，使用归一化坐标 (0-1)
const particles = [];
for (let i = 0; i < 100; i++) {
  particles.push({
    nx: Math.random(),  // 归一化 x (0-1) — 初始化用 Math.random 可以
    ny: Math.random(),  // 归一化 y (0-1)
  });
}

function render(ctx, time, params, canvas) {
  const { width, height } = canvas;

  particles.forEach(p => {
    // 渲染时转换为实际像素
    const x = p.nx * width;
    const y = p.ny * height;
    // ...绑制
  });
}
window.__motionRender = render;
```

**注意**：初始化代码只在加载时执行一次，可以用 `Math.random()`。但 render 函数内必须用确定性随机数。
