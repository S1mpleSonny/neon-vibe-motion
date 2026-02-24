/**
 * 消息附件显示组件 (031-multimodal-input)
 *
 * 在消息气泡中显示已发送的附件：图片缩略图或文档图标。
 * 支持点击图片查看大图。
 */

import { useState, useEffect, useCallback } from 'react';
import type { ChatAttachment } from '../../types';
import { useAppStore } from '../../stores/appStore';

interface MessageAttachmentProps {
  /** 消息 ID */
  messageId: string;
  /** 附件 ID 列表 */
  attachmentIds: string[];
}

export function MessageAttachment({ messageId, attachmentIds }: MessageAttachmentProps) {
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { loadMessageAttachments } = useAppStore();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const loaded = await loadMessageAttachments(messageId);
        if (mounted) {
          // 按 attachmentIds 顺序排序
          const sorted = attachmentIds
            .map((id) => loaded.find((a) => a.id === id))
            .filter((a): a is ChatAttachment => a !== undefined);
          setAttachments(sorted);
        }
      } catch (err) {
        console.error('[MessageAttachment] 加载附件失败:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [messageId, attachmentIds, loadMessageAttachments]);

  const handleImageClick = useCallback((imageUrl: string) => {
    setLightboxImage(imageUrl);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  if (loading) {
    return (
      <div className="flex gap-1 mt-1">
        {attachmentIds.map((id) => (
          <div
            key={id}
            className="w-12 h-12 rounded bg-black/20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-1 mt-1">
        {attachments.map((att) => (
          <AttachmentThumbnail
            key={att.id}
            attachment={att}
            onImageClick={handleImageClick}
          />
        ))}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={handleCloseLightbox}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={lightboxImage}
              alt="预览大图"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={handleCloseLightbox}
              className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white"
              title="关闭"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface AttachmentThumbnailProps {
  attachment: ChatAttachment;
  onImageClick: (imageUrl: string) => void;
}

function AttachmentThumbnail({ attachment, onImageClick }: AttachmentThumbnailProps) {
  const isImage = attachment.type === 'image';

  if (isImage) {
    return (
      <button
        type="button"
        onClick={() => onImageClick(attachment.content)}
        className="w-12 h-12 rounded overflow-hidden border border-white/20 hover:border-white/40 transition-colors cursor-pointer"
        title={`${attachment.fileName}${attachment.wasCompressed ? ' (已压缩)' : ''}`}
      >
        <img
          src={attachment.content}
          alt={attachment.fileName}
          className="w-full h-full object-cover"
        />
      </button>
    );
  }

  // Document
  return (
    <div
      className="w-12 h-12 rounded overflow-hidden border border-white/20 bg-black/20 flex flex-col items-center justify-center p-1"
      title={attachment.fileName}
    >
      {/* Document icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-white/70"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
      {/* File extension */}
      <span className="text-[8px] text-white/60 mt-0.5 truncate max-w-full">
        {attachment.fileName.split('.').pop()?.toUpperCase()}
      </span>
    </div>
  );
}

export default MessageAttachment;
