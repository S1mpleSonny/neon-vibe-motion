/**
 * HTML 生成器
 * 生成自包含的素材包 HTML 文件
 * @module services/assetPackExporter/htmlGenerator
 */

import type {
  MotionDefinition,
  AssetPackExportConfig,
  ExportableParameter,
  ParameterControlConfig,
  AssetPackMetadata,
  CanvasDimensions,
} from '../../types';
import { generateRendererCode, generateImagePreloadCode, generateVideoPreloadCode } from './codeInliner';
import { generateUtilsCode } from './utilsInliner';
import { generateParameterControlConfigs } from './parameterExtractor';
import { collectImageAssets } from './imageEncoder';
import { collectVideoAssets } from './videoEncoder';
import { generateThemeStyles } from './themeStyles';
import { generateControlBindings } from './controlBindings';
import { H264EncoderCodeGenerator } from './H264EncoderCodeGenerator';
import { generateInlinedH264Code } from './h264Inliner';
import { calculateExportDimensions } from '../../utils/coordinates';
import { generatePostProcessRuntimeCode, needsPostProcessRuntime } from './postProcessRuntime';

/**
 * HTML 模板占位符
 */
const PLACEHOLDERS = {
  TITLE: '{{TITLE}}',
  HEADER_TITLE: '{{HEADER_TITLE}}',
  STYLES: '{{STYLES}}',
  PARAMETER_PANEL: '{{PARAMETER_PANEL}}',
  EXPORT_TIME: '{{EXPORT_TIME}}',
  UTILS_CODE: '{{UTILS_CODE}}',
  IMAGE_PRELOAD_CODE: '{{IMAGE_PRELOAD_CODE}}',
  VIDEO_PRELOAD_CODE: '{{VIDEO_PRELOAD_CODE}}',
  RENDERER_CODE: '{{RENDERER_CODE}}',
  CONTROL_BINDINGS: '{{CONTROL_BINDINGS}}',
  POSTPROCESS_RUNTIME: '{{POSTPROCESS_RUNTIME}}',
  H264_CODE: '{{H264_CODE}}',
  MP4_EXPORTER: '{{MP4_EXPORTER}}',
} as const;

/**
 * 生成素材包 HTML 内容
 * @param motion 动效定义
 * @param config 导出配置
 * @param exportableParams 可导出参数列表
 * @param onProgress 进度回调
 * @returns 完整的 HTML 字符串
 */
