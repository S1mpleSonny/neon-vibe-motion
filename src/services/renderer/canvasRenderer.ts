import type { MotionDefinition, RendererService, ElementProperties, Keyframe, CanvasDimensions, RenderError, RenderErrorType, PerformanceWarning } from '../../types';
import { generateErrorId, getFriendlyMessage, FRAME_RENDER_TIMEOUT_MS } from '../../types';
import type { CoreRenderer, RenderFrameOptions } from '../core/CoreRenderer.interface';
import { videoSyncService } from '../core/VideoSyncService';
import { parameterLoaderService } from '../core/ParameterLoaderService';
import { logger } from '../logging';
import { createMotionUtils } from '../../utils/deterministicRandom';
import { getAllVideoStartTimes, getEffectiveDuration } from '../../utils/videoStartTimeEvaluator';

/**
 * 错误回调函数类型
 */
export type RenderErrorCallback = (error: RenderError) => void;

// Canvas info passed to render function
interface CanvasInfo {
  width: number;
  height: number;
}

type RenderFunction = (
  ctx: CanvasRenderingContext2D,
  time: number,
  params: Record<string, unknown>,
  canvas: CanvasInfo
) => void;

// Use a unique ID for each renderer instance to avoid conflicts
let rendererInstanceId = 0;

declare global {
  interface Window {
    __motionRender?: RenderFunction;
    __motionRenders?: Record<string, RenderFunction>;
  }
}

/**
 * 时长变化回调函数类型 (025-dynamic-duration)
 */
export type DurationChangeCallback = (newDuration: number) => void;

/**
 * 性能警告回调函数类型 (034-preview-performance-guard)
 */
export type PerformanceWarningCallback = (warning: PerformanceWarning) => void;

export interface CanvasRendererOptions {
  /**
   * 错误发生时的回调函数
   * 当代码加载或首帧渲染时发生错误，调用此回调
   */
  onError?: RenderErrorCallback;
  /**
   * 时长变化时的回调函数 (025-dynamic-duration)
   * 当参数变化导致动态时长重算时调用
   */
  onDurationChange?: DurationChangeCallback;
  /**
   * 性能警告回调函数 (034-preview-performance-guard)
   * 当单帧渲染超时时调用
   */
  onPerformanceWarning?: PerformanceWarningCallback;
}

export class CanvasRenderer implements RendererService, CoreRenderer {
  private _container: HTMLElement | null = null;
  private motion: MotionDefinition | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private _isPlaying = false;
  private startTime = 0;
  private pausedTime = 0;
  private animationFrameId: number | null = null;
  private renderFunction: RenderFunction | null = null;
  private params: Record<string, unknown> = {};
  private instanceId: string;
  // Actual canvas pixel dimensions (used directly by render function)
  private actualWidth = 640;
  private actualHeight = 360;
  // Error handling (009-js-error-autofix)
  private onError?: RenderErrorCallback;
  private hasErrored = false; // Track if first-frame error has been reported
  private currentCode = ''; // Store code for error reporting
  // Video start time offsets cache (024-video-start-time)
  private videoStartTimeOffsets: Record<string, number> = {};
  // Dynamic duration (025-dynamic-duration)
  private effectiveDuration = 0; // 动态计算的有效时长
  private onDurationChange?: DurationChangeCallback;
  // Performance warning (034-preview-performance-guard)
  private onPerformanceWarning?: PerformanceWarningCallback;

  constructor(options: CanvasRendererOptions = {}) {
    this.instanceId = `renderer_${++rendererInstanceId}_${Date.now()}`;
    this.onError = options.onError;
    this.onDurationChange = options.onDurationChange;
    this.onPerformanceWarning = options.onPerformanceWarning;
  }

