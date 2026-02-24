/**
 * H264EncoderService - H.264 编码服务
 *
 * 封装 h264-mp4-encoder WASM 库，提供统一的 H.264 编码接口
 * 供主平台导出和素材包导出共同使用
 *
 * @module services/exporter/H264EncoderService
 */

import type { H264Options } from '../../types';
import { logger } from '../logging';

// h264-mp4-encoder 类型定义
interface H264MP4Encoder {
  width: number;
  height: number;
  frameRate: number;
  quantizationParameter: number;
  speed: number;
  groupOfPictures: number;
  outputFilename: string;
  FS: {
    readFile: (filename: string) => Uint8Array;
  };
  initialize: () => void;
  addFrameRgba: (data: Uint8Array | Uint8ClampedArray) => void;
  finalize: () => void;
  delete: () => void;
}

// 全局 h264-mp4-encoder 初始化函数
declare global {
  interface Window {
    __initH264MP4Encoder__?: () => Promise<H264MP4Encoder>;
  }
}

/**
 * H.264 编码服务
 */
export class H264EncoderService {
  /** 默认帧率 */
  private static readonly DEFAULT_FRAME_RATE = 60;

  /** 默认量化参数 (质量) */
  private static readonly DEFAULT_QUALITY = 28;

  /** 默认编码速度 */
  private static readonly DEFAULT_SPEED = 5;

  /** 默认关键帧间隔 */
  private static readonly DEFAULT_KEYFRAME_INTERVAL = 60;

  /** 编码器实例 */
  private encoder: H264MP4Encoder | null = null;

  /** 编码器是否已初始化 */
  private _isInitialized = false;

  /** 编码器是否正在加载 */
  private isLoading = false;

  /** 对齐后的宽度 */
  private alignedWidth = 0;

  /** 对齐后的高度 */
  private alignedHeight = 0;

  /**
   * 初始化编码器
   * @param width - 视频宽度
   * @param height - 视频高度
   * @param options - 编码选项
   */
  async initialize(
    width: number,
    height: number,
    options: H264Options = {}
  ): Promise<void> {
    if (this._isInitialized) {
      logger.warn('H264EncoderService', '编码器已初始化，请先调用 dispose()');
      return;
    }

    if (this.isLoading) {
      logger.warn('H264EncoderService', '编码器正在加载中');
      return;
    }

    this.isLoading = true;

    try {
      // 检查 WASM 编码器是否可用
      if (typeof window.__initH264MP4Encoder__ !== 'function') {
        throw new Error('H264 MP4 编码器未正确加载，请确保 h264-mp4-encoder 库已加载');
      }

      // 创建编码器实例
      this.encoder = await window.__initH264MP4Encoder__();

      // 宽高必须是 2 的倍数（H.264 编码要求）
      this.alignedWidth = width % 2 === 0 ? width : width + 1;
      this.alignedHeight = height % 2 === 0 ? height : height + 1;

      // 设置编码器参数
      this.encoder.width = this.alignedWidth;
      this.encoder.height = this.alignedHeight;
      this.encoder.frameRate = options.frameRate ?? H264EncoderService.DEFAULT_FRAME_RATE;
      this.encoder.quantizationParameter = options.quality ?? H264EncoderService.DEFAULT_QUALITY;
      this.encoder.speed = options.speed ?? H264EncoderService.DEFAULT_SPEED;
      this.encoder.groupOfPictures = options.keyframeInterval ?? H264EncoderService.DEFAULT_KEYFRAME_INTERVAL;

      // 初始化编码器
      this.encoder.initialize();

      this._isInitialized = true;

      logger.info('H264EncoderService', '编码器初始化成功', {
        width: this.alignedWidth,
        height: this.alignedHeight,
        frameRate: this.encoder.frameRate,
        quality: this.encoder.quantizationParameter,
      });
    } catch (error) {
      logger.error('H264EncoderService', '编码器初始化失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 添加一帧
   * @param imageData - RGBA 格式的图像数据
   */
  addFrame(imageData: ImageData): void {
    if (!this._isInitialized || !this.encoder) {
      throw new Error('编码器未初始化，请先调用 initialize()');
    }

    // 检查图像尺寸是否与编码器匹配
    if (imageData.width !== this.alignedWidth || imageData.height !== this.alignedHeight) {
      logger.warn('H264EncoderService', '图像尺寸与编码器不匹配', {
        expected: { width: this.alignedWidth, height: this.alignedHeight },
        actual: { width: imageData.width, height: imageData.height },
      });
    }

    this.encoder.addFrameRgba(imageData.data);
  }

  /**
   * 添加一帧（从 Uint8Array）
   * @param rgbaData - RGBA 格式的原始数据
   */
  addFrameRgba(rgbaData: Uint8Array | Uint8ClampedArray): void {
    if (!this._isInitialized || !this.encoder) {
      throw new Error('编码器未初始化，请先调用 initialize()');
    }

    this.encoder.addFrameRgba(rgbaData);
  }

  /**
   * 完成编码并返回 MP4 Blob
   */
  finalize(): Blob {
    if (!this._isInitialized || !this.encoder) {
      throw new Error('编码器未初始化，请先调用 initialize()');
    }

    // 完成编码
    this.encoder.finalize();

    // 读取输出文件
    const mp4Data = this.encoder.FS.readFile(this.encoder.outputFilename);

    // 创建 Blob
    const blob = new Blob([mp4Data], { type: 'video/mp4' });

    logger.info('H264EncoderService', '编码完成', {
      size: blob.size,
      sizeKB: (blob.size / 1024).toFixed(1),
    });

    return blob;
  }

  /**
   * 释放编码器资源
   */
  dispose(): void {
    if (this.encoder) {
      try {
        this.encoder.delete();
        logger.debug('H264EncoderService', '编码器资源已释放');
      } catch (error) {
        logger.warn('H264EncoderService', '释放编码器资源时出错', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.encoder = null;
    }

    this._isInitialized = false;
    this.alignedWidth = 0;
    this.alignedHeight = 0;
  }

  /**
   * 检查编码器是否已初始化
   */
  isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * 获取对齐后的宽度
   */
  getAlignedWidth(): number {
    return this.alignedWidth;
  }

  /**
   * 获取对齐后的高度
   */
  getAlignedHeight(): number {
    return this.alignedHeight;
  }

  /**
   * 检查 h264-mp4-encoder 库是否可用
   */
  static isEncoderAvailable(): boolean {
    return typeof window.__initH264MP4Encoder__ === 'function';
  }

  /**
   * 将宽度对齐到 2 的倍数
   */
  static alignDimension(value: number): number {
    return value % 2 === 0 ? value : value + 1;
  }
}

/**
 * 创建 H264EncoderService 实例
 */
export function createH264EncoderService(): H264EncoderService {
  return new H264EncoderService();
}

export default H264EncoderService;
