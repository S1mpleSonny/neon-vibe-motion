// ==========================================
// 图片处理工具函数
// ==========================================

import {
  IMAGE_CONSTRAINTS,
  IMAGE_MAGIC_NUMBERS,
  PLACEHOLDER_IMAGE_VALUE,
  type ImageValidationResult,
  type ProcessedImage,
} from '../types';

// 图片缓存
const imageCache = new Map<string, HTMLImageElement>();

/**
 * 验证图片文件格式（MIME 类型 + 魔数双重检查）
 */
export async function validateImageFormat(file: File): Promise<boolean> {
  // 1. 检查 MIME 类型
  if (!IMAGE_CONSTRAINTS.ACCEPTED_FORMATS.includes(file.type as 'image/png' | 'image/jpeg')) {
    return false;
  }

  // 2. 读取文件头魔数
  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 检查 PNG 魔数
  const isPng = IMAGE_MAGIC_NUMBERS.PNG.every((byte, i) => bytes[i] === byte);
  if (isPng && file.type === 'image/png') {
    return true;
  }

  // 检查 JPEG 魔数
  const isJpeg = IMAGE_MAGIC_NUMBERS.JPEG.every((byte, i) => bytes[i] === byte);
  if (isJpeg && file.type === 'image/jpeg') {
    return true;
  }

  return false;
}

/**
 * 验证文件大小限制
 */
export function validateFileSize(file: File): boolean {
  return file.size <= IMAGE_CONSTRAINTS.MAX_FILE_SIZE;
}

/**
 * 读取图片尺寸
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取图片尺寸'));
    };

    img.src = url;
  });
}

/**
 * 缩放图片（使用 Canvas）
 */
export async function resizeImage(
  file: File,
  maxDimension: number = IMAGE_CONSTRAINTS.MAX_DIMENSION
): Promise<Blob> {
  const url = URL.createObjectURL(file);

  try {
    const img = await loadImageFromUrl(url);
    const { width, height } = img;

    // 计算缩放比例
    let newWidth = width;
    let newHeight = height;

    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      newWidth = Math.round(width * ratio);
      newHeight = Math.round(height * ratio);
    } else {
      // 不需要缩放，直接返回原文件
      return file;
    }

    // 使用 Canvas 缩放
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('图片缩放失败'));
          }
        },
        file.type,
        0.92 // JPEG 质量
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 从 URL 加载图片（内部函数）
 */
function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = url;
  });
}

/**
 * 综合处理图片：验证 + 缩放 + 生成 Blob URL
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  // 1. 验证格式
  const isValidFormat = await validateImageFormat(file);
  if (!isValidFormat) {
    throw new Error('INVALID_FORMAT');
  }

  // 2. 验证文件大小
  if (!validateFileSize(file)) {
    throw new Error('FILE_TOO_LARGE');
  }

  // 3. 读取尺寸
  let dimensions: { width: number; height: number };
  try {
    dimensions = await getImageDimensions(file);
  } catch {
    throw new Error('CORRUPTED_FILE');
  }

  // 4. 检查是否需要缩放
  let processedBlob: Blob = file;
  let wasResized = false;

  if (
    dimensions.width > IMAGE_CONSTRAINTS.MAX_DIMENSION ||
    dimensions.height > IMAGE_CONSTRAINTS.MAX_DIMENSION
  ) {
    processedBlob = await resizeImage(file);
    wasResized = true;

    // 重新读取缩放后的尺寸
    const resizedUrl = URL.createObjectURL(processedBlob);
    try {
      const resizedImg = await loadImageFromUrl(resizedUrl);
      dimensions = {
        width: resizedImg.naturalWidth,
        height: resizedImg.naturalHeight,
      };
    } finally {
      URL.revokeObjectURL(resizedUrl);
    }
  }

  // 5. 生成最终的 Blob URL
  const blobUrl = URL.createObjectURL(processedBlob);

  return {
    blobUrl,
    originalFileName: file.name,
    width: dimensions.width,
    height: dimensions.height,
    wasResized,
  };
}

/**
 * 验证图片文件（完整验证流程）
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  // 1. 验证格式
  const isValidFormat = await validateImageFormat(file);
  if (!isValidFormat) {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  // 2. 验证文件大小
  if (!validateFileSize(file)) {
    return { valid: false, error: 'FILE_TOO_LARGE' };
  }

  // 3. 读取尺寸
  let dimensions: { width: number; height: number };
  try {
    dimensions = await getImageDimensions(file);
  } catch {
    return { valid: false, error: 'CORRUPTED_FILE' };
  }

  return {
    valid: true,
    file,
    dimensions,
  };
}

/**
 * 加载图片为 HTMLImageElement（用于 Canvas 渲染）
 */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  // 检查缓存
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  // 处理占位图
  if (url === PLACEHOLDER_IMAGE_VALUE) {
    const placeholderUrl = createPlaceholderImage();
    return loadImage(placeholderUrl);
  }

  const img = await loadImageFromUrl(url);
  imageCache.set(url, img);
  return img;
}

