/**
 * 确定性随机数生成器模块
 * 使用 Mulberry32 算法实现可重复的伪随机数生成
 * @module utils/deterministicRandom
 */

/**
 * 创建基于种子的随机数生成器 (Mulberry32 算法)
 * @param seed - 种子值（通常是时间戳）
 * @returns 返回 0-1 之间的随机数的函数
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function random(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 生成基于种子的随机整数
 * @param seed - 种子值
 * @param min - 最小值（包含）
 * @param max - 最大值（包含）
 * @returns 指定范围内的随机整数
 */
export function seededRandomInt(seed: number, min: number, max: number): number {
  const random = createSeededRandom(seed);
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * 生成基于种子的随机浮点数
 * @param seed - 种子值
 * @param min - 最小值（包含）
 * @param max - 最大值（不包含）
 * @returns 指定范围内的随机浮点数
 */
export function seededRandomRange(seed: number, min: number, max: number): number {
  const random = createSeededRandom(seed);
  return random() * (max - min) + min;
}

/**
 * 创建基于种子和计数器的随机数生成器
 * 用于需要在同一帧内生成多个随机数的场景
 * @param seed - 基础种子值
 * @returns 每次调用返回下一个随机数
 */
export function createRandomSequence(seed: number): () => number {
  const random = createSeededRandom(seed);
  return random;
}

/**
 * 将字符串转换为数字种子
 * @param str - 输入字符串
 * @returns 数字种子值
 */
export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash >>> 0; // Convert to unsigned 32-bit integer
  }
  return hash;
}

/**
 * 创建 MotionUtils 对象，用于注入到 window.__motionUtils
 */
export function createMotionUtils() {
  return {
    seededRandom: createSeededRandom,
    seededRandomInt,
    seededRandomRange,
    createRandomSequence,
  };
}
