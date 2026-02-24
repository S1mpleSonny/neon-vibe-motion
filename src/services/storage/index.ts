import type {
  StorageService,
  LLMConfig,
  ChatMessage,
  MotionDefinition,
  AspectRatioId,
  ClarifySession,
  Conversation,
  ConversationMeta,
  LLMConfigList,
  LLMConfigItem,
  EncryptedData,
} from '../../types';
import { encrypt, getOrCreateSalt, saltToBase64 } from '../crypto';
import { generateId } from '../../utils/id';

const KEYS = {
  LLM_CONFIG: 'motion-platform:llm-config',
  CHAT_HISTORY: 'motion-platform:chat-history',
  LAST_MOTION: 'motion-platform:last-motion',
  PROMPT_OPTIMIZATION_ENABLED: 'motion-platform:prompt-optimization-enabled',
  ASPECT_RATIO: 'motion-platform:aspect-ratio',
  CLARIFY_SESSION: 'motion-platform:clarify-session',
  CLARIFY_ENABLED: 'motion-platform:clarify-enabled',
  // 对话存储键 (013-history-panel)
  CONVERSATION_INDEX: 'motion-platform:conversation-index',
  CURRENT_CONVERSATION: 'motion-platform:current-conversation',
  CONVERSATION_PREFIX: 'motion-platform:conversation:',
  // 多 LLM 配置存储键 (015-multi-llm-config)
  LLM_CONFIGS: 'motion-platform:llm-configs',
  CRYPTO_SALT: 'motion-platform:crypto-salt',
} as const;

function safeJSONParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    console.warn(`Failed to read from localStorage: ${key}`);
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // QuotaExceededError 表示存储空间不足
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      console.error(`[Storage] 存储空间不足，无法保存: ${key}。请考虑删除一些历史对话。`);
      // 可以在这里添加通知用户的逻辑
    } else {
      console.warn(`Failed to write to localStorage: ${key}`, e);
    }
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    console.warn(`Failed to remove from localStorage: ${key}`);
  }
}

export const storageService: StorageService = {
  saveLLMConfig(config: LLMConfig): void {
    safeLocalStorageSet(KEYS.LLM_CONFIG, JSON.stringify(config));
  },

  getLLMConfig(): LLMConfig | null {
    const value = safeLocalStorageGet(KEYS.LLM_CONFIG);
    return safeJSONParse<LLMConfig | null>(value, null);
  },

  saveChatHistory(messages: ChatMessage[]): void {
    safeLocalStorageSet(KEYS.CHAT_HISTORY, JSON.stringify(messages));
  },

  getChatHistory(): ChatMessage[] {
    const value = safeLocalStorageGet(KEYS.CHAT_HISTORY);
    return safeJSONParse<ChatMessage[]>(value, []);
  },

  saveLastMotion(motion: MotionDefinition): void {
    safeLocalStorageSet(KEYS.LAST_MOTION, JSON.stringify(motion));
  },

  getLastMotion(): MotionDefinition | null {
    const value = safeLocalStorageGet(KEYS.LAST_MOTION);
    return safeJSONParse<MotionDefinition | null>(value, null);
  },

  clearAll(): void {
    safeLocalStorageRemove(KEYS.LLM_CONFIG);
    safeLocalStorageRemove(KEYS.CHAT_HISTORY);
    safeLocalStorageRemove(KEYS.LAST_MOTION);
  },
};

// =============================================================================
// 画面比例持久化
// =============================================================================

/**
 * 加载用户保存的画面比例设置
 * @returns 保存的画面比例 ID，如果没有则返回 null
 */
export function loadAspectRatio(): AspectRatioId | null {
  const value = safeLocalStorageGet(KEYS.ASPECT_RATIO);
  if (!value) return null;
  // 验证是否为有效的 AspectRatioId
  const validIds: AspectRatioId[] = ['16:9', '4:3', '1:1', '9:16', '21:9', '2.35:1'];
  if (validIds.includes(value as AspectRatioId)) {
    return value as AspectRatioId;
  }
  return null;
}

