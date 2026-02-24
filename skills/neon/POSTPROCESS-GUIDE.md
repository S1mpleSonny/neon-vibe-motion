# Post-Processing Guide

Post-processing applies pixel-level effects to the entire canvas output using WebGL shaders.

## When to Use Post-Processing

后处理是**可选的**，只有需要全屏像素效果时才使用。

### ✅ 应该使用后处理的场景

| 用户描述关键词 | 对应效果 |
|---------------|----------|
| "发光"、"光晕"、"Bloom" | bloom-extract → blur → combine |
| "模糊"、"景深"、"运动模糊" | blur shader |
| "色彩调整"、"调色"、"滤镜" | color grading shader |
| "故障艺术"、"Glitch" | RGB split + noise |
| "像素化"、"马赛克" | pixelation shader |
| "CRT"、"扫描线"、"复古" | scanline + vignette |
| "扭曲"、"波纹"、"水波" | distortion shader |
| "色差"、"Chromatic Aberration" | RGB offset shader |

### ❌ 不应该使用后处理的场景

| 效果 | 正确做法 |
|------|----------|
| 单个元素的绘制和变换 | 在 render 函数中用 Canvas 2D API |
| 简单的颜色填充 | 在 render 函数中用 `ctx.fillStyle` |
| 元素的移动、旋转、缩放 | 在 render 函数中用 `ctx.translate/rotate/scale` |
| 透明度变化 | 在 render 函数中用 `ctx.globalAlpha` |
| 渐变填充 | 在 render 函数中用 `ctx.createLinearGradient` |

### 判断原则

> **后处理 = 需要访问整个画面像素信息的全屏效果**
>
> 如果效果只涉及单个或少量元素，用 render 函数实现更简单高效。

## Function Format

```javascript
function postProcess(params, time) {
  // params: parameter object (shared with render)
  // time: current time in milliseconds
  // Returns: array of PostProcessPass objects

  return [
    {
      name: 'effect-name',
      shader: `
        // GLSL Fragment Shader
        // Auto-injected uniforms:
        //   uniform sampler2D uTexture;   // previous pass output
        //   uniform sampler2D uOriginal;  // original render (for combine pass)
        //   uniform vec2 uResolution;     // canvas size
        //   uniform float uTime;          // current time (ms)
        //   varying vec2 vUv;             // UV coordinates (0-1)

        void main() {
          vec4 color = texture2D(uTexture, vUv);
          gl_FragColor = color;
        }
      `,
      uniforms: { customValue: 1.0 }  // custom uniforms (optional)
    }
  ];
}
window.__motionPostProcess = postProcess;
```

## Example: Bloom Effect

```javascript
function postProcess(params, time) {
  return [
    {
      name: 'bloom-extract',
      shader: `
        void main() {
          vec4 color = texture2D(uTexture, vUv);
          float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
          gl_FragColor = brightness > 0.7 ? color : vec4(0.0);
        }
      `
    },
    {
      name: 'bloom-blur',
      shader: `
        uniform float uBlurSize;
        void main() {
          vec2 texelSize = 1.0 / uResolution;
          vec4 color = vec4(0.0);
          for (int x = -2; x <= 2; x++) {
            for (int y = -2; y <= 2; y++) {
              color += texture2D(uTexture, vUv + vec2(x, y) * texelSize * uBlurSize);
            }
          }
          gl_FragColor = color / 25.0;
        }
      `,
      uniforms: { uBlurSize: 2.0 }
    },
    {
      name: 'combine',
      shader: `
        uniform float uIntensity;
        void main() {
          vec4 original = texture2D(uOriginal, vUv);
          vec4 bloom = texture2D(uTexture, vUv);
          gl_FragColor = vec4(original.rgb + bloom.rgb * uIntensity, original.a);
        }
      `,
      uniforms: { uIntensity: 1.5 }
    }
  ];
}
window.__motionPostProcess = postProcess;
```

## Multi-Pass Pipeline

Passes execute sequentially. Each pass receives the previous pass's output as `uTexture`. Use `uOriginal` in the final combine pass to blend with the unprocessed render.

Common pattern: **threshold → downsample → blur → upsample → combine**.
