/**
 * H264 MP4 编码器内嵌器
 * 将 h264-mp4-encoder 库内嵌到导出的 HTML 中
 * @module services/assetPackExporter/h264Inliner
 */

// H264 编码器 JS 文件路径（相对于 Vite base 路径）
const H264_JS_PATH = `${import.meta.env.BASE_URL}h264mp4/h264-mp4-encoder.web.js`;

// 缓存已加载的内容
let cachedH264JsCode: string | null = null;

/**
 * 加载并缓存 h264-mp4-encoder.web.js 内容
 */
async function loadH264JsCode(): Promise<string> {
  if (cachedH264JsCode) return cachedH264JsCode;

  const response = await fetch(H264_JS_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load h264-mp4-encoder.web.js: ${response.status}`);
  }
  cachedH264JsCode = await response.text();
  return cachedH264JsCode;
}

/**
 * 生成内嵌 H264 编码器的完整代码块
 * h264-mp4-encoder.web.js 已经内嵌了 WASM（使用 SINGLE_FILE=1 编译）
 *
 * 注意：原始库使用 Webpack UMD 格式，HME 是局部变量
 * 需要通过包装器将其暴露到全局
 */
export async function generateInlinedH264Code(): Promise<string> {
  const jsCode = await loadH264JsCode();

  if (!jsCode) {
    throw new Error('h264-mp4-encoder.web.js 加载内容为空');
  }

  // 库以 "var HME=function(A){...}([...])" 形式存在
  // 我们需要将其改为赋值给 window.HME
  // 通过在前面添加 "window." 来实现
  const modifiedJsCode = jsCode.replace(/^var HME=/, 'window.HME=');

  // 使用字符串拼接而非模板字符串，避免特殊字符问题
  const parts = [
    '// ============================================',
    '// H264 MP4 编码器（内嵌版本）',
    '// ============================================',
    '',
    modifiedJsCode,
    '',
    '// H264 编码器初始化辅助函数',
    'window.__initH264MP4Encoder__ = function() {',
    '  return window.HME.createH264MP4Encoder();',
    '};',
  ];

  return parts.join('\n');
}

/**
 * 清除缓存（用于测试或强制重新加载）
 */
export function clearH264Cache(): void {
  cachedH264JsCode = null;
}
