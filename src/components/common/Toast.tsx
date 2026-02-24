/**
 * Toast 组件
 * @module components/common/Toast
 * @description 用于显示系统通知的轻量级 Toast 组件
 * @since 034-preview-performance-guard
 */

import { useCallback } from 'react';
import type { ToastMessage } from '../../types';

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

/**
 * 单个 Toast 消息组件
 */
function ToastItem({ toast, onClose }: ToastProps) {
  const handleClose = useCallback(() => {
    onClose(toast.id);
  }, [toast.id, onClose]);

  // 根据类型选择样式
  const typeStyles: Record<ToastMessage['type'], string> = {
    warning: 'bg-amber-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
    success: 'bg-green-500 text-white',
  };

  const iconMap: Record<ToastMessage['type'], string> = {
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
    success: '✓',
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        min-w-[280px] max-w-[400px]
        animate-slide-in-right
        ${typeStyles[toast.type]}
      `}
      role="alert"
    >
      <span className="text-lg flex-shrink-0">{iconMap[toast.type]}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
        aria-label="关闭"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

/**
 * Toast 容器组件
 * 管理多个 Toast 的显示位置
 */
export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

export default ToastContainer;
