/**
 * 视频资源 Base64 编码工具
 * 将视频转换为 Base64 格式以内联到 HTML
 * @module services/assetPackExporter/videoEncoder
 */

import type { AdjustableParameter } from '../../types';
import { logger } from '../logging';

/**
 * 单个视频资源的 Base64 编码数据
 */
export interface VideoAssetData {
  /** 参数 ID (对应 AdjustableParameter.id) */
  paramId: string;
  /** Base64 编码的 video data URL (格式: "data:video/mp4;base64,...") */
  base64Data: string;
  /** 视频格式 (目前仅支持 "mp4") */
  format: 'mp4';
  /** 视频时长（秒，可选） */
  duration?: number;
  /** 是否包含透明通道 */
  hasAlpha?: boolean;
  /** 原始文件大小（字节） */
  originalSize: number;
}

/**
 * 视频资源收集操作的结果
 */
export interface VideoAssetsResult {
  /** 成功收集的视频资源列表 */
  assets: VideoAssetData[];
  /** 所有资源的总大小（字节，Base64 编码后） */
  totalSize: number;
  /** 收集失败的资源信息 */
  errors: VideoCollectError[];
}

/**
 * 视频资源收集失败信息
 */
export interface VideoCollectError {
  /** 失败的参数 ID */
  paramId: string;
  /** 失败原因 */
  reason: 'invalid_url' | 'invalid_format' | 'fetch_failed' | 'unsupported_format';
  /** 错误消息 */
  message: string;
  /** 原始 URL（用于调试） */
  url?: string;
}

/**
 * 将 Blob URL 转换为 Base64 字符串
 * 复用 sequenceEncoder 的实现模式
 * @param blobUrl - Blob URL
 * @returns Base64 字符串（data URL 格式）
 */
export async function blobUrlToBase64(blobUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('FileReader failed to convert blob to base64'));
      };
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = () => {
      reject(new Error(`Failed to fetch blob URL: ${blobUrl}`));
    };
    xhr.open('GET', blobUrl);
    xhr.responseType = 'blob';
    xhr.send();
  });
}

/**
 * 收集视频资源并转为 Base64
 * @param parameters - 参数列表
 * @returns 视频资源结果
 */
export async function collectVideoAssets(
  parameters: AdjustableParameter[]
): Promise<VideoAssetsResult> {
  const videoParams = parameters.filter((p) => p.type === 'video');

  if (videoParams.length === 0) {
    logger.debug('videoEncoder', '没有视频参数需要收集');
    return { assets: [], totalSize: 0, errors: [] };
  }

  logger.info('videoEncoder', '开始收集视频资源', {
    count: videoParams.length,
  });

  const assets: VideoAssetData[] = [];
  const errors: VideoCollectError[] = [];
  let totalSize = 0;

  for (const param of videoParams) {
    const url = param.videoValue as string;

    // 跳过空值或占位符
    if (!url || url === '__PLACEHOLDER__') {
      continue;
    }

    try {
      // 验证是否为 Blob URL
      if (!url.startsWith('blob:')) {
        errors.push({
          paramId: param.id,
          reason: 'invalid_url',
          message: `视频 "${param.name}" 不是有效的 Blob URL`,
          url,
        });
        logger.warn('videoEncoder', `跳过无效 URL: ${param.id}`, { url });
        continue;
      }

      // 转换为 Base64
      const base64 = await blobUrlToBase64(url);

      // 验证格式 - 仅支持 MP4
      if (!base64.startsWith('data:video/mp4')) {
        errors.push({
          paramId: param.id,
          reason: 'unsupported_format',
          message: `视频 "${param.name}" 格式不支持，仅支持 MP4 格式`,
          url,
        });
        logger.warn('videoEncoder', `不支持的视频格式: ${param.id}`, { format: base64.split(';')[0]?.split(':')[1] });
        continue;
      }

      // 估算原始大小（Base64 编码后约为原始的 4/3）
      const originalSize = Math.floor(base64.length * 0.75);

      assets.push({
        paramId: param.id,
        base64Data: base64,
        format: 'mp4',
        originalSize,
      });

      totalSize += base64.length;

      logger.debug('videoEncoder', `视频已收集: ${param.id}`, {
        size: `${(originalSize / 1024 / 1024).toFixed(2)}MB`,
      });
    } catch (error) {
      errors.push({
        paramId: param.id,
        reason: 'fetch_failed',
        message: `视频 "${param.name}" 加载失败: ${error instanceof Error ? error.message : String(error)}`,
        url,
      });
      logger.warn('videoEncoder', `收集视频失败: ${param.id}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('videoEncoder', '视频资源收集完成', {
    successCount: assets.length,
    errorCount: errors.length,
    totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
  });

  return { assets, totalSize, errors };
}

/**
 * 估算视频资源的大小（字节）
 * @param videoAssets - 视频资源映射
 * @returns 估算大小
 */
export function estimateVideoAssetsSize(videoAssets: Record<string, string>): number {
  let totalSize = 0;
  for (const base64 of Object.values(videoAssets)) {
    totalSize += base64.length;
  }
  return totalSize;
}

/**
 * 检查视频是否为 Blob URL
 */
export function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:');
}

/**
 * 检查视频是否为 Data URL
 */
export function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * 获取视频 URL 的类型
 */
export function getVideoUrlType(url: string): 'blob' | 'data' | 'placeholder' | 'unknown' {
  if (!url) return 'unknown';
  if (url === '__PLACEHOLDER__') return 'placeholder';
  if (isBlobUrl(url)) return 'blob';
  if (isDataUrl(url)) return 'data';
  return 'unknown';
}

export default {
  blobUrlToBase64,
  collectVideoAssets,
  estimateVideoAssetsSize,
  isBlobUrl,
  isDataUrl,
  getVideoUrlType,
};
