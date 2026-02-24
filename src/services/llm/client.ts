import type { LLMConfig, ContentPart } from '../../types';
import { logger } from '../logging';

const PROXY_ENABLED = import.meta.env.VITE_LLM_PROXY === 'true';

/**
 * Chat Completion 消息格式
 * content 支持字符串（纯文本）或 ContentPart 数组（多模态）(031-multimodal-input)
 */
export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string;
  };
  finish_reason: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 最大继续请求次数，防止无限循环
const MAX_CONTINUATION_ATTEMPTS = 5;

// API 请求超时时间（毫秒）
const REQUEST_TIMEOUT_MS = 600000;

/**
 * 创建带超时的 fetch 请求
 * @param externalSignal - 外部提供的 AbortSignal，用于取消请求 (009-js-error-autofix)
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    logger.error('LLMClient', `请求超时（${timeoutMs / 1000}秒）`, { url, timeoutMs });
    controller.abort();
  }, timeoutMs);

  // 如果外部信号被触发，取消内部控制器
  const handleExternalAbort = () => {
    controller.abort();
  };
  if (externalSignal) {
    externalSignal.addEventListener('abort', handleExternalAbort);
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // 区分外部取消和超时
      if (externalSignal?.aborted) {
        const abortError = new Error('请求已取消');
        abortError.name = 'AbortError';
        throw abortError;
      }
      throw new Error(`请求超时（${timeoutMs / 1000}秒），请稍后重试`);
    }
    // 处理网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('无法连接到服务器，请检查网络连接');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', handleExternalAbort);
    }
  }
}

/**
 * 根据 HTTP 状态码生成友好的错误消息
 */
function getErrorMessage(status: number, errorText: string): string {
  switch (status) {
    case 401:
      return 'API 密钥无效，请检查您的 API Key';
    case 403:
      return 'API 密钥权限不足或已过期';
    case 404:
      return 'API 端点不存在，请检查 API 地址';
    case 429:
      return 'API 请求过于频繁，请稍后重试';
    case 500:
    case 502:
    case 503:
    case 504:
      return '服务器错误，请稍后重试';
    default:
      return `API 错误 (${status}): ${errorText}`;
  }
}

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async chatCompletion(
    messages: ChatCompletionMessage[],
    options: { temperature?: number; maxTokens?: number; signal?: AbortSignal } = {}
  ): Promise<string> {
    const { temperature = 1, maxTokens = 16384, signal } = options;

    const baseURL = this.config.baseURL.replace(/\/+$/, '');
    const fullURL = `${baseURL}/chat/completions`;
    const endpoint = PROXY_ENABLED ? '/api/proxy' : fullURL;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    if (PROXY_ENABLED) {
      headers['X-Target-URL'] = fullURL;
    }

    let fullContent = '';
    let currentMessages = [...messages];
    let attempts = 0;

    while (attempts < MAX_CONTINUATION_ATTEMPTS) {
      attempts++;

      const request: ChatCompletionRequest = {
        model: this.config.model,
        messages: currentMessages,
        temperature,
        max_tokens: maxTokens,
      };

      logger.info('LLMClient', `请求 #${attempts}`, { messagesCount: currentMessages.length });

      const response = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(request),
        },
        REQUEST_TIMEOUT_MS,
        signal
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(getErrorMessage(response.status, errorText));
      }

      let data: ChatCompletionResponse;
      try {
        data = await response.json();
      } catch {
        throw new Error('服务器返回了无效的响应格式');
      }

      if (!data.choices || data.choices.length === 0) {
        throw new Error('LLM API 未返回任何结果');
      }

      const choice = data.choices[0];
      const content = choice.message.content;
      fullContent += content;

      // 调试：在控制台显示 finish_reason，便于排查截断问题
      console.log(`[LLMClient] Response #${attempts}: finish_reason=${choice.finish_reason}, content_length=${content.length}`);
      if (data.usage) {
        console.log(`[LLMClient] Token usage: prompt=${data.usage.prompt_tokens}, completion=${data.usage.completion_tokens}, total=${data.usage.total_tokens}`);
      }

      logger.info('LLMClient', `响应 #${attempts}`, { finishReason: choice.finish_reason, contentLength: content.length });

      // 检查是否完成
      if (choice.finish_reason === 'stop') {
        // 正常完成
        break;
      } else if (choice.finish_reason === 'length') {
        // 响应被截断，需要继续请求
        logger.info('LLMClient', '响应被截断，继续请求');

        // 添加当前响应到消息历史，请求继续
        currentMessages = [
          ...currentMessages,
          { role: 'assistant' as const, content },
          { role: 'user' as const, content: '继续输出，从上次中断的地方继续，不要重复已输出的内容。' }
        ];
      } else {
        // 其他情况（如 content_filter），直接返回
        logger.warn('LLMClient', '非预期的 finish_reason', { finishReason: choice.finish_reason });
        break;
      }
    }

    if (attempts >= MAX_CONTINUATION_ATTEMPTS) {
      logger.warn('LLMClient', '达到最大继续请求次数', { maxAttempts: MAX_CONTINUATION_ATTEMPTS });
    }

    return fullContent;
  }

  async validateConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const baseURL = this.config.baseURL.replace(/\/+$/, '');
      const fullURL = `${baseURL}/models`;
      const endpoint = PROXY_ENABLED ? '/api/proxy' : fullURL;
      const reqHeaders: Record<string, string> = {};
      if (this.config.apiKey) {
        reqHeaders['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      if (PROXY_ENABLED) {
        reqHeaders['X-Target-URL'] = fullURL;
      }
      const response = await fetchWithTimeout(
        endpoint,
        { headers: reqHeaders },
        30000 // 连接测试使用较短的超时时间
      );

      if (response.ok) {
        return { success: true };
      }

      const errorText = await response.text().catch(() => '');
      return { success: false, error: getErrorMessage(response.status, errorText) };
    } catch (error) {
      const message = error instanceof Error ? error.message : '连接失败';
      return { success: false, error: message };
    }
  }

  updateConfig(config: LLMConfig): void {
    this.config = config;
  }
}

export function createLLMClient(config: LLMConfig): LLMClient {
  return new LLMClient(config);
}

export default LLMClient;
