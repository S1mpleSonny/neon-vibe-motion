/**
 * 对话会话导出与导入 - 常量定义
 * Feature: 030-session-export
 */

/** 应用版本号（用于导出文件版本标记） */
export const APP_VERSION = __APP_VERSION__;

/** 支持的文件扩展名 */
export const EXPORT_FILE_EXTENSION = '.neon';

/** 文件 MIME 类型 */
export const EXPORT_MIME_TYPE = 'application/json';

/** 导出文件大小警告阈值（字节） */
export const EXPORT_SIZE_WARNING_THRESHOLD = 3 * 1024 * 1024; // 3MB

/** 导出文件大小上限（字节） */
export const EXPORT_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

/** 资源占位符常量 */
export const PLACEHOLDER_CONSTANTS = {
  VIDEO: '__VIDEO_PLACEHOLDER__',
  MODEL: '__MODEL_PLACEHOLDER__',
  TEXTURE: '__TEXTURE_PLACEHOLDER__',
  SEQUENCE: '__SEQUENCE_PLACEHOLDER__',
} as const;

/** 导入后缀 */
export const IMPORT_TITLE_SUFFIX = '（导入）';

/** 导入错误消息映射（中文） */
export const IMPORT_ERROR_MESSAGES = {
  PARSE_ERROR: '文件格式错误，请确认是有效的 .neon 文件',
  VERSION_INCOMPATIBLE: '文件版本不兼容，请使用最新版本的应用',
  INVALID_FORMAT: '文件数据不完整，无法导入',
  DATA_CORRUPTED: '文件数据损坏，部分对话无法导入',
  STORAGE_FULL: '存储空间不足，请删除一些历史对话后重试',
} as const;
