/**
 * 素材包导出服务主入口
 * @module services/assetPackExporter
 */

import type {
  MotionDefinition,
  AssetPackExportConfig,
  ExportableParameter,
  IAssetPackExporter,
} from '../../types';

import {
  extractExportableParameters,
  updateParameterSelection,
} from './parameterExtractor';

import { generateAssetPackHtml } from './htmlGenerator';
import { collectImageAssets, estimateImageAssetsSize } from './imageEncoder';
import { collectVideoAssets } from './videoEncoder';

export {
  extractExportableParameters,
  updateParameterSelection,
  selectAllParameters,
  deselectAllParameters,
  toggleParameter,
  getSelectedParameterIds,
} from './parameterExtractor';

export { generateAssetPackHtml } from './htmlGenerator';
export { generateThemeStyles } from './themeStyles';
export { generateControlBindings } from './controlBindings';
export { generateUtilsCode } from './utilsInliner';
export { generateRendererCode, generateImagePreloadCode, generateVideoPreloadCode } from './codeInliner';
export { collectVideoAssets, estimateVideoAssetsSize } from './videoEncoder';

// 核心渲染器代码生成器 (023-unified-renderer)
export {
  CoreRendererCodeGenerator,
  createCoreRendererCodeGenerator,
  coreRendererCodeGenerator,
  type CodeGeneratorConfig,
  type GeneratedCodeSegments,
} from './CoreRendererCodeGenerator';

// H264 编码器代码生成器 (023-unified-renderer)
export {
  H264EncoderCodeGenerator,
  createH264EncoderCodeGenerator,
  h264EncoderCodeGenerator,
  type EncoderConfig,
} from './H264EncoderCodeGenerator';

/**
 * 素材包导出服务实现
 */
class AssetPackExporter implements IAssetPackExporter {
  /**
   * 准备导出，返回可导出参数列表
   */
  prepareExport(motion: MotionDefinition): ExportableParameter[] {
    return extractExportableParameters(motion);
  }

  /**
   * 生成素材包 HTML 内容
   */
  async generateHtml(
    motion: MotionDefinition,
    config: AssetPackExportConfig,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // 提取所有可导出参数
    const allParams = extractExportableParameters(motion);

    // 根据配置更新选中状态
    const exportableParams = updateParameterSelection(allParams, config.selectedParameterIds);

    // 生成 HTML
    return generateAssetPackHtml(motion, config, exportableParams, onProgress);
  }

  /**
   * 下载生成的 HTML 文件
   */
  downloadHtml(htmlContent: string, filename: string): void {
    // 确保文件名以 .html 结尾
    const finalFilename = filename.endsWith('.html') ? filename : `${filename}.html`;

    // 创建 Blob
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;

    // 触发下载
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 估算导出文件大小
   */
  estimateFileSize(motion: MotionDefinition, config: AssetPackExportConfig): number {
    const allParams = extractExportableParameters(motion);
    const exportableParams = updateParameterSelection(allParams, config.selectedParameterIds);

    // 基础 HTML 模板大小估算（约 10KB）
    let estimatedSize = 10 * 1024;

    // 样式代码大小估算（约 5KB）
    estimatedSize += 5 * 1024;

    // 工具函数代码大小估算（约 2KB）
    estimatedSize += 2 * 1024;

    // 渲染器代码大小
    estimatedSize += motion.code.length;

    // 控件绑定代码大小估算（每个参数约 500 字节）
    const selectedParamCount = exportableParams.filter((p) => p.selected).length;
    estimatedSize += selectedParamCount * 500;

    // 图片资源大小需要异步计算，这里做粗略估算
    // 假设平均每张图片 50KB（Base64 后约 67KB）
    const imageParamCount = exportableParams.filter((p) => p.parameter.type === 'image').length;
    estimatedSize += imageParamCount * 67 * 1024;

    return estimatedSize;
  }

  /**
   * 异步估算导出文件大小（更精确，包含实际图片大小）
   */
  async estimateFileSizeAsync(
    motion: MotionDefinition,
    config: AssetPackExportConfig
  ): Promise<number> {
    const allParams = extractExportableParameters(motion);
    const exportableParams = updateParameterSelection(allParams, config.selectedParameterIds);

    // 基础大小估算
    let estimatedSize = 10 * 1024 + 5 * 1024 + 2 * 1024 + motion.code.length;

    // 控件绑定代码
    const selectedParamCount = exportableParams.filter((p) => p.selected).length;
    estimatedSize += selectedParamCount * 500;

    // 实际图片资源大小
    try {
      const imageAssets = await collectImageAssets(exportableParams);
      estimatedSize += estimateImageAssetsSize(imageAssets);
    } catch {
      // 如果图片收集失败，使用粗略估算
      const imageParamCount = exportableParams.filter((p) => p.parameter.type === 'image').length;
      estimatedSize += imageParamCount * 67 * 1024;
    }

    // 040-fix-html-export-assets: 视频资源大小估算
    try {
      const videoParams = exportableParams.map((ep) => ep.parameter);
      const videoAssetsResult = await collectVideoAssets(videoParams);
      estimatedSize += videoAssetsResult.totalSize;

      // 资源大小警告阈值检查
      for (const asset of videoAssetsResult.assets) {
        if (asset.originalSize > 50 * 1024 * 1024) {
          console.warn(`[AssetPackExporter] 视频 ${asset.paramId} 超过 50MB，导出文件将较大`);
        }
      }
      if (videoAssetsResult.totalSize > 200 * 1024 * 1024) {
        console.warn('[AssetPackExporter] 总视频大小超过 200MB，导出可能较慢');
      }

      // 记录收集错误
      for (const error of videoAssetsResult.errors) {
        console.warn(`[AssetPackExporter] 视频资源收集失败: ${error.paramId} - ${error.message}`);
      }
    } catch {
      // 如果视频收集失败，使用粗略估算
      const videoParamCount = exportableParams.filter((p) => p.parameter.type === 'video').length;
      estimatedSize += videoParamCount * 50 * 1024 * 1024; // 假设 50MB/视频
    }

    return estimatedSize;
  }
}

/**
 * 导出服务单例
 */
export const assetPackExporter = new AssetPackExporter();

/**
 * 默认导出
 */
export default assetPackExporter;

/**
 * 格式化文件大小为人类可读格式
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