  async initialize(container: HTMLElement, motion: MotionDefinition): Promise<void> {
    logger.info('CanvasRenderer', '初始化', { instanceId: this.instanceId, motionId: motion.id });
    this._container = container;
    this.motion = motion;
    this.cleanup();

    // Reset error state for new motion
    this.hasErrored = false;
    this.currentCode = motion.code;

    // Actual canvas pixel dimensions come from motion definition
    // For preview: this should match container size (set by PreviewCanvas)
    // For export: this should match export resolution
    this.actualWidth = motion.width;
    this.actualHeight = motion.height;

    logger.debug('CanvasRenderer', 'Canvas dimensions', { width: this.actualWidth, height: this.actualHeight });

    // Create canvas with actual pixel dimensions
    // Canvas pixel size matches display size - no CSS scaling needed
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.actualWidth;
    this.canvas.height = this.actualHeight;
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    // Initialize params from motion parameters
    this.initializeParams();

    // Execute the code to get the render function
    this.loadRenderFunction(motion.code);

    // Preload image and video parameters and then render
    await this.preloadMediaParams();

    // Calculate video start time offsets (024-video-start-time)
    this.updateVideoStartTimeOffsets();

    // Calculate initial effective duration (025-dynamic-duration)
    this.updateDynamicDuration();

    // 初始化所有视频到第一帧，确保首帧渲染稳定 (027-fix-video-first-frame-flash)
    // 在 renderFrame(0) 前调用 syncAllVideosToTime，与播放时的 tick() 行为保持一致
    await videoSyncService.syncAllVideosToTime(this.params, 0, {}, this.videoStartTimeOffsets);

    // Initial render after media is loaded
    this.renderFrame(0);
  }

  /**
   * 初始化为 offscreen 模式（用于后处理管线）
   * @param motion 动效定义
   * @param offscreenCanvas 外部提供的 offscreen canvas
   */
  async initializeOffscreen(motion: MotionDefinition, offscreenCanvas: HTMLCanvasElement): Promise<void> {
    this.motion = motion;
    this.canvas = offscreenCanvas;
    this.ctx = offscreenCanvas.getContext('2d');

    if (!this.ctx) {
      throw new Error('无法获取 2D 上下文');
    }

    this.actualWidth = offscreenCanvas.width;
    this.actualHeight = offscreenCanvas.height;

    // Reset error state (consistency with initialize)
    this.hasErrored = false;
    this.currentCode = motion.code;

    // 加载参数和代码（复用现有逻辑）
    this.initializeParams();
    this.loadRenderFunction(motion.code);

    // Media preloading (critical for images/videos/sequences)
    await this.preloadMediaParams();
    this.updateVideoStartTimeOffsets();
    this.updateDynamicDuration();
  }

  /**
   * 调整尺寸（用于导出不同分辨率）
   * @param width 新宽度
   * @param height 新高度
   */
  resize(width: number, height: number): void {
    if (!this.canvas || (this.actualWidth === width && this.actualHeight === height)) {
      return;
    }
    this.canvas.width = width;
    this.canvas.height = height;
    this.actualWidth = width;
    this.actualHeight = height;
  }

  /**
   * 更新视频起始时间偏移缓存 (024-video-start-time)
   * 使用运行时参数获取实际加载的视频信息（如 videoDuration）
   */
  private updateVideoStartTimeOffsets(): void {
    if (!this.motion) return;
    // 传递运行时参数，以便从实际加载的 HTMLVideoElement 获取 videoDuration
    this.videoStartTimeOffsets = getAllVideoStartTimes(this.motion.parameters, this.params);
    if (Object.keys(this.videoStartTimeOffsets).length > 0) {
      logger.debug('CanvasRenderer', '视频起始时间偏移已计算', this.videoStartTimeOffsets);
    }
  }

  /**
   * 更新动态时长 (025-dynamic-duration)
   * 根据 motion.durationCode 和运行时参数计算有效时长
   */
  private updateDynamicDuration(): void {
    if (!this.motion) return;

    const previousDuration = this.effectiveDuration;
    // 使用 getEffectiveDuration 计算动态时长
    // 传递运行时参数（包含已加载的视频元素）以获取实际 videoDuration
    this.effectiveDuration = getEffectiveDuration(this.motion, this.params);

    logger.debug('CanvasRenderer', '动态时长已计算', {
      effectiveDuration: this.effectiveDuration,
      hasDurationCode: !!this.motion.durationCode,
      durationCode: this.motion.durationCode,
      fixedDuration: this.motion.duration,
      runtimeParams: Object.keys(this.params).reduce((acc, key) => {
        const val = this.params[key];
        // 简化日志输出，避免打印 HTMLElement
        acc[key] = val instanceof HTMLElement ? `[${val.tagName}]` : val;
        return acc;
      }, {} as Record<string, unknown>),
    });

    // 如果时长发生变化，通知父组件 (025-dynamic-duration)
    if (previousDuration !== this.effectiveDuration && previousDuration !== 0) {
      if (this.onDurationChange) {
        this.onDurationChange(this.effectiveDuration);
        logger.info('CanvasRenderer', '时长变化回调已触发', {
          previousDuration,
          newDuration: this.effectiveDuration,
        });
      } else {
        logger.warn('CanvasRenderer', '时长变化但未设置 onDurationChange 回调', {
          previousDuration,
          newDuration: this.effectiveDuration,
        });
      }
    }
  }

