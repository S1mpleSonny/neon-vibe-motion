# Parameter Types Reference

Each parameter must have: `id`, `name`, `type`, `path` (e.g., `"params.myParam"`).

## Number

**使用场景**：数值调节（大小、速度、数量、透明度、角度等）

```json
{
  "id": "particleCount",
  "name": "粒子数量",
  "type": "number",
  "path": "params.particleCount",
  "min": 10,
  "max": 500,
  "step": 10,
  "value": 100
}
```

可选字段：`unit`（显示单位，如 `"px"`, `"deg"`, `"ms"`）

## Color

**使用场景**：颜色调节（主色调、背景色、描边色、填充色等）

```json
{
  "id": "primaryColor",
  "name": "主色调",
  "type": "color",
  "path": "params.primaryColor",
  "colorValue": "#ff0000"
}
```

## Select

**使用场景**：有限选项选择（混合模式、动画类型、方向等）

```json
{
  "id": "blendMode",
  "name": "混合模式",
  "type": "select",
  "path": "params.blendMode",
  "selectedValue": "lighter",
  "options": [
    { "label": "叠加", "value": "lighter" },
    { "label": "正常", "value": "source-over" }
  ]
}
```

## Boolean

**使用场景**：开关控制（是否启用某效果、是否显示某元素）

```json
{
  "id": "glowEnabled",
  "name": "发光效果",
  "type": "boolean",
  "path": "params.glowEnabled",
  "boolValue": true
}
```

## String

**使用场景**：
- 需要自定义文本内容的动效（"显示文字"、"标题动画"、"文字特效"）
- 明确提到文字、标题、标签、说明、名称等
- 需要用户输入自定义文本的动效

```json
{
  "id": "titleText",
  "name": "标题文字",
  "type": "string",
  "path": "params.titleText",
  "stringValue": "Hello World",
  "placeholder": "请输入标题",
  "maxLength": 50
}
```

可选字段：`maxLength`（最大字符数限制）

---

## Image

**使用场景**：
- 需要自定义图像/贴图的动效（"旋转的 logo"、"飘落的图片"）
- 明确提到图片、图像、头像、logo、图标等
- 需要纹理或背景图的动效

```json
{
  "id": "logoImage",
  "name": "Logo 图片",
  "type": "image",
  "path": "params.logoImage",
  "imageValue": "__PLACEHOLDER__",
  "placeholderImage": "__PLACEHOLDER__"
}
```

**关联子参数**：生成图片参数时，应同时生成以下调节参数：

```json
[
  { "id": "logoImage", "name": "Logo 图片", "type": "image", "path": "params.logoImage", "imageValue": "__PLACEHOLDER__", "placeholderImage": "__PLACEHOLDER__" },
  { "id": "logoScale", "name": "图片大小", "type": "number", "path": "params.logoScale", "min": 0.1, "max": 3, "step": 0.1, "value": 1 },
  { "id": "logoX", "name": "图片X位置", "type": "number", "path": "params.logoX", "min": 0, "max": 1, "step": 0.01, "value": 0.5 },
  { "id": "logoY", "name": "图片Y位置", "type": "number", "path": "params.logoY", "min": 0, "max": 1, "step": 0.01, "value": 0.5 },
  { "id": "logoOpacity", "name": "图片透明度", "type": "number", "path": "params.logoOpacity", "min": 0, "max": 1, "step": 0.05, "value": 1 },
  { "id": "logoRotation", "name": "图片旋转", "type": "number", "path": "params.logoRotation", "min": 0, "max": 360, "step": 1, "value": 0, "unit": "deg" }
]
```

**代码访问**：`params.logoImage` 是 `HTMLImageElement`（或 null）

---

## Video

**使用场景**：
- 需要播放视频的动效（"视频背景"、"视频遮罩"、"画中画视频"）
- 明确提到视频、影片、录像、短片等
- 需要动态背景或视频素材的动效

**特性**：
- 视频自动循环播放，静音
- 上传视频后，动效时长自动调整为视频时长（最长 60 秒）
- 支持 MP4 和 WebM 格式，最大 50MB

```json
{
  "id": "backgroundVideo",
  "name": "背景视频",
  "type": "video",
  "path": "params.backgroundVideo",
  "videoValue": "__PLACEHOLDER__",
  "placeholderVideo": "__PLACEHOLDER__"
}
```

