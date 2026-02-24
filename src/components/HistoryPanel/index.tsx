import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import { HistoryItem } from './HistoryItem';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ImportResultDialog } from './ImportResultDialog';
import { getConversation } from '@/services/storage';
import { exportConversation, exportConversations } from '@/services/sessionExporter/exporter';
import { importFromFile, getImportResultMessage } from '@/services/sessionExporter/importer';
import { EXPORT_FILE_EXTENSION } from '@/services/sessionExporter/constants';
import type { Conversation, ImportResult } from '@/types';

/** 标题最大长度 */
const MAX_TITLE_LENGTH = 50;

export function HistoryPanel() {
  const { t } = useTranslation();
  const {
    conversationList,
    currentConversationId,
    isHistoryPanelOpen,
    isGenerating,
    isClarifying,
    isFixing,
    toggleHistoryPanel,
    switchConversation,
    createConversation,
    deleteConversation,
    updateConversationTitle,
    duplicateConversation, // 018-duplicate-conversation
    importConversations, // 030-session-export
  } = useAppStore();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  // 编辑状态管理 (014-edit-conversation-title)
  const [editingId, setEditingId] = useState<string | null>(null);
  // 导入状态 (030-session-export)
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 批量选择状态 (030-session-export US3)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 批量导入结果对话框 (030-session-export US4)
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // 是否可以切换对话
  const canSwitch = !isGenerating && !isClarifying && !isFixing;

  // 按修改时间倒序排列
  const sortedList = [...conversationList].sort((a, b) => b.updatedAt - a.updatedAt);

  // 当前对话的标题
  const currentTitle =
    sortedList.find((c) => c.id === currentConversationId)?.title || t('history.newConversation');

  const handleSelect = (id: string) => {
    if (canSwitch) {
      switchConversation(id);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteConversation(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleCreate = () => {
    if (canSwitch) {
      createConversation();
    }
  };

  // 编辑相关回调 (014-edit-conversation-title)
  const handleStartEdit = (id: string) => {
    setEditingId(id);
  };

  const handleSaveEdit = (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    // 验证：空标题时恢复原标题，不保存
    if (trimmed.length === 0) {
      setEditingId(null);
      return;
    }
    // 截断超长标题
    const finalTitle = trimmed.length > MAX_TITLE_LENGTH
      ? trimmed.substring(0, MAX_TITLE_LENGTH)
      : trimmed;
    updateConversationTitle(id, finalTitle);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // 复制对话回调 (018-duplicate-conversation)
  const handleDuplicate = (id: string) => {
    if (canSwitch) {
      duplicateConversation(id);
    }
  };

  // 导出对话回调 (030-session-export)
  const handleExport = async (id: string) => {
    const conversation = getConversation(id);
    if (conversation) {
      try {
        await exportConversation(conversation);
      } catch (error) {
        console.error('[HistoryPanel] 导出失败:', error);
      }
    }
  };

  // 批量选择相关回调 (030-session-export US3)
  const handleToggleSelectionMode = () => {
    if (isSelectionMode) {
      // 退出选择模式时清空选择
      setSelectedIds(new Set());
    }
    setIsSelectionMode(!isSelectionMode);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchExport = async () => {
    if (selectedIds.size === 0) return;

    // 获取所有选中的对话
    const conversations: Conversation[] = [];
    for (const id of selectedIds) {
      const conv = getConversation(id);
      if (conv) {
        conversations.push(conv);
      }
    }

    if (conversations.length === 0) return;

    try {
      await exportConversations(conversations);
      // 导出成功后退出选择模式
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('[HistoryPanel] 批量导出失败:', error);
    }
  };

  // 导入对话回调 (030-session-export)
  const handleImportClick = () => {
    if (canSwitch && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 重置 input 以允许选择相同文件
    e.target.value = '';

    setIsImporting(true);
    setImportMessage(null);

    try {
      const existingTitles = conversationList.map((c) => c.title);
      const result = await importFromFile(file, existingTitles);

      // 导入成功的对话到 store（使用 importFromFile 返回的 conversations）
      if (result.success && result.conversations && result.conversations.length > 0) {
        importConversations(result.conversations);
      }

      // 批量导入（多个对话）、有错误或有警告时显示详细对话框
      const isBatchImport = result.importedCount > 1 || result.skippedCount > 0;
      const hasWarnings = result.warnings && result.warnings.length > 0;
      if (isBatchImport || result.errors.length > 0 || hasWarnings) {
        setImportResult(result);
      } else {
        // 单个导入成功时显示简单消息
        const message = getImportResultMessage(result);
        setImportMessage(message);
        setTimeout(() => setImportMessage(null), 3000);
      }
    } catch (error) {
      console.error('[HistoryPanel] 导入失败:', error);
      setImportMessage('导入失败，请重试');
      setTimeout(() => setImportMessage(null), 3000);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseImportResult = () => {
    setImportResult(null);
  };

  // 切换对话时取消编辑 (014-edit-conversation-title)
  useEffect(() => {
    setEditingId(null);
  }, [currentConversationId]);

  // 面板收起时退出选择模式 (030-session-export)
  useEffect(() => {
    if (!isHistoryPanelOpen && isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [isHistoryPanelOpen, isSelectionMode]);

  return (
    <div className="border-b border-[var(--color-border)]">
      {/* 隐藏的文件输入 (030-session-export) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={EXPORT_FILE_EXTENSION}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={toggleHistoryPanel}
          className="flex items-center gap-1 text-sm text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${isHistoryPanelOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="truncate max-w-[150px]">{currentTitle}</span>
        </button>

        <div className="flex items-center gap-1">
          {/* 批量选择模式按钮 (030-session-export US3) */}
          {isHistoryPanelOpen && sortedList.length > 1 && (
            <>
              {isSelectionMode ? (
                <>
                  {/* 批量导出按钮 */}
                  <button
                    onClick={handleBatchExport}
                    disabled={selectedIds.size === 0}
                    className={`
                      p-1 rounded transition-colors
                      ${
                        selectedIds.size > 0
                          ? 'text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:bg-opacity-10'
                          : 'text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed'
                      }
                    `}
                    title={selectedIds.size > 0 ? `导出 ${selectedIds.size} 个对话` : '请选择要导出的对话'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
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
                  {/* 取消选择按钮 */}
                  <button
                    onClick={handleToggleSelectionMode}
                    className="p-1 rounded transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)] hover:bg-opacity-10"
                    title="取消选择"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleToggleSelectionMode}
                  className="p-1 rounded transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-elevated)]"
                  title="批量选择"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </button>
              )}
            </>
          )}

          {/* 导入按钮 (030-session-export) */}
          {!isSelectionMode && (
            <button
              onClick={handleImportClick}
              disabled={!canSwitch || isImporting}
              className={`
                p-1 rounded transition-colors
                ${
                  canSwitch && !isImporting
                    ? 'text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-elevated)]'
                    : 'text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed'
                }
              `}
              title={
                !canSwitch
                  ? '正在处理中，无法导入'
                  : isImporting
                    ? '正在导入...'
                    : '导入对话'
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </button>
          )}

          {/* 新建按钮 */}
          {!isSelectionMode && (
            <button
              onClick={handleCreate}
              disabled={!canSwitch}
              className={`
                p-1 rounded transition-colors
                ${
                  canSwitch
                    ? 'text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-elevated)]'
                    : 'text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed'
                }
              `}
              title={canSwitch ? t('history.newConversationAction') : t('history.processingCannotCreate')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 导入消息提示 (030-session-export) */}
      {importMessage && (
        <div className="px-3 py-2 text-xs text-center bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]">
          {importMessage}
        </div>
      )}

      {/* 对话列表 */}
      {isHistoryPanelOpen && (
        <div className="max-h-48 overflow-y-auto border-t border-[var(--color-border)]">
          {sortedList.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-[var(--color-text-secondary)]">
              暂无历史对话
            </div>
          ) : (
            sortedList.map((conv) => (
              <HistoryItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === currentConversationId}
                disabled={!canSwitch}
                isEditing={editingId === conv.id}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(conv.id)}
                onSelect={() => handleSelect(conv.id)}
                onDelete={() => handleDelete(conv.id)}
                onDuplicate={() => handleDuplicate(conv.id)}
                onExport={() => handleExport(conv.id)}
                onStartEdit={() => handleStartEdit(conv.id)}
                onSaveEdit={(title) => handleSaveEdit(conv.id, title)}
                onCancelEdit={handleCancelEdit}
                onToggleSelect={() => handleToggleSelect(conv.id)}
              />
            ))
          )}
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="删除对话"
        message="确定要删除这个对话吗？此操作无法撤销。"
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        variant="danger"
      />

      {/* 导入结果对话框 (030-session-export US4) */}
      <ImportResultDialog
        isOpen={importResult !== null}
        result={importResult}
        onClose={handleCloseImportResult}
      />
    </div>
  );
}
