/**
 * H264EncoderCodeGenerator - H.264 编码器代码生成器
 *
 * 生成与主平台 H264EncoderService 一致的 JavaScript 代码，
 * 用于素材包的 MP4 导出功能。
 *
 * 统一编码参数：
 * - frameRate: 60
 * - quantizationParameter (quality): 28
 * - speed: 5
 * - groupOfPictures (keyframeInterval): 60
 *
 * @module services/assetPackExporter/H264EncoderCodeGenerator
 */

/**
 * 编码器参数配置（与主平台 H264EncoderService 保持一致）
 */
export interface EncoderConfig {
  /** 帧率，默认 60 */
  frameRate?: number;
  /** 量化参数（质量），默认 28 */
  quality?: number;
  /** 编码速度，默认 5 */
  speed?: number;
  /** 关键帧间隔，默认 60 */
  keyframeInterval?: number;
}

/**
 * 默认编码参数（与 H264EncoderService 完全一致）
 */
const DEFAULT_CONFIG: Required<EncoderConfig> = {
  frameRate: 60,
  quality: 28,
  speed: 5,
  keyframeInterval: 1,  // 每帧都是关键帧，避免首个 GOP P/B 帧编码问题
};

/**
 * H.264 编码器代码生成器
 */
export class H264EncoderCodeGenerator {
  /**
   * 生成编码器服务代码
   *
   * 与主平台 H264EncoderService 保持一致的逻辑：
   * - 宽高必须是 2 的倍数（H.264 编码要求）
   * - 统一的编码参数
   * - 统一的错误处理
   */
  generateEncoderService(config: EncoderConfig = {}): string {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    return `
  // ============================================
  // H264 编码器服务 (与主平台 H264EncoderService 保持一致)
  // 使用 window. 暴露全局访问，供 RGB+Alpha 导出功能使用
  // ============================================

  window.H264EncoderService = {
    // 编码器实例
    encoder: null,
    isInitialized: false,
    isLoading: false,
    alignedWidth: 0,
    alignedHeight: 0,

    // 默认参数（与主平台一致）
    DEFAULT_FRAME_RATE: ${finalConfig.frameRate},
    DEFAULT_QUALITY: ${finalConfig.quality},
    DEFAULT_SPEED: ${finalConfig.speed},
    DEFAULT_KEYFRAME_INTERVAL: ${finalConfig.keyframeInterval},

    /**
     * 初始化编码器
     * @param width - 视频宽度
     * @param height - 视频高度
     * @param options - 编码选项
     */
    initialize: async function(width, height, options) {
      options = options || {};

      if (this.isInitialized) {
        console.warn('H264EncoderService: 编码器已初始化，请先调用 dispose()');
        return;
      }

      if (this.isLoading) {
        console.warn('H264EncoderService: 编码器正在加载中');
        return;
      }

      this.isLoading = true;

      try {
        // 检查 WASM 编码器是否可用
        if (typeof window.__initH264MP4Encoder__ !== 'function') {
          throw new Error('H264 MP4 编码器未正确加载');
        }

        // 创建编码器实例
        this.encoder = await window.__initH264MP4Encoder__();

        // 宽高必须是 2 的倍数（H.264 编码要求）
        this.alignedWidth = width % 2 === 0 ? width : width + 1;
        this.alignedHeight = height % 2 === 0 ? height : height + 1;

        // 设置编码器参数
        this.encoder.width = this.alignedWidth;
        this.encoder.height = this.alignedHeight;
        this.encoder.frameRate = options.frameRate || this.DEFAULT_FRAME_RATE;
        this.encoder.quantizationParameter = options.quality || this.DEFAULT_QUALITY;
        this.encoder.speed = options.speed || this.DEFAULT_SPEED;
        this.encoder.groupOfPictures = options.keyframeInterval || this.DEFAULT_KEYFRAME_INTERVAL;

        // 初始化编码器
        this.encoder.initialize();

        this.isInitialized = true;
        console.log('H264EncoderService: 编码器初始化成功', {
          width: this.alignedWidth,
          height: this.alignedHeight,
          frameRate: this.encoder.frameRate
        });

        return true;
      } catch (error) {
        console.error('H264EncoderService: 编码器初始化失败', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 添加一帧
     * @param imageData - ImageData 对象
     */
    addFrame: function(imageData) {
      if (!this.isInitialized || !this.encoder) {
        throw new Error('编码器未初始化');
      }

      this.encoder.addFrameRgba(imageData.data);
    },

    /**
     * 添加一帧（从 Uint8Array）
     * @param rgbaData - RGBA 格式的原始数据
     */
    addFrameRgba: function(rgbaData) {
      if (!this.isInitialized || !this.encoder) {
        throw new Error('编码器未初始化');
      }

      this.encoder.addFrameRgba(rgbaData);
    },

    /**
     * 完成编码并返回 Blob
     */
    finalize: function() {
      if (!this.isInitialized || !this.encoder) {
        throw new Error('编码器未初始化');
      }

      // 完成编码
      this.encoder.finalize();

      // 读取输出文件
      var mp4Data = this.encoder.FS.readFile(this.encoder.outputFilename);

      // 创建 Blob
      var blob = new Blob([mp4Data], { type: 'video/mp4' });

      console.log('H264EncoderService: 编码完成', {
        size: blob.size,
        sizeKB: (blob.size / 1024).toFixed(1)
      });

      return blob;
    },

    /**
     * 释放编码器资源
     */
    dispose: function() {
      if (this.encoder) {
        try {
          this.encoder.delete();
          console.log('H264EncoderService: 编码器资源已释放');
        } catch (error) {
          console.warn('H264EncoderService: 释放编码器资源时出错', error);
        }
        this.encoder = null;
      }

      this.isInitialized = false;
      this.alignedWidth = 0;
      this.alignedHeight = 0;
    },

    /**
     * 获取对齐后的宽度
     */
    getAlignedWidth: function() {
      return this.alignedWidth;
    },

    /**
     * 获取对齐后的高度
     */
    getAlignedHeight: function() {
      return this.alignedHeight;
    },

    /**
     * 将值对齐到 2 的倍数
     */
    alignDimension: function(value) {
      return value % 2 === 0 ? value : value + 1;
    }
  };
`.trim();
  }

