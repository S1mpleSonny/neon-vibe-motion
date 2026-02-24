/**
 * 代码校验警告组件
 * 显示非确定性代码的警告信息
 * @module components/PreviewCanvas/CodeWarning
 */

import { useTranslation } from 'react-i18next';
import type { CodeValidationResult } from '../../types';

interface CodeWarningProps {
  validation: CodeValidationResult;
  onDismiss?: () => void;
}

export function CodeWarning({ validation, onDismiss }: CodeWarningProps) {
  const { t } = useTranslation();
  if (validation.isValid && validation.issues.length === 0) {
    return null;
  }

  const errorCount = validation.issues.filter((i) => i.severity === 'error').length;
  const warningCount = validation.issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="absolute top-2 left-2 right-2 z-10">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <span className="text-yellow-600 text-lg">
            {errorCount > 0 ? '!' : '!'}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-yellow-800">
              {t('codeWarning.title')}
              {errorCount > 0 && (
                <span className="ml-2 text-red-600">{t('codeWarning.errorCount', { count: errorCount })}</span>
              )}
              {warningCount > 0 && (
                <span className="ml-2 text-yellow-600">{t('codeWarning.warningCount', { count: warningCount })}</span>
              )}
            </h4>
            <ul className="mt-1 text-xs text-yellow-700 space-y-1">
              {validation.issues.slice(0, 3).map((issue, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className={issue.severity === 'error' ? 'text-red-500' : 'text-yellow-500'}>
                    {issue.severity === 'error' ? '!' : '!'}
                  </span>
                  <span>
                    {issue.message}: <code className="bg-yellow-100 px-1 rounded">{issue.match}</code>
                  </span>
                </li>
              ))}
              {validation.issues.length > 3 && (
                <li className="text-yellow-600">
                  {t('codeWarning.moreIssues', { count: validation.issues.length - 3 })}
                </li>
              )}
            </ul>
            <p className="mt-2 text-xs text-yellow-600">
              {t('codeWarning.hint')}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-yellow-400 hover:text-yellow-600 transition-colors"
              aria-label={t('codeWarning.dismiss')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CodeWarning;
