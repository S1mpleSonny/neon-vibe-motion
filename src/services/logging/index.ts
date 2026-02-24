// ==========================================
// 日志服务 - 入口
// ==========================================

import type { LogLevel, Logger, LogExportData } from './types';
import {
  addSystemLog,
  addCodeLog,
  clearSystemLogs as storageClearSystemLogs,
  clearCodeLogs as storageClearCodeLogs,
  clearAllLogs,
  getSystemLogs,
  getCodeLogs,
} from './storage';
import { exportLogs, exportLogsToFile } from './export';

// ---------- 系统日志方法 (T010, T011) ----------

/**
 * 记录日志（内部方法）
 */
function log(
  level: LogLevel,
  module: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  try {
    // 写入 localStorage
    addSystemLog({
      level,
      module,
      message,
      metadata,
    });

    // 同时输出到控制台（开发模式）(T011)
    const consoleMethod = getConsoleMethod(level);
    const prefix = `[${level}][${module}]`;
    if (metadata) {
      consoleMethod(prefix, message, metadata);
    } else {
      consoleMethod(prefix, message);
    }
  } catch {
    // 静默失败，不影响主功能 (T034, T035)
  }
}

/**
 * 获取对应级别的 console 方法
 */
function getConsoleMethod(level: LogLevel): typeof console.log {
  switch (level) {
    case 'DEBUG':
      return console.debug;
    case 'INFO':
      return console.info;
    case 'WARN':
      return console.warn;
    case 'ERROR':
      return console.error;
    default:
      return console.log;
  }
}

// ---------- 代码日志方法 (T017, T018) ----------

/**
 * 记录代码生成日志
 */
function logCodeGeneration(
  requestId: string,
  prompt: string,
  response: string,
  extractedCode: string
): void {
  try {
    addCodeLog({
      level: 'INFO',
      module: 'LLMService',
      message: '代码生成完成',
      requestId,
      codeType: 'generation',
      prompt,
      response,
      extractedCode,
    });
  } catch {
    // 静默失败
  }
}

/**
 * 记录代码修复日志
 */
function logCodeFix(
  requestId: string,
  prompt: string,
  response: string,
  extractedCode: string,
  originalCode: string,
  errorMessage: string
): void {
  try {
    addCodeLog({
      level: 'INFO',
      module: 'LLMService',
      message: '代码修复完成',
      requestId,
      codeType: 'fix',
      prompt,
      response,
      extractedCode,
      originalCode,
      errorMessage,
    });
  } catch {
    // 静默失败
  }
}

// ---------- 导出方法 (T032) ----------

/**
 * 导出日志数据
 */
function exportLogsData(options?: {
  startTime?: number;
  endTime?: number;
}): LogExportData {
  try {
    return exportLogs(getSystemLogs(), getCodeLogs(), options);
  } catch {
    // 返回空数据
    return {
      exportedAt: Date.now(),
      systemLogs: [],
      codeLogs: [],
      metadata: {
        totalSystemLogs: 0,
        totalCodeLogs: 0,
        oldestLogTime: null,
        newestLogTime: null,
      },
    };
  }
}

/**
 * 导出日志到文件
 */
function exportToFile(options?: {
  startTime?: number;
  endTime?: number;
}): void {
  try {
    exportLogsToFile(getSystemLogs(), getCodeLogs(), options);
  } catch {
    // 静默失败
  }
}

// ---------- 清理方法 (T026, T027, T028) ----------

/**
 * 清空系统日志
 */
function clearSystemLogs(): void {
  try {
    storageClearSystemLogs();
  } catch {
    // 静默失败
  }
}

/**
 * 清空代码日志
 */
function clearCodeLogs(): void {
  try {
    storageClearCodeLogs();
  } catch {
    // 静默失败
  }
}

/**
 * 清空所有日志
 */
function clearAll(): void {
  try {
    clearAllLogs();
  } catch {
    // 静默失败
  }
}

// ---------- Logger 实例导出 (T012) ----------

/**
 * 日志服务实例
 */
export const logger: Logger = {
  // 系统日志方法
  debug: (module, message, metadata) => log('DEBUG', module, message, metadata),
  info: (module, message, metadata) => log('INFO', module, message, metadata),
  warn: (module, message, metadata) => log('WARN', module, message, metadata),
  error: (module, message, metadata) => log('ERROR', module, message, metadata),

  // 代码日志方法
  logCodeGeneration,
  logCodeFix,

  // 导出方法
  export: exportLogsData,
  exportToFile,

  // 清理方法
  clearSystemLogs,
  clearCodeLogs,
  clearAll,
};

export default logger;

// 重新导出类型
export type {
  LogLevel,
  CodeLogType,
  LogEntry,
  CodeLogEntry,
  LogExportData,
  Logger,
} from './types';

// 导出工具函数
export { generateRequestId } from './storage';
