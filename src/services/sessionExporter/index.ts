/**
 * 对话会话导出与导入服务
 * Feature: 030-session-export
 *
 * 服务入口，统一导出所有功能
 */

// 常量
export {
  APP_VERSION,
  EXPORT_FILE_EXTENSION,
  EXPORT_MIME_TYPE,
  EXPORT_SIZE_WARNING_THRESHOLD,
  EXPORT_SIZE_LIMIT,
  PLACEHOLDER_CONSTANTS,
  IMPORT_TITLE_SUFFIX,
  IMPORT_ERROR_MESSAGES,
} from './constants';

// 图片序列化
export {
  blobUrlToBase64,
  base64ToBlobUrl,
  isBase64ImageDataUrl,
  isBlobUrl,
} from './imageSerializer';

// 验证器
export {
  validateExportFile,
  validateConversationData,
  getImportErrorMessage,
} from './validator';

// 导出功能
export {
  serializeParameter,
  serializeMotionDefinition,
  serializeConversation,
  exportConversation,
  exportConversations,
} from './exporter';

// 导入功能
export {
  deserializeParameter,
  deserializeMotionDefinition,
  deserializeConversation,
  resolveConflictTitle,
  importFromFile,
  getImportResultMessage,
} from './importer';
