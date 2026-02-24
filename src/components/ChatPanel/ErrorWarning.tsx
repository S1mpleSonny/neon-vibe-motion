import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import type { RenderError } from '../../types';
import { ERROR_CONSTANTS } from '../../types';

interface ErrorWarningProps {
  /** 渲染错误对象 */
  error: RenderError;
  /** 点击修复按钮的回调 */
  onFix: () => void;
  /** 是否正在修复中 */
  loading?: boolean;
  /** 是否禁用修复按钮 */
  disabled?: boolean;
  /** 当前修复尝试次数 */
  attemptCount?: number;
  /** 最大修复尝试次数 */
  maxAttempts?: number;
}

/**
 * 错误警告组件
 * 在对话面板中显示渲染错误，并提供修复按钮
 */
export function ErrorWarning({
  error,
  onFix,
  loading = false,
  disabled = false,
  attemptCount = 0,
  maxAttempts = ERROR_CONSTANTS.MAX_FIX_ATTEMPTS,
}: ErrorWarningProps) {
  const { t } = useTranslation();
  const hasReachedMaxRetries = attemptCount >= maxAttempts;

  return (
    <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-[var(--border-radius)] px-3 py-3">
      {/* Warning icon and message */}
      <div className="flex items-start gap-2">
        <span className="text-[var(--color-warning)] text-lg flex-shrink-0">
          ⚠️
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--color-text-primary)] font-medium">
            {t('error.codeExecution')}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t(error.friendlyMessage)}
          </p>
        </div>
      </div>

      {/* Retry count indicator */}
      {attemptCount > 0 && !hasReachedMaxRetries && (
        <div className="mt-2 text-xs text-[var(--color-text-secondary)]">
          {t('error.retryCount', { count: attemptCount, remaining: maxAttempts - attemptCount })}
        </div>
      )}

      {/* Action area */}
      <div className="mt-3">
        {hasReachedMaxRetries ? (
          // Max retry message
          <div className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface)] rounded-[var(--border-radius-sm)] p-3">
            <p className="font-medium text-[var(--color-text-primary)] mb-2">
              {t('error.maxRetryTitle', { max: maxAttempts })}
            </p>
            <p className="mb-1">{t('error.maxRetrySuggestion')}</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>{t('error.maxRetry1')}</li>
              <li>{t('error.maxRetry2')}</li>
              <li>{t('error.maxRetry3')}</li>
            </ol>
            <p className="mt-2">{t('error.maxRetryHint')}</p>
          </div>
        ) : (
          // Fix button
          <Button
            variant="primary"
            size="sm"
            onClick={onFix}
            loading={loading}
            disabled={disabled || loading}
          >
            {loading ? t('error.fixing') : t('error.autoFix')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default ErrorWarning;
