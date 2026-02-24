/**
 * 后处理着色器模块
 * 包含默认 vertex shader 和工具函数
 * @module services/renderer/postProcessShaders
 */

/**
 * 默认 Vertex Shader
 * 全屏四边形渲染,传递 UV 坐标
 */
export const DEFAULT_VERTEX_SHADER = `
attribute vec2 aPosition;
attribute vec2 aTexCoord;
varying vec2 vUv;

void main() {
  vUv = aTexCoord;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * 直通 Fragment Shader(无后处理时使用)
 */
export const PASSTHROUGH_FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D uTexture;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
`;

/**
 * 简单字符串 hash 函数,用于 shader 缓存
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * 检查 shader 代码是否包含必要声明
 * 如果缺少,自动注入系统 uniform
 *
 * 关键：GLSL 要求 precision 必须在任何 float/vec 声明之前
 * 因此如果我们需要注入 uniform，必须同时在最前面注入 precision
 */
export function ensureShaderDeclarations(fragmentShader: string): string {
  const uniformDeclarations: string[] = [];
  const varyingDeclarations: string[] = [];

  // 检查需要注入的 uniform
  if (!/uniform\s+sampler2D\s+uTexture/.test(fragmentShader)) {
    uniformDeclarations.push('uniform sampler2D uTexture;');
  }

  // uOriginal: 原始 Canvas 2D 输出，始终可用于任何 pass
  // 用于实现真正的 Bloom：原图 + 模糊(亮部) 叠加
  if (!/uniform\s+sampler2D\s+uOriginal/.test(fragmentShader)) {
    uniformDeclarations.push('uniform sampler2D uOriginal;');
  }

  if (!/uniform\s+vec2\s+uResolution/.test(fragmentShader)) {
    uniformDeclarations.push('uniform vec2 uResolution;');
  }

  if (!/uniform\s+float\s+uTime/.test(fragmentShader)) {
    uniformDeclarations.push('uniform float uTime;');
  }

  // 检查需要注入的 varying
  if (!/varying\s+vec2\s+vUv/.test(fragmentShader)) {
    varyingDeclarations.push('varying vec2 vUv;');
  }

  // 如果没有需要注入的声明，只需确保 precision 存在
  if (uniformDeclarations.length === 0 && varyingDeclarations.length === 0) {
    if (!fragmentShader.includes('precision ')) {
      return 'precision highp float;\n\n' + fragmentShader;
    }
    return fragmentShader;
  }

  // 有需要注入的声明时，必须在最前面放 precision
  // 然后移除原有的 precision 声明避免重复
  let processedShader = fragmentShader;
  if (fragmentShader.includes('precision ')) {
    // 移除原有的 precision 声明
    processedShader = fragmentShader.replace(/precision\s+(lowp|mediump|highp)\s+float\s*;/g, '');
  }

  // 按 GLSL 规范顺序组装: precision -> uniforms -> varyings -> 原始代码
  const declarations: string[] = ['precision highp float;'];
  declarations.push(...uniformDeclarations);
  declarations.push(...varyingDeclarations);

  return declarations.join('\n') + '\n\n' + processedShader;
}

/**
 * 自动注入自定义 uniform 声明
 * 根据 pass.uniforms 对象推断类型并注入缺失的声明
 * 在 ensureShaderDeclarations 之前调用
 */
export function injectCustomUniforms(
  fragmentShader: string,
  uniforms: Record<string, number | number[]>
): string {
  const declarations: string[] = [];

  for (const [name, value] of Object.entries(uniforms)) {
    const type = Array.isArray(value) ? `vec${value.length}` : 'float';
    const pattern = new RegExp(`uniform\\s+\\w+\\s+${name}\\b`);
    if (!pattern.test(fragmentShader)) {
      declarations.push(`uniform ${type} ${name};`);
    }
  }

  if (declarations.length === 0) return fragmentShader;
  return declarations.join('\n') + '\n' + fragmentShader;
}
