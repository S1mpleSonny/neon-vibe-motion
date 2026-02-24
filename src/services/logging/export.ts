// ==========================================
// 日志服务 - 导出功能
// ==========================================

import type { LogEntry, CodeLogEntry, LogExportData } from './types';

// ---------- 导出数据构建 (T030) ----------

/**
 * 构建日志导出数据
 */
export function exportLogs(
  systemLogs: LogEntry[],
  codeLogs: CodeLogEntry[],
  options?: { startTime?: number; endTime?: number }
): LogExportData {
  // 时间范围过滤 (T033)
  const filteredSystemLogs = filterByTimeRange(systemLogs, options);
  const filteredCodeLogs = filterByTimeRange(codeLogs, options);

  // 合并所有日志用于计算时间范围
  const allLogs = [...filteredSystemLogs, ...filteredCodeLogs];
  const timestamps = allLogs.map(log => log.timestamp).sort((a, b) => a - b);

  return {
    exportedAt: Date.now(),
    systemLogs: filteredSystemLogs,
    codeLogs: filteredCodeLogs,
    metadata: {
      totalSystemLogs: filteredSystemLogs.length,
      totalCodeLogs: filteredCodeLogs.length,
      oldestLogTime: timestamps.length > 0 ? timestamps[0] : null,
      newestLogTime: timestamps.length > 0 ? timestamps[timestamps.length - 1] : null,
    },
  };
}

// ---------- 时间范围过滤 (T033) ----------

/**
 * 按时间范围过滤日志
 */
function filterByTimeRange<T extends LogEntry>(
  logs: T[],
  options?: { startTime?: number; endTime?: number }
): T[] {
  if (!options?.startTime && !options?.endTime) {
    return logs;
  }

  return logs.filter(log => {
    if (options.startTime && log.timestamp < options.startTime) {
      return false;
    }
    if (options.endTime && log.timestamp > options.endTime) {
      return false;
    }
    return true;
  });
}

// ---------- 文件导出 (T031) ----------

/**
 * 导出日志为 JSON 文件并触发下载
 */
export function exportLogsToFile(
  systemLogs: LogEntry[],
  codeLogs: CodeLogEntry[],
  options?: { startTime?: number; endTime?: number }
): void {
  const exportData = exportLogs(systemLogs, codeLogs, options);

  // 构建 JSON 字符串
  const jsonString = JSON.stringify(exportData, null, 2);

  // 创建 Blob
  const blob = new Blob([jsonString], { type: 'application/json' });

  // 生成文件名（包含时间戳）
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `motion-platform-logs-${timestamp}.json`;

  // 触发下载
  downloadBlob(blob, filename);
}

/**
 * 触发 Blob 下载
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
