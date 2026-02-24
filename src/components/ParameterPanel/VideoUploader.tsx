// ==========================================
// 视频上传组件 (019-video-input-support)
// ==========================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdjustableParameter, VideoValidationError, ProcessedVideo } from '../../types';
import { VIDEO_CONSTRAINTS, VIDEO_ERROR_MESSAGES } from '../../types';
import { processVideo, isPlaceholderVideo, createPlaceholderVideo } from '../../utils/videoUtils';

interface VideoUploaderProps {
  parameter: AdjustableParameter;
  onChange: (value: string, videoInfo?: ProcessedVideo) => void;
}

export function VideoUploader({ parameter, onChange }: VideoUploaderProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<VideoValidationError | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentVideoUrl = parameter.videoValue ?? parameter.placeholderVideo;
  const isPlaceholder = isPlaceholderVideo(currentVideoUrl);
  const displayFileName = parameter.videoFileName;

  // 清理错误超时
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // 显示错误并自动隐藏
  const showError = useCallback((errorCode: VideoValidationError) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    setError(errorCode);
    // 3秒后自动隐藏错误
    errorTimeoutRef.current = setTimeout(() => {
      setError(null);
      errorTimeoutRef.current = null;
    }, 3000);
  }, []);

  // 处理文件选择
  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await processVideo(file);
        onChange(result.blobUrl, result);
      } catch (err) {
        const errorCode = (err instanceof Error ? err.message : 'LOAD_ERROR') as VideoValidationError;
        showError(errorCode);
      } finally {
        setIsLoading(false);
      }
    },
    [onChange, showError]
  );

  // 点击上传
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // 文件选择变更
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // 重置 input 以便可以重复选择同一文件
    e.target.value = '';
  };

  // 拖拽事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  // 格式化时长显示
  const formatDuration = (ms: number | undefined): string => {
    if (!ms) return '';
    const seconds = Math.round(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}秒`;
  };

  // 生成缩略图 URL（对于占位符使用 SVG）
  const thumbnailUrl = isPlaceholder ? createPlaceholderVideo(48, 48) : currentVideoUrl;

  return (
    <div className="py-2">
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {parameter.name}
      </label>

      {/* 上传区域 */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex items-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer
          transition-colors duration-200
          ${isDragOver
            ? 'border-blue-400 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
          }
          ${isLoading ? 'opacity-60 pointer-events-none' : ''}
        `}
      >
        {/* 缩略图预览 */}
        <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-slate-700/50 ring-1 ring-white/10">
          {isPlaceholder ? (
            <img
              src={thumbnailUrl}
              alt={parameter.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              src={currentVideoUrl}
              className="w-full h-full object-cover"
              muted
              playsInline
              onLoadedData={(e) => {
                // 显示第一帧
                const video = e.currentTarget;
                video.currentTime = 0;
              }}
            />
          )}
        </div>

        {/* 文件信息 */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">处理中...</span>
            </div>
          ) : displayFileName ? (
            <div>
              <p className="text-sm text-slate-200 truncate">{displayFileName}</p>
              <p className="text-xs text-slate-500">
                {parameter.videoDuration && formatDuration(parameter.videoDuration)}
                {parameter.videoDuration && ' · '}
                点击或拖拽更换视频
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-300">点击或拖拽上传视频</p>
              <p className="text-xs text-slate-500">支持 MP4、WebM 格式</p>
            </div>
          )}
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={VIDEO_CONSTRAINTS.ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-2 flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-md">
          <svg
            className="flex-shrink-0 w-4 h-4 mt-0.5 text-red-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs text-red-300">
            {t(VIDEO_ERROR_MESSAGES[error] || 'error.upload.fallback')}
          </p>
        </div>
      )}
    </div>
  );
}

export default VideoUploader;
