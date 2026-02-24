import type { MotionDefinition, CanvasDimensions, RenderError } from '../../types';

/**
 * 渲染选项
 */
export interface RenderOptions {
  /** 错误回调 */
  onError?: (error: RenderError) => void;

  /** 是否启用视频隔离模式（用于导出） */
  videoIsolation?: boolean;

  /** 视频参数覆盖（用于导出时使用克隆的视频） */
  videoOverrides?: Record<string, HTMLVideoElement>;
}

/**
 * 帧渲染选项
 */
export interface RenderFrameOptions {
  /** 透明背景（用于 WebP 导出） */
  transparent?: boolean;

  /** 等待视频 seek 完成 */
  waitForVideoSeek?: boolean;

  /** 视频 seek 超时时间（毫秒） */
  timeout?: number;

  /** 视频参数覆盖 */
  videoOverrides?: Record<string, HTMLVideoElement>;
}

/**
 * 核心渲染器接口
 * 支持实时渲染（预览）和逐帧渲染（导出）两种模式
 */
export interface CoreRenderer {
  // ===== 生命周期 =====

  /**
   * 初始化渲染器
   * @param container - 容器元素
   * @param motion - 动效定义
   * @param options - 渲染选项
   */
  initialize(
    container: HTMLElement,
    motion: MotionDefinition,
    options?: RenderOptions
  ): Promise<void>;

  /**
   * 销毁渲染器，释放资源
   */
  destroy(): void;

  // ===== 播放控制 =====

  /** 开始播放 */
  play(): void;

  /** 暂停播放 */
  pause(): void;

  /** 停止并重置到开头 */
  stop(): void;

  /**
   * 跳转到指定时间点
   * @param time - 时间（毫秒）
   */
  seek(time: number): Promise<void>;

  // ===== 参数管理 =====

  /**
   * 更新参数值
   * @param parameterId - 参数 ID
   * @param value - 新值
   */
  updateParameter(parameterId: string, value: unknown): Promise<void>;

  /**
   * 更新动效时长
   * @param newDuration - 新时长（毫秒）
   */
  updateDuration(newDuration: number): void;

  /**
   * 获取当前参数值
   */
  getParameters(): Record<string, unknown>;

  // ===== 状态查询 =====

  /** 获取当前播放时间（毫秒） */
  getCurrentTime(): number;

  /** 获取动效时长（毫秒） */
  getDuration(): number;

  /** 获取 Canvas 元素 */
  getCanvas(): HTMLCanvasElement;

  /** 获取 Canvas 尺寸 */
  getDimensions(): CanvasDimensions;

  /** 是否正在播放 */
  isPlaying(): boolean;

  // ===== 逐帧渲染（导出专用） =====

  /**
   * 渲染指定时间点的帧到内部 canvas
   * @param time - 时间（毫秒）
   * @param options - 渲染选项
   */
  renderAt(time: number, options?: RenderFrameOptions): Promise<void>;

  /**
   * 渲染指定时间点的帧到目标 canvas
   * @param targetCanvas - 目标 canvas
   * @param time - 时间（毫秒）
   * @param options - 渲染选项
   */
  renderToCanvas(
    targetCanvas: HTMLCanvasElement,
    time: number,
    options?: RenderFrameOptions
  ): Promise<void>;
}
