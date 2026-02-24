/**
 * CoreRendererCodeGenerator - 核心渲染器代码生成器
 *
 * 生成与主平台 VideoSyncService、ParameterLoaderService 一致的
 * JavaScript 代码，用于素材包的渲染。
 *
 * 统一渲染逻辑：
 * - 视频同步代码与 VideoSyncService 保持一致
 * - 参数加载代码与 ParameterLoaderService 保持一致
 * - 渲染框架代码与 CanvasRenderer 保持一致
 *
 * @module services/assetPackExporter/CoreRendererCodeGenerator
 */

import type { MotionDefinition, ExportableParameter, CanvasDimensions, AdjustableParameter } from '../../types';
import { EVALUATOR_CODE } from '../../utils/videoStartTimeEvaluator';

/**
 * 渲染器代码生成配置
 */
export interface CodeGeneratorConfig {
  /** 动效定义 */
  motion: MotionDefinition;
  /** 导出的参数列表 */
  exportedParams: ExportableParameter[];
  /** 覆盖尺寸（用于根据画面比例调整） */
  overrideDimensions?: CanvasDimensions;
}

/**
 * 生成的代码片段
 */
export interface GeneratedCodeSegments {
  /** 视频同步服务代码 */
  videoSyncService: string;
  /** 参数加载代码 */
  parameterLoader: string;
  /** 渲染核心代码 */
  renderingCore: string;
  /** 动画循环代码 */
  animationLoop: string;
  /** 导出接口代码 */
  exportInterface: string;
}

/**
 * 核心渲染器代码生成器
 *
 * 生成与主平台统一的渲染代码
 */
export class CoreRendererCodeGenerator {
  /** 默认视频同步超时时间（毫秒） */
  private static readonly DEFAULT_VIDEO_SYNC_TIMEOUT = 200;

  /**
   * 生成视频同步服务代码
   *
   * 与 VideoSyncService.syncVideoToTime 保持一致的逻辑：
   * - 循环模式下使用取模计算目标时间
   * - 边界处理：避免跳回第一帧
   * - 超时保护机制
   * - 支持 startTimeOffset (024-video-start-time)
   */
  generateVideoSyncService(): string {
    return `
  // ============================================
  // 视频同步服务 (与主平台 VideoSyncService 保持一致)
  // ============================================

  var VideoSyncService = {
    DEFAULT_TIMEOUT: ${CoreRendererCodeGenerator.DEFAULT_VIDEO_SYNC_TIMEOUT},

    /**
     * 同步单个视频到指定时间
     * @param video - 视频元素
     * @param timeMs - 目标时间（毫秒）
     * @param options - { timeout, loop, startTimeOffset }
     */
    syncVideoToTime: function(video, timeMs, options) {
      options = options || {};
      var timeout = options.timeout !== undefined ? options.timeout : this.DEFAULT_TIMEOUT;
      var loop = options.loop !== undefined ? options.loop : true;
      var startTimeOffset = options.startTimeOffset || 0;

      // 计算有效时间：动效时间 - 视频起始偏移 (024-video-start-time)
      var effectiveTimeMs = timeMs - startTimeOffset;
      var timeInSeconds = Math.max(0, effectiveTimeMs) / 1000;
      var videoDuration = video.duration || 1;

      var targetTime;
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
        return Promise.resolve();
      }

      // 确保视频暂停
      if (!video.paused) {
        video.pause();
      }

      return new Promise(function(resolve) {
        var onSeeked = function() {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };

        video.addEventListener('seeked', onSeeked);
        video.currentTime = targetTime;

        // 超时保护
        setTimeout(function() {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }, timeout);
      });
    },

    /**
     * 同步所有视频参数到指定时间
     * @param params - 参数对象
     * @param timeMs - 目标时间（毫秒）
     * @param options - 同步选项
     * @param startTimeOffsets - 各视频的起始时间偏移映射 (024-video-start-time)
     */
    syncAllVideosToTime: function(params, timeMs, options, startTimeOffsets) {
      var self = this;
      var promises = [];
      startTimeOffsets = startTimeOffsets || {};

      for (var paramId in params) {
        var value = params[paramId];
        // 检查是否是 HTMLVideoElement
        if (value && value.tagName === 'VIDEO' && typeof value.currentTime !== 'undefined') {
          var syncOptions = Object.assign({}, options, {
            startTimeOffset: startTimeOffsets[paramId] || 0
          });
          promises.push(self.syncVideoToTime(value, timeMs, syncOptions));
        }
      }

      if (promises.length === 0) {
        return Promise.resolve();
      }

      return Promise.all(promises);
    }
  };
`.trim();
  }

