/**
 * 图片序列化工具
 * Feature: 030-session-export
 *
 * 处理图片 Blob URL 与 Base64 Data URL 之间的转换
 */

/**
 * 将 Blob URL 转换为 Base64 Data URL
 * @param blobUrl - Blob URL (blob:xxx)
 * @returns Promise<string> Base64 Data URL (data:image/xxx;base64,xxx)
 */
export async function blobUrlToBase64(blobUrl: string): Promise<string> {
  // 如果已经是 Base64 Data URL，直接返回
  if (blobUrl.startsWith('data:')) {
    return blobUrl;
  }

  // 如果是占位符，直接返回
  if (blobUrl.startsWith('__')) {
    return blobUrl;
  }

  // 获取 Blob 数据
  const response = await fetch(blobUrl);
  const blob = await response.blob();

  // 转换为 Base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('图片转换失败'));
    reader.readAsDataURL(blob);
  });
}

/**
 * 将 Base64 Data URL 转换为 Blob URL
 * @param base64 - Base64 Data URL (data:image/xxx;base64,xxx)
 * @returns string Blob URL (blob:xxx)
 */
export function base64ToBlobUrl(base64: string): string {
  // 如果是占位符，直接返回
  if (base64.startsWith('__')) {
    return base64;
  }

  // 如果已经是 Blob URL，直接返回
  if (base64.startsWith('blob:')) {
    return base64;
  }

  // 解析 Base64 Data URL
  const match = base64.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    // 无效的 Base64 格式，返回原值
    return base64;
  }

  const mimeType = match[1];
  const base64Data = match[2];

  // 解码 Base64
  const byteString = atob(base64Data);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  // 创建 Blob 并生成 URL
  const blob = new Blob([uint8Array], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * 检查字符串是否为有效的 Base64 图片 Data URL
 * @param value - 待检查的字符串
 * @returns boolean
 */
export function isBase64ImageDataUrl(value: string): boolean {
  return /^data:image\/[a-zA-Z]+;base64,/.test(value);
}

/**
 * 检查字符串是否为 Blob URL
 * @param value - 待检查的字符串
 * @returns boolean
 */
export function isBlobUrl(value: string): boolean {
  return value.startsWith('blob:');
}
