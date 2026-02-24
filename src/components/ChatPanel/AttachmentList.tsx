/**
 * 附件列表组件 (031-multimodal-input)
 *
 * 在输入框上方显示待发送附件的网格列表。
 */

import type { AttachmentUploadState } from '../../types';
import { ATTACHMENT_CONSTRAINTS } from '../../types';
import { AttachmentPreview } from './AttachmentPreview';

interface AttachmentListProps {
  /** 附件列表 */
  attachments: AttachmentUploadState[];
  /** 移除附件回调 */
  onRemove: (tempId: string) => void;
  /** 是否禁用（发送中） */
  disabled?: boolean;
}

export function AttachmentList({
  attachments,
  onRemove,
  disabled = false,
}: AttachmentListProps) {
  if (attachments.length === 0) {
    return null;
  }

  const isAtLimit = attachments.length >= ATTACHMENT_CONSTRAINTS.MAX_ATTACHMENTS;

  return (
    <div className="px-3 py-2 border-b border-[var(--color-border)]">
      {/* 附件网格 */}
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <AttachmentPreview
            key={attachment.tempId}
            attachment={attachment}
            onRemove={onRemove}
            disabled={disabled}
          />
        ))}
      </div>

      {/* 附件数量提示 */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
        <span>
          {attachments.length} / {ATTACHMENT_CONSTRAINTS.MAX_ATTACHMENTS} 个附件
        </span>
        {isAtLimit && (
          <span className="text-[var(--color-warning)]">
            已达上限
          </span>
        )}
      </div>
    </div>
  );
}

export default AttachmentList;
