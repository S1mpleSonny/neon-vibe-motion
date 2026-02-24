/**
 * 导出服务
 * 使用 ExportPipeline 进行精确帧率的 MP4 导出
 *
 * @module services/exporter
 */

import type { MotionDefinition, ExportConfig, ExporterService, ExportResolutionId } from '../../types';
import type { CoreRenderer } from '../core/CoreRenderer.interface';
import { createRendererForMotion } from '../renderer';
import { checkBrowserSupport } from './support';
import { calculateExportDimensions, DEFAULT_ASPECT_RATIO } from '../../utils/coordinates';
import { ExportPipeline } from './ExportPipeline';
import { H264EncoderService } from './H264EncoderService';
import { logger } from '../logging';

/**
 * 加载 H.264 编码器
 * 从 public/h264mp4/h264-mp4-encoder.web.js 动态加载
 */
async function loadH264Encoder(): Promise<void> {
  if (H264EncoderService.isEncoderAvailable()) {
    return;
  }

  // 动态加载 H.264 编码器脚本
  const script = document.createElement('script');
  script.src = `${import.meta.env.BASE_URL}h264mp4/h264-mp4-encoder.web.js`;

  await new Promise<void>((resolve, reject) => {
    script.onload = () => {
      // 库加载后，HME 变成全局变量
      if (typeof (window as unknown as { HME?: { createH264MP4Encoder: () => Promise<unknown> } }).HME !== 'undefined') {
        // 创建初始化函数
        (window as unknown as { __initH264MP4Encoder__: () => Promise<unknown> }).__initH264MP4Encoder__ = () => {
          return (window as unknown as { HME: { createH264MP4Encoder: () => Promise<unknown> } }).HME.createH264MP4Encoder();
        };
        logger.info('Exporter', 'H.264 编码器加载成功');
        resolve();
      } else {
        reject(new Error('H.264 编码器加载失败：HME 未定义'));
      }
    };
    script.onerror = () => reject(new Error('H.264 编码器脚本加载失败'));
    document.head.appendChild(script);
  });
}

/**
 * 导出服务实现
 * 使用 ExportPipeline 进行逐帧渲染和 H.264 编码
 */
class ExporterServiceImpl implements ExporterService {
  private renderer: CoreRenderer | null = null;
  private container: HTMLDivElement | null = null;
  private exportPipeline: ExportPipeline | null = null;

  async export(
    motion: MotionDefinition,
    config: ExportConfig,
    onProgress: (progress: number) => void
  ): Promise<Blob> {
    // 加载 H.264 编码器
    await loadH264Encoder();

    const aspectRatio = config.aspectRatio || DEFAULT_ASPECT_RATIO;
    const resolutionId = (config.resolution || '1080p') as ExportResolutionId;
    const targetResolution = calculateExportDimensions(aspectRatio, resolutionId);

    // 创建隐藏容器
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: -9999px;
      width: ${targetResolution.width}px;
      height: ${targetResolution.height}px;
      visibility: hidden;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);

    // 创建导出用的动效定义
    const exportMotion: MotionDefinition = {
      ...motion,
      width: targetResolution.width,
      height: targetResolution.height,
    };

    // 创建渲染器
    logger.info('Exporter', '使用 ExportPipeline 导出', {
      resolution: resolutionId,
      frameRate: config.frameRate,
      dimensions: targetResolution,
    });

    this.renderer = createRendererForMotion(exportMotion, { exportMode: true }) as CoreRenderer;
    await this.renderer.initialize(this.container, exportMotion);

    // 等待 canvas 就绪
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // 使用 ExportPipeline 导出
      this.exportPipeline = new ExportPipeline();
      const blob = await this.exportPipeline.exportToMP4(
        this.renderer,
        {
          ...config,
          aspectRatio,
          resolution: resolutionId,
        },
        onProgress,
      );

      return blob;
    } finally {
      this.cleanup();
    }
  }

  private cleanup(): void {
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.exportPipeline) {
      this.exportPipeline.cancel();
      this.exportPipeline = null;
    }
  }

  cancel(): void {
    this.cleanup();
  }

  isSupported(): { supported: boolean; reason?: string } {
    const support = checkBrowserSupport();
    return {
      supported: support.supported,
      reason: support.reason,
    };
  }

  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const exporterService = new ExporterServiceImpl();

export function getDefaultFilename(_motion: MotionDefinition): string {
  void _motion; // 保留参数以便未来使用动效名称
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  return `motion_${timestamp}.mp4`;
}

export { checkBrowserSupport, getPreferredMimeType, getFileExtension } from './support';

// H.264 编码服务
export {
  H264EncoderService,
  createH264EncoderService,
} from './H264EncoderService';

// 逐帧渲染器
export {
  FrameByFrameRenderer,
  createFrameByFrameRenderer,
} from './FrameByFrameRenderer';

// 导出流水线
export {
  ExportPipeline,
  createExportPipeline,
  ExportError,
  type ExportPipelineStatus,
  type ExportValidationResult,
  type ExportValidationError,
} from './ExportPipeline';

export default exporterService;
