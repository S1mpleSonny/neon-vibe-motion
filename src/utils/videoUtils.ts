// ==========================================
// 视频处理工具函数 (019-video-input-support)
// ==========================================

import {
  VIDEO_CONSTRAINTS,
  PLACEHOLDER_VIDEO_VALUE,
  type VideoValidationResult,
  type ProcessedVideo,
} from '../types';

// 视频缓存
const videoCache = new Map<string, HTMLVideoElement>();

/**
 * 验证视频文件格式（MIME 类型检查）
 */
export function validateVideoFormat(file: File): boolean {
  return VIDEO_CONSTRAINTS.ACCEPTED_FORMATS.includes(
    file.type as 'video/mp4' | 'video/webm'
  );
}

/**
 * 验证文件大小限制
 */
export function validateVideoFileSize(file: File): boolean {
  return file.size <= VIDEO_CONSTRAINTS.MAX_FILE_SIZE;
}

/**
 * 获取视频元数据（时长、分辨率）
 */
export function getVideoMetadata(
  file: File
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration * 1000, // 转换为毫秒
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('CORRUPTED_FILE'));
    };

    video.src = url;
  });
}

/**
 * 验证视频时长
 */
export function validateVideoDuration(durationMs: number): boolean {
  return durationMs <= VIDEO_CONSTRAINTS.MAX_DURATION;
}

/**
 * 综合处理视频：验证 + 生成 Blob URL
 */
export async function processVideo(file: File): Promise<ProcessedVideo> {
  // 1. 验证格式
  if (!validateVideoFormat(file)) {
    throw new Error('INVALID_FORMAT');
  }

  // 2. 验证文件大小
  if (!validateVideoFileSize(file)) {
    throw new Error('FILE_TOO_LARGE');
  }

  // 3. 获取元数据
  let metadata: { duration: number; width: number; height: number };
  try {
    metadata = await getVideoMetadata(file);
  } catch {
    throw new Error('CORRUPTED_FILE');
  }

  // 4. 验证时长
  if (!validateVideoDuration(metadata.duration)) {
    throw new Error('DURATION_TOO_LONG');
  }

  // 5. 生成 Blob URL（视频暂不支持自动缩放）
  const blobUrl = URL.createObjectURL(file);

  return {
    blobUrl,
    originalFileName: file.name,
    duration: metadata.duration,
    width: metadata.width,
    height: metadata.height,
    wasResized: false, // 视频暂不支持自动缩放
  };
}

/**
 * 验证视频文件（完整验证流程）
 */
export async function validateVideoFile(file: File): Promise<VideoValidationResult> {
  // 1. 验证格式
  if (!validateVideoFormat(file)) {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  // 2. 验证文件大小
  if (!validateVideoFileSize(file)) {
    return { valid: false, error: 'FILE_TOO_LARGE' };
  }

  // 3. 获取元数据
  let metadata: { duration: number; width: number; height: number };
  try {
    metadata = await getVideoMetadata(file);
  } catch {
    return { valid: false, error: 'CORRUPTED_FILE' };
  }

  // 4. 验证时长
  if (!validateVideoDuration(metadata.duration)) {
    return { valid: false, error: 'DURATION_TOO_LONG' };
  }

  // 5. 分辨率警告（不阻止上传）
  if (
    metadata.width > VIDEO_CONSTRAINTS.MAX_DIMENSION ||
    metadata.height > VIDEO_CONSTRAINTS.MAX_DIMENSION
  ) {
    // 返回有效但带警告
    return {
      valid: true,
      error: 'RESOLUTION_TOO_LARGE', // 警告类型
      file,
      metadata,
    };
  }

  return {
    valid: true,
    file,
    metadata,
  };
}

/**
 * 从 URL 加载视频元素
 * (022-precise-frame-video: 移除自动播放，改用精确帧定位)
 */
function loadVideoFromUrl(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    video.oncanplaythrough = () => {
      // 022-precise-frame-video: 不再自动播放，改用精确帧定位
      resolve(video);
    };
    video.onerror = () => reject(new Error('LOAD_ERROR'));

    video.src = url;
    video.load();
  });
}

/**
 * 加载视频为 HTMLVideoElement（用于 Canvas 渲染）
 */
