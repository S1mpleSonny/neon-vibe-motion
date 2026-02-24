/**
 * FrameByFrameRenderer - 逐帧渲染器
 *
 * 用于视频导出的逐帧渲染，提供：
 * - 导出环境准备（克隆视频、创建离屏 canvas）
 * - 单帧渲染
 * - 批量逐帧渲染（异步迭代器）
 * - 资源清理
 *
 * @module services/exporter/FrameByFrameRenderer
 */

import type { ExportContext, ExportPrepareOptions, FrameData } from '../../types';
import type { CoreRenderer, RenderFrameOptions } from '../core/CoreRenderer.interface';
import { videoSyncService } from '../core/VideoSyncService';
import { logger } from '../logging';

/**
 * 逐帧渲染器
 */
export class FrameByFrameRenderer {
  /**
   * 准备导出环境
   * @param renderer - 核心渲染器
   * @param options - 准备选项
   */
  async prepareForExport(
    renderer: CoreRenderer,
    options: ExportPrepareOptions = {}
  ): Promise<ExportContext> {
    const { fps = 60, cloneVideos = true } = options;

    logger.info('FrameByFrameRenderer', '准备导出环境', { fps, cloneVideos });

    // 获取渲染器尺寸
    const dimensions = renderer.getDimensions();

    // 创建离屏 canvas
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = dimensions.width;
    offscreenCanvas.height = dimensions.height;

    // 克隆视频参数（如果需要）
    let clonedVideos: Record<string, HTMLVideoElement> = {};
    if (cloneVideos) {
      const params = renderer.getParameters();
      clonedVideos = await videoSyncService.cloneAllVideosForExport(params);
      logger.debug('FrameByFrameRenderer', '视频克隆完成', {
        count: Object.keys(clonedVideos).length,
      });
    }

    return {
      offscreenCanvas,
      clonedVideos,
      renderer,
      fps,
    };
  }

  /**
   * 渲染指定帧
   * @param context - 导出上下文
   * @param time - 时间（毫秒）
   * @param options - 渲染选项
   */
  async renderFrame(
    context: ExportContext,
    time: number,
    options: RenderFrameOptions = {}
  ): Promise<ImageData> {
    const { offscreenCanvas, clonedVideos, renderer } = context;

    // 合并视频覆盖
    const renderOptions: RenderFrameOptions = {
      ...options,
      videoOverrides: {
        ...options.videoOverrides,
        ...clonedVideos,
      },
      waitForVideoSeek: true,
    };

    // 渲染到离屏 canvas
    await (renderer as CoreRenderer).renderToCanvas(offscreenCanvas, time, renderOptions);

    // 获取图像数据
    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取离屏 canvas context');
    }

    return ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
  }

  /**
   * 渲染所有帧的异步迭代器
   * @param context - 导出上下文
   * @param fps - 帧率
   * @param duration - 时长（毫秒）
   */
  async *renderAllFrames(
    context: ExportContext,
    fps: number,
    duration: number
  ): AsyncGenerator<FrameData> {
    const frameDelay = 1000 / fps;
    const totalFrames = Math.max(1, Math.ceil(duration / frameDelay));

    logger.info('FrameByFrameRenderer', '开始逐帧渲染', {
      fps,
      duration,
      totalFrames,
    });

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const time = frameIndex * frameDelay;

      const imageData = await this.renderFrame(context, time);

      yield {
        frameIndex,
        time,
        imageData,
      };

      // 每 10 帧让出主线程，避免阻塞 UI
      if (frameIndex % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    logger.info('FrameByFrameRenderer', '逐帧渲染完成', { totalFrames });
  }

  /**
   * 计算总帧数
   * @param fps - 帧率
   * @param duration - 时长（毫秒）
   */
  calculateTotalFrames(fps: number, duration: number): number {
    const frameDelay = 1000 / fps;
    return Math.max(1, Math.ceil(duration / frameDelay));
  }

  /**
   * 清理导出上下文
   * @param context - 导出上下文
   */
  cleanup(context: ExportContext): void {
    // 释放克隆的视频
    videoSyncService.disposeClonedVideos(context.clonedVideos);

    // 清理离屏 canvas
    const ctx = context.offscreenCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, context.offscreenCanvas.width, context.offscreenCanvas.height);
    }

    logger.debug('FrameByFrameRenderer', '导出上下文已清理');
  }
}

/**
 * 创建 FrameByFrameRenderer 实例
 */
export function createFrameByFrameRenderer(): FrameByFrameRenderer {
  return new FrameByFrameRenderer();
}

export default FrameByFrameRenderer;