  /**
   * 初始化参数（使用 ParameterLoaderService）
   */
  private initializeParams(): void {
    if (!this.motion) return;
    this.params = parameterLoaderService.initializeParams(this.motion);
  }

  /**
   * 预加载所有媒体参数（使用 ParameterLoaderService）
   */
  private async preloadMediaParams(): Promise<void> {
    if (!this.motion) return;
    await parameterLoaderService.preloadAllMediaParams(this.motion, this.params);
  }

  private loadRenderFunction(code: string): void {
    if (!code) {
      this.renderFunction = null;
      return;
    }

    try {
      // Inject motion utils for deterministic rendering (016-deterministic-render)
      window.__motionUtils = createMotionUtils();

      // Clear any existing global render function to avoid using stale code
      window.__motionRender = undefined;

      // Initialize the render functions registry if needed
      if (!window.__motionRenders) {
        window.__motionRenders = {};
      }

      // Clear any existing function for this instance
      delete window.__motionRenders[this.instanceId];

      // Wrap the code in an IIFE to isolate variable scope
      // This ensures each motion's initialization runs fresh
      const instanceKey = this.instanceId;
      const wrappedCode = `
        (function() {
          ${code}
          if (typeof window.__motionRender === 'function') {
            window.__motionRenders['${instanceKey}'] = window.__motionRender;
            window.__motionRender = undefined;
          }
        })();
      `;

      // Use new Function() instead of script tag injection
      // This allows us to catch syntax errors synchronously
      // Script tag syntax errors are thrown globally and cannot be caught by try-catch
      const executeCode = new Function(wrappedCode);
      executeCode();

      // Get the render function from the registry
      if (typeof window.__motionRenders[instanceKey] === 'function') {
        this.renderFunction = window.__motionRenders[instanceKey];
        logger.debug('CanvasRenderer', 'Render function loaded', { instanceKey });
      } else {
        logger.warn('CanvasRenderer', 'Motion code did not define render function');
        this.renderFunction = null;
      }
    } catch (error) {
      logger.error('CanvasRenderer', 'Error loading render function', { error: error instanceof Error ? error.message : String(error) });
      this.renderFunction = null;

      // Report syntax error via callback (009-js-error-autofix)
      if (this.onError && error instanceof Error) {
        const renderError = this.createRenderError('syntax', error);
        logger.warn('CanvasRenderer', 'Reporting syntax error', { message: renderError.message });
        this.onError(renderError);
        this.hasErrored = true;
      }
    }
  }

  /**
   * Create a RenderError from a caught error (009-js-error-autofix)
   */
  private createRenderError(type: RenderErrorType, error: Error): RenderError {
    return {
      id: generateErrorId(),
      type,
      message: error.message,
      friendlyMessage: getFriendlyMessage(error.name),
      lineNumber: (error as unknown as { lineNumber?: number }).lineNumber,
      columnNumber: (error as unknown as { columnNumber?: number }).columnNumber,
      code: this.currentCode,
      timestamp: Date.now(),
    };
  }