**关联子参数**：

```json
[
  { "id": "backgroundVideo", "name": "背景视频", "type": "video", "path": "params.backgroundVideo", "videoValue": "__PLACEHOLDER__", "placeholderVideo": "__PLACEHOLDER__" },
  { "id": "videoScale", "name": "视频大小", "type": "number", "path": "params.videoScale", "min": 0.1, "max": 3, "step": 0.1, "value": 1 },
  { "id": "videoX", "name": "视频X位置", "type": "number", "path": "params.videoX", "min": 0, "max": 1, "step": 0.01, "value": 0.5 },
  { "id": "videoY", "name": "视频Y位置", "type": "number", "path": "params.videoY", "min": 0, "max": 1, "step": 0.01, "value": 0.5 },
  { "id": "videoOpacity", "name": "视频透明度", "type": "number", "path": "params.videoOpacity", "min": 0, "max": 1, "step": 0.05, "value": 1 }
]
```

**代码访问**：`params.backgroundVideo` 是 `HTMLVideoElement`

### Video Start Time（多视频场景）

多视频错开播放时使用：

| 字段 | 类型 | 说明 |
|------|------|------|
| `videoStartTime` | number | 固定起始时间（毫秒） |
| `videoStartTimeCode` | string | JavaScript 表达式，可引用 `params` 对象 |

**使用场景**：
- **顺序播放**：第二个视频在第一个结束时开始
- **转场效果**：第二个视频在第一个结束前开始，实现交叉溶解
- **延迟播放**：视频在动效开始后延迟一段时间播放

**示例**：

```json
// 固定延迟 1 秒开始
{ "id": "video2", "videoStartTime": 1000, ... }

// 在 video1 结束前 500ms 开始（转场）
{ "id": "video2", "videoStartTimeCode": "params.video1.videoDuration - 500", ... }

// 引用数值参数控制起始时间
{ "id": "video2", "videoStartTimeCode": "params.video2StartTime", ... }
```

---

## Model (3D)

**使用场景**：
- 需要 3D 模型渲染（"旋转的3D模型"、"产品展示"、"3D角色动画"）
- 明确提到 3D、立体、模型、GLB、GLTF 等
- 需要 3D 场景或物体展示的动效

**注意**：包含 model 参数时，`renderMode` 必须为 `"webgl"`

```json
{
  "id": "characterModel",
  "name": "角色模型",
  "type": "model",
  "path": "params.characterModel",
  "modelValue": "__PLACEHOLDER__",
  "placeholderModel": "__PLACEHOLDER__",
  "modelFormat": "glb"
}
```

**关联子参数**：

```json
[
  { "id": "characterModel", "name": "角色模型", "type": "model", "path": "params.characterModel", "modelValue": "__PLACEHOLDER__", "placeholderModel": "__PLACEHOLDER__", "modelFormat": "glb" },
  { "id": "modelScale", "name": "模型缩放", "type": "number", "path": "params.modelScale", "min": 0.1, "max": 5, "step": 0.1, "value": 1 },
  { "id": "modelRotationY", "name": "模型Y轴旋转", "type": "number", "path": "params.modelRotationY", "min": 0, "max": 360, "step": 1, "value": 0, "unit": "deg" },
  { "id": "autoRotateSpeed", "name": "自动旋转速度", "type": "number", "path": "params.autoRotateSpeed", "min": 0, "max": 10, "step": 0.1, "value": 1 }
]
```

**代码访问**：`params.characterModel` 是 `THREE.Group`（或 null）

---

## Texture

**使用场景**：
- 需要更换模型材质贴图
- 自定义模型表面外观

```json
{
  "id": "skinTexture",
  "name": "皮肤贴图",
  "type": "texture",
  "path": "params.skinTexture",
  "textureValue": "__PLACEHOLDER__",
  "textureType": "diffuse",
  "textureTargetModel": "characterModel"
}
```

| 字段 | 说明 |
|------|------|
| `textureType` | `diffuse`（漫反射）、`normal`（法线）、`roughness`（粗糙度）、`metalness`（金属度）、`emissive`（自发光）、`ao`（环境光遮蔽） |
| `textureTargetModel` | 关联的 model 参数 ID |

**代码访问**：`params.skinTexture` 是 `THREE.Texture`（或 null）

---

## Sequence (Frame Animation)

