/**
 * 附件预览组件 (031-multimodal-input)
 *
 * 显示单个附件的预览（图片缩略图或文档图标），包含移除按钮和状态提示。
 */

import { useTranslation } from 'react-i18next';
import type { AttachmentUploadState } from '../../types';

interface AttachmentPreviewProps {
  /** 附件上传状态 */
  attachment: AttachmentUploadState;
  /** 移除回调 */
  onRemove: (tempId: string) => void;
  /** 是否禁用移除（发送中） */
  disabled?: boolean;
}

// 霓虹风格附件预览组件 - 确保高对比度
export function AttachmentPreview({
  attachment,
  onRemove,
  disabled = false,
}: AttachmentPreviewProps) {
  const { t } = useTranslation();
  const { tempId, file, status, previewUrl, error, wasCompressed } = attachment;

  const isImage = file.type.startsWith('image/');
  const isProcessing = status === 'pending' || status === 'processing';
  const hasError = status === 'error';

  return (
    <div
      className={`
        relative group
        w-20 h-20 rounded-lg
        overflow-hidden
        border border-border-default
        ${hasError ? 'border-accent-tertiary' : ''}
        ${isProcessing ? 'animate-pulse' : ''}
      `}
    >
      {/* 图片预览 */}
      {isImage && previewUrl && (
        <img
          src={previewUrl}
          alt={file.name}
          className="w-full h-full object-cover"
        />
      )}

      {/* 文档预览 */}
      {!isImage && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-background-elevated p-1">
          {/* 文档图标 */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-text-muted"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
          {/* 文件扩展名 */}
          <span className="text-[10px] font-body text-text-muted mt-1 truncate max-w-full px-1">
            {file.name.split('.').pop()?.toUpperCase()}
          </span>
        </div>
      )}

      {/* 加载中遮罩 */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 错误遮罩 */}
      {hasError && (
        <div className="absolute inset-0 bg-accent-tertiary/20 flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-accent-tertiary"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
      )}

      {/* 移除按钮 */}
      {!disabled && (
        <button
          type="button"
          onClick={() => onRemove(tempId)}
          className={`
            absolute top-1 right-1
            w-5 h-5 rounded-full
            bg-black/60 hover:bg-black/80
            flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-opacity duration-150
            cursor-pointer
          `}
          title="移除"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {/* 压缩提示 */}
      {wasCompressed && status === 'ready' && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-accent-secondary/80 text-white text-[9px] text-center py-0.5"
          title="图片已压缩以优化传输"
        >
          已压缩
        </div>
      )}

      {/* 文件名 tooltip */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-body truncate px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        title={file.name}
      >
        {file.name}
      </div>

      {/* 错误提示 */}
      {hasError && error && (
        <div
          className="absolute -bottom-6 left-0 right-0 text-accent-tertiary text-[10px] font-body truncate"
          title={t(error)}
        >
          {t(error)}
        </div>
      )}
    </div>
  );
}

export default AttachmentPreview;