  private renderFrame(time: number): void {
    if (!this.ctx || !this.canvas || !this.motion) return;

    // Clear canvas - 先 clearRect 清除画布（处理透明/半透明背景的残影问题）
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // 如果有非透明背景色，再填充背景
    if (this.motion.backgroundColor && this.motion.backgroundColor !== 'transparent') {
      this.ctx.fillStyle = this.motion.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Canvas info to pass to render function
    // This allows LLM code to know actual canvas dimensions for proper scaling
    const canvasInfo: CanvasInfo = {
      width: this.actualWidth,
      height: this.actualHeight,
    };

    // Call custom render function if available
    // No transformation applied - render function receives actual canvas coordinates
    if (this.renderFunction) {
      try {
        this.ctx.save();
        this.renderFunction(this.ctx, time, this.params, canvasInfo);
        this.ctx.restore();
      } catch (error) {
        // (009-js-error-autofix) Distinguish first-frame errors from interval errors
        if (!this.hasErrored) {
          // First-frame runtime error - report to UI
          logger.error('CanvasRenderer', 'First-frame runtime error', { error: error instanceof Error ? error.message : String(error) });
          if (this.onError && error instanceof Error) {
            const renderError = this.createRenderError('runtime', error);
            logger.warn('CanvasRenderer', 'Reporting runtime error', { message: renderError.message });
            this.onError(renderError);
            this.hasErrored = true;
          }
        } else {
          // Interval error - only log, don't spam UI
          logger.debug('CanvasRenderer', 'Interval render error (not reporting to UI)', { error: error instanceof Error ? error.message : String(error) });
        }
      }
    } else {
      // Fallback: render elements based on motion definition
      this.ctx.save();
      this.renderElements(time);
      this.ctx.restore();
    }
  }

  private renderElements(time: number): void {
    if (!this.ctx || !this.motion) {
      logger.debug('CanvasRenderer', 'renderElements: ctx 或 motion 为空');
      return;
    }
    if (!this.motion.elements || !Array.isArray(this.motion.elements)) {
      logger.debug('CanvasRenderer', 'renderElements: elements 无效');
      return;
    }

    this.motion.elements.forEach((element, index) => {
      if (!element || !element.properties) {
        logger.debug('CanvasRenderer', `元素 ${index} 无效`);
        return;
      }

      const props = element.properties;
      const anim = element.animation || {
        type: 'keyframe' as const,
        duration: this.motion!.duration,
        delay: 0,
        easing: 'linear',
        loop: true,
      };

      // Calculate animation progress
      const animDuration = anim.duration || this.motion!.duration;
      const delay = anim.delay || 0;
      const effectiveTime = Math.max(0, time - delay);
      let progress = (effectiveTime % animDuration) / animDuration;

      if (!anim.loop && effectiveTime >= animDuration) {
        progress = 1;
      }

      // Apply easing (simplified linear for now)
      const currentProps = this.interpolateKeyframes(props, anim.keyframes, progress);

      this.ctx!.save();

      // Apply transformations with safe defaults
      const x = typeof currentProps.x === 'number' ? currentProps.x : (props.x || 0);
      const y = typeof currentProps.y === 'number' ? currentProps.y : (props.y || 0);
      this.ctx!.translate(x, y);

      const rotation = typeof currentProps.rotation === 'number' ? currentProps.rotation : (props.rotation || 0);
      if (rotation !== 0) {
        this.ctx!.rotate((rotation * Math.PI) / 180);
      }

      const opacity = typeof currentProps.opacity === 'number' ? currentProps.opacity : (props.opacity ?? 1);
      this.ctx!.globalAlpha = opacity;

      // Draw based on element type
      if (element.type === 'shape') {
        this.drawShape(currentProps);
      } else if (element.type === 'text' && currentProps.text) {
        this.drawText(currentProps);
      }

      this.ctx!.restore();
    });
  }

  private interpolateKeyframes(
    baseProps: ElementProperties,
    keyframes: Keyframe[] | undefined,
    progress: number
  ): Record<string, unknown> {
    const base: Record<string, unknown> = { ...baseProps };
    if (!keyframes || keyframes.length === 0) {
      return base;
    }

    // Find the two keyframes to interpolate between
    let prevFrame = keyframes[0];
    let nextFrame = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (progress >= keyframes[i].offset && progress <= keyframes[i + 1].offset) {
        prevFrame = keyframes[i];
        nextFrame = keyframes[i + 1];
        break;
      }
    }

    // Calculate local progress between the two keyframes
    const range = nextFrame.offset - prevFrame.offset;
    const localProgress = range > 0 ? (progress - prevFrame.offset) / range : 0;

    // Merge and interpolate properties
    const result: Record<string, unknown> = { ...base };

    Object.keys(nextFrame.properties).forEach((key) => {
      const prevProps = prevFrame.properties as Record<string, unknown>;
      const nextProps = nextFrame.properties as Record<string, unknown>;
      const prevValue = prevProps[key] ?? base[key];
      const nextValue = nextProps[key];

      if (typeof prevValue === 'number' && typeof nextValue === 'number') {
        result[key] = prevValue + (nextValue - prevValue) * localProgress;
      } else {
        result[key] = nextValue;
      }
    });

    return result;
  }