  /**
   * 生成参数加载代码
   *
   * 与 ParameterLoaderService 保持一致的逻辑：
   * - 基础类型直接加载
   * - 图片类型异步预加载
   * - 视频类型异步预加载
   */
  generateParameterLoader(exportedParams: ExportableParameter[]): string {
    const paramsInit = this.generateParamsInitCode(exportedParams);

    return `
  // ============================================
  // 参数加载器 (与主平台 ParameterLoaderService 保持一致)
  // ============================================

  var ParameterLoader = {
    /**
     * 加载参数初始值
     */
    loadInitialParams: function() {
      return ${paramsInit};
    },

    /**
     * 预加载图片参数
     * @param params - 参数对象
     * @param imageAssets - 图片资源映射 { paramId: base64/url }
     */
    preloadImages: function(params, imageAssets) {
      var promises = [];

      Object.keys(imageAssets).forEach(function(paramId) {
        var promise = new Promise(function(resolve) {
          var img = new Image();
          img.onload = function() {
            params[paramId] = img;
            resolve();
          };
          img.onerror = function() {
            console.warn('图片加载失败:', paramId);
            resolve(); // 失败也继续
          };
          img.src = imageAssets[paramId];
        });
        promises.push(promise);
      });

      return Promise.all(promises);
    },

    /**
     * 预加载视频参数
     * @param params - 参数对象
     * @param videoAssets - 视频资源映射 { paramId: blobUrl }
     */
    preloadVideos: function(params, videoAssets) {
      var promises = [];

      Object.keys(videoAssets).forEach(function(paramId) {
        var promise = new Promise(function(resolve) {
          var video = document.createElement('video');
          video.muted = true;
          video.playsInline = true;
          video.preload = 'auto';

          video.onloadeddata = function() {
            params[paramId] = video;
            resolve();
          };
          video.onerror = function() {
            console.warn('视频加载失败:', paramId);
            resolve();
          };
          video.src = videoAssets[paramId];
        });
        promises.push(promise);
      });

      return Promise.all(promises);
    }
  };
`.trim();
  }

