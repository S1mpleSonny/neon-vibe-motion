/**
 * ExportPipeline - 导出流水线
 *
 * 协调逐帧渲染和 H.264 编码，提供完整的视频导出流程：
 * - 准备导出环境
 * - 逐帧渲染
 * - 编码为 MP4
 * - 进度报告
 * - 取消和资源清理
 * - 错误处理和友好提示 (023-unified-renderer)
 *
 * @module services/exporter/ExportPipeline
 */

import type { ExportConfig, ExportContext, RenderError, RenderErrorType } from '../../types';
import type { CoreRenderer } from '../core/CoreRenderer.interface';
import { FrameByFrameRenderer } from './FrameByFrameRenderer';
import { H264EncoderService } from './H264EncoderService';
import { calculateExportDimensions, DEFAULT_ASPECT_RATIO } from '../../utils/coordinates';
import { logger } from '../logging';

/**
 * 导出流水线状态
 */
export type ExportPipelineStatus = 'idle' | 'preparing' | 'rendering' | 'encoding' | 'complete' | 'error';

/**
 * 导出验证结果
 */
export interface ExportValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: ExportValidationError[];
}

/**
 * 导出验证错误
 */
export interface ExportValidationError {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 用户友好提示 */
  friendlyMessage: string;
}

/**
 * 导出错误
 */
export class ExportError extends Error {
  /** 错误类型 */
  type: RenderErrorType;
  /** 用户友好提示 */
  friendlyMessage: string;
  /** 阶段 */
  phase: ExportPipelineStatus;

  constructor(
    message: string,
    type: RenderErrorType,
    friendlyMessage: string,
    phase: ExportPipelineStatus
  ) {
    super(message);
    this.name = 'ExportError';
    this.type = type;
    this.friendlyMessage = friendlyMessage;
    this.phase = phase;
  }

  /**
   * 转换为 RenderError 格式
   */
  toRenderError(code: string): RenderError {
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.type,
      message: this.message,
      friendlyMessage: this.friendlyMessage,
      code,
      timestamp: Date.now(),
    };
  }
}

/** 最小导出时长（毫秒） */
const MIN_EXPORT_DURATION = 100;

/**
 * 导出流水线
 */
export class ExportPipeline {
  /** 逐帧渲染器 */
  private frameRenderer: FrameByFrameRenderer;

  /** RGB H.264 编码器 */
  private encoder: H264EncoderService | null = null;

  /** 当前状态 */
  private status: ExportPipelineStatus = 'idle';

  /** 是否已取消 */
  private cancelled = false;

  /** 当前导出上下文 */
  private currentContext: ExportContext | null = null;

  /** 最后一个错误 */
  private lastError: ExportError | null = null;

  constructor() {
    this.frameRenderer = new FrameByFrameRenderer();
  }

