/**
 * 导出素材包对话框组件
 * 提供参数选择、文件名配置和导出功能
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../common/Button';
import { ParameterSelector } from './ParameterSelector';
import {
  assetPackExporter,
  extractExportableParameters,
  toggleParameter,
  selectAllParameters,
  deselectAllParameters,
  getSelectedParameterIds,
  formatFileSize,
} from '../../services/assetPackExporter';
import type { ExportableParameter, AssetPackExportConfig } from '../../types';

// 霓虹风格导出素材包对话框 - 确保高对比度
export const ExportAssetPackDialog: React.FC = () => {
  const { t } = useTranslation();
  // Store state
  const {
    isAssetPackExportDialogOpen,
    assetPackExportState,
    currentMotion,
    aspectRatio,
    closeAssetPackExportDialog,
    setAssetPackExportState,
  } = useAppStore();

  // Local state
  const [exportableParams, setExportableParams] = useState<ExportableParameter[]>([]);
  const [filename, setFilename] = useState('motion-preview');
  const [showPanelTitle, setShowPanelTitle] = useState(true);
  const [customTitle, setCustomTitle] = useState('');
  const [estimatedSize, setEstimatedSize] = useState<number>(0);

  // 初始化参数列表
  useEffect(() => {
    if (isAssetPackExportDialogOpen && currentMotion) {
      const params = extractExportableParameters(currentMotion);
      setExportableParams(params);
      setFilename(currentMotion.id || 'motion-preview');
      setCustomTitle('');
      // 文件大小估算在第二个 useEffect 中更新
    }
  }, [isAssetPackExportDialogOpen, currentMotion]);

  // 更新文件大小估算
  useEffect(() => {
    if (currentMotion && exportableParams.length > 0) {
      const config: AssetPackExportConfig = {
        filename,
        selectedParameterIds: getSelectedParameterIds(exportableParams),
        showPanelTitle,
        customTitle: customTitle || undefined,
        aspectRatio,
      };
      setEstimatedSize(assetPackExporter.estimateFileSize(currentMotion, config));
    }
  }, [exportableParams, filename, showPanelTitle, customTitle, currentMotion, aspectRatio]);

  // 参数选中状态切换
  const handleToggleParameter = useCallback((parameterId: string) => {
    setExportableParams((prev) => toggleParameter(prev, parameterId));
  }, []);

  // 全选
  const handleSelectAll = useCallback(() => {
    setExportableParams((prev) => selectAllParameters(prev));
  }, []);

  // 取消全选
  const handleDeselectAll = useCallback(() => {
    setExportableParams((prev) => deselectAllParameters(prev));
  }, []);

  // 导出处理
  const handleExport = useCallback(async () => {
    if (!currentMotion) return;

    const config: AssetPackExportConfig = {
      filename: filename || 'motion-preview',
      selectedParameterIds: getSelectedParameterIds(exportableParams),
      showPanelTitle,
      customTitle: customTitle || undefined,
      aspectRatio,
    };

    try {
      // 更新状态为生成中
      setAssetPackExportState({
        status: 'generating',
        config,
        progress: 0,
        error: null,
      });

      // 生成 HTML
      const html = await assetPackExporter.generateHtml(
        currentMotion,
        config,
        (progress) => {
          setAssetPackExportState({ progress });
        }
      );

      // 更新状态为下载中
      setAssetPackExportState({ status: 'downloading', progress: 100 });

      // 下载 HTML 文件（WASM 已内嵌）
      assetPackExporter.downloadHtml(html, config.filename);

      // 完成
      setAssetPackExportState({ status: 'completed' });

      // 延迟关闭对话框
      setTimeout(() => {
        closeAssetPackExportDialog();
      }, 500);
    } catch (error) {
      console.error('Export failed:', error);
      setAssetPackExportState({
        status: 'error',
        error: error instanceof Error ? error.message : t('export.failed'),
      });
    }
  }, [
    t,
    currentMotion,
    filename,
    exportableParams,
    showPanelTitle,
    customTitle,
    aspectRatio,
    setAssetPackExportState,
    closeAssetPackExportDialog,
  ]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAssetPackExportDialogOpen) {
        closeAssetPackExportDialog();
      }
    };

    if (isAssetPackExportDialogOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAssetPackExportDialogOpen, closeAssetPackExportDialog]);

  // 点击背景关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && assetPackExportState.status !== 'generating') {
      closeAssetPackExportDialog();
    }
  };

  if (!isAssetPackExportDialogOpen) {
    return null;
  }

  const isExporting = assetPackExportState.status === 'generating' || assetPackExportState.status === 'downloading';
  const hasError = assetPackExportState.status === 'error';
  const selectedCount = exportableParams.filter((p) => p.selected).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-background-elevated rounded-lg shadow-neon-soft w-full max-w-lg mx-4 overflow-hidden border border-border-default"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-border-default">
          <h2
            id="export-dialog-title"
            className="text-lg font-semibold font-display text-text-primary"
          >
            {t('export.assetPackTitle')}
          </h2>
          <p className="text-sm font-body text-text-muted mt-1">
            {t('exportAssetPack.subtitle')}
          </p>
        </div>

        {/* 内容区 */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* 文件名配置 */}
          <div className="mb-5">
            <label className="block text-sm font-medium font-body text-text-muted mb-2">
              {t('exportAssetPack.filename')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="motion-preview"
                disabled={isExporting}
                className="flex-1 px-3 py-2 bg-background-secondary border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent disabled:opacity-50 transition-colors duration-200"
              />
              <span className="text-sm font-body text-text-muted">.html</span>
            </div>
          </div>

          {/* 自定义标题 */}
          <div className="mb-5">
            <label className="block text-sm font-medium font-body text-text-muted mb-2">
              {t('exportAssetPack.customTitle')}
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={t('exportAssetPack.customTitlePlaceholder')}
              disabled={isExporting}
              className="w-full px-3 py-2 bg-background-secondary border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent disabled:opacity-50 transition-colors duration-200"
            />
          </div>

          {/* 显示标题选项 */}
          <div className="mb-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showPanelTitle}
                onChange={(e) => setShowPanelTitle(e.target.checked)}
                disabled={isExporting}
                className="w-4 h-4 accent-accent-primary cursor-pointer"
              />
              <span className="text-sm font-body text-text-primary">
                {t('exportAssetPack.showTitle')}
              </span>
            </label>
          </div>

          {/* 参数选择器 */}
          <div className="mb-4">
            <label className="block text-sm font-medium font-body text-text-muted mb-3">
              {t('exportAssetPack.selectParameters')}
            </label>
            <ParameterSelector
              parameters={exportableParams}
              onToggle={handleToggleParameter}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />
          </div>

          {/* 文件大小估算 */}
          <div className="text-xs font-body text-text-muted flex items-center gap-2">
            <span>{t('exportAssetPack.estimatedSize')}</span>
            <span className="font-mono text-accent-primary">
              {formatFileSize(estimatedSize)}
            </span>
          </div>

          {/* 错误提示 */}
          {hasError && assetPackExportState.error && (
            <div className="mt-4 p-3 bg-accent-tertiary/10 border border-accent-tertiary/30 rounded-lg text-accent-tertiary text-sm">
              {assetPackExportState.error}
            </div>
          )}

          {/* 导出进度 */}
          {isExporting && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-body text-text-muted">
                  {assetPackExportState.status === 'generating' ? t('exportAssetPack.generating') : t('exportAssetPack.downloading')}
                </span>
                <span className="text-accent-primary">
                  {assetPackExportState.progress}%
                </span>
              </div>
              <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-primary transition-all duration-300"
                  style={{ width: `${assetPackExportState.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="px-6 py-4 border-t border-border-default bg-background-secondary flex items-center justify-between">
          <div className="text-sm font-body text-text-muted">
            {selectedCount > 0 ? (
              <span>{t('exportAssetPack.selectedCount', { count: selectedCount })}</span>
            ) : (
              <span>{t('exportAssetPack.noParameters')}</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeAssetPackExportDialog}
              disabled={isExporting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || !currentMotion}
              loading={isExporting}
            >
              {isExporting ? t('exportAssetPack.exportingButton') : t('exportAssetPack.exportButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportAssetPackDialog;