  private drawShape(props: Record<string, unknown>): void {
    if (!this.ctx) return;

    const width = (props.width as number) || 100;
    const height = (props.height as number) || 100;
    const shape = (props.shape as string) || 'rectangle';

    this.ctx.beginPath();

    if (shape === 'circle') {
      const radius = Math.min(width, height) / 2;
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    } else if (shape === 'triangle') {
      this.ctx.moveTo(0, -height / 2);
      this.ctx.lineTo(width / 2, height / 2);
      this.ctx.lineTo(-width / 2, height / 2);
      this.ctx.closePath();
    } else {
      // Rectangle
      const borderRadius = (props.borderRadius as number) || 0;
      if (borderRadius > 0) {
        this.roundRect(-width / 2, -height / 2, width, height, borderRadius);
      } else {
        this.ctx.rect(-width / 2, -height / 2, width, height);
      }
    }

    if (props.fill) {
      this.ctx.fillStyle = props.fill as string;
      this.ctx.fill();
    }

    if (props.stroke) {
      this.ctx.strokeStyle = props.stroke as string;
      this.ctx.lineWidth = (props.strokeWidth as number) || 1;
      this.ctx.stroke();
    }
  }

  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  private drawText(props: Record<string, unknown>): void {
    if (!this.ctx) return;

    const text = props.text as string;
    const fontSize = (props.fontSize as number) || 16;
    const fontFamily = (props.fontFamily as string) || 'sans-serif';
    const color = (props.color as string) || '#000000';

    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, 0, 0);
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
    this.renderFrame(0);
  }

  async seek(time: number): Promise<void> {
    this.pausedTime = time;
    this.startTime = performance.now() - time;
    // 精确定位视频并渲染帧 (022-precise-frame-video)
    // 使用 VideoSyncService 统一处理 (023-unified-renderer)
    // 传递视频起始时间偏移 (024-video-start-time)
    await videoSyncService.syncAllVideosToTime(this.params, time, {}, this.videoStartTimeOffsets);
    this.renderFrame(time);
  }

  private tick = async (): Promise<void> => {
    if (!this._isPlaying || !this.motion) return;

    let currentTime = performance.now() - this.startTime;

    // Loop animation (使用动态时长 025-dynamic-duration)
    const duration = this.effectiveDuration || this.motion.duration;
    if (currentTime >= duration) {
      this.startTime = performance.now();
      currentTime = 0;
    }

    // 精确定位所有视频参数到当前时间点 (022-precise-frame-video)
    // 使用 VideoSyncService 统一处理 (023-unified-renderer)
    // 传递视频起始时间偏移 (024-video-start-time)
    await videoSyncService.syncAllVideosToTime(this.params, currentTime, {}, this.videoStartTimeOffsets);

    // (034-preview-performance-guard) 测量渲染耗时
    const renderStartTime = performance.now();
    this.renderFrame(currentTime);
    const renderElapsed = performance.now() - renderStartTime;

    // 检测超时并触发警告
    if (renderElapsed > FRAME_RENDER_TIMEOUT_MS && this.onPerformanceWarning) {
      logger.warn('CanvasRenderer', '单帧渲染超时', { elapsed: renderElapsed, threshold: FRAME_RENDER_TIMEOUT_MS });
      this.onPerformanceWarning({
        elapsed: renderElapsed,
        threshold: FRAME_RENDER_TIMEOUT_MS,
        timestamp: Date.now(),
      });
      // 超时后不继续动画循环，等待外部暂停
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  async updateParameter(parameterId: string, value: unknown): Promise<void> {
    // 检查是否是图片参数
    const param = this.motion?.parameters.find((p) => p.id === parameterId);

    if (param?.type === 'image' && typeof value === 'string') {
      // 异步加载图片 (使用 ParameterLoaderService)
      try {
        const img = await parameterLoaderService.loadImageForParam(value);
        this.params[parameterId] = img;
        // Re-render after image loaded
        if (!this._isPlaying) {
          this.renderFrame(this.pausedTime);
        }
      } catch (error) {
        logger.warn('CanvasRenderer', `更新图片参数失败: ${parameterId}`, { error: error instanceof Error ? error.message : String(error) });
      }
    } else if (param?.type === 'video' && typeof value === 'string') {
      // 异步加载视频 (使用 ParameterLoaderService)
      try {
        const video = await parameterLoaderService.loadVideoForParam(value);
        this.params[parameterId] = video;
        // 确保视频静音 (022-precise-frame-video: 移除自动播放和循环)
        video.muted = true;
        // 重新计算视频起始时间偏移 (024-video-start-time)
        // 因为视频时长可能影响动态计算
        this.updateVideoStartTimeOffsets();
        // 重新计算动态时长 (025-dynamic-duration)
        // 因为视频时长变化可能影响 durationCode 的计算结果
        this.updateDynamicDuration();
        // Re-render after video loaded
        if (!this._isPlaying) {
          // 使用精确帧定位渲染当前帧 (使用 VideoSyncService)
          // 传递视频起始时间偏移 (024-video-start-time)
          await videoSyncService.syncAllVideosToTime(this.params, this.pausedTime, {}, this.videoStartTimeOffsets);
          this.renderFrame(this.pausedTime);
        }
      } catch (error) {
        logger.warn('CanvasRenderer', `更新视频参数失败: ${parameterId}`, { error: error instanceof Error ? error.message : String(error) });
      }
    } else {
      this.params[parameterId] = value;

      // 参数变更可能影响 videoStartTimeCode 的动态计算结果
      // 例如：videoStartTimeCode 引用了其他参数的值
      this.updateVideoStartTimeOffsets();
      // 参数变更可能影响 durationCode 的动态计算结果 (025-dynamic-duration)
      this.updateDynamicDuration();

      // Re-render if paused
      if (!this._isPlaying) {
        this.renderFrame(this.pausedTime);
      }
    }
  }

  /**
   * 更新动效时长 (019-video-input-support)
   * 用于视频上传后同步动效时长
   */
  updateDuration(newDuration: number): void {
    if (this.motion) {
      this.motion = {
        ...this.motion,
        duration: newDuration,
      };
      logger.debug('CanvasRenderer', '动效时长已更新', { duration: newDuration });
    }
  }

  getCurrentTime(): number {
    if (this._isPlaying) {
      return performance.now() - this.startTime;
    }
    return this.pausedTime;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas!;
  }

  /**
   * Get the current canvas dimensions
   */
  getDimensions(): CanvasDimensions {
    return {
      width: this.actualWidth,
      height: this.actualHeight,
    };
  }

  // ===== CoreRenderer 接口实现 (023-unified-renderer) =====

  /**
   * 是否正在播放
   */
  isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * 获取动效时长（毫秒）
   * 返回动态计算的有效时长 (025-dynamic-duration)
   */
  getDuration(): number {
    // 优先返回动态计算的有效时长，降级到固定时长
    return this.effectiveDuration || this.motion?.duration || 0;
  }

  /**
   * 获取当前参数值
   */
  getParameters(): Record<string, unknown> {
    return { ...this.params };
  }

  /**
   * 渲染指定时间点的帧到内部 canvas
   * @param time - 时间（毫秒）
   * @param options - 渲染选项
   */
  async renderAt(time: number, options: RenderFrameOptions = {}): Promise<void> {
    const { waitForVideoSeek = true, videoOverrides } = options;

    // 使用视频覆盖或默认参数
    const paramsToUse = videoOverrides
      ? { ...this.params, ...videoOverrides }
      : this.params;

    // 同步所有视频到指定时间（传递起始时间偏移）(024-video-start-time)
    if (waitForVideoSeek) {
      await videoSyncService.syncAllVideosToTime(paramsToUse, time, {}, this.videoStartTimeOffsets);
    }

    // 渲染帧
    this.renderFrameWithParams(time, paramsToUse);
  }

  /**
   * 渲染指定时间点的帧到目标 canvas
   * @param targetCanvas - 目标 canvas
   * @param time - 时间（毫秒）
   * @param options - 渲染选项
   */
  async renderToCanvas(
    targetCanvas: HTMLCanvasElement,
    time: number,
    options: RenderFrameOptions = {}
  ): Promise<void> {
    const { waitForVideoSeek = true, videoOverrides } = options;

    // 使用视频覆盖或默认参数
    const paramsToUse = videoOverrides
      ? { ...this.params, ...videoOverrides }
      : this.params;

    // 同步所有视频到指定时间（传递起始时间偏移）(024-video-start-time)
    if (waitForVideoSeek) {
      await videoSyncService.syncAllVideosToTime(paramsToUse, time, {}, this.videoStartTimeOffsets);
    }

    // 获取目标 canvas 的 context
    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx || !this.motion) {
      throw new Error('无法获取目标 canvas context 或动效未初始化');
    }

    // 保存原始 ctx 和尺寸
    const originalCtx = this.ctx;
    const originalWidth = this.actualWidth;
    const originalHeight = this.actualHeight;

    try {
      // 临时使用目标 canvas
      this.ctx = targetCtx;
      this.actualWidth = targetCanvas.width;
      this.actualHeight = targetCanvas.height;

      // 渲染帧
      this.renderFrameWithParams(time, paramsToUse);
    } finally {
      // 恢复原始 ctx 和尺寸
      this.ctx = originalCtx;
      this.actualWidth = originalWidth;
      this.actualHeight = originalHeight;
    }
  }

  /**
   * 使用指定参数渲染帧（内部方法）
   */
  private renderFrameWithParams(time: number, params: Record<string, unknown>): void {
    // 导出模式下 this.canvas 可能为 null，但 this.ctx 已被临时替换为目标 canvas 的 context
    // 因此只检查 this.ctx 和 this.motion
    if (!this.ctx || !this.motion) return;

    // Clear canvas - 先使用 clearRect 清除画布（处理透明背景的残影问题）
    this.ctx.clearRect(0, 0, this.actualWidth, this.actualHeight);
    // 如果有非透明背景色，再填充背景
    if (this.motion.backgroundColor && this.motion.backgroundColor !== 'transparent') {
      this.ctx.fillStyle = this.motion.backgroundColor;
      this.ctx.fillRect(0, 0, this.actualWidth, this.actualHeight);
    }

    // Canvas info to pass to render function
    const canvasInfo: CanvasInfo = {
      width: this.actualWidth,
      height: this.actualHeight,
    };

    // Call custom render function if available
    if (this.renderFunction) {
      try {
        this.ctx.save();
        this.renderFunction(this.ctx, time, params, canvasInfo);
        this.ctx.restore();
      } catch (error) {
        // 导出模式下的错误只记录日志
        logger.debug('CanvasRenderer', 'renderFrameWithParams error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      // Fallback: render elements based on motion definition
      // 注意：这里暂不支持自定义参数，使用内部 params
      this.ctx.save();
      this.renderElements(time);
      this.ctx.restore();
    }
  }

  getWebGLContext(): WebGLRenderingContext | null {
    // This implementation uses 2D context
    // WebGL would require separate implementation
    return null;
  }

  destroy(): void {
    this.cleanup();
    this._container = null;
    this.motion = null;
  }

  private cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }

    this.ctx = null;
    this.renderFunction = null;
    this.params = {};
    this._isPlaying = false;
    this.startTime = 0;
    this.pausedTime = 0;

    // Clean up instance-specific render function
    if (window.__motionRenders && this.instanceId) {
      delete window.__motionRenders[this.instanceId];
    }
  }
}

export function createCanvasRenderer(options?: CanvasRendererOptions): CanvasRenderer {
  return new CanvasRenderer(options);
}

export default CanvasRenderer;