  /**
   * 生成渲染核心代码
   *
   * 与 CanvasRenderer 保持一致的渲染逻辑：
   * - 统一的背景处理
   * - 统一的上下文保存/恢复
   * - 统一的错误处理
   * - 支持后处理模式（使用离屏 canvas + PostProcessRuntime）
   */
  generateRenderingCore(config: CodeGeneratorConfig): string {
    const { motion, overrideDimensions } = config;
    const width = overrideDimensions?.width ?? motion.width;
    const height = overrideDimensions?.height ?? motion.height;
    const motionCode = motion.code || '';
    const hasPostProcess = Boolean(motion.postProcessCode && motion.postProcessCode.trim());
    const postProcessCode = hasPostProcess ? motion.postProcessCode!.trim() : '';

    return `
  // ============================================
  // 渲染核心 (与主平台 CanvasRenderer 保持一致)
  // ============================================

  var RenderingCore = {
    canvas: null,
    ctx: null,
    renderFunction: null,
    canvasInfo: null,
    ${hasPostProcess ? `
    // 后处理模式专用
    offscreenCanvas: null,
    offscreenCtx: null,
    postProcessor: null,
    postProcessFn: null,` : ''}

    /**
     * 初始化渲染核心
     */
    initialize: function() {
      this.canvas = document.getElementById('motion-canvas');
      ${hasPostProcess ? `
      // 后处理模式：隐藏原始 canvas，使用离屏渲染
      this.canvas.style.display = 'none';
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = ${width};
      this.offscreenCanvas.height = ${height};
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');` : `
      this.ctx = this.canvas.getContext('2d');`}

      // 设置 Canvas 尺寸（像素尺寸）
      this.canvas.width = ${width};
      this.canvas.height = ${height};
      // 显示尺寸由 CSS 的 max-width/max-height 控制

      this.canvasInfo = {
        width: ${width},
        height: ${height}
      };

      // 加载渲染函数
      this.loadRenderFunction();

      ${hasPostProcess ? `
      // 初始化后处理器
      if (typeof PostProcessRuntime !== 'undefined') {
        this.postProcessor = new PostProcessRuntime();
        this.postProcessor.initialize(this.canvas.parentElement, ${width}, ${height});

        // 加载后处理函数
        this.loadPostProcessFunction();
      }` : ''}
    },

    /**
     * 加载用户定义的渲染函数
     */
    loadRenderFunction: function() {
      try {
        // 用户定义的渲染代码
        ${motionCode}

        // 获取渲染函数
        if (typeof window.__motionRender === 'function') {
          this.renderFunction = window.__motionRender;
          window.__motionRender = undefined;
        }
      } catch (e) {
        console.error('加载渲染函数失败:', e);
      }
    },

    ${hasPostProcess ? `
    /**
     * 加载后处理函数
     */
    loadPostProcessFunction: function() {
      try {
        // 用户定义的后处理代码
        ${postProcessCode}

        // 获取后处理函数
        if (typeof window.__motionPostProcess === 'function') {
          this.postProcessFn = window.__motionPostProcess;
          window.__motionPostProcess = undefined;
        }
      } catch (e) {
        console.error('加载后处理函数失败:', e);
      }
    },` : ''}

    /**
     * 渲染单帧
     * @param ctx - Canvas 上下文
     * @param time - 当前时间（毫秒）
     * @param params - 参数对象
     * @param transparent - 是否透明背景
     */
    renderFrame: function(ctx, time, params, transparent) {
      var width = this.canvasInfo.width;
      var height = this.canvasInfo.height;

      if (transparent) {
        // 透明模式：清除画布
        ctx.clearRect(0, 0, width, height);
      } else {
        // 普通模式：填充背景色
        ctx.fillStyle = '${this.escapeString(motion.backgroundColor || '#ffffff')}';
        ctx.fillRect(0, 0, width, height);
      }

      // 调用渲染函数
      if (this.renderFunction) {
        try {
          ctx.save();
          this.renderFunction(ctx, time, params, this.canvasInfo);
          ctx.restore();
        } catch (e) {
          console.error('渲染错误:', e);
        }
      }
    },

    ${hasPostProcess ? `
    /**
     * 渲染单帧（后处理模式）
     * 先渲染到离屏 canvas，再通过后处理器输出到主 canvas
     * @param time - 当前时间（毫秒）
     * @param params - 参数对象
     * @param transparent - 是否透明背景
     */
    renderFrameWithPostProcess: function(time, params, transparent) {
      // 1. 渲染到离屏 canvas
      this.renderFrame(this.offscreenCtx, time, params, transparent);

      // 2. 应用后处理
      if (this.postProcessor && this.postProcessFn) {
        this.postProcessor.render(this.offscreenCanvas, time, params, this.postProcessFn);
      }
    },` : ''}

    /**
     * 渲染到离屏 Canvas（用于导出隔离）
     * @param targetCanvas - 离屏 canvas
     * @param time - 渲染时间
     * @param params - 参数对象
     * @param transparent - 是否透明
     */
    renderToOffscreen: function(targetCanvas, time, params, transparent) {
      var targetCtx = targetCanvas.getContext('2d');
      this.renderFrame(targetCtx, time, params, transparent);
    }
  };
`.trim();
  }