/**
 * 保存用户的画面比例设置
 * @param aspectRatio 画面比例 ID
 */
export function saveAspectRatio(aspectRatio: AspectRatioId): void {
  safeLocalStorageSet(KEYS.ASPECT_RATIO, aspectRatio);
}

// =============================================================================
// 主题持久化 (已移除，仅保留默认主题)
// =============================================================================

// =============================================================================
// 澄清会话持久化
// =============================================================================

/**
 * 保存澄清会话
 */
export function saveClarifySession(session: ClarifySession): void {
  safeLocalStorageSet(KEYS.CLARIFY_SESSION, JSON.stringify(session));
}

/**
 * 获取澄清会话
 */
export function getClarifySession(): ClarifySession | null {
  const value = safeLocalStorageGet(KEYS.CLARIFY_SESSION);
  return safeJSONParse<ClarifySession | null>(value, null);
}

/**
 * 清除澄清会话
 */
export function clearClarifySession(): void {
  safeLocalStorageRemove(KEYS.CLARIFY_SESSION);
}

/**
 * 获取澄清功能启用状态
 * @returns 启用状态，默认为 true
 */
export function getClarifyEnabled(): boolean {
  const value = safeLocalStorageGet(KEYS.CLARIFY_ENABLED);
  // 默认启用
  if (value === null) return true;
  return value === 'true';
}

/**
 * 设置澄清功能启用状态
 */
export function setClarifyEnabled(enabled: boolean): void {
  safeLocalStorageSet(KEYS.CLARIFY_ENABLED, String(enabled));
}

// =============================================================================
// 对话存储 (013-history-panel)
// =============================================================================

/**
 * 获取对话索引（元数据列表）
 * @returns 对话元数据列表，不存在时返回 null
 */
export function getConversationIndex(): ConversationMeta[] | null {
  const value = safeLocalStorageGet(KEYS.CONVERSATION_INDEX);
  return safeJSONParse<ConversationMeta[] | null>(value, null);
}

/**
 * 保存对话索引
 * @param index 对话元数据列表
 */
export function saveConversationIndex(index: ConversationMeta[]): void {
  safeLocalStorageSet(KEYS.CONVERSATION_INDEX, JSON.stringify(index));
}

/**
 * 获取当前对话 ID
 * @returns 当前对话 ID，不存在时返回 null
 */
export function getCurrentConversationId(): string | null {
  return safeLocalStorageGet(KEYS.CURRENT_CONVERSATION);
}

/**
 * 设置当前对话 ID
 * @param id 对话 ID，传 null 清除
 */
export function setCurrentConversationId(id: string | null): void {
  if (id === null) {
    safeLocalStorageRemove(KEYS.CURRENT_CONVERSATION);
  } else {
    safeLocalStorageSet(KEYS.CURRENT_CONVERSATION, id);
  }
}

/**
 * 验证对话数据是否有效
 */
function isValidConversation(data: unknown): data is Conversation {
  if (!data || typeof data !== 'object') return false;
  const conv = data as Partial<Conversation>;
  return (
    typeof conv.id === 'string' &&
    typeof conv.title === 'string' &&
    Array.isArray(conv.messages) &&
    typeof conv.createdAt === 'number' &&
    typeof conv.updatedAt === 'number'
  );
}

/**
 * 获取指定对话数据
 * @param id 对话 ID
 * @returns 完整对话数据，不存在或数据损坏时返回 null
 */
export function getConversation(id: string): Conversation | null {
  const key = `${KEYS.CONVERSATION_PREFIX}${id}`;
  const value = safeLocalStorageGet(key);
  const parsed = safeJSONParse<Conversation | null>(value, null);

  // 数据完整性验证
  if (parsed && !isValidConversation(parsed)) {
    console.warn(`[Storage] 对话数据损坏: ${id}，将被忽略`);
    return null;
  }

  return parsed;
}

/**
 * 保存对话数据
 * @param conversation 完整对话数据
 */
export function saveConversation(conversation: Conversation): void {
  const key = `${KEYS.CONVERSATION_PREFIX}${conversation.id}`;
  safeLocalStorageSet(key, JSON.stringify(conversation));
}

