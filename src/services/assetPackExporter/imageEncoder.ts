/**
 * 图片资源 Base64 编码工具
 * 将图片转换为 Base64 格式以内联到 HTML
 * @module services/assetPackExporter/imageEncoder
 */

import type { ExportableParameter } from '../../types';

/**
 * 将 Blob URL 或外部图片 URL 转换为 Base64
 * @param url 图片 URL（Blob URL 或 http/https URL）
 * @returns Base64 编码的 data URL
 */
export async function urlToBase64(url: string): Promise<string> {
  // 如果已经是 data URL，直接返回
  if (url.startsWith('data:')) {
    return url;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // 尝试跨域加载

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);

        // 尝试获取 PNG 格式的 data URL
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (error) {
        // 可能因为跨域问题导致 canvas 被污染
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
}

/**
 * 从导出参数列表中收集并编码所有图片资源
 * @param params 可导出参数列表（包括未选中的图片参数）
 * @returns 图片资源映射（paramId -> Base64 data URL）
 */
export async function collectImageAssets(
  params: ExportableParameter[]
): Promise<Record<string, string>> {
  const imageAssets: Record<string, string> = {};

  // 收集所有图片类型参数
  const imageParams = params.filter((ep) => ep.parameter.type === 'image');

  // 并行处理所有图片
  const promises = imageParams.map(async (ep) => {
    const url = ep.currentValue as string;
    if (!url || url === '__PLACEHOLDER__') {
      return; // 跳过空值或占位符
    }

    try {
      const base64 = await urlToBase64(url);
      imageAssets[ep.parameter.id] = base64;
    } catch (error) {
      console.warn(`Failed to encode image for parameter ${ep.parameter.id}:`, error);
      // 编码失败时，跳过该图片（导出的 HTML 中会缺少这张图）
    }
  });

  await Promise.all(promises);

  return imageAssets;
}

/**
 * 估算图片资源的大小（字节）
 * @param imageAssets 图片资源映射
 * @returns 估算大小（字节）
 */
export function estimateImageAssetsSize(imageAssets: Record<string, string>): number {
  let totalSize = 0;

  for (const base64 of Object.values(imageAssets)) {
    // Base64 编码后大小约为原始大小的 4/3
    // data URL 格式: "data:image/png;base64," + base64Data
    // 这里直接计算字符串长度作为估算
    totalSize += base64.length;
  }

  return totalSize;
}

/**
 * 检查图片是否为 Blob URL
 */
export function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:');
}

/**
 * 检查图片是否为外部 URL
 */
export function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * 检查图片是否为 Data URL
 */
export function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * 获取图片 URL 的类型
 */
export function getImageUrlType(url: string): 'blob' | 'external' | 'data' | 'placeholder' | 'unknown' {
  if (!url) return 'unknown';
  if (url === '__PLACEHOLDER__') return 'placeholder';
  if (isBlobUrl(url)) return 'blob';
  if (isExternalUrl(url)) return 'external';
  if (isDataUrl(url)) return 'data';
  return 'unknown';
}