  /**
   * 生成动画循环代码
   *
   * 与 CanvasRenderer 保持一致的动画循环：
   * - 使用 requestAnimationFrame
   * - 支持播放/暂停/停止/seek
   * - 精确视频帧同步
   * - 动态时长支持 (025-dynamic-duration)
   * - 后处理模式支持
   */
  generateAnimationLoop(config: CodeGeneratorConfig): string {
    const { motion } = config;
    const hasPostProcess = Boolean(motion.postProcessCode && motion.postProcessCode.trim());

    return `
  // ============================================
  // 动画循环 (与主平台 CanvasRenderer 保持一致)
  // ============================================

  var AnimationLoop = {
    isPlaying: true,
    startTime: 0,
    pausedTime: 0,
    animationFrameId: null,
    duration: ${motion.duration},
    effectiveDuration: 0, // 动态计算的有效时长 (025-dynamic-duration)
    params: null,

    /**
     * 初始化动画循环
     * @param params - 参数对象
     */
    initialize: function(params) {
      this.params = params;
      this.startTime = performance.now();
      // 计算初始动态时长 (025-dynamic-duration)
      this.updateDynamicDuration();
    },

    /**
     * 更新动态时长 (025-dynamic-duration)
     */
    updateDynamicDuration: function() {
      var motionLike = {
        duration: this.duration,
        durationCode: motionDurationCode,
        parameters: parametersDefinition
      };
      var previousDuration = this.effectiveDuration;
      this.effectiveDuration = VideoStartTimeEvaluator.getEffectiveDuration(motionLike, this.params);
      if (previousDuration !== this.effectiveDuration && previousDuration !== 0) {
        console.log('[025-dynamic-duration] 时长已更新:', previousDuration, '->', this.effectiveDuration);
      }
    },

    /**
     * 获取有效时长 (025-dynamic-duration)
     */
    getEffectiveDuration: function() {
      return this.effectiveDuration || this.duration;
    },

    /**
     * 动画帧回调
     */
    tick: async function() {
      if (!this.isPlaying) return;

      var currentTime = performance.now() - this.startTime;

      // 循环动画（使用动态时长 025-dynamic-duration）
      var loopDuration = this.effectiveDuration || this.duration;
      if (currentTime >= loopDuration) {
        this.startTime = performance.now();
        currentTime = 0;
      }

      // 精确定位所有视频参数（传递起始时间偏移）(024-video-start-time)
      await VideoSyncService.syncAllVideosToTime(this.params, currentTime, {}, videoStartTimeOffsets);

      // T037: 更新序列帧参数到当前帧 (029-sequence-frame-input)
      SequenceService.updateSequenceFrames(this.params, currentTime);

      // 渲染当前帧
      ${hasPostProcess ? `
      RenderingCore.renderFrameWithPostProcess(currentTime, this.params, false);` : `
      RenderingCore.renderFrame(RenderingCore.ctx, currentTime, this.params, false);`}

      var self = this;
      this.animationFrameId = requestAnimationFrame(function() {
        self.tick();
      });
    },

    /**
     * 开始播放
     */
    play: function() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.startTime = performance.now() - this.pausedTime;
      this.tick();
    },

    /**
     * 暂停
     */
    pause: function() {
      if (!this.isPlaying) return;
      this.isPlaying = false;
      this.pausedTime = performance.now() - this.startTime;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    },

    /**
     * 停止
     */
    stop: function() {
      this.pause();
      this.pausedTime = 0;
      ${hasPostProcess ? `
      RenderingCore.renderFrameWithPostProcess(0, this.params, false);` : `
      RenderingCore.renderFrame(RenderingCore.ctx, 0, this.params, false);`}
    },

    /**
     * 跳转到指定时间
     * @param time - 目标时间（毫秒）
     */
    seek: async function(time) {
      this.pausedTime = time;
      this.startTime = performance.now() - time;
      // 传递起始时间偏移 (024-video-start-time)
      await VideoSyncService.syncAllVideosToTime(this.params, time, {}, videoStartTimeOffsets);
      // T037: 更新序列帧参数到当前帧 (029-sequence-frame-input)
      SequenceService.updateSequenceFrames(this.params, time);
      ${hasPostProcess ? `
      RenderingCore.renderFrameWithPostProcess(time, this.params, false);` : `
      RenderingCore.renderFrame(RenderingCore.ctx, time, this.params, false);`}
    },

    /**
     * 获取当前时间
     */
    getCurrentTime: function() {
      if (this.isPlaying) {
        return performance.now() - this.startTime;
      }
      return this.pausedTime;
    }
  };
`.trim();
  }

