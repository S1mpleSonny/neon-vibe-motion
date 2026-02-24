import { useTranslation } from 'react-i18next';
import { Button, Toggle } from '../common';
import { ConfigList } from './ConfigList';
import { useAppStore } from '../../stores/appStore';
import { logger } from '../../services/logging';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const {
    clarifyEnabled,
    setClarifyEnabled,
  } = useAppStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-background-elevated rounded-lg shadow-neon-soft w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col border border-border-default">
        <div className="p-6 overflow-y-auto flex-1">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-4">
            {t('settings.title')}
          </h2>

          <div className="space-y-4">
            <ConfigList />

            {/* Clarify Toggle */}
            <div className="pt-4 border-t border-border-default">
              <Toggle
                label={t('settings.clarify.label')}
                checked={clarifyEnabled}
                onChange={(e) => setClarifyEnabled(e.target.checked)}
              />
              <p className="mt-1 text-xs font-body text-text-muted">
                {t('settings.clarify.description')}
              </p>
            </div>

            {/* Log Export */}
            <div className="pt-4 border-t border-border-default">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium font-body text-text-primary">
                    {t('settings.log.title')}
                  </p>
                  <p className="mt-1 text-xs font-body text-text-muted">
                    {t('settings.log.description')}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => logger.exportToFile()}
                >
                  {t('settings.log.export')}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={onClose}>
              {t('settings.close')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsDialog;