  /**
   * 生成视频克隆服务代码
   *
   * 与主平台 VideoSyncService.cloneVideoForExport 保持一致的逻辑
   */
  generateVideoCloneService(): string {
    return `
  // ============================================
  // 视频克隆服务 (与主平台 VideoSyncService 保持一致)
  // 使用 window. 暴露全局访问，供 RGB+Alpha 导出功能使用
  // ============================================

  window.VideoCloneService = {
    /**
     * 克隆视频元素
     * @param original - 原始视频元素
     * @param timeout - 超时时间（毫秒），默认 5000
     */
    cloneVideo: function(original, timeout) {
      timeout = timeout || 5000;

      return new Promise(function(resolve, reject) {
        var clone = document.createElement('video');
        clone.src = original.src;
        clone.muted = true;
        clone.preload = 'auto';

        var cleanup = function() {
          clone.removeEventListener('loadeddata', onLoaded);
          clone.removeEventListener('error', onError);
        };

        var onLoaded = function() {
          cleanup();
          clearTimeout(timeoutId);
          console.log('VideoCloneService: 视频克隆成功');
          resolve(clone);
        };

        var onError = function() {
          cleanup();
          clearTimeout(timeoutId);
          console.error('VideoCloneService: 视频克隆失败');
          reject(new Error('视频克隆失败'));
        };

        clone.addEventListener('loadeddata', onLoaded, { once: true });
        clone.addEventListener('error', onError, { once: true });

        var timeoutId = setTimeout(function() {
          cleanup();
          console.warn('VideoCloneService: 视频克隆超时');
          reject(new Error('视频克隆超时'));
        }, timeout);
      });
    },

    /**
     * 批量克隆所有视频参数
     * @param params - 参数对象
     */
    cloneAllVideos: async function(params) {
      var result = {};

      for (var paramId in params) {
        var value = params[paramId];
        if (value && value.tagName === 'VIDEO') {
          try {
            result[paramId] = await this.cloneVideo(value);
          } catch (error) {
            console.warn('VideoCloneService: 跳过克隆失败的视频:', paramId);
            // 克隆失败时使用原始视频
            result[paramId] = value;
          }
        }
      }

      return result;
    },

    /**
     * 释放克隆的视频资源
     * @param clonedVideos - 克隆的视频映射
     */
    disposeClonedVideos: function(clonedVideos) {
      for (var paramId in clonedVideos) {
        var video = clonedVideos[paramId];
        if (video) {
          video.pause();
          video.src = '';
          video.load();
        }
      }
      console.log('VideoCloneService: 已释放克隆视频资源');
    }
  };
`.trim();
  }