export async function generateAssetPackHtml(
  motion: MotionDefinition,
  config: AssetPackExportConfig,
  exportableParams: ExportableParameter[],
  onProgress?: (progress: number) => void
): Promise<string> {
  onProgress?.(5);

  // 1. 收集图片资源并转换为 Base64
  const imageAssets = await collectImageAssets(exportableParams);
  onProgress?.(15);

  // 2. 收集视频资源并转换为 Base64
  const videoParams = exportableParams.map(ep => ep.parameter).filter(p => p.type === 'video');
  const videoAssetsResult = await collectVideoAssets(videoParams);
  const videoAssetsMap = Object.fromEntries(
    videoAssetsResult.assets.map(a => [a.paramId, a.base64Data])
  );
  onProgress?.(25);

  // 3. 生成参数控件配置
  const paramConfigs = generateParameterControlConfigs(exportableParams);
  onProgress?.(30);

  // 4. 计算导出尺寸（根据画面比例）
  let exportDimensions: CanvasDimensions | undefined;
  if (config.aspectRatio) {
    exportDimensions = calculateExportDimensions(config.aspectRatio, '1080p');
  }

  // 5. 生成各部分代码
  const utilsCode = generateUtilsCode();
  const imagePreloadCode = generateImagePreloadCode(imageAssets);
  const videoPreloadCode = generateVideoPreloadCode(videoAssetsMap);
  const rendererCode = generateRendererCode(motion, exportableParams, exportDimensions);
  onProgress?.(50);

  // 6. 生成样式
  const styles = generateThemeStyles();
  onProgress?.(60);

  // 7. 生成参数面板 HTML
  const parameterPanelHtml = generateParameterPanel(paramConfigs, config.showPanelTitle);
  onProgress?.(70);

  // 8. 生成控件绑定代码
  const controlBindings = generateControlBindings(paramConfigs);
  onProgress?.(75);

  // 9. 生成后处理运行时代码
  const postProcessRuntimeCode = needsPostProcessRuntime(motion)
    ? generatePostProcessRuntimeCode()
    : '// 无后处理';
  onProgress?.(76);

  // 10. 生成 MP4 导出代码
  const mp4ExporterCode = new H264EncoderCodeGenerator().generateMP4ExporterCode();
  onProgress?.(80);

  // 11. 生成内嵌 H264 编码器代码
  const h264Code = await generateInlinedH264Code();
  onProgress?.(92);

  // 12. 生成元信息
  const metadata: AssetPackMetadata = {
    exportedAt: Date.now(),
    exportedFrom: 'Neon Motion Platform',
    version: '1.0.0',
  };

  // 13. 组装 HTML
  const template = getHtmlTemplate();
  const title = config.customTitle || config.filename || 'Motion Preview';
  const exportTime = formatExportTime(metadata.exportedAt);

  // 使用函数形式的 replace 避免特殊字符 ($&, $`, $' 等) 被解释
  const safeReplace = (str: string, search: string, replacement: string): string => {
    return str.replace(search, () => replacement ?? '');
  };

  let html = template;
  html = safeReplace(html, PLACEHOLDERS.TITLE, escapeHtml(title));
  html = safeReplace(html, PLACEHOLDERS.HEADER_TITLE, config.showPanelTitle ? escapeHtml(title) : '');
  html = safeReplace(html, PLACEHOLDERS.STYLES, styles);
  html = safeReplace(html, PLACEHOLDERS.PARAMETER_PANEL, parameterPanelHtml);
  html = safeReplace(html, PLACEHOLDERS.EXPORT_TIME, exportTime);
  html = safeReplace(html, PLACEHOLDERS.UTILS_CODE, utilsCode);
  html = safeReplace(html, PLACEHOLDERS.IMAGE_PRELOAD_CODE, imagePreloadCode);
  html = safeReplace(html, PLACEHOLDERS.VIDEO_PRELOAD_CODE, videoPreloadCode);
  html = safeReplace(html, PLACEHOLDERS.RENDERER_CODE, rendererCode);
  html = safeReplace(html, PLACEHOLDERS.CONTROL_BINDINGS, controlBindings);
  html = safeReplace(html, PLACEHOLDERS.POSTPROCESS_RUNTIME, postProcessRuntimeCode);
  html = safeReplace(html, PLACEHOLDERS.H264_CODE, h264Code);
  html = safeReplace(html, PLACEHOLDERS.MP4_EXPORTER, mp4ExporterCode);

  onProgress?.(100);

  return html;
}

/**
 * 生成参数面板 HTML
 */
function generateParameterPanel(
  paramConfigs: ParameterControlConfig[],
  showTitle: boolean
): string {
  if (paramConfigs.length === 0) {
    return '<!-- 无可调参数 -->';
  }

  const controlsHtml = paramConfigs.map((config) => generateControlHtml(config)).join('\n');

  return `
      <aside class="parameter-panel">
        ${showTitle ? '<h2 class="panel-title">参数调整</h2>' : ''}
        <div class="parameter-list">
          ${controlsHtml}
        </div>
      </aside>
  `;
}

/**
 * 生成单个控件的 HTML
 */
function generateControlHtml(config: ParameterControlConfig): string {
  const labelHtml = `<label class="param-label" for="param-${config.id}">${escapeHtml(config.label)}</label>`;

  switch (config.controlType) {
    case 'slider':
      return generateSliderControlHtml(config, labelHtml);
    case 'color':
      return generateColorControlHtml(config, labelHtml);
    case 'toggle':
      return generateToggleControlHtml(config, labelHtml);
    case 'select':
      return generateSelectControlHtml(config, labelHtml);
    case 'image':
      return generateImageControlHtml(config, labelHtml);
    case 'video':
      return generateVideoControlHtml(config, labelHtml);
    case 'text':
      return generateTextControlHtml(config, labelHtml);
    default:
      return '';
  }
}

/**
 * 生成滑块控件 HTML
 */
function generateSliderControlHtml(config: ParameterControlConfig, labelHtml: string): string {
  const { min = 0, max = 100, step = 1, unit = '' } = config.numberConfig || {};
  const value = config.initialValue as number;

  return `
          <div class="param-control param-slider">
            ${labelHtml}
            <div class="slider-container">
              <input
                type="range"
                id="param-${config.id}"
                data-param-id="${config.id}"
                min="${min}"
                max="${max}"
                step="${step}"
                value="${value}"
                class="slider-input"
              />
              <span class="slider-value" id="value-${config.id}">${value}${unit}</span>
            </div>
          </div>
  `;
}