**使用场景**：
- 需要播放帧动画的动效（"序列帧动画"、"逐帧动画"、"帧动画"）
- 明确提到序列帧、帧动画、逐帧动画、PNG序列、AE导出等
- 需要用户上传从 After Effects、Photoshop 等工具导出的序列帧图片
- 需要雪碧图动画或帧序列播放的动效

```json
{
  "id": "frameAnimation",
  "name": "序列帧动画",
  "type": "sequence",
  "path": "params.frameAnimation",
  "sequenceFrames": [],
  "sequenceFps": 30,
  "sequenceLoop": true,
  "placeholderSequence": "__SEQUENCE_PLACEHOLDER__"
}
```

| 字段 | 说明 |
|------|------|
| `sequenceFrames` | 帧数据数组（初始为 `[]`） |
| `sequenceFps` | 播放帧率（默认 30） |
| `sequenceLoop` | 是否循环（默认 true） |

**代码访问**：`params.frameAnimation` 是 `HTMLImageElement`（当前帧），系统根据时间自动选择帧。

---

## Complete .neon Parameters Example

完整的 parameters 数组在 .neon 文件中的表现：

```json
{
  "version": "0.1.0",
  "exportedAt": 1770198455346,
  "conversation": {
    "id": "conv-001",
    "title": "Logo 动画效果",
    "messages": [
      {
        "id": "msg-1",
        "role": "assistant",
        "content": "Logo 旋转放大效果：图片从中心向外放大并旋转，配合发光效果。使用 Canvas 2D 绑制，easeOutBack 缓动函数实现弹性放大。",
        "timestamp": 1770198455346
      }
    ],
    "motion": {
      "id": "motion-001",
      "renderMode": "canvas",
      "duration": 3000,
      "width": 1920,
      "height": 1080,
      "backgroundColor": "#000000",
      "elements": [],
      "parameters": [
        {
          "id": "logoImage",
          "name": "Logo 图片",
          "type": "image",
          "path": "params.logoImage",
          "imageValue": "__PLACEHOLDER__",
          "placeholderImage": "__PLACEHOLDER__"
        },
        {
          "id": "logoScale",
          "name": "图片大小",
          "type": "number",
          "path": "params.logoScale",
          "min": 0.1,
          "max": 3,
          "step": 0.1,
          "value": 1
        },
        {
          "id": "logoOpacity",
          "name": "图片透明度",
          "type": "number",
          "path": "params.logoOpacity",
          "min": 0,
          "max": 1,
          "step": 0.05,
          "value": 1
        },
        {
          "id": "logoRotation",
          "name": "图片旋转",
          "type": "number",
          "path": "params.logoRotation",
          "min": 0,
          "max": 360,
          "step": 1,
          "value": 0,
          "unit": "deg"
        },
        {
          "id": "primaryColor",
          "name": "发光颜色",
          "type": "color",
          "path": "params.primaryColor",
          "colorValue": "#00ffff"
        },
        {
          "id": "glowEnabled",
          "name": "启用发光",
          "type": "boolean",
          "path": "params.glowEnabled",
          "boolValue": true
        },
        {
          "id": "glowIntensity",
          "name": "发光强度",
          "type": "number",
          "path": "params.glowIntensity",
          "min": 0,
          "max": 2,
          "step": 0.1,
          "value": 1
        }
      ],
      "code": "function render(ctx, time, params, canvas) {\n  const { width, height } = canvas;\n  const centerX = width / 2;\n  const centerY = height / 2;\n  const progress = time / 3000;\n  \n  const img = params.logoImage;\n  if (img instanceof HTMLImageElement) {\n    const scale = params.logoScale * (0.5 + progress * 0.5);\n    const rotation = params.logoRotation * (Math.PI / 180) + progress * Math.PI * 2;\n    const size = Math.min(width, height) * 0.3 * scale;\n    \n    ctx.save();\n    ctx.globalAlpha = params.logoOpacity;\n    ctx.translate(centerX, centerY);\n    ctx.rotate(rotation);\n    ctx.drawImage(img, -size/2, -size/2, size, size);\n    ctx.restore();\n  }\n}\n\nwindow.__motionRender = render;",
      "createdAt": 1770198455346,
      "updatedAt": 1770198455346
    },
    "createdAt": 1770198455346,
    "updatedAt": 1770198455346
  }
}
```
