/**
 * 导入结果对话框
 * Feature: 030-session-export US4
 *
 * 用于显示批量导入的详细结果
 */

import { useTranslation } from 'react-i18next';
import type { ImportResult } from '@/types';

interface ImportResultDialogProps {
  isOpen: boolean;
  result: ImportResult | null;
  onClose: () => void;
}

export function ImportResultDialog({
  isOpen,
  result,
  onClose,
}: ImportResultDialogProps) {
  const { t } = useTranslation();
  if (!isOpen || !result) return null;

  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings && result.warnings.length > 0;
  const isPartialSuccess = result.success && result.skippedCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div className="relative bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* 标题 */}
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
            {t('import.title')}
          </h3>
        </div>

        {/* 内容 */}
        <div className="px-4 py-4">
          {/* 成功统计 */}
          <div className="flex items-center gap-2 mb-3">
            <div
              className={`
                w-6 h-6 rounded-full flex items-center justify-center
                ${result.success
                  ? isPartialSuccess
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-green-100 text-green-600'
                  : 'bg-red-100 text-red-600'
                }
              `}
            >
              {result.success ? (
                isPartialSuccess ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <span className="text-[var(--color-text-primary)]">
              {result.success
                ? t('import.successCount', { count: result.importedCount })
                : t('import.failed')
              }
            </span>
          </div>

          {/* 跳过统计 */}
          {result.skippedCount > 0 && (
            <div className="text-sm text-[var(--color-text-secondary)] mb-3">
              {t('import.skippedCount', { count: result.skippedCount })}
            </div>
          )}

          {/* 警告信息 */}
          {hasWarnings && (
            <div className="mt-3 border-t border-[var(--color-border)] pt-3">
              <div className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                {t('import.warnings')}
              </div>
              <div className="space-y-1">
                {result.warnings!.map((warning, index) => (
                  <div
                    key={index}
                    className="text-sm text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-800/40 px-2 py-1 rounded"
                  >
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 错误详情 */}
          {hasErrors && (
            <div className="mt-3 border-t border-[var(--color-border)] pt-3">
              <div className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                {t('import.errorDetails')}
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {result.errors.map((error, index) => (
                  <div
                    key={index}
                    className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded"
                  >
                    {error.title && <span className="font-medium">{error.title}: </span>}
                    {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="px-4 py-3 border-t border-[var(--color-border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded hover:bg-opacity-90 transition-colors"
          >
            {t('common.ok')}
          </button>
        </div>
      </div>
    </div>
  );
}
