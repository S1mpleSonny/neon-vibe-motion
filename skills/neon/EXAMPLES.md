# Examples

## Example 1: Particle Burst (Canvas)

```json
{
  "id": "particle-burst",
  "renderMode": "canvas",
  "duration": 3000,
  "width": 640,
  "height": 360,
  "backgroundColor": "#000000",
  "elements": [],
  "createdAt": 1738000000000,
  "updatedAt": 1738000000000,
  "parameters": [
    {
      "id": "particleCount",
      "name": "粒子数量",
      "type": "number",
      "path": "params.particleCount",
      "min": 10,
      "max": 500,
      "step": 10,
      "value": 100
    },
    {
      "id": "color",
      "name": "颜色",
      "type": "color",
      "path": "params.color",
      "colorValue": "#ff6b6b"
    }
  ],
  "code": "const rng = window.__motionUtils.createRandomSequence(42);\nconst particles = [];\nfor (let i = 0; i < 500; i++) {\n  const angle = rng() * Math.PI * 2;\n  particles.push({\n    angle,\n    speed: rng() * 0.3 + 0.1,\n    size: rng() * 0.01 + 0.005\n  });\n}\n\nfunction render(ctx, time, params, canvas) {\n  const { width, height } = canvas;\n  const centerX = width / 2;\n  const centerY = height / 2;\n  const progress = time / 3000;\n  const count = params.particleCount || 100;\n  \n  ctx.fillStyle = params.color || '#ff6b6b';\n  \n  for (let i = 0; i < count; i++) {\n    const p = particles[i];\n    const dist = progress * p.speed * Math.min(width, height);\n    const x = centerX + Math.cos(p.angle) * dist;\n    const y = centerY + Math.sin(p.angle) * dist;\n    const size = p.size * Math.min(width, height) * (1 - progress);\n    \n    ctx.beginPath();\n    ctx.arc(x, y, size, 0, Math.PI * 2);\n    ctx.fill();\n  }\n}\n\nwindow.__motionRender = render;"
}
```

## Example 2: Text Wave (Canvas)

```json
{
  "id": "text-wave",
  "renderMode": "canvas",
  "duration": 4000,
  "width": 640,
  "height": 360,
  "backgroundColor": "#1a1a2e",
  "elements": [],
  "createdAt": 1738000000000,
  "updatedAt": 1738000000000,
  "parameters": [
    {
      "id": "text",
      "name": "文字",
      "type": "string",
      "path": "params.text",
      "stringValue": "WAVE",
      "placeholder": "输入文字"
    },
    {
      "id": "color",
      "name": "颜色",
      "type": "color",
      "path": "params.color",
      "colorValue": "#00d2ff"
    }
  ],
  "code": "function render(ctx, time, params, canvas) {\n  const { width, height } = canvas;\n  const text = params.text || 'WAVE';\n  const fontSize = Math.min(width, height) * 0.15;\n  \n  ctx.font = `bold ${fontSize}px Arial`;\n  ctx.textAlign = 'center';\n  ctx.textBaseline = 'middle';\n  \n  const chars = text.split('');\n  const charWidth = width / (chars.length + 1);\n  \n  chars.forEach((char, i) => {\n    const x = (i + 1) * charWidth;\n    const wave = Math.sin(time * 0.003 + i * 0.5) * height * 0.1;\n    const y = height / 2 + wave;\n    \n    ctx.fillStyle = params.color || '#00d2ff';\n    ctx.fillText(char, x, y);\n  });\n}\n\nwindow.__motionRender = render;"
}
```

## Example 3: Rotating Model (WebGL)

```json
{
  "id": "rotating-model",
  "renderMode": "webgl",
  "duration": 5000,
  "width": 640,
  "height": 360,
  "backgroundColor": "#2c3e50",
  "elements": [],
  "createdAt": 1738000000000,
  "updatedAt": 1738000000000,
  "parameters": [
    {
      "id": "productModel",
      "name": "产品模型",
      "type": "model",
      "path": "params.productModel",
      "modelValue": "__PLACEHOLDER__",
      "placeholderModel": "__PLACEHOLDER__",
      "modelFormat": "glb"
    },
    {
      "id": "rotateSpeed",
      "name": "旋转速度",
      "type": "number",
      "path": "params.rotateSpeed",
      "min": 0,
      "max": 5,
      "step": 0.1,
      "value": 1
    }
  ],
  "code": "function render(scene, time, params, helpers) {\n  const model = params.productModel;\n  \n  if (model) {\n    const speed = params.rotateSpeed || 1;\n    model.rotation.y = (time / 1000) * speed;\n    model.scale.setScalar(1);\n  }\n}\n\nwindow.__motionRender = render;"
}
```
