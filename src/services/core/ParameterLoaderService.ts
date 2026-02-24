/**
 * ParameterLoaderService - 参数加载服务
 *
 * 统一处理参数的预加载，特别是媒体类型参数：
 * - 图片参数预加载
 * - 视频参数预加载
 *
 * @module services/core/ParameterLoaderService
 */

import type { AdjustableParameter, MotionDefinition } from '../../types';
import { PLACEHOLDER_IMAGE_VALUE, PLACEHOLDER_VIDEO_VALUE } from '../../types';
import { loadImage, createPlaceholderImage, isPlaceholderImage } from '../../utils/imageUtils';
import { loadVideo, createPlaceholderVideo, isPlaceholderVideo } from '../../utils/videoUtils';
import { logger } from '../logging';

/**
 * 参数加载结果
 */
export interface ParameterLoadResult {
  /** 参数 ID */
  id: string;
  /** 加载后的值 */
  value: unknown;
  /** 是否加载成功 */
  success: boolean;
  /** 错误信息（如有） */
  error?: string;
}

/**
 * 参数加载服务
 */
export class ParameterLoaderService {
  /**
   * 从参数定义获取初始值
   * @param param - 参数定义
   */
  getParameterValue(param: AdjustableParameter): unknown {
    switch (param.type) {
      case 'number':
        return param.value ?? param.min ?? 0;
      case 'color':
        return param.colorValue ?? '#000000';
      case 'select':
        return param.selectedValue ?? param.options?.[0]?.value ?? '';
      case 'boolean':
        return param.boolValue ?? false;
      case 'image':
        return param.imageValue ?? param.placeholderImage ?? PLACEHOLDER_IMAGE_VALUE;
      case 'video':
        return param.videoValue ?? param.placeholderVideo ?? PLACEHOLDER_VIDEO_VALUE;
      case 'string':
        return param.stringValue ?? '';
      default:
        return null;
    }
  }

  /**
   * 初始化所有参数值
   * @param motion - 动效定义
   * @returns 参数值映射
   */
  initializeParams(motion: MotionDefinition): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    motion.parameters.forEach((param) => {
      params[param.id] = this.getParameterValue(param);
    });
    return params;
  }

  /**
   * 加载单个图片参数
   * @param url - 图片 URL
   */
  async loadImageForParam(url: string): Promise<HTMLImageElement> {
    if (isPlaceholderImage(url)) {
      const placeholderUrl = createPlaceholderImage();
      return loadImage(placeholderUrl);
    }
    return loadImage(url);
  }

  /**
   * 预加载所有图片参数
   * @param motion - 动效定义
   * @param params - 当前参数值映射
   * @returns 更新后的参数值映射
   */
  async preloadImageParams(
    motion: MotionDefinition,
    params: Record<string, unknown>
  ): Promise<ParameterLoadResult[]> {
    const imageParams = motion.parameters.filter((p) => p.type === 'image');
    const results: ParameterLoadResult[] = [];

    for (const param of imageParams) {
      const url = params[param.id] as string;
      if (url) {
        try {
          const img = await this.loadImageForParam(url);
          params[param.id] = img;
          results.push({ id: param.id, value: img, success: true });
        } catch (error) {
          logger.warn('ParameterLoaderService', `加载图片参数失败: ${param.id}`, {
            error: error instanceof Error ? error.message : String(error),
          });
          // 使用占位图作为后备
          try {
            const placeholderUrl = createPlaceholderImage();
            const placeholderImg = await loadImage(placeholderUrl);
            params[param.id] = placeholderImg;
            results.push({
              id: param.id,
              value: placeholderImg,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          } catch (placeholderError) {
            results.push({
              id: param.id,
              value: null,
              success: false,
              error: `加载占位图也失败: ${placeholderError}`,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * 加载单个视频参数
   * @param url - 视频 URL
   */
  async loadVideoForParam(url: string): Promise<HTMLVideoElement> {
    if (isPlaceholderVideo(url)) {
      const placeholderUrl = createPlaceholderVideo();
      return loadVideo(placeholderUrl);
    }
    return loadVideo(url);
  }

  /**
   * 预加载所有视频参数
   * @param motion - 动效定义
   * @param params - 当前参数值映射
   * @returns 更新后的参数值映射
   */
  async preloadVideoParams(
    motion: MotionDefinition,
    params: Record<string, unknown>
  ): Promise<ParameterLoadResult[]> {
    const videoParams = motion.parameters.filter((p) => p.type === 'video');
    const results: ParameterLoadResult[] = [];

    for (const param of videoParams) {
      const url = params[param.id] as string;
      if (url) {
        try {
          const video = await this.loadVideoForParam(url);
          params[param.id] = video;
          results.push({ id: param.id, value: video, success: true });
        } catch (error) {
          logger.warn('ParameterLoaderService', `加载视频参数失败: ${param.id}`, {
            error: error instanceof Error ? error.message : String(error),
          });
          // 使用占位视频作为后备
          try {
            const placeholderUrl = createPlaceholderVideo();
            const placeholderVideo = await loadVideo(placeholderUrl);
            params[param.id] = placeholderVideo;
            results.push({
              id: param.id,
              value: placeholderVideo,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          } catch (placeholderError) {
            // 如果占位视频也加载失败，设置为 null
            params[param.id] = null;
            results.push({
              id: param.id,
              value: null,
              success: false,
              error: `加载占位视频也失败: ${placeholderError}`,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * 预加载所有媒体参数（图片和视频）
   * @param motion - 动效定义
   * @param params - 当前参数值映射
   * @returns 加载结果
   */
  async preloadAllMediaParams(
    motion: MotionDefinition,
    params: Record<string, unknown>
  ): Promise<ParameterLoadResult[]> {
    const [imageResults, videoResults] = await Promise.all([
      this.preloadImageParams(motion, params),
      this.preloadVideoParams(motion, params),
    ]);

    return [...imageResults, ...videoResults];
  }
}

/**
 * 创建 ParameterLoaderService 实例
 */
export function createParameterLoaderService(): ParameterLoaderService {
  return new ParameterLoaderService();
}

// 导出单例实例
export const parameterLoaderService = new ParameterLoaderService();

export default ParameterLoaderService;
