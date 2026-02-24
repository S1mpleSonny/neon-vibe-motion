/**
 * 坐标转换工具模块
 *
 * 提供归一化坐标（0-1）与像素坐标之间的转换，
 * 以及画面比例和导出分辨率的计算功能。
 */

import type {
  AspectRatioId,
  ExportResolutionId,
  AspectRatio,
  ExportResolution,
  CanvasDimensions,
  NormalizedPosition,
  NormalizedSize,
} from '@/types';

// =============================================================================
// 常量定义
// =============================================================================

/**
 * 支持的画面比例列表
 * 顺序决定 UI 显示顺序
 */
export const ASPECT_RATIOS: readonly AspectRatio[] = [
  { id: '16:9', label: 'aspectRatio.16_9', ratio: 16 / 9, isVertical: false },
  { id: '4:3', label: 'aspectRatio.4_3', ratio: 4 / 3, isVertical: false },
  { id: '1:1', label: 'aspectRatio.1_1', ratio: 1, isVertical: false },
  { id: '9:16', label: 'aspectRatio.9_16', ratio: 9 / 16, isVertical: true },
  { id: '21:9', label: 'aspectRatio.21_9', ratio: 21 / 9, isVertical: false },
  { id: '2.35:1', label: 'aspectRatio.2_35_1', ratio: 2.35, isVertical: false },
] as const;

/**
 * 支持的导出分辨率列表
 */
export const EXPORT_RESOLUTIONS: readonly ExportResolution[] = [
  { id: '720p', label: '720p (HD)', baseHeight: 720 },
  { id: '1080p', label: '1080p (Full HD)', baseHeight: 1080 },
  { id: '4k', label: '4K (Ultra HD)', baseHeight: 2160 },
] as const;

/**
 * 默认画面比例
 */
export const DEFAULT_ASPECT_RATIO: AspectRatioId = '16:9';

/**
 * 默认导出分辨率
 */
export const DEFAULT_EXPORT_RESOLUTION: ExportResolutionId = '1080p';

// =============================================================================
// 查找辅助函数
// =============================================================================

/**
 * 根据 ID 获取画面比例定义
 * @throws 如果 ID 无效则抛出错误
 */
export function getAspectRatio(id: AspectRatioId): AspectRatio {
  const found = ASPECT_RATIOS.find((ar) => ar.id === id);
  if (!found) {
    throw new Error(`无效的画面比例: ${id}`);
  }
  return found;
}

/**
 * 根据 ID 获取导出分辨率定义
 * @throws 如果 ID 无效则抛出错误
 */
export function getExportResolution(id: ExportResolutionId): ExportResolution {
  const found = EXPORT_RESOLUTIONS.find((er) => er.id === id);
  if (!found) {
    throw new Error(`无效的导出分辨率: ${id}`);
  }
  return found;
}

// =============================================================================
// 尺寸计算
// =============================================================================

/**
 * 根据画面比例和分辨率计算导出尺寸
 *
 * 短边保持为分辨率的 baseHeight（如 1080p 时短边为 1080 像素），
 * 长边根据画面比例计算。
 *
 * @example
 * calculateExportDimensions('16:9', '1080p') // { width: 1920, height: 1080 } (横屏，高度是短边)
 * calculateExportDimensions('9:16', '1080p') // { width: 1080, height: 1920 } (竖屏，宽度是短边)
 * calculateExportDimensions('1:1', '1080p')  // { width: 1080, height: 1080 } (方形)
 */
export function calculateExportDimensions(
  aspectRatioId: AspectRatioId,
  resolutionId: ExportResolutionId
): CanvasDimensions {
  const aspectRatio = getAspectRatio(aspectRatioId);
  const resolution = getExportResolution(resolutionId);

  const shortEdge = resolution.baseHeight;

  if (aspectRatio.ratio >= 1) {
    // 横屏或方形：高度是短边
    const height = shortEdge;
    const width = Math.round(height * aspectRatio.ratio);
    return { width, height };
  } else {
    // 竖屏：宽度是短边
    const width = shortEdge;
    const height = Math.round(width / aspectRatio.ratio);
    return { width, height };
  }
}

/**
 * 计算适合容器的预览尺寸，保持画面比例
 *
 * 使用 letterbox/pillarbox 方式，预览会完整显示在容器内，
 * 不会裁剪。
 *
 * @param aspectRatioId - 目标画面比例
 * @param containerWidth - 容器可用宽度（像素）
 * @param containerHeight - 容器可用高度（像素）
 * @returns 适合容器且保持比例的尺寸
 */
export function calculatePreviewDimensions(
  aspectRatioId: AspectRatioId,
  containerWidth: number,
  containerHeight: number
): CanvasDimensions {
  const aspectRatio = getAspectRatio(aspectRatioId);
  const containerAspect = containerWidth / containerHeight;
  const targetAspect = aspectRatio.ratio;

  let width: number;
  let height: number;

  if (containerAspect > targetAspect) {
    // 容器比目标宽 - 按高度适配（letterbox）
    height = containerHeight;
    width = Math.round(containerHeight * targetAspect);
  } else {
    // 容器比目标高 - 按宽度适配（pillarbox）
    width = containerWidth;
    height = Math.round(containerWidth / targetAspect);
  }

  return { width, height };
}

// =============================================================================
// 坐标转换
// =============================================================================

/**
 * 将归一化坐标（0-1）转换为像素坐标
 *
 * @example
 * denormalizePosition({ x: 0.5, y: 0.5 }, { width: 1920, height: 1080 })
 * // { x: 960, y: 540 } (画布中心)
 */
export function denormalizePosition(
  normalized: NormalizedPosition,
  canvasDimensions: CanvasDimensions
): { x: number; y: number } {
  return {
    x: normalized.x * canvasDimensions.width,
    y: normalized.y * canvasDimensions.height,
  };
}

/**
 * 将归一化尺寸（0-1）转换为像素尺寸
 *
 * @example
 * denormalizeSize({ width: 0.5, height: 0.25 }, { width: 1920, height: 1080 })
 * // { width: 960, height: 270 }
 */
export function denormalizeSize(
  normalized: NormalizedSize,
  canvasDimensions: CanvasDimensions
): { width: number; height: number } {
  return {
    width: normalized.width * canvasDimensions.width,
    height: normalized.height * canvasDimensions.height,
  };
}

/**
 * 将像素坐标转换为归一化坐标（0-1）
 *
 * @example
 * normalizePosition({ x: 960, y: 540 }, { width: 1920, height: 1080 })
 * // { x: 0.5, y: 0.5 }
 */
export function normalizePosition(
  pixel: { x: number; y: number },
  canvasDimensions: CanvasDimensions
): NormalizedPosition {
  return {
    x: pixel.x / canvasDimensions.width,
    y: pixel.y / canvasDimensions.height,
  };
}

/**
 * 将像素尺寸转换为归一化尺寸（0-1）
 *
 * @example
 * normalizeSize({ width: 960, height: 270 }, { width: 1920, height: 1080 })
 * // { width: 0.5, height: 0.25 }
 */
export function normalizeSize(
  pixel: { width: number; height: number },
  canvasDimensions: CanvasDimensions
): NormalizedSize {
  return {
    width: pixel.width / canvasDimensions.width,
    height: pixel.height / canvasDimensions.height,
  };
}
