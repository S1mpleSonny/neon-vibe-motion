// ==========================================
// 日志服务 - 存储管理
// ==========================================

import type { LogEntry, CodeLogEntry } from './types';

// ---------- 存储键常量 (T007) ----------

export const LOG_STORAGE_KEYS = {
  SYSTEM_LOGS: 'motion-platform:system-logs',
  CODE_LOGS: 'motion-platform:code-logs',
} as const;

// ---------- 容量限制常量 (T022) ----------

export const LOG_CAPACITY = {
  MAX_SYSTEM_LOGS: 1000,
  MAX_CODE_LOGS: 100,
  MAX_AGE_DAYS: 7,
  MAX_RESPONSE_SIZE: 50 * 1024, // 50KB
} as const;

// ---------- ID 生成器 (T004, T005) ----------

/**
 * 生成 4 位随机字符串
 */
function randomString4(): string {
  return Math.random().toString(36).substring(2, 6);
}

/**
 * 生成日志 ID
 * 格式: log_{timestamp}_{random4}
 */
export function generateLogId(): string {
  return `log_${Date.now()}_${randomString4()}`;
}

/**
 * 生成请求 ID
 * 格式: req_{timestamp}_{random4}
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${randomString4()}`;
}

// ---------- 安全 localStorage 操作 (T006) ----------

/**
 * 安全 JSON 解析
 */
function safeJSONParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * 安全读取 localStorage
 */
function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * 安全写入 localStorage
 * @returns 是否写入成功
 */
function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 安全删除 localStorage 项
 */
function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 静默失败
  }
}

// ---------- 系统日志存储 (T008, T009) ----------

/**
 * 获取所有系统日志
 */
export function getSystemLogs(): LogEntry[] {
  const value = safeLocalStorageGet(LOG_STORAGE_KEYS.SYSTEM_LOGS);
  return safeJSONParse<LogEntry[]>(value, []);
}

/**
 * 添加系统日志条目
 */
export function addSystemLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
  const logs = getSystemLogs();

  const newEntry: LogEntry = {
    ...entry,
    id: generateLogId(),
    timestamp: Date.now(),
  };

  logs.push(newEntry);

  // 清理超限日志
  const prunedLogs = pruneSystemLogs(logs);

  // 尝试写入
  const success = safeLocalStorageSet(
    LOG_STORAGE_KEYS.SYSTEM_LOGS,
    JSON.stringify(prunedLogs)
  );

  // 配额超限时强制清理 (T029)
  if (!success) {
    handleQuotaExceeded(LOG_STORAGE_KEYS.SYSTEM_LOGS, prunedLogs);
  }
}

/**
 * 清空系统日志
 */
export function clearSystemLogs(): void {
  safeLocalStorageRemove(LOG_STORAGE_KEYS.SYSTEM_LOGS);
}

// ---------- 代码日志存储 (T015, T016) ----------

/**
 * 获取所有代码日志
 */
export function getCodeLogs(): CodeLogEntry[] {
  const value = safeLocalStorageGet(LOG_STORAGE_KEYS.CODE_LOGS);
  return safeJSONParse<CodeLogEntry[]>(value, []);
}

/**
 * 添加代码日志条目
 */
export function addCodeLog(entry: Omit<CodeLogEntry, 'id' | 'timestamp'>): void {
  const logs = getCodeLogs();

  // 处理大响应截断 (T021)
  const truncatedEntry = truncateLargeResponse(entry);

  const newEntry: CodeLogEntry = {
    ...truncatedEntry,
    id: generateLogId(),
    timestamp: Date.now(),
  };

  logs.push(newEntry);

  // 清理超限日志
  const prunedLogs = pruneCodeLogs(logs);

  // 尝试写入
  const success = safeLocalStorageSet(
    LOG_STORAGE_KEYS.CODE_LOGS,
    JSON.stringify(prunedLogs)
  );

  // 配额超限时强制清理 (T029)
  if (!success) {
    handleQuotaExceeded(LOG_STORAGE_KEYS.CODE_LOGS, prunedLogs);
  }
}

/**
 * 清空代码日志
 */
export function clearCodeLogs(): void {
  safeLocalStorageRemove(LOG_STORAGE_KEYS.CODE_LOGS);
}

// ---------- 容量管理 (T023, T024, T025) ----------

/**
 * 清理系统日志：移除超过数量和时间限制的条目
 */
export function pruneSystemLogs(logs: LogEntry[]): LogEntry[] {
  const now = Date.now();
  const maxAge = LOG_CAPACITY.MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  // 按时间过滤
  let prunedLogs = logs.filter(log => now - log.timestamp < maxAge);

  // 按数量限制（保留最新的）
  if (prunedLogs.length > LOG_CAPACITY.MAX_SYSTEM_LOGS) {
    prunedLogs = prunedLogs.slice(-LOG_CAPACITY.MAX_SYSTEM_LOGS);
  }

  return prunedLogs;
}

/**
 * 清理代码日志：移除超过数量和时间限制的条目
 */
export function pruneCodeLogs(logs: CodeLogEntry[]): CodeLogEntry[] {
  const now = Date.now();
  const maxAge = LOG_CAPACITY.MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  // 按时间过滤
  let prunedLogs = logs.filter(log => now - log.timestamp < maxAge);

  // 按数量限制（保留最新的）
  if (prunedLogs.length > LOG_CAPACITY.MAX_CODE_LOGS) {
    prunedLogs = prunedLogs.slice(-LOG_CAPACITY.MAX_CODE_LOGS);
  }

  return prunedLogs;
}

// ---------- 大响应截断 (T021) ----------

/**
 * 截断大响应内容
 */
function truncateLargeResponse(
  entry: Omit<CodeLogEntry, 'id' | 'timestamp'>
): Omit<CodeLogEntry, 'id' | 'timestamp'> {
  if (entry.response.length <= LOG_CAPACITY.MAX_RESPONSE_SIZE) {
    return entry;
  }

  return {
    ...entry,
    response: entry.response.substring(0, LOG_CAPACITY.MAX_RESPONSE_SIZE) +
      '\n\n[TRUNCATED - Response exceeded 50KB limit]',
    truncated: true,
  };
}

// ---------- 配额超限处理 (T029) ----------

/**
 * 处理 localStorage 配额超限
 */
function handleQuotaExceeded<T extends LogEntry>(
  key: string,
  logs: T[]
): void {
  // 强制删除一半旧日志
  const halfLength = Math.floor(logs.length / 2);
  const reducedLogs = logs.slice(-halfLength);

  const success = safeLocalStorageSet(key, JSON.stringify(reducedLogs));

  if (!success) {
    // 最后手段：清空所有日志
    safeLocalStorageRemove(key);
    console.warn(`[Logger] Cleared ${key} due to quota exceeded`);
  }
}

// ---------- 清空所有日志 ----------

/**
 * 清空所有日志
 */
export function clearAllLogs(): void {
  clearSystemLogs();
  clearCodeLogs();
}
