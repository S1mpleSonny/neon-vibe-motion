/**
 * 对话会话导出服务
 * Feature: 030-session-export
 */

import type {
  Conversation,
  MotionDefinition,
  AdjustableParameter,
  SerializedParameter,
  SerializedMotionDefinition,
  SerializedConversation,
  ExportedConversation,
} from '@/types';
import { downloadFile } from '@/utils/fileUtils';
import { blobUrlToBase64 } from './imageSerializer';
import {
  APP_VERSION,
  EXPORT_FILE_EXTENSION,
  EXPORT_MIME_TYPE,
  PLACEHOLDER_CONSTANTS,
} from './constants';

/**
 * 序列化单个参数
 * - 图片参数：Blob URL → Base64 Data URL
 * - 视频：保留占位符
 * - 其他参数：原样保留
 *
 * @param param - 原始参数
 * @returns Promise<SerializedParameter>
 */
export async function serializeParameter(
  param: AdjustableParameter
): Promise<SerializedParameter> {
  const serialized: SerializedParameter = { ...param };

  switch (param.type) {
    case 'image':
      // 图片：Blob URL → Base64
      if (param.imageValue && param.imageValue.startsWith('blob:')) {
        try {
          serialized.imageValue = await blobUrlToBase64(param.imageValue);
        } catch (error) {
          console.warn(`[Exporter] 图片序列化失败: ${param.id}`, error);
        }
      }
      break;

    case 'video':
      // 视频：保留占位符
      if (param.videoValue && param.videoValue.startsWith('blob:')) {
        serialized.videoValue = PLACEHOLDER_CONSTANTS.VIDEO;
      }
      break;
  }

  return serialized;
}

/**
 * 序列化动效定义
 * 处理所有参数的序列化
 *
 * @param motion - 原始动效定义
 * @returns Promise<SerializedMotionDefinition>
 */
export async function serializeMotionDefinition(
  motion: MotionDefinition
): Promise<SerializedMotionDefinition> {
  // 并行序列化所有参数
  const serializedParameters = await Promise.all(
    motion.parameters.map(serializeParameter)
  );

  return {
    ...motion,
    parameters: serializedParameters,
  };
}

/**
 * 序列化对话
 * 处理动效定义的序列化
 *
 * @param conversation - 原始对话
 * @returns Promise<SerializedConversation>
 */
export async function serializeConversation(
  conversation: Conversation
): Promise<SerializedConversation> {
  let serializedMotion: SerializedMotionDefinition | null = null;

  if (conversation.motion) {
    serializedMotion = await serializeMotionDefinition(conversation.motion);
  }

  return {
    id: conversation.id,
    title: conversation.title,
    messages: conversation.messages,
    motion: serializedMotion,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

/**
 * 导出单个对话
 * 创建 ExportedConversation 并触发下载
 *
 * @param conversation - 要导出的对话
 * @param filename - 可选的文件名（不含扩展名），默认使用对话标题
 */
export async function exportConversation(
  conversation: Conversation,
  filename?: string
): Promise<void> {
  // 序列化对话
  const serializedConversation = await serializeConversation(conversation);

  // 创建导出对象
  const exportData: ExportedConversation = {
    version: APP_VERSION,
    exportedAt: Date.now(),
    conversation: serializedConversation,
  };

  // 生成 JSON 内容
  const jsonContent = JSON.stringify(exportData, null, 2);

  // 生成文件名
  const safeFilename = sanitizeFilename(filename || conversation.title);
  const fullFilename = `${safeFilename}${EXPORT_FILE_EXTENSION}`;

  // 触发下载
  downloadFile(jsonContent, fullFilename, EXPORT_MIME_TYPE);
}

/**
 * 批量导出多个对话
 * 创建 ExportedConversation[] 并触发下载
 *
 * @param conversations - 要导出的对话数组
 * @param filename - 可选的文件名（不含扩展名），默认为 "conversations-export"
 */
export async function exportConversations(
  conversations: Conversation[],
  filename?: string
): Promise<void> {
  // 并行序列化所有对话
  const exportDataArray: ExportedConversation[] = await Promise.all(
    conversations.map(async (conv) => {
      const serializedConversation = await serializeConversation(conv);
      return {
        version: APP_VERSION,
        exportedAt: Date.now(),
        conversation: serializedConversation,
      };
    })
  );

  // 生成 JSON 内容
  const jsonContent = JSON.stringify(exportDataArray, null, 2);

  // 生成文件名
  const defaultName = `conversations-export-${conversations.length}`;
  const safeFilename = sanitizeFilename(filename || defaultName);
  const fullFilename = `${safeFilename}${EXPORT_FILE_EXTENSION}`;

  // 触发下载
  downloadFile(jsonContent, fullFilename, EXPORT_MIME_TYPE);
}

/**
 * 清理文件名中的非法字符
 * @param name - 原始文件名
 * @returns 安全的文件名
 */
function sanitizeFilename(name: string): string {
  // 移除或替换非法字符
  return name
    .replace(/[<>:"/\\|?*]/g, '_') // Windows 非法字符
    .replace(/[\x00-\x1f]/g, '') // 控制字符
    .replace(/\s+/g, '_') // 空格替换为下划线
    .substring(0, 100); // 限制长度
}
