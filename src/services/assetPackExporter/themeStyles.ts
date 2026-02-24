/**
 * 科技风格样式生成器
 * 生成导出 HTML 的科技风格 CSS
 * @module services/assetPackExporter/themeStyles
 */

/**
 * 科技风格颜色配置
 */
export const TECH_THEME = {
  // 背景色
  background: '#0a0a0f',
  backgroundSecondary: '#12121a',

  // 面板
  panelBackground: 'rgba(20, 20, 30, 0.85)',
  panelBorder: 'rgba(0, 212, 255, 0.3)',

  // 主色调
  primary: '#00d4ff',
  primaryHover: '#00e5ff',
  primaryGlow: 'rgba(0, 212, 255, 0.4)',

  // 辅助色
  accent: '#ff00ff',
  accentGlow: 'rgba(255, 0, 255, 0.3)',

  // 文字
  textPrimary: '#e0e0e0',
  textSecondary: '#a0a0a0',
  textMuted: '#606060',

  // 边框和阴影
  borderRadius: '8px',
  shadow: '0 0 20px rgba(0, 212, 255, 0.2)',
  glassBlur: '10px',
} as const;

/**
 * 生成科技风格的 CSS 样式
 * @returns CSS 样式字符串
 */
export function generateThemeStyles(): string {
  return `
/* ============================================ */
/* 科技风格主题 - Neon Motion Platform */
/* ============================================ */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: ${TECH_THEME.background};
  color: ${TECH_THEME.textPrimary};
  min-height: 100vh;
  overflow-x: hidden;
}

/* 应用容器 */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 头部 */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: ${TECH_THEME.panelBackground};
  backdrop-filter: blur(${TECH_THEME.glassBlur});
  border-bottom: 1px solid ${TECH_THEME.panelBorder};
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: ${TECH_THEME.primary};
  text-shadow: 0 0 10px ${TECH_THEME.primaryGlow};
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-divider {
  width: 1px;
  height: 24px;
  background: ${TECH_THEME.panelBorder};
  margin: 0 8px;
}

.control-btn {
  width: 40px;
  height: 40px;
  border: 1px solid ${TECH_THEME.panelBorder};
  border-radius: ${TECH_THEME.borderRadius};
  background: ${TECH_THEME.backgroundSecondary};
  color: ${TECH_THEME.primary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(0, 212, 255, 0.1);
  border-color: ${TECH_THEME.primary};
  box-shadow: ${TECH_THEME.shadow};
}

.control-btn .icon {
  width: 20px;
  height: 20px;
}

/* 导出组 */
.export-group {
  display: flex;
  align-items: center;
  gap: 0;
}

/* 导出按钮 */
.export-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid ${TECH_THEME.panelBorder};
  border-radius: ${TECH_THEME.borderRadius};
  background: ${TECH_THEME.backgroundSecondary};
  color: ${TECH_THEME.primary};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.export-btn:hover:not(:disabled) {
  background: rgba(0, 212, 255, 0.1);
  border-color: ${TECH_THEME.primary};
  box-shadow: ${TECH_THEME.shadow};
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-btn .icon {
  width: 18px;
  height: 18px;
}

.export-btn .icon.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.export-status {
  font-size: 12px;
  color: ${TECH_THEME.primary};
  margin-left: 8px;
  display: none;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  padding: 24px;
  gap: 24px;
}

/* Canvas 预览区 */
.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

/* T011-T013: 背景图容器 (033-preview-background) */
.background-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${TECH_THEME.borderRadius};
  overflow: hidden;
}

/* T011: 背景图控制按钮 (033-preview-background) */
.background-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.background-btn {
  padding: 6px 12px;
  font-size: 12px;
  color: ${TECH_THEME.textSecondary};
  background: ${TECH_THEME.backgroundSecondary};
  border: 1px solid ${TECH_THEME.panelBorder};
  border-radius: ${TECH_THEME.borderRadius};
  cursor: pointer;
  transition: all 0.2s ease;
}

.background-btn:hover {
  color: ${TECH_THEME.primary};
  border-color: ${TECH_THEME.primary};
  box-shadow: 0 0 8px ${TECH_THEME.primaryGlow};
}

.background-hint {
  font-size: 11px;
  color: ${TECH_THEME.textMuted};
}

.canvas-container {
  position: relative;
  background: ${TECH_THEME.backgroundSecondary};
  border: 1px solid ${TECH_THEME.panelBorder};
  border-radius: ${TECH_THEME.borderRadius};
  overflow: hidden;
  box-shadow: ${TECH_THEME.shadow};
  display: inline-block;
  max-width: min(100%, 1200px);
  max-height: min(80vh, 750px);
}

.canvas-container canvas {
  display: block;
  max-width: 100%;
  max-height: min(80vh, 750px);
  width: auto;
  height: auto;
}

/* 参数面板 */
.parameter-panel {
  width: 320px;
  background: ${TECH_THEME.panelBackground};
  backdrop-filter: blur(${TECH_THEME.glassBlur});
  border: 1px solid ${TECH_THEME.panelBorder};
  border-radius: ${TECH_THEME.borderRadius};
  padding: 20px;
  overflow-y: auto;
  max-height: calc(100vh - 180px);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: ${TECH_THEME.primary};
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${TECH_THEME.panelBorder};
  text-shadow: 0 0 8px ${TECH_THEME.primaryGlow};
}

.parameter-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 参数控件通用样式 */
.param-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-label {
  font-size: 13px;
  color: ${TECH_THEME.textSecondary};
  font-weight: 500;
}

/* 滑块控件 */
.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-input {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: ${TECH_THEME.backgroundSecondary};
  border-radius: 3px;
  outline: none;
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${TECH_THEME.primary};
  cursor: pointer;
  box-shadow: 0 0 8px ${TECH_THEME.primaryGlow};
  transition: all 0.2s ease;
}

.slider-input::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 12px ${TECH_THEME.primaryGlow};
}

.slider-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: ${TECH_THEME.primary};
  cursor: pointer;
  box-shadow: 0 0 8px ${TECH_THEME.primaryGlow};
}

.slider-value {
  font-size: 12px;
  color: ${TECH_THEME.primary};
  min-width: 50px;
  text-align: right;
  font-family: 'SF Mono', Monaco, monospace;
}

/* 颜色控件 */
.color-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-input {
  width: 48px;
  height: 32px;
  border: 1px solid ${TECH_THEME.panelBorder};
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  padding: 2px;
}

.color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-input::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}

.color-value {
  font-size: 12px;
  color: ${TECH_THEME.textSecondary};
  font-family: 'SF Mono', Monaco, monospace;
}

/* 开关控件 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${TECH_THEME.backgroundSecondary};
  border: 1px solid ${TECH_THEME.panelBorder};
  border-radius: 26px;
  transition: all 0.3s ease;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background: ${TECH_THEME.textMuted};
  border-radius: 50%;
  transition: all 0.3s ease;
}

.toggle-input:checked + .toggle-slider {
  background: rgba(0, 212, 255, 0.2);
  border-color: ${TECH_THEME.primary};
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(22px);
  background: ${TECH_THEME.primary};
  box-shadow: 0 0 8px ${TECH_THEME.primaryGlow};
}

/* 下拉选择控件 */
.select-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  color: ${TECH_THEME.textPrimary};
  background: ${TECH_THEME.backgroundSecondary};
  border: 1px solid ${TECH_THEME.panelBorder};
  border-radius: ${TECH_THEME.borderRadius};
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2300d4ff' d='M2 4l4 4 4-4z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.select-input:hover {
  border-color: ${TECH_THEME.primary};
}

.select-input:focus {
  border-color: ${TECH_THEME.primary};
  box-shadow: 0 0 0 2px ${TECH_THEME.primaryGlow};
}

.select-input option {
  background: ${TECH_THEME.background};
  color: ${TECH_THEME.textPrimary};
}

/* 文本输入控件 (028-string-param) */
.param-text {
  margin-bottom: 4px;
}

.text-container {
  display: flex;
  align-items: center;
}

.text-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  color: ${TECH_THEME.textPrimary};
  background: ${TECH_THEME.backgroundSecondary};
  border: 1px solid ${TECH_THEME.panelBorder};
  border-radius: ${TECH_THEME.borderRadius};
  outline: none;
  transition: all 0.2s ease;
}

.text-input:hover {
  border-color: ${TECH_THEME.primary};
}

.text-input:focus {
  border-color: ${TECH_THEME.primary};
  box-shadow: 0 0 0 2px ${TECH_THEME.primaryGlow};
}

.text-input::placeholder {
  color: ${TECH_THEME.textMuted};
}

/* 图片上传控件 */
.param-image {
  margin-bottom: 8px;
}

.image-upload-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-preview-wrapper {
  display: block;
  position: relative;
  width: 100%;
  height: 120px;
  background: ${TECH_THEME.backgroundSecondary};
  border: 1px dashed ${TECH_THEME.panelBorder};
  border-radius: ${TECH_THEME.borderRadius};
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.image-preview-wrapper:hover {
  border-color: ${TECH_THEME.primary};
  box-shadow: 0 0 8px ${TECH_THEME.primaryGlow};
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: ${TECH_THEME.textMuted};
}

.placeholder-icon {
  font-size: 32px;
  opacity: 0.5;
}

.placeholder-text {
  font-size: 12px;
}

.image-input {
  display: none;
}

.image-filename {
  font-size: 11px;
  color: ${TECH_THEME.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 视频上传控件 (019-video-input-support) */
.param-video {
  margin-bottom: 8px;
}

.video-upload-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.video-preview-wrapper {
  display: block;
  position: relative;
  width: 100%;
  height: 120px;
  background: ${TECH_THEME.backgroundSecondary};
  border: 1px dashed ${TECH_THEME.panelBorder};
  border-radius: ${TECH_THEME.borderRadius};
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.video-preview-wrapper:hover {
  border-color: ${TECH_THEME.primary};
  box-shadow: 0 0 8px ${TECH_THEME.primaryGlow};
}

.video-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: ${TECH_THEME.textMuted};
  background: ${TECH_THEME.backgroundSecondary};
}

.video-input {
  display: none;
}

.video-filename {
  font-size: 11px;
  color: ${TECH_THEME.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-duration {
  font-size: 11px;
  color: ${TECH_THEME.primary};
  font-family: 'SF Mono', Monaco, monospace;
}

/* T040: 序列帧上传控件 (029-sequence-frame-input) */
.param-sequence {
  margin-bottom: 8px;
}

.sequence-upload-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sequence-preview-wrapper {
  display: block;
  position: relative;
  width: 100%;
  height: 120px;
  background: ${TECH_THEME.backgroundSecondary};
  border: 1px dashed ${TECH_THEME.panelBorder};
  border-radius: ${TECH_THEME.borderRadius};
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sequence-preview-wrapper:hover {
  border-color: ${TECH_THEME.primary};
  box-shadow: 0 0 8px ${TECH_THEME.primaryGlow};
}

.sequence-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.sequence-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: ${TECH_THEME.textMuted};
  background: ${TECH_THEME.backgroundSecondary};
}

.sequence-input {
  display: none;
}

.sequence-info {
  font-size: 11px;
  color: ${TECH_THEME.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 页脚 */
.app-footer {
  padding: 16px 24px;
  background: ${TECH_THEME.panelBackground};
  backdrop-filter: blur(${TECH_THEME.glassBlur});
  border-top: 1px solid ${TECH_THEME.panelBorder};
  text-align: center;
}

.footer-text {
  font-size: 12px;
  color: ${TECH_THEME.textMuted};
}

.footer-text strong {
  color: ${TECH_THEME.primary};
}

/* 响应式布局 */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
    padding: 16px;
  }

  .parameter-panel {
    width: 100%;
    max-height: 300px;
  }

  .canvas-container {
    width: 100%;
  }

  .canvas-container canvas {
    max-width: 100%;
    max-height: 40vh;
  }
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: ${TECH_THEME.background};
}

::-webkit-scrollbar-thumb {
  background: ${TECH_THEME.panelBorder};
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: ${TECH_THEME.primary};
}

/* 无参数时的提示样式 */
.no-params-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  text-align: center;
}

.no-params-notice .notice-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-params-notice .notice-text {
  color: ${TECH_THEME.textMuted};
  font-size: 14px;
}

/* 浏览器兼容性警告 */
.compat-warning {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 12px 20px;
  background: rgba(255, 152, 0, 0.9);
  color: #000;
  text-align: center;
  font-size: 14px;
  z-index: 1000;
  display: none;
}

.compat-warning.show {
  display: block;
}
`.trim();
}

/**
 * 获取最小化版本的样式（用于减小文件大小）
 * @returns 压缩后的 CSS
 */
export function generateMinifiedThemeStyles(): string {
  // 基础压缩：移除注释和多余空白
  return generateThemeStyles()
    .replace(/\/\*[\s\S]*?\*\//g, '') // 移除注释
    .replace(/\s+/g, ' ') // 压缩空白
    .replace(/\s*([{:;,}])\s*/g, '$1') // 移除选择器周围空白
    .replace(/;}/g, '}') // 移除最后的分号
    .trim();
}