  /**
   * 生成导出接口代码
   *
   * 提供 motionControls 接口供外部调用：
   * - 播放控制
   * - 导出渲染
   * - 参数更新
   * - 后处理模式支持
   */
  generateExportInterface(config: CodeGeneratorConfig): string {
    const { motion } = config;
    const hasPostProcess = Boolean(motion.postProcessCode && motion.postProcessCode.trim());

    return `
  // ============================================
  // 导出接口 (motionControls)
  // ============================================

  window.motionControls = {
    // 导出状态管理
    _isExporting: false,
    _preExportTime: 0,

    play: function() {
      AnimationLoop.play();
    },

    pause: function() {
      AnimationLoop.pause();
    },

    stop: function() {
      AnimationLoop.stop();
    },

    seek: async function(time) {
      await AnimationLoop.seek(time);
    },

    seekTo: function(time) {
      this.seek(time);
    },

    setProgress: function(progress) {
      // 使用动态时长 (025-dynamic-duration)
      var time = progress * AnimationLoop.getEffectiveDuration();
      this.seek(time);
    },

    isPlaying: function() {
      return AnimationLoop.isPlaying;
    },

    getDuration: function() {
      // 返回动态时长 (025-dynamic-duration)
      return AnimationLoop.getEffectiveDuration();
    },

    getCurrentTime: function() {
      return AnimationLoop.getCurrentTime();
    },

    /**
     * 开始导出模式
     * 保存当前预览状态，防止导出过程影响预览
     */
    beginExport: function() {
      this._isExporting = true;
      this._preExportTime = AnimationLoop.getCurrentTime();
      // 暂停动画循环
      AnimationLoop.pause();
    },

    /**
     * 结束导出模式
     * 恢复预览到导出前的状态
     */
    endExport: async function() {
      this._isExporting = false;
      // 恢复到导出前的时间点并渲染
      await VideoSyncService.syncAllVideosToTime(params, this._preExportTime, {}, videoStartTimeOffsets);
      ${hasPostProcess ? `
      RenderingCore.renderFrameWithPostProcess(this._preExportTime, params, false);` : `
      RenderingCore.renderFrame(RenderingCore.ctx, this._preExportTime, params, false);`}
    },

    /**
     * 渲染指定时间的帧（用于导出）
     * @param time - 时间（毫秒）
     * @param transparent - 是否透明背景
     */
    renderAt: async function(time, transparent) {
      // 传递起始时间偏移 (024-video-start-time)
      await VideoSyncService.syncAllVideosToTime(params, time, {}, videoStartTimeOffsets);
      ${hasPostProcess ? `
      RenderingCore.renderFrameWithPostProcess(time, params, transparent);` : `
      RenderingCore.renderFrame(RenderingCore.ctx, time, params, transparent);`}
    },

    /**
     * 渲染到离屏 Canvas（用于导出隔离）
     * @param targetCanvas - 离屏 canvas
     * @param time - 时间（毫秒）
     * @param transparent - 是否透明
     * @param videoOverrides - 克隆的视频对象映射
     */
    renderToCanvas: async function(targetCanvas, time, transparent, videoOverrides) {
      // 使用克隆的视频对象（如果有）
      var renderParams = {};
      for (var paramId in params) {
        if (videoOverrides && videoOverrides[paramId]) {
          renderParams[paramId] = videoOverrides[paramId];
        } else {
          renderParams[paramId] = params[paramId];
        }
      }

      // 同步视频到指定时间（传递起始时间偏移）(024-video-start-time)
      await VideoSyncService.syncAllVideosToTime(renderParams, time, {}, videoStartTimeOffsets);

      ${hasPostProcess ? `
      // 后处理模式：先渲染到离屏，再应用后处理，最后复制到目标
      if (RenderingCore.postProcessor) {
        RenderingCore.renderToOffscreen(RenderingCore.offscreenCanvas, time, renderParams, transparent);
        RenderingCore.postProcessor.render(RenderingCore.offscreenCanvas, time, renderParams, RenderingCore.postProcessFn);
        var targetCtx = targetCanvas.getContext('2d');
        targetCtx.drawImage(RenderingCore.postProcessor.getCanvas(), 0, 0);
      } else {
        RenderingCore.renderToOffscreen(targetCanvas, time, renderParams, transparent);
      }` : `
      // 标准路径：直接渲染到目标 canvas
      RenderingCore.renderToOffscreen(targetCanvas, time, renderParams, transparent);`}
    }
  };

  // 参数更新函数
  window.updateParam = function(paramId, value) {
    params[paramId] = value;

    // 参数变更可能影响 videoStartTimeCode 的动态计算结果 (024-video-start-time)
    // 例如：videoStartTimeCode 引用了其他数值参数
    updateVideoStartTimeOffsets();

    // 参数变更可能影响 durationCode 的动态计算结果 (025-dynamic-duration)
    AnimationLoop.updateDynamicDuration();

    if (!AnimationLoop.isPlaying) {
      ${hasPostProcess ? `
      RenderingCore.renderFrameWithPostProcess(AnimationLoop.pausedTime, params, false);` : `
      RenderingCore.renderFrame(RenderingCore.ctx, AnimationLoop.pausedTime, params, false);`}
    }
  };

  // 获取参数值
  window.getParam = function(paramId) {
    return params[paramId];
  };

  // 暴露 params 对象
  window.__motionParams = params;

  // 更新动效时长
  window.updateMotionDuration = function(newDuration) {
    AnimationLoop.duration = newDuration;
    console.log('动效时长已更新:', newDuration, 'ms');
  };
`.trim();
  }

