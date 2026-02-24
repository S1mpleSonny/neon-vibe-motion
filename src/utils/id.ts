/**
 * ID 生成工具
 * @module utils/id
 */

/**
 * 生成唯一标识符 (UUID v4)
 * 优先使用浏览器原生 crypto.randomUUID()
 * 如果不可用则使用 crypto.getRandomValues() 作为 fallback
 * 最后使用 Math.random() 作为兜底（非 HTTPS 环境）
 * @returns UUID v4 格式的字符串
 */
export function generateId(): string {
  // 优先使用原生 API (Chrome 92+, Safari 15.4+, Firefox 95+)
  // 需要 Secure Context (HTTPS/localhost/file://)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // 某些浏览器可能抛出错误，继续尝试 fallback
    }
  }

  // Fallback 1: 使用 crypto.getRandomValues()
  // 仍然需要 Secure Context，但支持范围更广
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    try {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);

      // 设置版本号为 4 (随机 UUID) 和变体为 0b10xx
      bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10

      // 转换为十六进制字符串
      const hex = Array.from(bytes, (b) => (b < 16 ? '0' : '') + b.toString(16)).join('');

      // 格式化为 UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
      ].join('-');
    } catch {
      // 继续尝试兜底方案
    }
  }

  // Fallback 2: 使用 Math.random() (非 HTTPS 环境兜底)
  // 注意：这不是密码学安全的，仅用于开发/局域网环境
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
