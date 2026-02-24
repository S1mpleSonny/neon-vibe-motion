import type { MotionDefinition, RendererService, CanvasDimensions } from '../../types';
import type { CoreRenderer } from '../core/CoreRenderer.interface';
import { CanvasRenderer, type RenderErrorCallback, type DurationChangeCallback, type PerformanceWarningCallback } from './canvasRenderer';
import { PostProcessRenderer } from './postProcessRenderer';

export interface RendererFactoryOptions {
  /** 错误回调 (009-js-error-autofix) */
  onError?: RenderErrorCallback;
  /** 时长变化回调 (025-dynamic-duration) */
  onDurationChange?: DurationChangeCallback;
  /** 是否为导出模式 */
  exportMode?: boolean;
  /** 性能警告回调 (034-preview-performance-guard) */
  onPerformanceWarning?: PerformanceWarningCallback;
}

/**
 * Canvas 渲染器 + 后处理包装器
 * 使用离屏 canvas 进行 2D 渲染，然后通过 PostProcessor 处理
 */
class CanvasWithPostProcessRenderer implements RendererService {
  private canvasRenderer: CanvasRenderer;
  private postProcessor: PostProcessRenderer;
  private offscreenCanvas: HTMLCanvasElement;
  private motion: MotionDefinition | null = null;
  private params: Record<string, unknown> = {};

  // 自己的动画循环状态
  private _isPlaying = false;
  private startTime = 0;
  private pausedTime = 0;
  private animationFrameId: number | null = null;
  private _isDestroyed = false;

  constructor(
    canvasRenderer: CanvasRenderer,
    postProcessor: PostProcessRenderer
  ) {
    this.canvasRenderer = canvasRenderer;
    this.postProcessor = postProcessor;
    this.offscreenCanvas = document.createElement('canvas');
  }

  async initialize(container: HTMLElement, motion: MotionDefinition): Promise<void> {
    this.motion = motion;
    this._isDestroyed = false;

    // 设置离屏 canvas 尺寸（必须在 initializeOffscreen 之前）
    this.offscreenCanvas.width = motion.width;
    this.offscreenCanvas.height = motion.height;

    // 初始化 params 缓存（使用 id 作为 key，与 postProcessCode 中的参数名对应）
    this.params = motion.parameters.reduce((acc, p) => {
      acc[p.id] = p.value;
      return acc;
    }, {} as Record<string, unknown>);

    // 加载后处理代码
    if (motion.postProcessCode) {
      this.postProcessor.loadPostProcessFunction(motion.postProcessCode);
    }

    // 初始化 canvas 渲染器（离屏）
    await this.canvasRenderer.initializeOffscreen(motion, this.offscreenCanvas);

    // 异步加载期间渲染器可能已被 destroy，不再继续挂载 canvas
    if (this._isDestroyed) return;

    // 初始化后处理器（输出到 container）
    this.postProcessor.initialize(container, motion.width, motion.height);
  }

  render(time: number): void {
    if (!this.motion) return;

    // 1. Canvas 渲染到离屏 canvas
    this.canvasRenderer.renderAt(time);

    // 2. 后处理渲染
    this.postProcessor.render(this.offscreenCanvas, time, this.params);
  }

