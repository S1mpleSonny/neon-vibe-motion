/**
 * 附件上传按钮组件 (031-multimodal-input)
 *
 * 提供文件选择器入口，支持图片和文档上传。
 */

import { useRef, useCallback } from 'react';
import { ATTACHMENT_CONSTRAINTS } from '../../types';

interface AttachmentButtonProps {
  /** 点击选择文件后的回调 */
  onFileSelect: (files: FileList) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 当前附件数量（用于判断是否达到上限） */
  currentCount?: number;
}

export function AttachmentButton({
  onFileSelect,
  disabled = false,
  currentCount = 0,
}: AttachmentButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAtLimit = currentCount >= ATTACHMENT_CONSTRAINTS.MAX_ATTACHMENTS;

  const handleClick = useCallback(() => {
    if (!disabled && !isAtLimit && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isAtLimit]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files);
      }
      // 重置 input，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onFileSelect]
  );

  // 构建 accept 属性
  const acceptFormats = [
    ...ATTACHMENT_CONSTRAINTS.ACCEPTED_IMAGE_FORMATS,
    ...ATTACHMENT_CONSTRAINTS.ACCEPTED_DOCUMENT_EXTENSIONS,
  ].join(',');

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptFormats}
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isAtLimit}
        title={isAtLimit ? '最多支持 5 个附件' : '添加附件'}
        className={`
          flex items-center justify-center
          w-8 h-8 rounded-[var(--border-radius)]
          transition-colors duration-150
          ${
            disabled || isAtLimit
              ? 'text-[var(--color-text-secondary)] opacity-50 cursor-not-allowed'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]'
          }
        `}
      >
        {/* 回形针图标 */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
    </>
  );
}

export default AttachmentButton;
