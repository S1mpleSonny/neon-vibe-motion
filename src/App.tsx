import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './stores/appStore';
import { Button } from './components/common';
import { SettingsDialog } from './components/SettingsDialog';
import { ExportDialog } from './components/ExportDialog';
import { ExportAssetPackDialog } from './components/ExportAssetPackDialog';
import { ChatPanel } from './components/ChatPanel';
import { PreviewCanvas } from './components/PreviewCanvas';
import { ParameterPanel } from './components/ParameterPanel';
import { AspectRatioSelector } from './components/AspectRatioSelector';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const { t } = useTranslation();
  const {
    llmConfigs,
    activeConfigId,
    isLoadingConfigs,
    currentMotion,
    isSettingsOpen,
    isExportDialogOpen,
    openSettings,
    closeSettings,
    openExportDialog,
    closeExportDialog,
    openAssetPackExportDialog,
    loadFromStorage,
    initConversations,
    initLLMConfigs,
  } = useAppStore();

  // 判断是否有有效的 LLM 配置
  const hasValidConfig = llmConfigs.length > 0 && activeConfigId !== null;

  useEffect(() => {
    loadFromStorage();
    initConversations();
    initLLMConfigs();
  }, [loadFromStorage, initConversations, initLLMConfigs]);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="h-screen flex flex-col bg-[var(--color-background)]">
      {/* Header */}
      <header className="relative h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-4 shrink-0 glass-panel overflow-hidden">
        <h1 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)]">动效预览平台</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={openSettings}>
            <span className="hidden sm:inline">{t('nav.settings')}</span>
            <span className="sm:hidden">⚙</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={openAssetPackExportDialog}
            disabled={!currentMotion}
            title="导出为可独立运行的 HTML 素材包"
          >
            <span className="hidden sm:inline">{t('nav.exportAssetPack')}</span>
            <span className="sm:hidden">📦</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={openExportDialog}
            disabled={!currentMotion}
          >
            <span className="hidden sm:inline">{t('nav.exportVideo')}</span>
            <span className="sm:hidden">↓</span>
          </Button>
        </div>
      </header>

      {/* Main content - Three panel layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left panel - Chat */}
        <div className="relative w-full lg:w-80 bg-[var(--color-surface)] border-b lg:border-b-0 lg:border-r border-[var(--color-border)] flex flex-col shrink-0 h-48 lg:h-auto glass-panel overflow-hidden">
          <div className="p-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-medium text-[var(--color-text-primary)]">{t('panel.conversations')}</h2>
          </div>
          {!hasValidConfig && !isLoadingConfigs ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-[var(--color-text-secondary)] px-4">
                <p className="mb-3">{t('chat.configRequired')}</p>
                <Button variant="secondary" size="sm" onClick={openSettings}>
                  {t('nav.openSettings')}
                </Button>
              </div>
            </div>
          ) : (
            <ChatPanel />
          )}
        </div>

        {/* Center panel - Preview Canvas */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <PreviewCanvas />
        </div>

        {/* Right panel - Parameters */}
        <div className="relative w-full lg:w-72 bg-[var(--color-surface)] border-t lg:border-t-0 lg:border-l border-[var(--color-border)] flex flex-col shrink-0 h-48 lg:h-auto glass-panel overflow-hidden">
          <div className="p-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-medium text-[var(--color-text-primary)]">{t('panel.parameters')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {/* Aspect Ratio Selector */}
            <div className="mb-4 pb-4 border-b border-[var(--color-border)]">
              <AspectRatioSelector />
            </div>
            <ParameterPanel />
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <SettingsDialog isOpen={isSettingsOpen} onClose={closeSettings} />
      <ExportDialog isOpen={isExportDialogOpen} onClose={closeExportDialog} />
      <ExportAssetPackDialog />
    </div>
  );
}

export default App;