export async function loadVideo(url: string): Promise<HTMLVideoElement> {
  // 检查缓存
  if (videoCache.has(url)) {
    return videoCache.get(url)!;
  }

  // 处理占位视频
  if (url === PLACEHOLDER_VIDEO_VALUE || !url) {
    const placeholderUrl = createPlaceholderVideo();
    const video = await loadVideoFromUrl(placeholderUrl);
    videoCache.set(url, video);
    return video;
  }

  const video = await loadVideoFromUrl(url);
  videoCache.set(url, video);
  return video;
}

/**
 * 生成 SVG 占位视频（静态图像作为视频源）
 */
export function createPlaceholderVideo(
  width: number = 200,
  height: number = 200
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#1f2937"/>
      <g fill="#6b7280" transform="translate(${width / 2 - 24}, ${height / 2 - 24})">
        <rect x="4" y="4" width="40" height="40" rx="4" fill="none" stroke="#6b7280" stroke-width="2"/>
        <polygon points="18,14 18,34 34,24" fill="#6b7280"/>
      </g>
      <text x="${width / 2}" y="${height - 20}" text-anchor="middle" fill="#6b7280" font-size="12" font-family="sans-serif">
        视频占位符
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * 释放视频 Blob URL 资源
 */
export function revokeVideoUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
    videoCache.delete(url);
  }
}

/**
 * 清理所有视频缓存
 */
export function clearVideoCache(): void {
  videoCache.forEach((video, url) => {
    // 暂停视频播放
    video.pause();
    video.src = '';
    video.load();

    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
  videoCache.clear();
}

/**
 * 判断是否为占位视频
 */
export function isPlaceholderVideo(value: string | undefined): boolean {
  return value === PLACEHOLDER_VIDEO_VALUE || !value;
}

/**
 * 获取视频缓存（用于调试）
 */
export function getVideoCache(): Map<string, HTMLVideoElement> {
  return videoCache;
}

// ==========================================
// 精确帧定位工具函数 (022-precise-frame-video)
// ==========================================

/**
 * 克隆视频元素（用于导出隔离）
 * 创建一个独立的视频对象副本，共享相同的 Blob URL
 * @param original 原始视频元素
 * @returns Promise<HTMLVideoElement> 克隆的视频元素
 */
export function cloneVideoElement(original: HTMLVideoElement): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const clone = document.createElement('video');
    clone.src = original.src;
    clone.muted = true;
    clone.preload = 'auto';

    const onLoaded = () => {
      clone.removeEventListener('loadeddata', onLoaded);
      clone.removeEventListener('error', onError);
      resolve(clone);
    };

    const onError = () => {
      clone.removeEventListener('loadeddata', onLoaded);
      clone.removeEventListener('error', onError);
      reject(new Error('视频克隆失败'));
    };

    clone.addEventListener('loadeddata', onLoaded, { once: true });
    clone.addEventListener('error', onError, { once: true });

    // 5秒超时
    setTimeout(() => {
      clone.removeEventListener('loadeddata', onLoaded);
      clone.removeEventListener('error', onError);
      reject(new Error('视频克隆超时'));
    }, 5000);
  });
}

/**
 * 精确定位视频到指定时间点
 * @param video 视频元素
 * @param timeMs 目标时间（毫秒）
 * @param timeoutMs 超时时间（毫秒），默认 200ms
 * @returns Promise<void> 在 seek 完成或超时后 resolve
 */
export function syncVideoToTime(
  video: HTMLVideoElement,
  timeMs: number,
  timeoutMs = 200
): Promise<void> {
  return new Promise((resolve) => {
    const timeInSeconds = timeMs / 1000;
    const videoDuration = video.duration || 1;
    let targetTime = timeInSeconds % videoDuration;

    // 边界处理：避免跳回第一帧
    // 当时间正好是视频时长的整数倍时，取模为 0，应该定位到最后一帧
    if (targetTime === 0 && timeInSeconds > 0) {
      targetTime = videoDuration - 0.001;
    }

    // 如果已经在目标位置，直接返回
    if (Math.abs(video.currentTime - targetTime) < 0.01) {
      resolve();
      return;
    }

    // 确保视频暂停（精确帧定位模式下不使用自然播放）
    if (!video.paused) {
      video.pause();
    }

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };

    video.addEventListener('seeked', onSeeked);
    video.currentTime = targetTime;

    // 超时保护
    setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    }, timeoutMs);
  });
}
