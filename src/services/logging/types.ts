// ==========================================
// 日志服务 - 类型定义
// ==========================================

/**
 * 日志级别
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * 代码日志类型
 */
export type CodeLogType = 'generation' | 'fix';

/**
 * 通用日志条目
 */
export interface LogEntry {
  /** 唯一标识 (format: log_{timestamp}_{random4}) */
  id: string;
  /** Unix 时间戳 (ms) */
  timestamp: number;
  /** 日志级别 */
  level: LogLevel;
  /** 模块名称 (e.g., 'LLMClient', 'CanvasRenderer') */
  module: string;
  /** 日志消息 */
  message: string;
  /** 可选的额外数据 */
  metadata?: Record<string, unknown>;
}

/**
 * LLM 代码日志条目
 * 继承 LogEntry 并扩展代码相关字段
 */
export interface CodeLogEntry extends LogEntry {
  /** 请求 ID (关联同一次生成的多条日志) */
  requestId: string;
  /** 代码类型 */
  codeType: CodeLogType;
  /** 用户输入的 prompt */
  prompt: string;
  /** LLM 返回的完整响应 */
  response: string;
  /** 提取出的代码内容 */
  extractedCode: string;
  /** 原始错误代码 (仅 fix 类型) */
  originalCode?: string;
  /** 错误信息 (仅 fix 类型) */
  errorMessage?: string;
  /** 响应是否被截断 */
  truncated?: boolean;
}

/**
 * 日志导出数据结构
 */
export interface LogExportData {
  /** 导出时间戳 */
  exportedAt: number;
  /** 系统日志数组 */
  systemLogs: LogEntry[];
  /** 代码日志数组 */
  codeLogs: CodeLogEntry[];
  /** 元数据 */
  metadata: {
    totalSystemLogs: number;
    totalCodeLogs: number;
    oldestLogTime: number | null;
    newestLogTime: number | null;
  };
}

/**
 * 日志服务接口
 */
export interface Logger {
  // 系统日志方法
  debug(module: string, message: string, metadata?: Record<string, unknown>): void;
  info(module: string, message: string, metadata?: Record<string, unknown>): void;
  warn(module: string, message: string, metadata?: Record<string, unknown>): void;
  error(module: string, message: string, metadata?: Record<string, unknown>): void;

  // 代码日志方法
  logCodeGeneration(
    requestId: string,
    prompt: string,
    response: string,
    extractedCode: string
  ): void;
  logCodeFix(
    requestId: string,
    prompt: string,
    response: string,
    extractedCode: string,
    originalCode: string,
    errorMessage: string
  ): void;

  // 导出方法
  export(options?: { startTime?: number; endTime?: number }): LogExportData;
  exportToFile(options?: { startTime?: number; endTime?: number }): void;

  // 清理方法
  clearSystemLogs(): void;
  clearCodeLogs(): void;
  clearAll(): void;
}
