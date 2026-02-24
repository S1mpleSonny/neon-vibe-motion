/**
 * 多模态消息构建器 (031-multimodal-input)
 *
 * 提供将附件内容转换为 OpenAI Chat Completions API 多模态格式的功能。
 */

import type { ChatAttachment, ContentPart } from '../../types';

/**
 * 构建多模态消息内容
 *
 * 将用户文本和附件转换为 OpenAI Chat Completions API 的多模态格式：
 * - 纯文本消息返回 string
 * - 带附件消息返回 ContentPart[]
 *
 * @param text 用户输入的文本
 * @param attachments 附件列表
 * @returns 字符串（纯文本）或 ContentPart 数组（多模态）
 */
export function buildMultimodalContent(
  text: string,
  attachments: ChatAttachment[]
): string | ContentPart[] {
  // 无附件时直接返回文本
  if (attachments.length === 0) {
    return text;
  }

  const parts: ContentPart[] = [];

  // 先添加附件（图片在前，文档在后）
  const images = attachments.filter((att) => att.type === 'image');
  const documents = attachments.filter((att) => att.type === 'document');

  // 添加图片附件
  for (const att of images) {
    parts.push({
      type: 'image_url',
      image_url: {
        url: att.content, // Base64 Data URL
        detail: 'high',
      },
    });
  }

  // 添加文档附件（作为带文件名标题的文本）
  for (const att of documents) {
    parts.push({
      type: 'text',
      text: `[文档: ${att.fileName}]\n${att.content}`,
    });
  }

  // 最后添加用户文本（如果有）
  if (text.trim()) {
    parts.push({
      type: 'text',
      text: text.trim(),
    });
  }

  return parts;
}

/**
 * 检查内容是否为多模态格式
 */
export function isMultimodalContent(content: string | ContentPart[]): content is ContentPart[] {
  return Array.isArray(content);
}

/**
 * 从多模态内容中提取纯文本部分（用于显示或日志）
 */
export function extractTextFromContent(content: string | ContentPart[]): string {
  if (typeof content === 'string') {
    return content;
  }

  const textParts = content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text);

  return textParts.join('\n');
}

/**
 * 统计多模态内容中的图片数量
 */
export function countImagesInContent(content: string | ContentPart[]): number {
  if (typeof content === 'string') {
    return 0;
  }

  return content.filter((part) => part.type === 'image_url').length;
}
