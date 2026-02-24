import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageTransition } from '../components/common/PageTransition';
import { Navbar } from '../components/Navigation/Navbar';
import { Breadcrumb } from '../components/Navigation/Breadcrumb';
import { PreviewCanvas } from '../components/PreviewCanvas';
import { ParameterPanel } from '../components/ParameterPanel';
import { ChatPanel } from '../components/ChatPanel';
import { AspectRatioSelector } from '../components/AspectRatioSelector';
import { SettingsDialog } from '../components/SettingsDialog';
import { ExportDialog } from '../components/ExportDialog';
import { ExportAssetPackDialog } from '../components/ExportAssetPackDialog';
import { Button } from '../components/common';
import { useAppStore } from '../stores/appStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

/**
 * PreviewPage - Main motion preview workspace.
 * Contains the preview canvas, parameter panel, and chat panel in a 3-column layout.
 * This is the main working page where users create and preview motions.
 */
export function PreviewPage() {
  const { t } = useTranslation();
  const {
    llmConfigs,
    activeConfigId,
    isLoadingConfigs,
    currentMotion,
    isSettingsOpen,
    isExportDialogOpen,
    locale,
    setLocale,
    openSettings,
    closeSettings,
    openExportDialog,
    closeExportDialog,
    openAssetPackExportDialog,
    loadFromStorage,
    initConversations,
    initLLMConfigs,
  } = useAppStore();

  const hasValidConfig = llmConfigs.length > 0 && activeConfigId !== null;

  // Initialize store data
  useEffect(() => {
    loadFromStorage();
    initConversations();
    initLLMConfigs();
  }, [loadFromStorage, initConversations, initLLMConfigs]);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <PageTransition>
      <div className="h-screen flex flex-col bg-background-primary">
        {/* Header with action buttons */}
        <header className="relative h-14 bg-background-elevated border-b border-border-default flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            {/* Back button */}
            <Link
              to="/"
              className="p-1 -ml-1 text-text-muted hover:text-accent-primary transition-colors rounded hover:bg-accent-primary/10"
              title="返回首页"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-lg sm:text-xl font-display text-accent-primary" style={{ textShadow: 'var(--text-glow)' }}>Neon Lab</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
              className="px-2 py-1 text-xs font-medium rounded-md border border-border-default text-text-muted hover:text-accent-primary hover:border-accent-primary transition-colors cursor-pointer"
              title={locale === 'zh' ? 'Switch to English' : '切换为中文'}
            >
              {locale === 'zh' ? 'EN' : '中'}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openSettings}
              className={isSettingsOpen ? 'bg-accent-primary/15 text-accent-primary' : ''}
            >
              <span className="hidden sm:inline">{t('nav.settings')}</span>
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426-1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={openAssetPackExportDialog}
              disabled={!currentMotion}
              title="导出为可独立运行的 HTML 素材包"
            >
              <span className="hidden sm:inline">{t('nav.exportAssetPack')}</span>
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7l8 4" />
              </svg>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={openExportDialog}
              disabled={!currentMotion}
            >
              <span className="hidden sm:inline">{t('nav.exportVideo')}</span>
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </Button>
          </div>
        </header>

        {/* Main content - Three panel layout */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left panel - Chat */}
          <div className="w-full lg:w-80 bg-background-secondary border-b lg:border-b-0 lg:border-r border-border-default flex flex-col shrink-0">
            <div className="p-3 border-b border-border-default shrink-0">
              <h2 className="text-sm font-medium font-display text-text-primary">{t('panel.conversations')}</h2>
            </div>
            {!hasValidConfig && !isLoadingConfigs ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-text-muted px-4">
                  <p className="mb-3 font-body">{t('chat.configRequired')}</p>
                  <Button variant="secondary" size="sm" onClick={openSettings}>
                    {t('nav.openSettings')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0">
                <ChatPanel />
              </div>
            )}
          </div>

          {/* Center panel - Preview Canvas */}
          <div className="flex-1 flex flex-col min-w-0 bg-background-elevated">
            <PreviewCanvas />
          </div>

          {/* Right panel - Parameters */}
          <div className="w-full lg:w-72 bg-background-secondary border-t lg:border-t-0 lg:border-l border-border-default flex flex-col shrink-0">
            <div className="p-3 border-b border-border-default shrink-0">
              <h2 className="text-sm font-medium font-display text-text-primary">{t('panel.parameters')}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              {/* Aspect Ratio Selector */}
              <div className="mb-4 pb-4 border-b border-border-default">
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
    </PageTransition>
  );
}
