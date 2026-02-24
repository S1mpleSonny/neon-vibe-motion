import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../locales/i18n';
import type { ConversationMeta } from '@/types';

/** 标题最大长度 */
const MAX_TITLE_LENGTH = 50;

interface HistoryItemProps {
  conversation: ConversationMeta;
  isActive: boolean;
  disabled: boolean;
  isEditing: boolean;
  isSelectionMode?: boolean; // 030-session-export US3
  isSelected?: boolean; // 030-session-export US3
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void; // 018-duplicate-conversation
  onExport: () => void; // 030-session-export
  onStartEdit: () => void;
  onSaveEdit: (title: string) => void;
  onCancelEdit: () => void;
  onToggleSelect?: () => void; // 030-session-export US3
}

/**
 * 时间格式化函数
 * - 今天: 显示时间 (HH:mm)
 * - 昨天: "昨天"
 * - 本周: 周X
 * - 更早: YYYY-MM-DD
 */
function formatTime(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const t = i18n.t.bind(i18n);
  const locale = i18n.language === 'en' ? 'en-US' : 'zh-CN';

  // 今天
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= today) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }

  // 昨天
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date >= yesterday) {
    return t('time.yesterday');
  }

  // 本周
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - today.getDay());
  if (date >= weekStart) {
    const days = [
      t('time.sunday'), t('time.monday'), t('time.tuesday'), t('time.wednesday'),
      t('time.thursday'), t('time.friday'), t('time.saturday'),
    ];
    return days[date.getDay()];
  }

  // 更早
  return date.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function HistoryItem({
  conversation,
  isActive,
  disabled,
  isEditing,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
  onDelete,
  onDuplicate,
  onExport,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleSelect,
}: HistoryItemProps) {
  const { t } = useTranslation();
  const [editValue, setEditValue] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // 进入编辑模式时聚焦并选中
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 同步外部标题变化
  useEffect(() => {
    setEditValue(conversation.title);
  }, [conversation.title]);

  const handleClick = () => {
    if (isSelectionMode) {
      // 选择模式下点击整行切换选中状态
      onToggleSelect?.();
      return;
    }
    if (!disabled && !isEditing) {
      onSelect();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onDelete();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartEdit();
  };

  // 复制对话处理 (018-duplicate-conversation)
  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onDuplicate();
    }
  };

  // 导出对话处理 (030-session-export)
  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExport();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveEdit(editValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(conversation.title);
      onCancelEdit();
    }
  };

  const handleBlur = () => {
    onSaveEdit(editValue);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        group flex items-center justify-between px-3 py-2 cursor-pointer transition-colors
        ${isActive && !isSelectionMode ? 'bg-[var(--color-surface-elevated)] border-l-2 border-[var(--color-primary)]' : 'hover:bg-[var(--color-surface-elevated)]'}
        ${isSelected ? 'bg-[var(--color-primary)] bg-opacity-10' : ''}
        ${disabled && !isSelectionMode ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      title={isSelectionMode ? t('history.clickToSelect') : disabled ? t('history.processing') : conversation.title}
    >
      {/* 选择模式下显示复选框 (030-session-export US3) */}
      {isSelectionMode && (
        <div className="mr-2 flex-shrink-0">
          <div
            className={`
              w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
              ${isSelected
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                : 'border-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
              }
            `}
          >
            {isSelected && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          // 编辑模式：显示输入框
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            maxLength={MAX_TITLE_LENGTH}
            className="
              w-full text-sm px-1 py-0.5 rounded
              bg-[var(--color-surface)] border border-[var(--color-primary)]
              text-[var(--color-text-primary)]
              focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]
            "
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          // 显示模式：标题文本
          <div
            className={`
              text-sm truncate
              ${isActive ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-primary)]'}
            `}
          >
            {conversation.title}
          </div>
        )}
        <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
          {formatTime(conversation.updatedAt)}
        </div>
      </div>

      {/* 操作按钮：悬停显示（选择模式下隐藏） */}
      {!disabled && !isEditing && !isSelectionMode && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
          {/* 编辑按钮 */}
          <button
            onClick={handleEditClick}
            className="
              ml-1 p-1 rounded
              text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]
              hover:bg-[var(--color-primary)] hover:bg-opacity-10
              transition-all
            "
            title={t('history.editTitle')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          {/* 复制按钮 (018-duplicate-conversation) */}
          <button
            onClick={handleDuplicate}
            className="
              ml-1 p-1 rounded
              text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]
              hover:bg-[var(--color-primary)] hover:bg-opacity-10
              transition-all
            "
            title={t('history.duplicateConversation')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>

          {/* 导出按钮 (030-session-export) */}
          <button
            onClick={handleExport}
            className="
              ml-1 p-1 rounded
              text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]
              hover:bg-[var(--color-primary)] hover:bg-opacity-10
              transition-all
            "
            title={t('history.exportConversation')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>

          {/* 删除按钮 */}
          <button
            onClick={handleDelete}
            className="
              ml-1 p-1 rounded
              text-[var(--color-text-secondary)] hover:text-[var(--color-error)]
              hover:bg-[var(--color-error)] hover:bg-opacity-10
              transition-all
            "
            title={t('history.deleteConversation')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
