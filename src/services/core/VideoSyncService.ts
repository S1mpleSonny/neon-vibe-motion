/**
 * VideoSyncService - 视频同步服务
 *
 * 统一处理视频参数的时间同步，提供：
 * - 单个视频精确帧定位
 * - 批量同步所有视频参数
 * - 克隆视频用于导出隔离
 *
 * @module services/core/VideoSyncService
 */

import type { VideoSyncOptions } from '../../types';
import { logger } from '../logging';

/**
 * 扩展的视频同步选项，支持起始时间偏移
 * (024-video-start-time)
 */
export interface VideoSyncOptionsExtended extends VideoSyncOptions {
  /** 视频起始时间偏移（毫秒），视频在此时间之前显示第一帧 */
  startTimeOffset?: number;
}

/**
 * 视频同步服务
 */
export class VideoSyncService {
  /** 默认超时时间（毫秒） */
  private static readonly DEFAULT_TIMEOUT = 200;

  /**
   * 同步单个视频到指定时间
   * @param video - 视频元素
   * @param timeMs - 目标时间（毫秒）
   * @param options - 同步选项（支持 startTimeOffset）
   */
  async syncVideoToTime(
    video: HTMLVideoElement,
    timeMs: number,
    options: VideoSyncOptionsExtended = {}
  ): Promise<void> {
    const {
      timeout = VideoSyncService.DEFAULT_TIMEOUT,
      loop = true,
      startTimeOffset = 0,
    } = options;

    // 计算有效时间：动效时间 - 视频起始偏移
    // 当 effectiveTimeMs < 0 时，视频应显示第一帧
    const effectiveTimeMs = timeMs - startTimeOffset;
    const timeInSeconds = Math.max(0, effectiveTimeMs) / 1000;
    const videoDuration = video.duration || 1;

    let targetTime: number;
    if (loop) {
      targetTime = timeInSeconds % videoDuration;
      // 边界处理：避免跳回第一帧
      if (targetTime === 0 && timeInSeconds > 0) {
        targetTime = videoDuration - 0.001;
      }
    } else {
      // 非循环模式：超出时长后保持最后一帧
      targetTime = Math.min(timeInSeconds, videoDuration - 0.001);
    }

    // 如果已经在目标位置，直接返回
    if (Math.abs(video.currentTime - targetTime) < 0.01) {
      return;
    }

    // 确保视频暂停（精确帧定位模式下不使用自然播放）
    if (!video.paused) {
      video.pause();
    }

    return new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };

      video.addEventListener('seeked', onSeeked);
      video.currentTime = targetTime;

      // 超时保护
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      }, timeout);
    });
  }

  /**
   * 同步所有视频参数到指定时间
   * @param params - 参数对象（可能包含 HTMLVideoElement）
   * @param timeMs - 目标时间（毫秒）
   * @param options - 同步选项
   * @param startTimeOffsets - 各视频的起始时间偏移映射（参数 ID -> 毫秒）
   */
  async syncAllVideosToTime(
    params: Record<string, unknown>,
    timeMs: number,
    options: VideoSyncOptions = {},
    startTimeOffsets: Record<string, number> = {}
  ): Promise<void> {
    const videoParams = Object.entries(params).filter(
      ([, value]) => value instanceof HTMLVideoElement
    );

    if (videoParams.length === 0) {
      return;
    }

    await Promise.all(
      videoParams.map(([id, video]) => {
        const startTimeOffset = startTimeOffsets[id] ?? 0;
        return this.syncVideoToTime(video as HTMLVideoElement, timeMs, {
          ...options,
          startTimeOffset,
        });
      })
    );
  }

  /**
   * 克隆视频元素用于导出隔离
   * 创建一个独立的视频对象副本，共享相同的 Blob URL
   * @param original - 原始视频元素
   * @param timeout - 超时时间（毫秒），默认 5000
   */
  async cloneVideoForExport(
    original: HTMLVideoElement,
    timeout = 5000
  ): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const clone = document.createElement('video');
      clone.src = original.src;
      clone.muted = true;
      clone.preload = 'auto';

      const cleanup = () => {
        clone.removeEventListener('loadeddata', onLoaded);
        clone.removeEventListener('error', onError);
      };

      const onLoaded = () => {
        cleanup();
        clearTimeout(timeoutId);
        logger.debug('VideoSyncService', '视频克隆成功', { src: original.src });
        resolve(clone);
      };

      const onError = () => {
        cleanup();
        clearTimeout(timeoutId);
        logger.error('VideoSyncService', '视频克隆失败', { src: original.src });
        reject(new Error('视频克隆失败'));
      };

      clone.addEventListener('loadeddata', onLoaded, { once: true });
      clone.addEventListener('error', onError, { once: true });

      const timeoutId = setTimeout(() => {
        cleanup();
        logger.warn('VideoSyncService', '视频克隆超时', { src: original.src });
        reject(new Error('视频克隆超时'));
      }, timeout);
    });
  }

  /**
   * 批量克隆所有视频参数
   * @param params - 参数对象（可能包含 HTMLVideoElement）
   * @returns 克隆的视频映射
   */
  async cloneAllVideosForExport(
    params: Record<string, unknown>
  ): Promise<Record<string, HTMLVideoElement>> {
    const result: Record<string, HTMLVideoElement> = {};

    const videoParams = Object.entries(params).filter(
      ([, value]) => value instanceof HTMLVideoElement
    );

    for (const [id, video] of videoParams) {
      try {
        result[id] = await this.cloneVideoForExport(video as HTMLVideoElement);
      } catch (error) {
        logger.warn('VideoSyncService', `跳过克隆失败的视频: ${id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // 克隆失败时使用原始视频
        result[id] = video as HTMLVideoElement;
      }
    }

    return result;
  }

  /**
   * 释放克隆的视频资源
   * @param clonedVideos - 克隆的视频映射
   */
  disposeClonedVideos(clonedVideos: Record<string, HTMLVideoElement>): void {
    for (const video of Object.values(clonedVideos)) {
      video.pause();
      video.src = '';
      video.load();
    }
    logger.debug('VideoSyncService', '已释放克隆视频资源', {
      count: Object.keys(clonedVideos).length,
    });
  }
}

/**
 * 创建 VideoSyncService 实例
 */
export function createVideoSyncService(): VideoSyncService {
  return new VideoSyncService();
}

// 导出单例实例
export const videoSyncService = new VideoSyncService();

export default VideoSyncService;
