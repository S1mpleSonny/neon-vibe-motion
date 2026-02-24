/**
 * 导出文件验证器
 * Feature: 030-session-export
 */

import type {
  ExportedConversation,
  FileValidationResult,
  ImportErrorType,
  SerializedConversation,
} from '@/types';
import { APP_VERSION, IMPORT_ERROR_MESSAGES } from './constants';

/**
 * 比较语义化版本号
 * @returns 负数表示 v1 < v2，0 表示相等，正数表示 v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 !== p2) return p1 - p2;
  }
  return 0;
}

/**
 * 验证导出文件内容
 * @param fileContent - 文件内容字符串
 * @returns FileValidationResult 验证结果
 */
export function validateExportFile(fileContent: string): FileValidationResult {
  // 1. JSON 解析
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContent);
  } catch {
    return {
      valid: false,
      error: 'PARSE_ERROR',
      errorMessage: IMPORT_ERROR_MESSAGES.PARSE_ERROR,
    };
  }

  // 2. 判断单个还是批量（Array.isArray）
  const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

  // 空数组检查
  if (items.length === 0) {
    return {
      valid: false,
      error: 'INVALID_FORMAT',
      errorMessage: IMPORT_ERROR_MESSAGES.INVALID_FORMAT,
    };
  }

  // 3. 验证每个导出项
  const validatedItems: ExportedConversation[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Record<string, unknown>;
    const validationResult = validateSingleExportItem(item, i);

    if (!validationResult.valid) {
      return validationResult;
    }

    // 收集警告
    if (validationResult.warnings) {
      warnings.push(...validationResult.warnings);
    }

    validatedItems.push(item as unknown as ExportedConversation);
  }

  return {
    valid: true,
    items: validatedItems,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * 验证单个导出项
 * @param item - 导出项对象
 * @param index - 在数组中的索引（用于错误提示）
 * @returns FileValidationResult
 */
function validateSingleExportItem(
  item: Record<string, unknown>,
  index: number
): FileValidationResult {
  const warnings: string[] = [];

  // 版本检查：版本不匹配时只警告，不阻止导入
  const fileVersion = item.version as string;
  if (typeof fileVersion !== 'string') {
    return {
      valid: false,
      error: 'INVALID_FORMAT',
      errorMessage: `${IMPORT_ERROR_MESSAGES.INVALID_FORMAT}（项 ${index + 1}：缺少版本号）`,
    };
  }

  // 版本不匹配时添加警告但允许继续
  if (fileVersion !== APP_VERSION) {
    warnings.push(`文件版本 ${fileVersion} 与当前版本 ${APP_VERSION} 不一致，部分功能可能无法正常工作`);
  }

  // 必需字段检查：exportedAt
  if (typeof item.exportedAt !== 'number' || item.exportedAt <= 0) {
    return {
      valid: false,
      error: 'INVALID_FORMAT',
      errorMessage: `${IMPORT_ERROR_MESSAGES.INVALID_FORMAT}（项 ${index + 1}：缺少导出时间）`,
    };
  }

  // 必需字段检查：conversation
  if (!item.conversation || typeof item.conversation !== 'object') {
    return {
      valid: false,
      error: 'INVALID_FORMAT',
      errorMessage: `${IMPORT_ERROR_MESSAGES.INVALID_FORMAT}（项 ${index + 1}：缺少对话数据）`,
    };
  }

  // 验证对话数据
  const convValidation = validateConversationData(
    item.conversation as Record<string, unknown>,
    index
  );
  if (!convValidation.valid) {
    return convValidation;
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * 验证对话数据结构
 * @param conv - 对话数据对象
 * @param index - 在数组中的索引
 * @returns FileValidationResult
 */
export function validateConversationData(
  conv: Record<string, unknown>,
  index: number = 0
): FileValidationResult {
  // 必需字段：id
  if (typeof conv.id !== 'string' || conv.id.length === 0) {
    return {
      valid: false,
      error: 'DATA_CORRUPTED',
      errorMessage: `${IMPORT_ERROR_MESSAGES.DATA_CORRUPTED}（项 ${index + 1}：缺少对话 ID）`,
    };
  }

  // 必需字段：title
  if (typeof conv.title !== 'string' || conv.title.length === 0) {
    return {
      valid: false,
      error: 'DATA_CORRUPTED',
      errorMessage: `${IMPORT_ERROR_MESSAGES.DATA_CORRUPTED}（项 ${index + 1}：缺少对话标题）`,
    };
  }

  // 必需字段：messages（必须是数组）
  if (!Array.isArray(conv.messages)) {
    return {
      valid: false,
      error: 'DATA_CORRUPTED',
      errorMessage: `${IMPORT_ERROR_MESSAGES.DATA_CORRUPTED}（项 ${index + 1}：消息列表无效）`,
    };
  }

  // motion 可以为 null，但如果存在则必须是对象
  if (conv.motion !== null && typeof conv.motion !== 'object') {
    return {
      valid: false,
      error: 'DATA_CORRUPTED',
      errorMessage: `${IMPORT_ERROR_MESSAGES.DATA_CORRUPTED}（项 ${index + 1}：动效数据无效）`,
    };
  }

  // 如果 motion 存在，检查必需字段
  if (conv.motion && typeof conv.motion === 'object') {
    const motion = conv.motion as Record<string, unknown>;
    if (typeof motion.code !== 'string') {
      return {
        valid: false,
        error: 'DATA_CORRUPTED',
        errorMessage: `${IMPORT_ERROR_MESSAGES.DATA_CORRUPTED}（项 ${index + 1}：动效代码无效）`,
      };
    }
    if (!Array.isArray(motion.parameters)) {
      return {
        valid: false,
        error: 'DATA_CORRUPTED',
        errorMessage: `${IMPORT_ERROR_MESSAGES.DATA_CORRUPTED}（项 ${index + 1}：动效参数无效）`,
      };
    }
  }

  return { valid: true };
}

/**
 * 获取错误类型对应的用户友好消息
 * @param errorType - 错误类型
 * @returns string 错误消息
 */
export function getImportErrorMessage(errorType: ImportErrorType): string {
  return IMPORT_ERROR_MESSAGES[errorType] || '导入失败，请重试';
}