  /**
   * 生成完整的 MP4 导出代码
   *
   * 使用统一的编码器服务和视频克隆服务
   */
  generateMP4ExporterCode(config: EncoderConfig = {}): string {
    const encoderService = this.generateEncoderService(config);
    const videoCloneService = this.generateVideoCloneService();

    return `
// ============================================
// MP4 视频导出器 (统一渲染架构 023-unified-renderer)
// ============================================

(function() {
  'use strict';

  var exportStatus = document.getElementById('export-status');

  // ==================== 状态显示 ====================

  function showStatus(text, isError) {
    if (exportStatus) {
      exportStatus.textContent = text;
      exportStatus.style.color = isError ? '#ff6b6b' : '#00d4ff';
      exportStatus.style.display = 'inline';
    }
  }

  function hideStatus() {
    if (exportStatus) {
      exportStatus.style.display = 'none';
    }
  }

${encoderService}

${videoCloneService}

  // ==================== 导出视频 ====================

  async function exportMP4Video() {
    if (!window.motionControls) {
      showStatus('动效控制器未初始化', true);
      return;
    }

    var canvas = document.getElementById('motion-canvas');
    if (!canvas) {
      showStatus('找不到画布元素', true);
      return;
    }

    // 禁用导出按钮
    var exportBtn = document.getElementById('export-btn');
    var originalHTML = '';
    if (exportBtn) {
      exportBtn.disabled = true;
      originalHTML = exportBtn.innerHTML;
      exportBtn.innerHTML = '<svg class="icon spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4m-8-10H2m20 0h-2m-2.93-5.66l-1.41 1.41m-9.32 9.32l-1.41 1.41m0-12.02l1.41 1.41m9.32 9.32l1.41 1.41"/></svg>';
    }

    // 克隆的视频对象
    var clonedVideos = {};

    // 开始导出模式（暂停预览并保存状态）
    if (window.motionControls.beginExport) {
      window.motionControls.beginExport();
    } else if (window.motionControls.pause) {
      // 向后兼容：旧版本渲染器只有 pause 方法
      window.motionControls.pause();
    }
    // 更新播放按钮 UI
    var playBtn = document.getElementById('play-btn');
    if (playBtn) {
      var iconPlay = playBtn.querySelector('.icon-play');
      var iconPause = playBtn.querySelector('.icon-pause');
      if (iconPlay) iconPlay.style.display = 'block';
      if (iconPause) iconPause.style.display = 'none';
    }

    try {
      var width = canvas.width;
      var height = canvas.height;

      // 初始化编码器
      showStatus('正在初始化 MP4 编码器...', false);
      await H264EncoderService.initialize(width, height);

      var duration = window.motionControls.getDuration ? window.motionControls.getDuration() : 3000;
      var fps = H264EncoderService.DEFAULT_FRAME_RATE;
      var frameDelay = Math.round(1000 / fps);
      var totalFrames = Math.max(1, Math.round(duration / frameDelay));

      // 克隆所有视频参数
      var params = window.__motionParams;
      if (params) {
        showStatus('正在准备视频...', false);
        clonedVideos = await VideoCloneService.cloneAllVideos(params);
      }

      // 创建离屏 canvas
      var offCanvas = document.createElement('canvas');
      offCanvas.width = H264EncoderService.getAlignedWidth();
      offCanvas.height = H264EncoderService.getAlignedHeight();
      var offCtx = offCanvas.getContext('2d');

      // 逐帧捕获和编码
      for (var i = 0; i < totalFrames; i++) {
        var progress = totalFrames > 1 ? i / (totalFrames - 1) : 0;
        showStatus('捕获帧 ' + (i + 1) + '/' + totalFrames, false);

        var time = progress * duration;

        // 使用离屏 canvas 渲染帧
        if (typeof window.motionControls.renderToCanvas === 'function') {
          await window.motionControls.renderToCanvas(offCanvas, time, false, clonedVideos);
        } else if (typeof window.motionControls.renderAt === 'function') {
          await window.motionControls.renderAt(time, false);
          offCtx.drawImage(canvas, 0, 0, offCanvas.width, offCanvas.height);
        }

        // 获取 RGBA 数据并添加到编码器
        var imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        H264EncoderService.addFrame(imageData);

        // 每 10 帧让出主线程
        if (i % 10 === 0) {
          await new Promise(function(r) { setTimeout(r, 0); });
        }
      }

      showStatus('正在编码 MP4 视频...', false);

      // 完成编码
      var mp4Blob = H264EncoderService.finalize();

      // 释放编码器资源
      H264EncoderService.dispose();

      // 下载
      var url = URL.createObjectURL(mp4Blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'motion-animation.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showStatus('导出成功！大小: ' + (mp4Blob.size / 1024).toFixed(1) + ' KB', false);
      setTimeout(hideStatus, 3000);

    } catch (err) {
      showStatus('导出失败: ' + err.message, true);
      setTimeout(hideStatus, 5000);

      // 清理编码器
      H264EncoderService.dispose();
    } finally {
      // 清理克隆的视频对象
      VideoCloneService.disposeClonedVideos(clonedVideos);

      // 结束导出模式（恢复预览到导出前状态）
      if (window.motionControls.endExport) {
        window.motionControls.endExport();
      }

      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalHTML;
      }
    }
  }

  // 导出全局函数供统一导出调度器调用
  window.__exportMP4Video = exportMP4Video;
})();
`.trim();
  }
}

/**
 * 创建 H264EncoderCodeGenerator 实例
 */
export function createH264EncoderCodeGenerator(): H264EncoderCodeGenerator {
  return new H264EncoderCodeGenerator();
}

/**
 * 导出单例实例
 */
export const h264EncoderCodeGenerator = new H264EncoderCodeGenerator();

export default H264EncoderCodeGenerator;