  /**
   * 导出专用：渲染到指定 canvas
   */
  renderToCanvas(targetCanvas: HTMLCanvasElement, time: number): void {
    if (!this.motion) return;

    // 1. Canvas 渲染到离屏 canvas
    this.canvasRenderer.renderAt(time);

    // 2. 后处理到临时 canvas
    this.postProcessor.render(this.offscreenCanvas, time, this.params);

    // 3. 复制到目标 canvas
    const ctx = targetCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(this.postProcessor.getCanvas(), 0, 0);
    }
  }

  updateParameter(name: string, value: unknown): void {
    this.canvasRenderer.updateParameter(name, value);
    this.params[name] = value;
  }

  getCurrentTime(): number {
    if (this._isPlaying) {
      return performance.now() - this.startTime;
    }
    return this.pausedTime;
  }

  getDuration(): number {
    return this.canvasRenderer.getDuration();
  }

  getDimensions(): CanvasDimensions {
    return {
      width: this.offscreenCanvas.width,
      height: this.offscreenCanvas.height,
    };
  }

  getParameters(): Record<string, unknown> {
    return { ...this.params };
  }

  isPlaying(): boolean {
    return this._isPlaying;
  }

  async renderAt(time: number): Promise<void> {
    this.render(time);
  }

  play(): void {
    if (this._isPlaying) return;

    this._isPlaying = true;
    this.startTime = performance.now() - this.pausedTime;
    this.tick();
  }

  pause(): void {
    if (!this._isPlaying) return;

    this._isPlaying = false;
    this.pausedTime = performance.now() - this.startTime;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  stop(): void {
    this.pause();
    this.pausedTime = 0;
  }

  seek(time: number): void {
    this.pausedTime = time;
    if (this._isPlaying) {
      this.startTime = performance.now() - time;
    }
    // 立即渲染当前帧
    this.render(time);
  }

  private tick = (): void => {
    if (!this._isPlaying || !this.motion) return;

    let currentTime = performance.now() - this.startTime;

    // Loop animation
    const duration = this.getDuration();
    if (currentTime >= duration) {
      this.startTime = performance.now();
      currentTime = 0;
    }

    // 渲染：先渲染到离屏 canvas，再后处理
    this.render(currentTime);

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  resize(width: number, height: number): void {
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.postProcessor.resize(width, height);
    this.canvasRenderer.resize(width, height);
  }

  getCanvas(): HTMLCanvasElement {
    return this.postProcessor.getCanvas();
  }

  destroy(): void {
    this._isDestroyed = true;
    this.pause();
    this.canvasRenderer.destroy();
    this.postProcessor.dispose();
  }

  dispose(): void {
    this.destroy();
  }

  updateDuration(newDuration: number): void {
    this.canvasRenderer.updateDuration?.(newDuration);
  }
}

export function createRenderer(options?: RendererFactoryOptions): RendererService {
  return new CanvasRenderer(options);
}

/**
 * 根据动效定义创建合适的渲染器
 * - 如果包含 postProcessCode，使用 CanvasWithPostProcessRenderer
 * - 否则使用 CanvasRenderer
 */
export function createRendererForMotion(motion: MotionDefinition, options?: RendererFactoryOptions): RendererService {
  // 调试：检查 postProcessCode 是否存在
  console.log('[RendererFactory] motion.postProcessCode:', motion.postProcessCode ? `存在 (${motion.postProcessCode.length} chars)` : '不存在');

  // 检测是否需要后处理
  const needsPostProcess = motion.postProcessCode && motion.postProcessCode.trim().length > 0;

  if (needsPostProcess) {
    console.log('[RendererFactory] 使用 CanvasWithPostProcessRenderer (后处理模式)');
    const canvasRenderer = new CanvasRenderer(options);
    const postProcessor = new PostProcessRenderer({
      exportMode: options?.exportMode,
      onError: options?.onError,
    });
    return new CanvasWithPostProcessRenderer(canvasRenderer, postProcessor);
  }

  // 默认使用 CanvasRenderer
  return new CanvasRenderer(options);
}

/**
 * 创建支持 CoreRenderer 接口的渲染器 (023-unified-renderer)
 */
export function createCanvasRenderer(options?: RendererFactoryOptions): CanvasRenderer & CoreRenderer {
  return new CanvasRenderer(options);
}

export { CanvasRenderer } from './canvasRenderer';
export type { CanvasRendererOptions, RenderErrorCallback, DurationChangeCallback, PerformanceWarningCallback } from './canvasRenderer';

// 导出 PostProcessRenderer
export { PostProcessRenderer, type PostProcessRendererOptions } from './postProcessRenderer';
export { CanvasWithPostProcessRenderer };

// 重导出 CoreRenderer 接口类型 (023-unified-renderer)
export type { CoreRenderer, RenderOptions, RenderFrameOptions } from '../core/CoreRenderer.interface';
