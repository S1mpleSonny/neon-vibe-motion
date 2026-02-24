/**
 * 代码内联工具
 *
 * 从 CoreRendererCodeGenerator 生成可内联到导出 HTML 的代码
 *
 * @module services/assetPackExporter/codeInliner
 */

import type { MotionDefinition, ExportableParameter, CanvasDimensions } from '../../types';
import {
  CoreRendererCodeGenerator,
  type CodeGeneratorConfig,
} from './CoreRendererCodeGenerator';

/**
 * 生成的渲染器代码结构
 */
export interface GeneratedRendererCode {
  /** 初始化代码 */
  initCode: string;
  /** 渲染循环代码 */
  renderLoopCode: string;
  /** 参数更新代码 */
  paramUpdateCode: string;
}

/** Canvas 2D 代码生成器 */
const canvasCodeGenerator = new CoreRendererCodeGenerator();

/**
 * 生成渲染器的内联 JavaScript 代码
 *
 * @param motion 动效定义
 * @param exportedParams 导出的参数列表
 * @param overrideDimensions 可选的覆盖尺寸（用于根据画面比例调整）
 * @returns 完整的渲染器代码
 */
export function generateRendererCode(
  motion: MotionDefinition,
  exportedParams: ExportableParameter[],
  overrideDimensions?: CanvasDimensions
): string {
  const config: CodeGeneratorConfig = {
    motion,
    exportedParams,
    overrideDimensions,
  };

  return canvasCodeGenerator.generateCompleteRendererCode(config);
}

/**
 * 生成图片预加载代码
 * @param imageAssets 图片资源映射（paramId -> base64）
 * @returns 图片预加载的 JavaScript 代码
 */
export function generateImagePreloadCode(imageAssets: Record<string, string>): string {
  if (Object.keys(imageAssets).length === 0) {
    return '// 无图片资源需要预加载';
  }

  const imageEntries = Object.entries(imageAssets)
    .map(([paramId, base64]) => `    '${paramId}': '${base64}'`)
    .join(',\n');

  return `
// ============================================
// 图片资源预加载
// ============================================

(function() {
  // 图片预加载函数，在 window.updateParam 定义后调用
  function preloadImages() {
    var imageData = {
${imageEntries}
  };

    var loadedImages = {};
    var loadPromises = [];

    Object.keys(imageData).forEach(function(paramId) {
      var promise = new Promise(function(resolve, reject) {
        var img = new Image();
        img.onload = function() {
          loadedImages[paramId] = img;
          resolve();
        };
        img.onerror = function() {
          console.warn('图片加载失败:', paramId);
          resolve(); // 即使失败也继续
        };
        img.src = imageData[paramId];
      });
      loadPromises.push(promise);
    });

    // 等待所有图片加载完成后更新参数
    Promise.all(loadPromises).then(function() {
      Object.keys(loadedImages).forEach(function(paramId) {
        if (window.updateParam) {
          window.updateParam(paramId, loadedImages[paramId]);
        } else {
          console.error('[ImagePreload] window.updateParam 未定义，无法更新图片参数:', paramId);
        }
      });
      console.log('[ImagePreload] 图片预加载完成，共', Object.keys(loadedImages).length, '张');
    });
  }

  // 通过 __onThreeReady 确保在渲染器代码（window.updateParam）之后执行
  if (window.__onThreeReady) {
    window.__onThreeReady(preloadImages);
  } else {
    // 降级处理：如果 __onThreeReady 不存在，直接执行
    console.warn('[ImagePreload] __onThreeReady 不存在，直接执行预加载');
    preloadImages();
  }
})();
`.trim();
}

/**
 * 生成视频预加载代码 (019-video-input-support)
 * @param videoAssets 视频资源映射（paramId -> base64 data url）
 * @returns 视频预加载的 JavaScript 代码
 */
export function generateVideoPreloadCode(videoAssets: Record<string, string>): string {
  if (Object.keys(videoAssets).length === 0) {
    return '// 无视频资源需要预加载';
  }

  const videoEntries = Object.entries(videoAssets)
    .map(([paramId, dataUrl]) => `    '${paramId}': '${dataUrl}'`)
    .join(',\n');

  return `
// ============================================
// 视频资源预加载 (019-video-input-support)
// ============================================

(function() {
  // 视频预加载函数，在 window.updateParam 定义后调用
  function preloadVideos() {
    var videoData = {
${videoEntries}
  };

    var loadPromises = [];

    Object.keys(videoData).forEach(function(paramId) {
      var promise = new Promise(function(resolve) {
        var video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';

        video.onloadeddata = function() {
          if (window.updateParam) {
            window.updateParam(paramId, video);
          } else {
            console.error('[VideoPreload] window.updateParam 未定义，无法更新视频参数:', paramId);
          }
          resolve();
        };

        video.onerror = function() {
          console.warn('[VideoPreload] 视频加载失败:', paramId);
          resolve();
        };

        video.src = videoData[paramId];
      });
      loadPromises.push(promise);
    });

    Promise.all(loadPromises).then(function() {
      console.log('[VideoPreload] 所有视频资源加载完成，共', loadPromises.length, '个');
    });
  }

  // 通过 __onThreeReady 确保在渲染器代码（window.updateParam）之后执行
  if (window.__onThreeReady) {
    window.__onThreeReady(preloadVideos);
  } else {
    // 降级处理：如果 __onThreeReady 不存在，直接执行
    console.warn('[VideoPreload] __onThreeReady 不存在，直接执行预加载');
    preloadVideos();
  }
})();
`.trim();
}
