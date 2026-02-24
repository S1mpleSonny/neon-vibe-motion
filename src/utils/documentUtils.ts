/**
 * 文档处理工具函数 (031-multimodal-input)
 *
 * 提供文档文件的格式验证和内容读取功能，支持 .txt 和 .md 格式。
 */

import { ATTACHMENT_CONSTRAINTS } from '../types';

/**
 * 验证文档格式（检查文件扩展名）
 */
export function validateDocumentFormat(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const extension = '.' + fileName.split('.').pop();

  return (ATTACHMENT_CONSTRAINTS.ACCEPTED_DOCUMENT_EXTENSIONS as readonly string[]).includes(
    extension
  );
}

/**
 * 根据文件名获取文档 MIME 类型
 */
export function getDocumentMimeType(fileName: string): string {
  const extension = fileName.toLowerCase().split('.').pop();

  switch (extension) {
    case 'txt':
      return 'text/plain';
    case 'md':
      return 'text/markdown';
    default:
      return 'text/plain';
  }
}

/**
 * 读取文档为文本内容
 *
 * @param file 文档文件
 * @returns 文档的文本内容
 * @throws 文档为空或读取失败时抛出错误
 */
export async function readDocumentAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const text = reader.result as string;

      // 检查文档是否为空
      if (!text || !text.trim()) {
        reject(new Error('EMPTY_DOCUMENT'));
        return;
      }

      resolve(text);
    };

    reader.onerror = () => {
      reject(new Error('READ_ERROR'));
    };

    reader.readAsText(file, 'utf-8');
  });
}

/**
 * 判断文件是否为文档类型
 */
export function isDocumentFile(file: File): boolean {
  // 检查 MIME 类型
  const mimeType = file.type.toLowerCase();
  if (
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    mimeType === 'text/x-markdown'
  ) {
    return true;
  }

  // 检查扩展名（某些系统可能不设置正确的 MIME 类型）
  return validateDocumentFormat(file);
}

/**
 * 判断文件是否为图片类型
 */
export function isImageFile(file: File): boolean {
  const acceptedFormats = ATTACHMENT_CONSTRAINTS.ACCEPTED_IMAGE_FORMATS as readonly string[];
  return acceptedFormats.includes(file.type);
}

/**
 * 获取文件类型（image 或 document）
 *
 * @returns 'image' | 'document' | null (不支持的格式返回 null)
 */
export function getFileType(file: File): 'image' | 'document' | null {
  if (isImageFile(file)) {
    return 'image';
  }

  if (isDocumentFile(file)) {
    return 'document';
  }

  return null;
}
