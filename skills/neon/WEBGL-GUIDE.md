# WebGL / Three.js Rendering Guide

## Function Signature

```javascript
function render(scene, time, params, helpers) {
  // scene: Three.js Scene object (pre-initialized)
  // time: current time in milliseconds (0 to duration)
  // params: parameter values
  //   - params.modelId → loaded 3D model (THREE.Group or null)
  //   - params.textureId → loaded texture (THREE.Texture or null)
  // helpers: { THREE, camera, renderer }
}
window.__motionRender = render;
```

## Critical Requirements

1. **MUST end with** `window.__motionRender = render;`
2. **MUST check model existence** before use: `if (params.modelId) { ... }`
3. **DO NOT create new renderer or scene** — use provided objects
4. **DO NOT `scene.add()`** model parameters — already added by system
5. Models and textures are loaded automatically — just manipulate the objects

## Example

```javascript
function render(scene, time, params, helpers) {
  const { THREE, camera } = helpers;
  const model = params.characterModel;

  if (model) {
    const scale = params.modelScale || 1;
    model.scale.setScalar(scale);

    const rotateSpeed = params.autoRotateSpeed || 1;
    model.rotation.y = (time / 1000) * rotateSpeed;
  }
}
window.__motionRender = render;
```

## Scene Configuration

Use `sceneConfig` in the MotionDefinition for camera and lighting setup:

```json
{
  "sceneConfig": {
    "camera": { "position": [0, 2, 5], "fov": 45 },
    "lights": [
      { "type": "ambient", "intensity": 0.5 },
      { "type": "directional", "position": [5, 5, 5], "intensity": 1 }
    ]
  }
}
```
