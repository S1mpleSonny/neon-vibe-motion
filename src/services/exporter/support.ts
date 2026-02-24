/**
 * 浏览器支持检测
 * 检测 Canvas 和 H.264 编码能力
 *
 * @module services/exporter/support
 */

export interface BrowserSupport {
  supported: boolean;
  reason?: string;
  capabilities: {
    canvas: boolean;
  };
}

/**
 * 检测浏览器是否支持视频导出
 * 主要检测 Canvas 支持（H.264 编码器在运行时动态加载）
 */
export function checkBrowserSupport(): BrowserSupport {
  const capabilities = {
    canvas: typeof HTMLCanvasElement !== 'undefined',
  };

  if (!capabilities.canvas) {
    return {
      supported: false,
      reason: '您的浏览器不支持 Canvas',
      capabilities,
    };
  }

  return {
    supported: true,
    capabilities,
  };
}

/**
 * 获取首选的 MIME 类型
 * 现在统一使用 MP4 格式
 */
export function getPreferredMimeType(): string {
  return 'video/mp4';
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(_mimeType: string): string {
  void _mimeType;
  return 'mp4';
}
