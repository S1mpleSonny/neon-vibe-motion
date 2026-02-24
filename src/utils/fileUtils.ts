/**
 * 文件工具函数
 * Feature: 030-session-export
 */

/**
 * 触发浏览器下载文件
 * @param content - 文件内容字符串
 * @param filename - 文件名（含扩展名）
 * @param mimeType - MIME 类型，默认 application/json
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'application/json'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * 读取文件内容为文本
 * @param file - File 对象
 * @returns Promise<string> 文件文本内容
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
}