/**
 * 生成 SVG 占位图
 */
export function createPlaceholderImage(
  width: number = 200,
  height: number = 200
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <g fill="#9ca3af" transform="translate(${width / 2 - 24}, ${height / 2 - 24})">
        <path d="M4 4h40v40H4z" fill="none" stroke="#9ca3af" stroke-width="2"/>
        <circle cx="16" cy="16" r="4"/>
        <path d="M4 36l10-12 8 8 12-16 10 20"/>
      </g>
    </svg>
  `.trim();

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * 释放 Blob URL 资源
 */
export function revokeImageUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
    imageCache.delete(url);
  }
}

/**
 * 清理所有图片缓存
 */
export function clearImageCache(): void {
  imageCache.forEach((_, url) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
  imageCache.clear();
}

/**
 * 判断是否为占位图
 */
export function isPlaceholderImage(value: string | undefined): boolean {
  return value === PLACEHOLDER_IMAGE_VALUE || !value;
}

// ==========================================
// 多模态输入支持 (031-multimodal-input)
// ==========================================

import { ATTACHMENT_CONSTRAINTS } from '../types';

/** WebP 魔数 */
const WEBP_MAGIC = [0x52, 0x49, 0x46, 0x46] as const; // "RIFF"
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50] as const; // "WEBP"

/**
 * 验证附件图片格式（支持 PNG、JPEG、WebP，使用魔数检查）
 */
export async function validateAttachmentImageFormat(file: File): Promise<boolean> {
  // 检查 MIME 类型
  const acceptedFormats = ATTACHMENT_CONSTRAINTS.ACCEPTED_IMAGE_FORMATS as readonly string[];
  if (!acceptedFormats.includes(file.type)) {
    return false;
  }

  // 读取文件头魔数
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 检查 PNG 魔数
  const isPng = IMAGE_MAGIC_NUMBERS.PNG.every((byte, i) => bytes[i] === byte);
  if (isPng && file.type === 'image/png') {
    return true;
  }

  // 检查 JPEG 魔数
  const isJpeg = IMAGE_MAGIC_NUMBERS.JPEG.every((byte, i) => bytes[i] === byte);
  if (isJpeg && file.type === 'image/jpeg') {
    return true;
  }

  // 检查 WebP 魔数 (RIFF....WEBP)
  const isWebpRiff = WEBP_MAGIC.every((byte, i) => bytes[i] === byte);
  const isWebpSig = WEBP_SIGNATURE.every((byte, i) => bytes[i + 8] === byte);
  if (isWebpRiff && isWebpSig && file.type === 'image/webp') {
    return true;
  }

  return false;
}

/**
 * 按短边压缩图片 (031-multimodal-input)
 *
 * @param file 原始图片文件
 * @param maxShortEdge 短边最大尺寸 (默认 1080)
 * @returns 压缩后的 Blob 和是否被压缩
 */
export async function compressImageByShortEdge(
  file: File,
  maxShortEdge: number = ATTACHMENT_CONSTRAINTS.IMAGE_SHORT_EDGE_LIMIT
): Promise<{ blob: Blob; wasCompressed: boolean; dimensions: { width: number; height: number } }> {
  const url = URL.createObjectURL(file);

  try {
    const img = await loadImageFromUrl(url);
    const { width, height } = { width: img.naturalWidth, height: img.naturalHeight };

    // 计算短边
    const shortEdge = Math.min(width, height);

    // 如果短边不超过限制，不压缩
    if (shortEdge <= maxShortEdge) {
      return {
        blob: file,
        wasCompressed: false,
        dimensions: { width, height },
      };
    }

    // 计算缩放比例（基于短边）
    const ratio = maxShortEdge / shortEdge;
    const newWidth = Math.round(width * ratio);
    const newHeight = Math.round(height * ratio);

    // 使用 Canvas 缩放
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // 输出为 JPEG（压缩效果更好）或保持原格式
    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const quality = 0.92;

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              wasCompressed: true,
              dimensions: { width: newWidth, height: newHeight },
            });
          } else {
            reject(new Error('图片压缩失败'));
          }
        },
        outputType,
        quality
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 图片文件转 Base64 Data URL (031-multimodal-input)
 */
export async function imageToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('图片转换失败'));
    reader.readAsDataURL(blob);
  });
}