  /**
   * 导出前验证
   * @param renderer - 核心渲染器
   * @param config - 导出配置
   */
  validateExport(renderer: CoreRenderer, config: ExportConfig): ExportValidationResult {
    const errors: ExportValidationError[] = [];

    // 检查动效时长
    const duration = renderer.getDuration();
    if (duration < MIN_EXPORT_DURATION) {
      errors.push({
        code: 'DURATION_TOO_SHORT',
        message: `动效时长 ${duration}ms 小于最小要求 ${MIN_EXPORT_DURATION}ms`,
        friendlyMessage: `动效时长太短，请确保时长至少为 ${MIN_EXPORT_DURATION / 1000} 秒`,
      });
    }

    // 检查帧率
    if (config.frameRate < 1 || config.frameRate > 120) {
      errors.push({
        code: 'INVALID_FRAME_RATE',
        message: `帧率 ${config.frameRate} 超出有效范围 (1-120)`,
        friendlyMessage: '帧率设置无效，请使用 1-120 之间的值',
      });
    }

    // 检查分辨率
    const validResolutions = ['720p', '1080p', '4k'];
    if (!validResolutions.includes(config.resolution)) {
      errors.push({
        code: 'INVALID_RESOLUTION',
        message: `分辨率 ${config.resolution} 不在支持列表中`,
        friendlyMessage: '请选择有效的分辨率（720p、1080p 或 4K）',
      });
    }

    // 检查 H.264 编码器是否可用
    if (!H264EncoderService.isEncoderAvailable()) {
      errors.push({
        code: 'ENCODER_UNAVAILABLE',
        message: 'H.264 MP4 编码器未加载',
        friendlyMessage: 'MP4 编码器未能加载，请刷新页面重试',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取最后一个错误
   */
  getLastError(): ExportError | null {
    return this.lastError;
  }

  /**
   * 生成友好的错误提示
   */
  private generateFriendlyMessage(error: unknown, phase: ExportPipelineStatus): string {
    const message = error instanceof Error ? error.message : String(error);

    // 根据阶段和错误内容生成友好提示
    if (phase === 'preparing') {
      if (message.includes('视频')) {
        return '准备视频资源时出错，请检查视频文件是否有效';
      }
      return '准备导出环境时出错，请稍后重试';
    }

    if (phase === 'rendering') {
      if (message.includes('canvas')) {
        return '渲染画布时出错，请检查动效代码是否正确';
      }
      return '渲染帧时出错，请检查动效代码是否有运行时错误';
    }

    if (phase === 'encoding') {
      if (message.includes('内存') || message.includes('memory')) {
        return '编码时内存不足，请尝试降低分辨率或帧率';
      }
      return '视频编码时出错，请尝试重新导出';
    }

    if (message === '导出已取消') {
      return '导出已取消';
    }

    return '导出失败，请稍后重试';
  }

  /**
   * 导出为 MP4
   * @param renderer - 核心渲染器
   * @param config - 导出配置
   * @param onProgress - 进度回调 (0-100)
   */
  async exportToMP4(
    renderer: CoreRenderer,
    config: ExportConfig,
    onProgress?: (progress: number) => void,
  ): Promise<Blob> {
    if (this.status !== 'idle') {
      throw new ExportError(
        '导出流水线正在运行中，请先取消当前导出',
        'export',
        '导出正在进行中，请等待当前导出完成或取消后重试',
        this.status
      );
    }

    // 重置错误状态
    this.lastError = null;
    this.cancelled = false;
    this.status = 'preparing';

    logger.info('ExportPipeline', '开始导出', { config });

    // 导出前验证
    const validation = this.validateExport(renderer, config);
    if (!validation.valid) {
      const firstError = validation.errors[0];
      const error = new ExportError(
        firstError.message,
        'export',
        firstError.friendlyMessage,
        'preparing'
      );
      this.lastError = error;
      this.status = 'error';
      throw error;
    }

    try {
      // 1. 计算导出尺寸
      const aspectRatio = config.aspectRatio || DEFAULT_ASPECT_RATIO;
      const targetResolution = calculateExportDimensions(aspectRatio, config.resolution);
      const duration = renderer.getDuration();
      const totalFrames = this.frameRenderer.calculateTotalFrames(config.frameRate, duration);

      // 2. 准备导出环境
      onProgress?.(0);
      this.currentContext = await this.frameRenderer.prepareForExport(renderer, {
        fps: config.frameRate,
        cloneVideos: true,
      });

      if (this.cancelled) {
        throw new Error('导出已取消');
      }

      // 3. 初始化 RGB 编码器
      this.encoder = new H264EncoderService();
      await this.encoder.initialize(targetResolution.width, targetResolution.height, {
        frameRate: config.frameRate,
        quality: 10,
        speed: 5,
        keyframeInterval: config.frameRate,
      });

      if (this.cancelled) {
        throw new Error('导出已取消');
      }

      // 4. 逐帧渲染和编码
      this.status = 'rendering';

      // 创建导出专用的离屏 canvas
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = this.encoder.getAlignedWidth();
      exportCanvas.height = this.encoder.getAlignedHeight();
      const exportCtx = exportCanvas.getContext('2d');

      if (!exportCtx) {
        throw new Error('无法创建导出 canvas context');
      }

      let frameCount = 0;
      for await (const frameData of this.frameRenderer.renderAllFrames(
        this.currentContext,
        config.frameRate,
        duration
      )) {
        if (this.cancelled) {
          throw new Error('导出已取消');
        }

        // 将帧数据绘制到导出 canvas（可能需要缩放）
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frameData.imageData.width;
        tempCanvas.height = frameData.imageData.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.putImageData(frameData.imageData, 0, 0);
          exportCtx.drawImage(tempCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
        }

        // 获取导出尺寸的图像数据并添加到编码器
        const exportImageData = exportCtx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
        this.encoder.addFrame(exportImageData);

        frameCount++;
        const progress = Math.min(((frameCount / totalFrames) * 90) + 5, 95);
        onProgress?.(progress);
      }

      if (this.cancelled) {
        throw new Error('导出已取消');
      }

      // 5. 完成编码
      this.status = 'encoding';
      onProgress?.(96);

      const rgbBlob = this.encoder.finalize();
      onProgress?.(100);

      this.status = 'complete';
      logger.info('ExportPipeline', '导出完成', {
        size: rgbBlob.size,
        sizeKB: (rgbBlob.size / 1024).toFixed(1),
        frames: frameCount,
      });

      return rgbBlob;
    } catch (error) {
      logger.error('ExportPipeline', '导出失败', {
        error: error instanceof Error ? error.message : String(error),
        phase: this.status,
      });

      // 如果是取消操作，不需要包装错误
      if (error instanceof Error && error.message === '导出已取消') {
        this.status = 'idle';
        throw error;
      }

      // 如果已经是 ExportError，直接保存并抛出
      if (error instanceof ExportError) {
        this.lastError = error;
        this.status = 'error';
        throw error;
      }

      // 包装为 ExportError
      const errorType: RenderErrorType = this.status === 'encoding' ? 'encode' : 'export';
      const friendlyMessage = this.generateFriendlyMessage(error, this.status);
      const exportError = new ExportError(
        error instanceof Error ? error.message : String(error),
        errorType,
        friendlyMessage,
        this.status
      );
      this.lastError = exportError;
      this.status = 'error';
      throw exportError;
    } finally {
      this.cleanup();
    }
  }

  /**
   * 取消导出
   */
  cancel(): void {
    if (this.status === 'idle') {
      return;
    }

    logger.info('ExportPipeline', '取消导出');
    this.cancelled = true;
    this.cleanup();
  }

  /**
   * 是否正在导出
   */
  isExporting(): boolean {
    return this.status !== 'idle' && this.status !== 'complete';
  }

  /**
   * 获取当前状态
   */
  getStatus(): ExportPipelineStatus {
    return this.status;
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    // 清理导出上下文
    if (this.currentContext) {
      this.frameRenderer.cleanup(this.currentContext);
      this.currentContext = null;
    }

    // 清理编码器
    if (this.encoder) {
      this.encoder.dispose();
      this.encoder = null;
    }

    this.status = 'idle';
  }
}

/**
 * 创建 ExportPipeline 实例
 */
export function createExportPipeline(): ExportPipeline {
  return new ExportPipeline();
}

export default ExportPipeline;