/**
 * 生成颜色控件 HTML
 */
function generateColorControlHtml(config: ParameterControlConfig, labelHtml: string): string {
  const value = config.initialValue as string;

  return `
          <div class="param-control param-color">
            ${labelHtml}
            <div class="color-container">
              <input
                type="color"
                id="param-${config.id}"
                data-param-id="${config.id}"
                value="${value}"
                class="color-input"
              />
              <span class="color-value" id="value-${config.id}">${value}</span>
            </div>
          </div>
  `;
}

/**
 * 生成开关控件 HTML
 */
function generateToggleControlHtml(config: ParameterControlConfig, labelHtml: string): string {
  const value = config.initialValue as boolean;

  return `
          <div class="param-control param-toggle">
            ${labelHtml}
            <label class="toggle-switch">
              <input
                type="checkbox"
                id="param-${config.id}"
                data-param-id="${config.id}"
                ${value ? 'checked' : ''}
                class="toggle-input"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
  `;
}

/**
 * 生成下拉选择控件 HTML
 */
function generateSelectControlHtml(config: ParameterControlConfig, labelHtml: string): string {
  const value = config.initialValue as string;
  const options = config.selectConfig?.options || [];

  const optionsHtml = options
    .map((opt) => `<option value="${escapeHtml(opt.value)}" ${opt.value === value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`)
    .join('\n');

  return `
          <div class="param-control param-select">
            ${labelHtml}
            <select
              id="param-${config.id}"
              data-param-id="${config.id}"
              class="select-input"
            >
              ${optionsHtml}
            </select>
          </div>
  `;
}

/**
 * 生成图片控件 HTML
 */
function generateImageControlHtml(config: ParameterControlConfig, labelHtml: string): string {
  // 初始值可能是 Base64 data URL 或空字符串
  const initialSrc = config.initialValue as string;
  const hasInitialImage = initialSrc && initialSrc.startsWith('data:');

  return `
          <div class="param-control param-image">
            ${labelHtml}
            <div class="image-upload-container">
              <label class="image-preview-wrapper">
                <input
                  type="file"
                  id="param-${config.id}"
                  data-param-id="${config.id}"
                  accept="image/png,image/jpeg"
                  class="image-input"
                />
                <img
                  id="preview-${config.id}"
                  class="image-preview"
                  src="${hasInitialImage ? initialSrc : ''}"
                  style="display: ${hasInitialImage ? 'block' : 'none'};"
                  alt="预览"
                />
                <div class="image-placeholder" id="placeholder-${config.id}" style="display: ${hasInitialImage ? 'none' : 'flex'};">
                  <span class="placeholder-icon">🖼️</span>
                  <span class="placeholder-text">点击上传图片</span>
                </div>
              </label>
              <span class="image-filename" id="filename-${config.id}"></span>
            </div>
          </div>
  `;
}

/**
 * 生成视频控件 HTML (019-video-input-support)
 */
function generateVideoControlHtml(config: ParameterControlConfig, labelHtml: string): string {
  // 初始值可能是 Base64 data URL 或空字符串
  const initialSrc = config.initialValue as string;
  const hasInitialVideo = initialSrc && initialSrc.startsWith('data:');

  return `
          <div class="param-control param-video">
            ${labelHtml}
            <div class="video-upload-container">
              <label class="video-preview-wrapper">
                <input
                  type="file"
                  id="param-${config.id}"
                  data-param-id="${config.id}"
                  accept="video/mp4,video/webm"
                  class="video-input"
                />
                <video
                  id="preview-${config.id}"
                  class="video-preview"
                  muted
                  loop
                  playsinline
                  src="${hasInitialVideo ? initialSrc : ''}"
                  style="display: ${hasInitialVideo ? 'block' : 'none'};"
                ></video>
                <div class="video-placeholder" id="placeholder-${config.id}" style="display: ${hasInitialVideo ? 'none' : 'flex'};">
                  <span class="placeholder-icon">🎬</span>
                  <span class="placeholder-text">点击上传视频</span>
                </div>
              </label>
              <span class="video-filename" id="filename-${config.id}"></span>
              <span class="video-duration" id="duration-${config.id}"></span>
            </div>
          </div>
  `;
}

