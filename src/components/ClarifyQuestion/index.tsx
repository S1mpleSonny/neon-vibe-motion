import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../common';
import type { ClarifyQuestion as ClarifyQuestionType } from '../../types';

interface ClarifyQuestionProps {
  /** 当前问题 */
  question: ClarifyQuestionType;
  /** 当前进度 */
  progress: { current: number; total: number };
  /** 选择预设选项 */
  onSelectOption: (optionId: string) => void;
  /** 提交自定义答案 */
  onSubmitCustom: (value: string) => void;
  /** 跳过澄清 */
  onSkip: () => void;
  /** 是否禁用交互（加载中） */
  disabled?: boolean;
}

export function ClarifyQuestion({
  question,
  progress,
  onSelectOption,
  onSubmitCustom,
  onSkip,
  disabled = false,
}: ClarifyQuestionProps) {
  const { t } = useTranslation();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleOptionClick = (optionId: string) => {
    if (disabled) return;
    setShowCustomInput(false);
    setCustomValue('');
    onSelectOption(optionId);
  };

  const handleCustomClick = () => {
    if (disabled) return;
    setShowCustomInput(true);
  };

  const handleCustomSubmit = () => {
    if (disabled || !customValue.trim()) return;
    onSubmitCustom(customValue.trim());
    setCustomValue('');
    setShowCustomInput(false);
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCustomSubmit();
    }
  };

  // 边界检查：确保 question 和 options 存在
  if (!question || !question.options || question.options.length === 0) {
    return (
      <div className="text-sm text-[var(--color-text-secondary)]">
        {t('clarify.loadFailed')}
        <button
          onClick={onSkip}
          className="ml-2 text-[var(--color-primary)] hover:underline"
        >
          {t('common.skip')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 进度指示器 */}
      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <span>{t('clarify.progress', { current: progress.current, total: progress.total })}</span>
        <button
          onClick={onSkip}
          disabled={disabled}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
        >
          {t('clarify.skipGenerate')}
        </button>
      </div>

      {/* 问题文本 */}
      <div className="bg-[var(--color-surface-elevated)] rounded-[var(--border-radius)] px-3 py-2">
        <p className="text-sm text-[var(--color-text-primary)]">{question.question}</p>
      </div>

      {/* 选项列表 */}
      <div className="flex flex-wrap gap-2">
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleOptionClick(option.id)}
            disabled={disabled}
            className={`
              px-3 py-1.5 text-sm rounded-[var(--border-radius)]
              border border-[var(--color-border)]
              bg-[var(--color-surface)] text-[var(--color-text-primary)]
              hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)]
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <span className="font-medium mr-1">{option.id}.</span>
            {option.label}
          </button>
        ))}

        {/* 自定义选项按钮 */}
        <button
          onClick={handleCustomClick}
          disabled={disabled}
          className={`
            px-3 py-1.5 text-sm rounded-[var(--border-radius)]
            border border-dashed border-[var(--color-border)]
            bg-transparent text-[var(--color-text-secondary)]
            hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${showCustomInput ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : ''}
          `}
        >
          {t('common.custom')}
        </button>
      </div>

      {/* 自定义输入框 */}
      {showCustomInput && (
        <div className="flex gap-2">
          <Input
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            placeholder={t('clarify.customPlaceholder')}
            disabled={disabled}
            className="flex-1"
            autoFocus
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleCustomSubmit}
            disabled={disabled || !customValue.trim()}
          >
            {t('common.confirm')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCustomInput(false);
              setCustomValue('');
            }}
            disabled={disabled}
          >
            {t('common.cancel')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ClarifyQuestion;