  /**
   * 生成视频起始时间评估器代码 (024-video-start-time)
   *
   * 直接复用 videoStartTimeEvaluator.ts 中的 EVALUATOR_CODE
   * 消除代码重复，确保运行时和素材包使用相同的逻辑
   */
  generateVideoStartTimeEvaluator(): string {
    return `
  // ============================================
  // 视频起始时间评估器 (024-video-start-time)
  // 复用自 videoStartTimeEvaluator.ts
  // ============================================

  ${EVALUATOR_CODE}
`.trim();
  }

  /**
   * T035-T036: 生成序列帧服务代码 (029-sequence-frame-input)
   *
   * 提供序列帧预加载和帧获取功能：
   * - preloadSequences(): 从 __SEQUENCE_ASSETS__ 预加载所有帧为 HTMLImageElement
   * - getSequenceFrame(paramId, time, fps, loop): 根据时间获取当前帧
   */
  generateSequenceService(): string {
    return `
  // ============================================
  // 序列帧服务 (T035-T036, 029-sequence-frame-input)
  // ============================================

  var SequenceService = {
    // 预加载的序列帧缓存: { paramId: HTMLImageElement[] }
    preloadedSequences: {},

    /**
     * T035: 预加载所有序列帧
     * 从 __SEQUENCE_ASSETS__ 中读取 Base64 数据并转换为 HTMLImageElement
     */
    preloadSequences: function() {
      var self = this;
      var assets = window.__SEQUENCE_ASSETS__ || {};

      Object.keys(assets).forEach(function(paramId) {
        var assetData = assets[paramId];
        if (!assetData || !assetData.frames || assetData.frames.length === 0) {
          return;
        }

        var loadedFrames = [];
        assetData.frames.forEach(function(base64Data) {
          var img = new Image();
          img.src = base64Data;
          loadedFrames.push(img);
        });

        self.preloadedSequences[paramId] = loadedFrames;
        console.log('[SequenceService] 预加载完成:', paramId, '帧数:', loadedFrames.length);
      });
    },

    /**
     * T036: 根据时间获取当前序列帧
     * @param paramId - 参数 ID
     * @param time - 当前时间（毫秒）
     * @param fps - 帧率（默认 30）
     * @param loop - 是否循环（默认 true）
     * @returns HTMLImageElement 或 null
     */
    getSequenceFrame: function(paramId, time, fps, loop) {
      var frames = this.preloadedSequences[paramId];
      if (!frames || frames.length === 0) {
        return null;
      }

      fps = fps || 30;
      loop = loop !== undefined ? loop : true;

      var frameDuration = 1000 / fps;
      var frameIndex = Math.floor(time / frameDuration);

      if (loop) {
        return frames[frameIndex % frames.length];
      } else {
        return frames[Math.min(frameIndex, frames.length - 1)];
      }
    },

    /**
     * 获取序列帧的 fps 和 loop 配置
     * @param paramId - 参数 ID
     */
    getSequenceConfig: function(paramId) {
      var assets = window.__SEQUENCE_ASSETS__ || {};
      var assetData = assets[paramId];
      if (!assetData) {
        return { fps: 30, loop: true };
      }
      return {
        fps: assetData.fps || 30,
        loop: assetData.loop !== undefined ? assetData.loop : true
      };
    },

    /**
     * T037: 更新所有序列帧参数到当前帧
     * 在每帧渲染前调用
     * @param params - 参数对象
     * @param time - 当前时间（毫秒）
     */
    updateSequenceFrames: function(params, time) {
      var self = this;
      Object.keys(this.preloadedSequences).forEach(function(paramId) {
        var config = self.getSequenceConfig(paramId);
        var currentFrame = self.getSequenceFrame(paramId, time, config.fps, config.loop);
        if (currentFrame) {
          params[paramId] = currentFrame;
        }
      });
    }
  };

  // 暴露到 window 以便控件绑定代码可以访问 (029-sequence-frame-input)
  window.SequenceService = SequenceService;
`.trim();
  }