/**
 * 生成文本输入控件 HTML (028-string-param)
 */
function generateTextControlHtml(config: ParameterControlConfig, labelHtml: string): string {
  const value = config.initialValue as string;

  return `
          <div class="param-control param-text">
            ${labelHtml}
            <div class="text-container">
              <input
                type="text"
                id="param-${config.id}"
                data-param-id="${config.id}"
                value="${escapeHtml(value)}"
                class="text-input"
                placeholder=""
              />
            </div>
          </div>
  `;
}

/**
 * 获取 HTML 模板
 */
function getHtmlTemplate(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${PLACEHOLDERS.TITLE}</title>
  <style>
    ${PLACEHOLDERS.STYLES}
  </style>
</head>
<body>
  <div class="app-container">
    <!-- 头部区域 -->
    <header class="app-header">
      <h1 class="app-title">${PLACEHOLDERS.HEADER_TITLE}</h1>
      <div class="header-controls">
        <button id="play-btn" class="control-btn" title="播放/暂停">
          <svg class="icon icon-play" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg class="icon icon-pause" viewBox="0 0 24 24" fill="currentColor" style="display:none;">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>
        <button id="stop-btn" class="control-btn" title="停止">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z"/>
          </svg>
        </button>
        <div class="header-divider"></div>
        <div class="export-group">
          <button id="export-btn" class="export-btn" title="导出动画">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>导出 MP4</span>
          </button>
        </div>
        <span id="export-status" class="export-status"></span>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- Canvas 预览区 -->
      <div class="preview-area">
        <!-- T011-T013: 背景图容器 (033-preview-background) -->
        <div class="background-container" id="background-container" style="background-image: none; background-size: cover; background-position: center; background-repeat: no-repeat;">
          <div class="canvas-container" id="canvas-container">
            <canvas id="motion-canvas"></canvas>
          </div>
        </div>
        <!-- T011: 背景图上传按钮 (033-preview-background) -->
        <div class="background-controls">
          <input type="file" id="background-input" accept="image/png,image/jpeg,image/webp" style="display: none;" />
          <button id="upload-background-btn" class="background-btn" title="上传预览背景图">上传背景图</button>
          <button id="clear-background-btn" class="background-btn" style="display: none;" title="清除背景图">清除背景</button>
          <span class="background-hint">背景图仅预览使用，不参与导出</span>
        </div>
      </div>

      <!-- 参数面板 -->
      ${PLACEHOLDERS.PARAMETER_PANEL}
    </main>

    <!-- 页脚 -->
    <footer class="app-footer">
      <p class="footer-text">
        导出自 <strong>Neon Motion Platform</strong> · ${PLACEHOLDERS.EXPORT_TIME}
      </p>
    </footer>
  </div>

  <!-- 工具函数 -->
  <script>
    ${PLACEHOLDERS.UTILS_CODE}
  </script>

  <!-- 后处理运行时 -->
  <script>
    ${PLACEHOLDERS.POSTPROCESS_RUNTIME}
  </script>

  <!-- 渲染器代码 -->
  <script>
    ${PLACEHOLDERS.RENDERER_CODE}
  </script>

  <!-- 视频资源预加载 -->
  <script>
    ${PLACEHOLDERS.VIDEO_PRELOAD_CODE}
  </script>

  <!-- 图片预加载 -->
  <script>
    ${PLACEHOLDERS.IMAGE_PRELOAD_CODE}
  </script>

  <!-- 控件绑定代码 -->
  <script>
    ${PLACEHOLDERS.CONTROL_BINDINGS}
  </script>

  <!-- H264 MP4 编码器（内嵌） -->
  <script>
    ${PLACEHOLDERS.H264_CODE}
  </script>

  <!-- MP4 导出功能 -->
  <script>
    ${PLACEHOLDERS.MP4_EXPORTER}
  </script>

  <!-- 导出按钮绑定 -->
  <script>
    (function() {
      var exportBtn = document.getElementById('export-btn');
      if (!exportBtn) return;
      exportBtn.addEventListener('click', function() {
        if (typeof window.__exportMP4Video === 'function') {
          window.__exportMP4Video();
        }
      });
    })();
  </script>

  <!-- 播放控制绑定 -->
  <script>
    (function() {
      var playBtn = document.getElementById('play-btn');
      var stopBtn = document.getElementById('stop-btn');
      var iconPlay = playBtn.querySelector('.icon-play');
      var iconPause = playBtn.querySelector('.icon-pause');

      function updatePlayIcon(isPlaying) {
        iconPlay.style.display = isPlaying ? 'none' : 'block';
        iconPause.style.display = isPlaying ? 'block' : 'none';
      }

      playBtn.addEventListener('click', function() {
        if (window.motionControls.isPlaying()) {
          window.motionControls.pause();
          updatePlayIcon(false);
        } else {
          window.motionControls.play();
          updatePlayIcon(true);
        }
      });

      stopBtn.addEventListener('click', function() {
        window.motionControls.stop();
        updatePlayIcon(false);
      });

      // 初始状态
      updatePlayIcon(true);
    })();
  </script>

  <!-- T012-T014: 背景图上传逻辑 (033-preview-background) -->
  <script>
    (function() {
      'use strict';

      var backgroundContainer = document.getElementById('background-container');
      var canvasContainer = document.getElementById('canvas-container');
      var backgroundInput = document.getElementById('background-input');
      var uploadBtn = document.getElementById('upload-background-btn');
      var clearBtn = document.getElementById('clear-background-btn');
      var currentBackgroundUrl = null;

      if (!backgroundContainer || !canvasContainer || !backgroundInput || !uploadBtn || !clearBtn) {
        console.warn('[Background] 背景图控件元素未找到');
        return;
      }

      // 保存 canvas-container 的原始背景
      var originalCanvasBg = window.getComputedStyle(canvasContainer).background;

      // T012: 上传按钮点击触发 file input
      uploadBtn.addEventListener('click', function() {
        backgroundInput.click();
      });

      // T012: 文件选择处理
      backgroundInput.addEventListener('change', function(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;

        // 文件类型校验（PNG/JPG/WebP）
        var validTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (validTypes.indexOf(file.type) === -1) {
          alert('仅支持 PNG、JPG、WebP 格式的图片');
          backgroundInput.value = '';
          return;
        }

        // 大文件警告（>10MB）
        if (file.size > 10 * 1024 * 1024) {
          console.warn('[Background] 背景图较大，建议使用小于 10MB 的图片');
        }

        // 释放旧的 Blob URL
        if (currentBackgroundUrl) {
          URL.revokeObjectURL(currentBackgroundUrl);
        }

        // T013: 创建 Blob URL 并应用 CSS 背景图样式
        currentBackgroundUrl = URL.createObjectURL(file);
        backgroundContainer.style.backgroundImage = 'url("' + currentBackgroundUrl + '")';

        // 将 canvas-container 背景设为透明，让背景图可见
        canvasContainer.style.background = 'transparent';

        // 显示清除按钮
        clearBtn.style.display = 'inline-block';

        // 重置 input 以支持再次选择同一文件
        backgroundInput.value = '';

        console.log('[Background] 背景图已设置');
      });

      // T014: 清除背景图
      clearBtn.addEventListener('click', function() {
        // 释放 Blob URL
        if (currentBackgroundUrl) {
          URL.revokeObjectURL(currentBackgroundUrl);
          currentBackgroundUrl = null;
        }

        // 清除 CSS 背景图
        backgroundContainer.style.backgroundImage = 'none';

        // 恢复 canvas-container 原始背景
        canvasContainer.style.background = originalCanvasBg;

        // 隐藏清除按钮
        clearBtn.style.display = 'none';

        console.log('[Background] 背景图已清除');
      });
    })();
  </script>

  <!-- 浏览器兼容性检测 -->
  <script>
    (function() {
      var warnings = [];

      // 检查 Canvas 支持
      var testCanvas = document.createElement('canvas');
      if (!testCanvas.getContext || !testCanvas.getContext('2d')) {
        warnings.push('您的浏览器不支持 Canvas，动效可能无法正常显示');
      }

      // 检查 requestAnimationFrame 支持
      if (!window.requestAnimationFrame) {
        warnings.push('您的浏览器不支持流畅动画，建议升级浏览器');
      }

      // 显示警告
      if (warnings.length > 0) {
        var warningDiv = document.createElement('div');
        warningDiv.className = 'compat-warning show';
        warningDiv.textContent = warnings.join(' | ');
        document.body.insertBefore(warningDiv, document.body.firstChild);
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * HTML 转义
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * 格式化导出时间
 */
function formatExportTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
