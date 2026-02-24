/**
 * 确定性渲染工具内联器
 * 生成可内联到导出 HTML 的工具函数代码
 * @module services/assetPackExporter/utilsInliner
 */

/**
 * 生成确定性随机数工具的内联 JavaScript 代码
 * 这些代码将嵌入到导出的 HTML 文件中
 * @returns 内联 JavaScript 代码字符串
 */
export function generateUtilsCode(): string {
  return `
// ============================================
// Motion Utils - 确定性随机数工具
// ============================================

(function() {
  /**
   * 创建基于种子的随机数生成器 (Mulberry32 算法)
   * @param {number} seed - 种子值
   * @returns {function(): number} 返回 0-1 之间的随机数的函数
   */
  function createSeededRandom(seed) {
    var state = seed >>> 0;
    return function random() {
      state = (state + 0x6d2b79f5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * 生成基于种子的随机整数
   * @param {number} seed - 种子值
   * @param {number} min - 最小值（包含）
   * @param {number} max - 最大值（包含）
   * @returns {number} 指定范围内的随机整数
   */
  function seededRandomInt(seed, min, max) {
    var random = createSeededRandom(seed);
    return Math.floor(random() * (max - min + 1)) + min;
  }

  /**
   * 生成基于种子的随机浮点数
   * @param {number} seed - 种子值
   * @param {number} min - 最小值（包含）
   * @param {number} max - 最大值（不包含）
   * @returns {number} 指定范围内的随机浮点数
   */
  function seededRandomRange(seed, min, max) {
    var random = createSeededRandom(seed);
    return random() * (max - min) + min;
  }

  /**
   * 创建基于种子和计数器的随机数生成器
   * @param {number} seed - 基础种子值
   * @returns {function(): number} 每次调用返回下一个随机数
   */
  function createRandomSequence(seed) {
    return createSeededRandom(seed);
  }

  // 全局注入 motion utils
  window.__motionUtils = {
    seededRandom: createSeededRandom,
    seededRandomInt: seededRandomInt,
    seededRandomRange: seededRandomRange,
    createRandomSequence: createRandomSequence
  };
})();
`.trim();
}

/**
 * 获取最小化版本的工具代码（用于减小文件大小）
 * @returns 压缩后的 JavaScript 代码
 */
export function generateMinifiedUtilsCode(): string {
  // 压缩版本 - 移除注释和多余空白
  return `(function(){function e(e){var n=e>>>0;return function(){n=(n+1831565813)>>>0;var e=n;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function n(n,t,r){return Math.floor(e(n)()*(r-t+1))+t}function t(n,t,r){return e(n)()*(r-t)+t}window.__motionUtils={seededRandom:e,seededRandomInt:n,seededRandomRange:t,createRandomSequence:e}})();`;
}
