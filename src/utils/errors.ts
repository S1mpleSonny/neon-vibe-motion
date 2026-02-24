export type ErrorCode =
  | 'INVALID_CONFIG'
  | 'API_ERROR'
  | 'PARSE_ERROR'
  | 'RATE_LIMIT'
  | 'NETWORK_ERROR'
  | 'EXPORT_ERROR'
  | 'RENDER_ERROR'
  | 'UNKNOWN_ERROR';

const ERROR_MESSAGES: Record<ErrorCode, { title: string; guidance: string }> = {
  INVALID_CONFIG: {
    title: '配置无效',
    guidance: '请检查 LLM API 设置是否正确，确保 API 地址和密钥填写正确。',
  },
  API_ERROR: {
    title: 'API 请求失败',
    guidance: '请检查网络连接，或稍后重试。如果问题持续，请检查 API 密钥是否有效。',
  },
  PARSE_ERROR: {
    title: '解析响应失败',
    guidance: 'LLM 返回的格式不正确。请尝试用更简洁的描述重新生成，或换一种表述方式。',
  },
  RATE_LIMIT: {
    title: '请求过于频繁',
    guidance: '请稍等片刻后再试。如果您需要更高的调用频率，请考虑升级 API 套餐。',
  },
  NETWORK_ERROR: {
    title: '网络连接失败',
    guidance: '请检查您的网络连接是否正常，然后重试。',
  },
  EXPORT_ERROR: {
    title: '导出失败',
    guidance: '视频导出过程中出现问题。请尝试降低分辨率或帧率后重试。',
  },
  RENDER_ERROR: {
    title: '渲染失败',
    guidance: '动效渲染过程中出现问题。请尝试重新生成动效，或简化动效描述。',
  },
  UNKNOWN_ERROR: {
    title: '未知错误',
    guidance: '发生了未预期的错误。请刷新页面后重试。',
  },
};

export function getErrorMessage(code: ErrorCode): { title: string; guidance: string } {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

export function formatErrorForUser(error: unknown): string {
  if (error instanceof Error) {
    // Try to identify error type from message
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      const { title, guidance } = getErrorMessage('NETWORK_ERROR');
      return `${title}：${guidance}`;
    }

    if (message.includes('rate limit') || message.includes('429')) {
      const { title, guidance } = getErrorMessage('RATE_LIMIT');
      return `${title}：${guidance}`;
    }

    if (message.includes('parse') || message.includes('json')) {
      const { title, guidance } = getErrorMessage('PARSE_ERROR');
      return `${title}：${guidance}`;
    }

    if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
      const { title, guidance } = getErrorMessage('INVALID_CONFIG');
      return `${title}：${guidance}`;
    }

    // Return the original message if it's user-friendly
    if (error.message.length < 100 && !message.includes('http')) {
      return error.message;
    }
  }

  const { title, guidance } = getErrorMessage('UNKNOWN_ERROR');
  return `${title}：${guidance}`;
}

export class UserFriendlyError extends Error {
  code: ErrorCode;
  guidance: string;
  originalError?: Error;

  constructor(code: ErrorCode, originalError?: Error) {
    const { title, guidance } = getErrorMessage(code);
    super(title);
    this.name = 'UserFriendlyError';
    this.code = code;
    this.guidance = guidance;
    this.originalError = originalError;
  }

  toUserMessage(): string {
    return `${this.message}：${this.guidance}`;
  }
}
