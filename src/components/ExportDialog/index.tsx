import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Select } from '../common';
import { useAppStore } from '../../stores/appStore';
import { exporterService, getDefaultFilename, checkBrowserSupport, getPreferredMimeType } from '../../services/exporter';
import { calculateExportDimensions } from '../../utils/coordinates';
import type { ExportConfig, Resolution, FrameRate, ExportResolutionId } from '../../types';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const RESOLUTION_OPTIONS = [
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' },
  { label: '4K', value: '4k' },
];

const FRAMERATE_OPTIONS = [
  { label: '24 fps', value: '24' },
  { label: '30 fps', value: '30' },
  { label: '60 fps', value: '60' },
];

// 霓虹风格导出对话框 - 确保高对比度
export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { t } = useTranslation();
  const {
    currentMotion,
    isExporting,
    exportProgress,
    setIsExporting,
    setExportProgress,
    setError,
    aspectRatio,
  } = useAppStore();

  const [resolution, setResolution] = useState<Resolution>('1080p');
  const [frameRate, setFrameRate] = useState<FrameRate>(30);
  const [browserSupport, setBrowserSupport] = useState<{ supported: boolean; reason?: string } | null>(null);

  // Calculate export dimensions based on aspect ratio and resolution
  const exportDimensions = useMemo(() => {
    return calculateExportDimensions(aspectRatio, resolution as ExportResolutionId);
  }, [aspectRatio, resolution]);

  useEffect(() => {
    if (isOpen) {
      setBrowserSupport(checkBrowserSupport());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!currentMotion) return;

    setIsExporting(true);
    setExportProgress(0);
    setError(null);

    try {
      const config: ExportConfig = {
        resolution,
        frameRate,
        format: 'webm',
        aspectRatio,
      };

      const blob = await exporterService.export(
        currentMotion,
        config,
        (progress) => setExportProgress(progress)
      );

      const filename = getDefaultFilename(currentMotion);
      exporterService.download(blob, filename);

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('export.failed');
      if (message !== 'Export cancelled') {
        setError(message);
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleCancel = () => {
    if (isExporting) {
      exporterService.cancel();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isExporting ? undefined : handleCancel}
      />

      {/* Dialog */}
      <div className="relative bg-background-elevated rounded-lg shadow-neon-soft w-full max-w-md mx-4 overflow-hidden border border-border-default">
        <div className="p-6">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-4">
            {t('export.videoTitle')}
          </h2>

          {browserSupport && !browserSupport.supported ? (
            <div className="p-4 bg-accent-tertiary/10 rounded-lg text-accent-tertiary mb-4 border border-accent-tertiary/30">
              {browserSupport.reason}
            </div>
          ) : isExporting ? (
            <div className="space-y-4">
              <div className="text-center text-text-muted mb-2">
                {t('export.exporting')}
              </div>
              <div className="w-full bg-border-default rounded-full h-3">
                <div
                  className="bg-accent-primary h-3 rounded-full transition-all duration-150"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <div className="text-center text-sm text-text-muted">
                {Math.round(exportProgress)}%
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Select
                label={t('export.resolution')}
                options={RESOLUTION_OPTIONS}
                value={resolution}
                onChange={(e) => setResolution(e.target.value as Resolution)}
              />

              <Select
                label={t('export.frameRate')}
                options={FRAMERATE_OPTIONS}
                value={String(frameRate)}
                onChange={(e) => setFrameRate(Number(e.target.value) as FrameRate)}
              />

              <div className="text-sm text-text-muted bg-background-secondary p-3 rounded-lg border border-border-default">
                <p className="font-body">{t('export.duration', { duration: currentMotion ? (currentMotion.duration / 1000).toFixed(1) : '0' })}</p>
                <p className="mt-1 font-body">{t('export.outputSize', { width: exportDimensions.width, height: exportDimensions.height })}</p>
                <p className="mt-1 font-body">{t('export.outputFormatMp4')}</p>
                {resolution === '4k' && (
                  <p className="mt-2 text-accent-secondary font-body">{t('export.4kWarning')}</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={handleCancel}
            >
              {isExporting ? t('common.cancel') : t('export.close')}
            </Button>
            {!isExporting && browserSupport?.supported && (
              <Button
                variant="primary"
                onClick={handleExport}
                disabled={!currentMotion}
              >
                {t('export.startExport')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportDialog;
