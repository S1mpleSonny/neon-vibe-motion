import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ToastContainer } from '../common';
import { useAppStore } from '../../stores/appStore';
import { createRendererForMotion } from '../../services/renderer';
import { useDebounce } from '../../hooks/useDebounce';
import { calculatePreviewDimensions, getAspectRatio } from '../../utils/coordinates';
import { validateMotionCode } from '../../services/llm/codeValidator';
import { CodeWarning } from './CodeWarning';
import type { RendererService, CanvasDimensions, RenderError, CodeValidationResult, PerformanceWarning } from '../../types';
import type { CoreRenderer } from '../../services/core/CoreRenderer.interface';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function PreviewCanvas() {
  const { t } = useTranslation();
  const {
    currentMotion,
    isPlaying,
    currentTime,
    setIsPlaying,
    setCurrentTime,
    aspectRatio,
    // Error state (009-js-error-autofix)
    setRenderError,
    clearErrorState,
    // Preview background state (033-preview-background)
    previewBackgroundUrl,
    setPreviewBackgroundUrl,
    // Toast state (034-preview-performance-guard)
    toasts,
    addToast,
    removeToast,
  } = useAppStore();

  // Hidden file input ref for background upload (033-preview-background)
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<RendererService | null>(null);
  const timeUpdateIntervalRef = useRef<number | null>(null);
  const lastMotionIdRef = useRef<string | null>(null);
  const lastMotionCodeRef = useRef<string | null>(null);

  // 错误状态追踪，用于判断是否可以自动播放
  const [hasRenderError, setHasRenderError] = useState(false);

  // 追踪 container 是否已挂载，用于处理 currentMotion 从 null 变为有值时的情况
  const [containerMounted, setContainerMounted] = useState(false);

  // 动态时长状态 (025-dynamic-duration)
  const [effectiveDuration, setEffectiveDuration] = useState<number>(0);

  // 代码校验警告状态 (016-deterministic-render)
  const [showCodeWarning, setShowCodeWarning] = useState(true);

  // 对当前代码进行校验
  const codeValidation: CodeValidationResult | null = useMemo(() => {
    if (!currentMotion?.code) return null;
    return validateMotionCode(currentMotion.code);
  }, [currentMotion?.code]);

  // 当代码变化时重新显示警告
  useEffect(() => {
    setShowCodeWarning(true);
  }, [currentMotion?.code]);

  // Error callback for renderer (009-js-error-autofix)
  const handleRenderError = useCallback((error: RenderError) => {
    console.log('[PreviewCanvas] Received render error:', error.message);
    setRenderError(error);
    setHasRenderError(true);
  }, [setRenderError]);

  // Duration change callback (025-dynamic-duration)
  const handleDurationChange = useCallback((newDuration: number) => {
    console.log('[PreviewCanvas] 动态时长已更新:', newDuration);
    setEffectiveDuration(newDuration);
  }, []);

  // Performance warning callback (034-preview-performance-guard)
  const handlePerformanceWarning = useCallback((warning: PerformanceWarning) => {
    console.log('[PreviewCanvas] 性能警告，单帧渲染耗时:', warning.elapsed.toFixed(0), 'ms');
    // 暂停播放
    setIsPlaying(false);
    // 显示警告 Toast
    addToast({
      type: 'warning',
      message: t('preview.performanceWarning', { elapsed: (warning.elapsed / 1000).toFixed(1) }),
      duration: 5000,
    });
  }, [setIsPlaying, addToast]);

  // 预览尺寸状态
  const [previewDimensions, setPreviewDimensions] = useState<CanvasDimensions>({ width: 640, height: 360 });

  // Initialize renderer only when motion ID or code changes (new motion generated or code modified)
  const motionId = currentMotion?.id ?? null;
  const motionCode = currentMotion?.code ?? null;

  // 当 container 挂载/卸载时更新状态
  const containerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerMounted(!!node);
  }, []);

  // 计算预览尺寸，根据画面比例和容器大小
  const updatePreviewDimensions = useCallback(() => {
    if (!previewAreaRef.current) return;

    const rect = previewAreaRef.current.getBoundingClientRect();
    // 留出一些 padding
    const availableWidth = rect.width - 32;
    const availableHeight = rect.height - 32;

    if (availableWidth > 0 && availableHeight > 0) {
      const dims = calculatePreviewDimensions(aspectRatio, availableWidth, availableHeight);
      setPreviewDimensions(dims);
    }
  }, [aspectRatio]);

  // 监听画面比例变化和窗口大小变化
  useEffect(() => {
    updatePreviewDimensions();

    const handleResize = () => {
      updatePreviewDimensions();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePreviewDimensions]);

  // 追踪上次使用的预览尺寸
  const lastPreviewDimsRef = useRef<{ width: number; height: number } | null>(null);

  useEffect(() => {
    console.log('[PreviewCanvas] 检查渲染器初始化, motionId:', motionId, '上一个:', lastMotionIdRef.current, 'containerMounted:', containerMounted);

    if (!containerRef.current || !currentMotion) {
      console.log('[PreviewCanvas] container 或 motion 为空，清理渲染器');
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
      lastMotionIdRef.current = null;
      lastMotionCodeRef.current = null;
      lastPreviewDimsRef.current = null;
      setHasRenderError(false);
      return;
    }

    // 检查 motion ID、code 或预览尺寸是否变化
    const idChanged = lastMotionIdRef.current !== motionId;
    const codeChanged = lastMotionCodeRef.current !== motionCode;
    const dimsChanged = !lastPreviewDimsRef.current ||
      lastPreviewDimsRef.current.width !== previewDimensions.width ||
      lastPreviewDimsRef.current.height !== previewDimensions.height;

    if (!idChanged && !codeChanged && !dimsChanged) {
      console.log('[PreviewCanvas] motion ID、code 和尺寸均未变化，跳过重建');
      return;
    }

    console.log('[PreviewCanvas] 需要重建渲染器, idChanged:', idChanged, 'codeChanged:', codeChanged, 'dimsChanged:', dimsChanged);

    // Clean up previous renderer
    if (rendererRef.current) {
      console.log('[PreviewCanvas] 清理旧渲染器');
      rendererRef.current.destroy();
    }

    // Clear container
    containerRef.current.innerHTML = '';

    // Create motion with preview dimensions for proper rendering
    // This ensures canvas pixel size matches container size (no CSS distortion)
    const previewMotion = {
      ...currentMotion,
      width: previewDimensions.width,
      height: previewDimensions.height,
    };

    // Clear any previous error state BEFORE initialization (009-js-error-autofix)
    // This must be done before initialize() because initialize() may set new errors
    clearErrorState();

    // Track if error occurred during initialization via callback (009-js-error-autofix)
    let initializationError = false;
    const errorCallback = (error: RenderError) => {
      initializationError = true;
      handleRenderError(error);
    };

    // Create new renderer with error, duration change, and performance warning callbacks
    console.log('[PreviewCanvas] 创建新渲染器, renderMode:', currentMotion.renderMode, 'previewDims:', previewDimensions);
    const renderer = createRendererForMotion(previewMotion, {
      onError: errorCallback,
      onDurationChange: handleDurationChange,
      onPerformanceWarning: handlePerformanceWarning,
    });

    try {
      renderer.initialize(containerRef.current, previewMotion);
      rendererRef.current = renderer;
      lastMotionIdRef.current = motionId;
      lastMotionCodeRef.current = motionCode;
      lastPreviewDimsRef.current = { ...previewDimensions };

      // Only clear local error state if no error occurred during initialization
      if (!initializationError) {
        setHasRenderError(false);
        console.log('[PreviewCanvas] 渲染器初始化成功');

        // 获取初始动态时长 (025-dynamic-duration)
        const coreRenderer = renderer as unknown as CoreRenderer;
        if (coreRenderer.getDuration) {
          const initialDuration = coreRenderer.getDuration();
          setEffectiveDuration(initialDuration);
          console.log('[PreviewCanvas] 初始动态时长:', initialDuration);
        }

        // T002/T003: 新动效生成后自动播放
        // 渲染器初始化成功后，自动从头开始播放
        setCurrentTime(0);
        renderer.play();
        setIsPlaying(true);
        console.log('[PreviewCanvas] 新动效自动播放已启动');
      } else {
        console.log('[PreviewCanvas] 渲染器初始化完成但有错误，不自动播放');
        setHasRenderError(true);
        setIsPlaying(false);
        setCurrentTime(0);
      }
    } catch (err) {
      console.error('[PreviewCanvas] 渲染器初始化失败:', err);
      // T004: 渲染错误时不触发自动播放
      setHasRenderError(true);
      setIsPlaying(false);
      setCurrentTime(0);
    }

    // 注意：不在这里添加 cleanup 函数，因为我们只想在 motionId/code 真正变化时才销毁渲染器
    // cleanup 会在下一次 effect 执行时（即 motionId/code 变化时）通过上面的逻辑处理
  }, [motionId, motionCode, currentMotion, containerMounted, previewDimensions, setIsPlaying, setCurrentTime, handleRenderError, handleDurationChange, handlePerformanceWarning, clearErrorState]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        console.log('[PreviewCanvas] 组件卸载，清理渲染器');
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, []);

  // 使用 updatedAt 作为参数变化的检测依据
  const motionUpdatedAt = currentMotion?.updatedAt ?? 0;

  // T006: 对 updatedAt 应用 200ms 防抖，避免快速参数变更时频繁重播
  const debouncedUpdatedAt = useDebounce(motionUpdatedAt, 200);

  // 用于追踪是否是首次渲染（避免初始化时重复触发）
  const isFirstRenderRef = useRef(true);
  const lastDebouncedUpdatedAtRef = useRef<number>(0);

  // 监听参数变化，实时更新渲染器
  useEffect(() => {
    if (!rendererRef.current || !currentMotion) return;

    // 只有在同一个 motion（ID 相同）且 updatedAt 变化时才同步参数
    if (lastMotionIdRef.current !== motionId) return;

    console.log('[PreviewCanvas] 参数已更新 (updatedAt:', motionUpdatedAt, ')，同步到渲染器');

    // 019-video-input-support: 同步动效时长（视频上传后可能改变）
    if (rendererRef.current.updateDuration) {
      rendererRef.current.updateDuration(currentMotion.duration);
    }

    currentMotion.parameters.forEach((param) => {
      let value: unknown;
      switch (param.type) {
        case 'number':
          value = param.value;
          break;
        case 'color':
          value = param.colorValue;
          break;
        case 'select':
          value = param.selectedValue;
          break;
        case 'boolean':
          value = param.boolValue;
          break;
        case 'image':
          value = param.imageValue;
          break;
        case 'video':
          // 019-video-input-support: 同步视频参数
          value = param.videoValue;
          break;
        case 'string':
          // 028-string-param: 同步字符串参数
          value = param.stringValue;
          break;
      }
      if (value !== undefined) {
        console.log('[PreviewCanvas] 同步参数:', param.id, '=', value);
        rendererRef.current?.updateParameter(param.id, value);
      }
    });
  }, [motionUpdatedAt, motionId, currentMotion]);

  // T007/T008/T010: 参数变更后自动重播（使用防抖后的 updatedAt）
  useEffect(() => {
    // 跳过首次渲染，避免与新动效自动播放冲突
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      lastDebouncedUpdatedAtRef.current = debouncedUpdatedAt;
      return;
    }

    // 检查防抖后的 updatedAt 是否真的变化了
    if (lastDebouncedUpdatedAtRef.current === debouncedUpdatedAt) {
      return;
    }
    lastDebouncedUpdatedAtRef.current = debouncedUpdatedAt;

    // 确保渲染器存在且无错误
    if (!rendererRef.current || !currentMotion || hasRenderError) {
      console.log('[PreviewCanvas] 跳过自动重播: 渲染器不可用或有错误');
      return;
    }

    // 只有在同一个 motion 时才触发重播
    if (lastMotionIdRef.current !== motionId) {
      return;
    }

    console.log('[PreviewCanvas] 参数变更后自动重播 (debouncedUpdatedAt:', debouncedUpdatedAt, ')');

    // 从头开始播放
    rendererRef.current.seek(0);
    rendererRef.current.play();
    setIsPlaying(true);
    setCurrentTime(0);
  }, [debouncedUpdatedAt, motionId, currentMotion, hasRenderError, setIsPlaying, setCurrentTime]);

  // Handle play/pause
  useEffect(() => {
    if (!rendererRef.current) return;

    if (isPlaying) {
      rendererRef.current.play();

      // Update current time periodically
      timeUpdateIntervalRef.current = window.setInterval(() => {
        if (rendererRef.current) {
          setCurrentTime(rendererRef.current.getCurrentTime());
        }
      }, 100);
    } else {
      rendererRef.current.pause();

      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    }

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    };
  }, [isPlaying, setCurrentTime]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const handleStop = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.stop();
    }
    setIsPlaying(false);
    setCurrentTime(0);
  }, [setIsPlaying, setCurrentTime]);

  // 使用动态时长，降级到 motion.duration (025-dynamic-duration)
  const duration = effectiveDuration || currentMotion?.duration || 0;
  const displayCurrentTime = Math.min(currentTime, duration);

  // Background upload handler (033-preview-background T004-T006)
  const handleBackgroundUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // T005: 文件类型校验（PNG/JPG/WebP）
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert(t('preview.imageTypeError'));
      e.target.value = ''; // Reset input
      return;
    }

    // T006: 大文件警告（>10MB）
    if (file.size > 10 * 1024 * 1024) {
      console.warn('[PreviewCanvas] 背景图较大，建议使用小于 10MB 的图片');
    }

    // Create Blob URL and set to store
    const url = URL.createObjectURL(file);
    setPreviewBackgroundUrl(url);

    // Reset input to allow re-selecting the same file
    e.target.value = '';
  }, [setPreviewBackgroundUrl]);

  // Clear background handler (033-preview-background)
  const handleClearBackground = useCallback(() => {
    setPreviewBackgroundUrl(null);
  }, [setPreviewBackgroundUrl]);

  return (
    <div className="flex flex-col h-full">
      {/* Hidden file input for background upload (033-preview-background) */}
      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleBackgroundUpload}
        className="hidden"
      />

      {/* Preview header */}
      <div className="p-3 border-b border-border-default bg-background-elevated shrink-0">
        <h2 className="text-sm font-medium font-display text-text-primary">{t('preview.title')}</h2>
      </div>

      {/* Preview area */}
      <div
        ref={previewAreaRef}
        className="flex-1 flex items-center justify-center bg-background-primary p-4 overflow-hidden relative"
      >
        {/* Letterbox/Pillarbox container */}
        <div
          className="relative flex items-center justify-center bg-gray-900/50 rounded-lg overflow-hidden"
          style={{
            width: previewDimensions.width,
            height: previewDimensions.height,
          }}
        >
          {/* 霓虹虚线边框 - 预览区域指示器 */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* 虚线边框 */}
            <div className="absolute inset-0 border-2 border-dashed border-accent-primary/50 rounded-md shadow-neon-soft" />

            {/* 四角标记 */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent-primary rounded-tl-sm" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-accent-primary rounded-tr-sm" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-accent-primary rounded-bl-sm" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent-primary rounded-br-sm" />
          </div>

          {currentMotion ? (
            <div className="relative w-full h-full">
              {/* Code validation warning (016-deterministic-render) */}
              {codeValidation && codeValidation.issues.length > 0 && showCodeWarning && (
                <CodeWarning
                  validation={codeValidation}
                  onDismiss={() => setShowCodeWarning(false)}
                />
              )}
              {/* T007: Background image container with CSS background (033-preview-background) */}
              <div
                className="w-full h-full overflow-hidden rounded-md"
                style={{
                  backgroundImage: previewBackgroundUrl ? `url(${previewBackgroundUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                <div
                  ref={containerCallbackRef}
                  className="overflow-hidden"
                  style={{
                    width: '100%',
                    height: '100%',
                    // Make canvas container transparent when background is set
                    backgroundColor: previewBackgroundUrl ? 'transparent' : '#0A0A0F',
                  }}
                />
              </div>
              {/* T002-T003: Background upload button and hint (033-preview-background) */}
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                {previewBackgroundUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearBackground}
                    className="text-xs opacity-70 hover:opacity-100"
                  >
                    {t('preview.clearBackground')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => backgroundInputRef.current?.click()}
                  className="text-xs opacity-70 hover:opacity-100"
                >
                  {previewBackgroundUrl ? t('preview.changeBackground') : t('preview.uploadBackground')}
                </Button>
              </div>
              {/* T003: Hint text (033-preview-background) */}
              <div className="absolute bottom-2 left-2 text-xs text-text-muted opacity-60 font-body">
                {t('preview.backgroundHint')}
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-md" style={{ backgroundColor: '#0A0A0F' }}>
              <div className="text-center">
                <p className="font-display text-text-primary/90">{t('preview.area')}</p>
                <p className="text-sm mt-1 font-body text-text-secondary">{t('preview.areaHint')}</p>
                <p className="text-xs mt-2 font-mono text-accent-primary">
                  {getAspectRatio(aspectRatio).label}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div className="relative h-14 bg-background-elevated border-t border-border-default flex items-center justify-center gap-4 px-4 shrink-0 overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
          disabled={!currentMotion}
        >
          {t('preview.reset')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handlePlayPause}
          disabled={!currentMotion}
        >
          {isPlaying ? t('preview.pause') : t('preview.play')}
        </Button>
        <span className="text-sm font-mono text-text-muted min-w-[100px] text-center">
          {formatTime(displayCurrentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Toast container (034-preview-performance-guard) */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default PreviewCanvas;
