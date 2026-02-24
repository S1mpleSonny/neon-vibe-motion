/**
 * 对话会话导入服务
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
  ImportResult,
  ImportError,
} from '@/types';
import { readFileAsText } from '@/utils/fileUtils';
import { generateId } from '@/utils/id';
import { base64ToBlobUrl, isBase64ImageDataUrl } from './imageSerializer';
import { validateExportFile } from './validator';
import { PLACEHOLDER_CONSTANTS, IMPORT_TITLE_SUFFIX, IMPORT_ERROR_MESSAGES } from './constants';

const generateUUID = generateId;

/**
 * 反序列化单个参数
 * - 图片参数：Base64 Data URL → Blob URL
 * - 视频占位符：保持占位符状态
 *
 * @param param - 序列化的参数
 * @returns AdjustableParameter
 */
export function deserializeParameter(param: SerializedParameter): AdjustableParameter {
  const deserialized: AdjustableParameter = { ...param };

  switch (param.type) {
    case 'image':
      // 图片：Base64 → Blob URL
      if (param.imageValue && isBase64ImageDataUrl(param.imageValue)) {
        deserialized.imageValue = base64ToBlobUrl(param.imageValue);
      }
      break;

    case 'video':
      // 视频占位符：保持占位符状态，用户需要重新上传
      if (param.videoValue === PLACEHOLDER_CONSTANTS.VIDEO) {
        deserialized.videoValue = undefined;
        deserialized.videoFileName = undefined;
        deserialized.videoDuration = undefined;
      }
      break;
  }

  return deserialized;
}

/**
 * 反序列化动效定义
 *
 * @param motion - 序列化的动效定义
 * @returns MotionDefinition
 */
export function deserializeMotionDefinition(
  motion: SerializedMotionDefinition
): MotionDefinition {
  const deserializedParameters = motion.parameters.map(deserializeParameter);

  return {
    ...motion,
    parameters: deserializedParameters,
  };
}

/**
 * 反序列化对话
 * - 生成新的 ID
 * - 更新时间戳
 *
 * @param serialized - 序列化的对话
 * @returns Conversation
 */
export function deserializeConversation(
  serialized: SerializedConversation
): Conversation {
  const now = Date.now();
  let motion: MotionDefinition | null = null;

  if (serialized.motion) {
    motion = deserializeMotionDefinition(serialized.motion);
    // 更新动效的 ID 和时间戳
    motion = {
      ...motion,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    id: generateUUID(),
    title: serialized.title,
    messages: serialized.messages,
    motion,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 解决标题冲突
 * 如果标题已存在，添加"（导入）"后缀
 *
 * @param title - 原始标题
 * @param existingTitles - 现有标题列表
 * @returns 处理后的标题
 */
export function resolveConflictTitle(
  title: string,
  existingTitles: string[]
): string {
  // 如果标题不冲突，直接返回
  if (!existingTitles.includes(title)) {
    return title;
  }

  // 尝试添加"（导入）"后缀
  const baseSuffix = IMPORT_TITLE_SUFFIX;
  let newTitle = `${title}${baseSuffix}`;

  if (!existingTitles.includes(newTitle)) {
    return newTitle;
  }

  // 如果仍然冲突，添加数字后缀
  let counter = 2;
  while (existingTitles.includes(newTitle)) {
    newTitle = `${title}${baseSuffix.slice(0, -1)} ${counter}）`;
    counter++;
    // 防止无限循环
    if (counter > 100) {
      newTitle = `${title}${baseSuffix.slice(0, -1)} ${Date.now()}）`;
      break;
    }
  }

  return newTitle;
}

/**
 * 从文件导入对话
 * 支持单个和批量导入
 *
 * @param file - File 对象
 * @param existingTitles - 现有对话标题列表（用于冲突检测）
 * @returns Promise<ImportResult>
 */
export async function importFromFile(
  file: File,
  existingTitles: string[]
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    importedCount: 0,
    skippedCount: 0,
    importedIds: [],
    errors: [],
  };

  // 1. 读取文件内容
  let fileContent: string;
  try {
    fileContent = await readFileAsText(file);
  } catch (error) {
    result.errors.push({
      type: 'PARSE_ERROR',
      message: IMPORT_ERROR_MESSAGES.PARSE_ERROR,
    });
    return result;
  }

  // 2. 验证文件格式
  const validation = validateExportFile(fileContent);
  if (!validation.valid) {
    result.errors.push({
      type: validation.error!,
      message: validation.errorMessage || IMPORT_ERROR_MESSAGES[validation.error!],
    });
    return result;
  }

  // 收集验证警告（如版本不兼容）
  if (validation.warnings && validation.warnings.length > 0) {
    result.warnings = validation.warnings;
  }

  // 3. 处理每个导出项
  const exportItems = validation.items!;
  const importedConversations: Conversation[] = [];
  const updatedExistingTitles = [...existingTitles];

  for (let i = 0; i < exportItems.length; i++) {
    const exportItem = exportItems[i];

    try {
      // 反序列化对话
      const conversation = deserializeConversation(exportItem.conversation);

      // 解决标题冲突
      conversation.title = resolveConflictTitle(
        conversation.title,
        updatedExistingTitles
      );

      // 添加到已使用标题列表（避免后续导入时重复）
      updatedExistingTitles.push(conversation.title);

      importedConversations.push(conversation);
      result.importedIds.push(conversation.id);
      result.importedCount++;
    } catch (error) {
      result.skippedCount++;
      result.errors.push({
        index: i,
        title: exportItem.conversation?.title,
        type: 'DATA_CORRUPTED',
        message: `${IMPORT_ERROR_MESSAGES.DATA_CORRUPTED}（项 ${i + 1}）`,
      });
    }
  }

  // 4. 判断整体成功状态
  result.success = result.importedCount > 0;
  result.conversations = importedConversations;

  return result;
}

/**
 * 获取导入结果的用户友好消息
 *
 * @param result - 导入结果
 * @returns 用户友好的消息字符串
 */
export function getImportResultMessage(result: ImportResult): string {
  if (!result.success) {
    if (result.errors.length > 0) {
      return result.errors[0].message;
    }
    return '导入失败，请重试';
  }

  if (result.skippedCount > 0) {
    return `成功导入 ${result.importedCount} 个对话，${result.skippedCount} 个对话导入失败`;
  }

  if (result.importedCount === 1) {
    return '成功导入 1 个对话';
  }

  return `成功导入 ${result.importedCount} 个对话`;
}