  /**
   * 生成参数定义数组代码 (024-video-start-time)
   *
   * 将动效的 parameters 数组转换为内联的 JavaScript 代码
   *
   * 架构说明：
   * - 需要导出所有参数类型，因为 videoStartTimeCode 可能引用任意参数
   * - 例如：videoStartTimeCode = "params.video2StartTime" 引用了 number 类型参数
   * - buildParamsContext 需要所有参数才能正确构建评估上下文
   */
  private generateParametersDefinition(parameters: AdjustableParameter[]): string {
    // 导出所有参数的类型和必要字段，供 buildParamsContext 使用
    const paramDefs = parameters.map(p => {
      const base: Record<string, unknown> = {
        id: p.id,
        type: p.type,
      };

      // 根据类型添加默认值（用于 buildParamsContext 回退）
      switch (p.type) {
        case 'number':
          base.value = p.value ?? 0;
          break;
        case 'color':
          base.colorValue = p.colorValue ?? '#000000';
          break;
        case 'boolean':
          base.boolValue = p.boolValue ?? false;
          break;
        case 'select':
          base.selectedValue = p.selectedValue ?? '';
          break;
        case 'video':
          base.videoStartTime = p.videoStartTime ?? 0;
          base.videoStartTimeCode = p.videoStartTimeCode ?? null;
          break;
      }

      return base;
    });

    return JSON.stringify(paramDefs, null, 2);
  }