/**
 * 删除对话数据
 * @param id 对话 ID
 */
export function deleteConversation(id: string): void {
  const key = `${KEYS.CONVERSATION_PREFIX}${id}`;
  safeLocalStorageRemove(key);
}

export default storageService;

// =============================================================================
// 多 LLM 配置存储 (015-multi-llm-config)
// =============================================================================

/**
 * 获取加密盐值
 * @returns Base64 编码的盐值，如果不存在返回 null
 */
export function getCryptoSalt(): string | null {
  return safeLocalStorageGet(KEYS.CRYPTO_SALT);
}

/**
 * 保存加密盐值
 * @param salt Base64 编码的盐值
 */
export function saveCryptoSalt(salt: string): void {
  safeLocalStorageSet(KEYS.CRYPTO_SALT, salt);
}

/**
 * 获取多配置列表
 * @returns 配置列表，如果不存在返回 null
 */
export function getLLMConfigs(): LLMConfigList | null {
  const value = safeLocalStorageGet(KEYS.LLM_CONFIGS);
  return safeJSONParse<LLMConfigList | null>(value, null);
}

/**
 * 保存多配置列表
 * @param configList 配置列表
 */
export function saveLLMConfigs(configList: LLMConfigList): void {
  safeLocalStorageSet(KEYS.LLM_CONFIGS, JSON.stringify(configList));
}

/**
 * 清除多配置列表
 */
export function clearLLMConfigs(): void {
  safeLocalStorageRemove(KEYS.LLM_CONFIGS);
}

/**
 * 从 URL 提取服务商名称
 */
function extractProviderName(baseURL: string): string {
  try {
    const url = new URL(baseURL);
    const hostname = url.hostname;
    if (hostname.includes('openai')) return 'OpenAI';
    if (hostname.includes('deepseek')) return 'DeepSeek';
    if (hostname.includes('anthropic')) return 'Anthropic';
    if (hostname.includes('azure')) return 'Azure';
    return hostname.split('.')[0];
  } catch {
    return 'Unknown';
  }
}

/**
 * 检查并迁移旧版单配置到多配置格式
 * 应在应用启动时调用
 * @returns 迁移后的配置列表，如果无需迁移返回 null
 */
export async function migrateOldConfig(): Promise<LLMConfigList | null> {
  // 如果已有新格式数据，无需迁移
  const existingConfigs = getLLMConfigs();
  if (existingConfigs) {
    return null;
  }

  // 检查是否有旧格式数据
  const oldConfig = storageService.getLLMConfig();
  if (!oldConfig) {
    return null;
  }

  console.log('[Storage] 检测到旧版配置，开始迁移到多配置格式...');

  try {
    // 获取或创建盐值
    const existingSalt = getCryptoSalt();
    const salt = getOrCreateSalt(existingSalt);
    if (!existingSalt) {
      saveCryptoSalt(saltToBase64(salt));
    }

    // 加密 API Key
    const encryptedApiKey: EncryptedData = await encrypt(oldConfig.apiKey, salt);

    // 生成配置名称
    const providerName = extractProviderName(oldConfig.baseURL);
    const configName = `${providerName} - ${oldConfig.model}`;

    // 创建新配置项
    const now = new Date().toISOString();
    const newConfig: LLMConfigItem = {
      id: generateId(),
      name: configName,
      baseURL: oldConfig.baseURL,
      apiKey: encryptedApiKey,
      model: oldConfig.model,
      createdAt: now,
      updatedAt: now,
    };

    // 创建配置列表
    const configList: LLMConfigList = {
      configs: [newConfig],
      activeConfigId: newConfig.id,
    };

    // 保存新格式
    saveLLMConfigs(configList);

    // 删除旧格式数据
    safeLocalStorageRemove(KEYS.LLM_CONFIG);

    console.log('[Storage] 配置迁移完成');
    return configList;
  } catch (error) {
    console.error('[Storage] 配置迁移失败:', error);
    return null;
  }
}