  /**
   * 生成完整的渲染器代码
   *
   * 组装所有代码片段成完整的自执行函数
   */
  generateCompleteRendererCode(config: CodeGeneratorConfig): string {
    const videoSyncService = this.generateVideoSyncService();
    const videoStartTimeEvaluator = this.generateVideoStartTimeEvaluator();
    const sequenceService = this.generateSequenceService();  // T035-T036
    const parameterLoader = this.generateParameterLoader(config.exportedParams);
    const renderingCore = this.generateRenderingCore(config);
    const animationLoop = this.generateAnimationLoop(config);
    const exportInterface = this.generateExportInterface(config);
    const parametersDefinition = this.generateParametersDefinition(config.motion.parameters);

    return `
// ============================================
// Canvas 渲染器 (统一渲染架构 023-unified-renderer)
// ============================================

(function() {
  'use strict';

  // 动效配置
  var config = {
    duration: ${config.motion.duration},
    width: ${config.overrideDimensions?.width ?? config.motion.width},
    height: ${config.overrideDimensions?.height ?? config.motion.height},
    backgroundColor: '${this.escapeString(config.motion.backgroundColor || '#ffffff')}'
  };

  // 动态时长计算代码 (025-dynamic-duration)
  var motionDurationCode = ${config.motion.durationCode ? JSON.stringify(config.motion.durationCode) : 'null'};

  // 参数定义（用于视频起始时间和动态时长计算）(024-video-start-time, 025-dynamic-duration)
  var parametersDefinition = ${parametersDefinition};

${videoSyncService}

${videoStartTimeEvaluator}

${sequenceService}

${parameterLoader}

  // 参数值（在 ParameterLoader 定义后初始化）
  var params = ParameterLoader.loadInitialParams();

  // 视频起始时间偏移缓存 (024-video-start-time)
  var videoStartTimeOffsets = {};

  // 更新视频起始时间偏移（视频加载后调用）
  function updateVideoStartTimeOffsets() {
    videoStartTimeOffsets = VideoStartTimeEvaluator.getAllVideoStartTimes(parametersDefinition, params);
    if (Object.keys(videoStartTimeOffsets).length > 0) {
      console.log('[024-video-start-time] 视频起始时间偏移已计算:', videoStartTimeOffsets);
    }
  }

${renderingCore}

${animationLoop}

${exportInterface}

  // 初始化
  RenderingCore.initialize();
  SequenceService.preloadSequences();  // T035: 预加载序列帧
  AnimationLoop.initialize(params);
  AnimationLoop.tick();
})();
`.trim();
  }

  /**
   * 获取所有代码片段（用于调试或自定义组装）
   */
  generateAllSegments(config: CodeGeneratorConfig): GeneratedCodeSegments {
    return {
      videoSyncService: this.generateVideoSyncService(),
      parameterLoader: this.generateParameterLoader(config.exportedParams),
      renderingCore: this.generateRenderingCore(config),
      animationLoop: this.generateAnimationLoop(config),
      exportInterface: this.generateExportInterface(config),
    };
  }

  /**
   * 生成参数初始值代码
   */
  private generateParamsInitCode(exportedParams: ExportableParameter[]): string {
    const paramsObj: Record<string, unknown> = {};

    for (const ep of exportedParams) {
      const param = ep.parameter;

      switch (param.type) {
        case 'number':
        case 'color':
        case 'boolean':
        case 'select':
        case 'image':
        case 'string':
          paramsObj[param.id] = ep.currentValue;
          break;
      }
    }

    return JSON.stringify(paramsObj, null, 2);
  }

  /**
   * 转义字符串中的特殊字符
   */
  private escapeString(str: string): string {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }
}

/**
 * 创建 CoreRendererCodeGenerator 实例
 */
export function createCoreRendererCodeGenerator(): CoreRendererCodeGenerator {
  return new CoreRendererCodeGenerator();
}

/**
 * 导出单例实例
 */
export const coreRendererCodeGenerator = new CoreRendererCodeGenerator();

export default CoreRendererCodeGenerator;
