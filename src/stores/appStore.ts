import { create } from 'zustand';
import type {
  AppState,
  MotionDefinition,
  ChatMessage,
  LLMConfig,
  AspectRatioId,
  ClarifySession,
  ClarifyAnswer,
  RenderError,
  Conversation,
  ConversationMeta,
  LLMConfigItem,
  LLMConfigList,
  DecryptedLLMConfig,
  AssetPackExportState,
  AssetPackExportConfig,
  ProcessedVideo,
  AttachmentUploadState,
  ChatAttachment,
  ToastMessage,
  Locale,
} from '../types';
import {
  DEFAULT_CONVERSATION_TITLE,
  MAX_CONVERSATION_TITLE_LENGTH,
  INITIAL_ASSET_PACK_EXPORT_STATE,
  TOAST_DEFAULT_DURATION_MS,
} from '../types';
import {
  storageService,
  loadAspectRatio,
  saveAspectRatio,
  getClarifySession,
  saveClarifySession,
  clearClarifySession,
  getClarifyEnabled,
  setClarifyEnabled as storageClarifyEnabled,
  getConversationIndex,
  saveConversationIndex,
  getCurrentConversationId,
  setCurrentConversationId,
  getConversation,
  saveConversation,
  deleteConversation as deleteConversationFromStorage,
  getLLMConfigs,
  saveLLMConfigs,
  migrateOldConfig,
  getCryptoSalt,
} from '../services/storage';
import { decrypt, decryptLegacy, encrypt, getOrCreateSalt } from '../services/crypto';
import i18n from '../locales/i18n';
import { revokeImageUrl } from '../utils/imageUtils';
import { revokeVideoUrl } from '../utils/videoUtils';
import { DEFAULT_ASPECT_RATIO } from '../utils/coordinates';
import { generateId } from '../utils/id';

interface AppActions {
  // Motion actions
  setCurrentMotion: (motion: MotionDefinition | null) => void;
  updateMotionParameter: (parameterId: string, value: unknown) => void;
  /** 更新视频参数，同时更新动效时长 (019-video-input-support) */
  updateVideoParameter: (parameterId: string, value: string, videoInfo?: ProcessedVideo) => void;

  // Chat actions
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;

  // LLM config actions
  setLLMConfig: (config: LLMConfig | null) => void;

  // UI state actions
  setIsGenerating: (isGenerating: boolean) => void;
  setIsExporting: (isExporting: boolean) => void;
  setExportProgress: (progress: number) => void;
  setError: (error: string | null) => void;

  // Playback actions
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;

  // Dialog actions
  openSettings: () => void;
  closeSettings: () => void;
  openExportDialog: () => void;
  closeExportDialog: () => void;

  // Aspect ratio actions
  setAspectRatio: (aspectRatio: AspectRatioId) => void;

  // Theme actions

  // Clarify actions
  setClarifySession: (session: ClarifySession | null) => void;
  setIsClarifying: (isClarifying: boolean) => void;
  answerClarifyQuestion: (questionId: string, answer: ClarifyAnswer) => void;
  skipClarify: () => void;
  nextClarifyQuestion: () => void;
  setClarifyEnabled: (enabled: boolean) => void;

  // Error actions (009-js-error-autofix)
  setRenderError: (error: RenderError | null) => void;
  setIsFixing: (isFixing: boolean) => void;
  incrementFixAttempt: () => void;
  resetFixAttempt: () => void;
  setFixAbortController: (controller: AbortController | null) => void;
  clearErrorState: () => void;

  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;

  // Conversation actions (013-history-panel)
  initConversations: () => void;
  createConversation: () => void;
  switchConversation: (id: string) => Promise<void>;
  saveCurrentConversation: (immediate?: boolean) => void;
  deleteConversation: (id: string) => void;
  touchConversation: () => void;
  toggleHistoryPanel: () => void;
  updateConversationTitle: (id: string, title: string) => void;
  /** 复制指定对话，返回新对话 ID (018-duplicate-conversation) */
  duplicateConversation: (id: string) => Promise<string | null>;
  /** 导入对话列表，返回导入的对话 ID 列表 (030-session-export) */
  importConversations: (conversations: Conversation[]) => string[];

  // Multi LLM config actions (015-multi-llm-config)
  initLLMConfigs: () => Promise<void>;
  setLLMConfigs: (configs: LLMConfigItem[]) => void;
  setActiveConfigId: (id: string | null) => void;
  addLLMConfig: (config: LLMConfigItem) => void;
  updateLLMConfig: (id: string, config: Partial<LLMConfigItem>) => void;
  deleteLLMConfig: (id: string) => void;
  /** 获取解密后的活跃配置（用于 API 调用） */
  getActiveConfig: () => Promise<DecryptedLLMConfig | null>;

  // Asset pack export actions (017-export-asset-pack)
  openAssetPackExportDialog: () => void;
  closeAssetPackExportDialog: () => void;
  setAssetPackExportState: (state: Partial<AssetPackExportState>) => void;
  updateAssetPackExportConfig: (config: Partial<AssetPackExportConfig>) => void;
  resetAssetPackExportState: () => void;

  // Attachment actions (031-multimodal-input)
  /** 添加待发送附件 */
  addPendingAttachment: (attachment: AttachmentUploadState) => void;
  /** 更新待发送附件状态 */
  updatePendingAttachment: (tempId: string, updates: Partial<AttachmentUploadState>) => void;
  /** 移除待发送附件 */
  removePendingAttachment: (tempId: string) => void;
  /** 清空待发送附件 */
  clearPendingAttachments: () => void;
  /** 加载消息的附件数据 */
  loadMessageAttachments: (messageId: string) => Promise<ChatAttachment[]>;

  // Preview background actions (033-preview-background)
  /** 设置预览背景图 URL */
  setPreviewBackgroundUrl: (url: string | null) => void;

  // Toast actions (034-preview-performance-guard)
  /** 添加 Toast 消息 */
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  /** 移除 Toast 消息 */
  removeToast: (id: string) => void;

  // Navigation actions (036-game-ui-redesign)
  /** 设置当前路由路径 */
  setCurrentPath: (path: string) => void;
  /** 设置移动端菜单状态 */
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  /** 切换移动端菜单 */
  toggleMobileMenu: () => void;
  /** 设置界面语言 */
  setLocale: (locale: Locale) => void;
}

type AppStore = AppState & AppActions;

function detectLocale(): Locale {
  const saved = localStorage.getItem('neon-locale');
  if (saved === 'zh' || saved === 'en') return saved;
  return navigator.language.startsWith('en') ? 'en' : 'zh';
}

/**
 * 迁移旧版 device-fingerprint 加密的配置到固定口令加密
 * 尝试顺序：新密钥解密 → 旧指纹解密并重新加密 → 保留配置但清空 apiKey
 */
async function migrateEncryptionIfNeeded(configs: LLMConfigItem[]): Promise<{ configs: LLMConfigItem[]; changed: boolean }> {
  const salt = getOrCreateSalt(getCryptoSalt());
  let changed = false;
  const result: LLMConfigItem[] = [];

  for (const config of configs) {
    // 先用新固定密钥尝试解密，成功说明已经是新格式
    try {
      await decrypt(config.apiKey, salt);
      result.push(config);
      continue;
    } catch {
      // 新密钥解不开，尝试旧指纹
    }

    const legacyPlaintext = await decryptLegacy(config.apiKey, salt);
    if (legacyPlaintext) {
      // 旧指纹解密成功，用新密钥重新加密
      const newEncrypted = await encrypt(legacyPlaintext, salt);
      result.push({ ...config, apiKey: newEncrypted, updatedAt: new Date().toISOString() });
      changed = true;
      console.log(`[AppStore] 已迁移配置 "${config.name}" 到新加密方式`);
    } else {
      // 都解不开，保留配置但清空 apiKey
      const emptyEncrypted = await encrypt('', salt);
      result.push({ ...config, apiKey: emptyEncrypted, updatedAt: new Date().toISOString() });
      changed = true;
      console.warn(`[AppStore] 配置 "${config.name}" 无法迁移，已清空 API Key，请重新填写`);
    }
  }

  return { configs: result, changed };
}

const initialState: AppState = {
  currentMotion: null,
  messages: [],
  llmConfig: null,
  isGenerating: false,
  isExporting: false,
  exportProgress: 0,
  error: null,
  isPlaying: false,
  currentTime: 0,
  isSettingsOpen: false,
  isExportDialogOpen: false,
  aspectRatio: DEFAULT_ASPECT_RATIO,
  // 澄清问答状态
  clarifySession: null,
  isClarifying: false,
  clarifyEnabled: true, // 默认启用
  // 渲染错误状态 (009-js-error-autofix)
  renderError: null,
  isFixing: false,
  fixAttemptCount: 0,
  fixAbortController: null,
  // 对话管理状态 (013-history-panel)
  conversationList: [],
  currentConversationId: null,
  isHistoryPanelOpen: false,
  // 多 LLM 配置状态 (015-multi-llm-config)
  llmConfigs: [],
  activeConfigId: null,
  isLoadingConfigs: false,
  // 素材包导出状态 (017-export-asset-pack)
  isAssetPackExportDialogOpen: false,
  assetPackExportState: INITIAL_ASSET_PACK_EXPORT_STATE,
  // 附件上传状态 (031-multimodal-input)
  pendingAttachments: [],
  // 预览背景图状态 (033-preview-background)
  previewBackgroundUrl: null,
  // Toast 状态 (034-preview-performance-guard)
  toasts: [],
  // 导航状态 (036-game-ui-redesign)
  currentPath: '/',
  isMobileMenuOpen: false,
  locale: detectLocale(),
};

// 生成 UUID v4
const generateUUID = generateId;

// 从首条用户消息生成标题
function generateTitleFromMessages(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) {
    return i18n.t(DEFAULT_CONVERSATION_TITLE);
  }
  const content = firstUserMessage.content.trim();
  if (content.length <= MAX_CONVERSATION_TITLE_LENGTH) {
    return content;
  }
  return content.substring(0, MAX_CONVERSATION_TITLE_LENGTH) + '...';
}

// 副本标题后缀 (018-duplicate-conversation) - locale-aware
function getCopySuffix(): string {
  return i18n.t('copy.suffix');
}

function getCopySuffixPattern(): RegExp {
  const suffix = escapeRegExp(getCopySuffix().replace(/[()（）]/g, ''));
  return new RegExp(`^(.+?)\\s*[（(]${suffix}(?:\\s*(\\d+))?[）)]$`);
}

const MAX_DUPLICATE_TITLE_LENGTH = 50;

// 转义正则表达式特殊字符
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 生成复制对话的标题 (018-duplicate-conversation)
function generateDuplicateTitle(originalTitle: string, existingTitles: string[]): string {
  const copySuffixPattern = getCopySuffixPattern();
  // 解析基础标题（去除已有的副本后缀）
  const match = originalTitle.match(copySuffixPattern);
  const baseTitle = match ? match[1].trim() : originalTitle.trim();

  // 找出当前最大序号
  let maxNum = 0;
  const copySuffix = getCopySuffix().replace(/[()（）]/g, '');
  const pattern = new RegExp(`^${escapeRegExp(baseTitle)}\\s*[（(]${escapeRegExp(copySuffix)}(?:\\s*(\\d+))?[）)]$`);

  for (const title of existingTitles) {
    const m = title.match(pattern);
    if (m) {
      const num = m[1] ? parseInt(m[1], 10) : 1;
      if (num > maxNum) maxNum = num;
    }
  }

  // 生成后缀
  const suffix = maxNum === 0 ? getCopySuffix() : i18n.t('copy.suffixN', { n: maxNum + 1 });
  const fullTitle = `${baseTitle} ${suffix}`;

  // 处理超长标题
  if (fullTitle.length > MAX_DUPLICATE_TITLE_LENGTH) {
    const availableLength = MAX_DUPLICATE_TITLE_LENGTH - suffix.length - 1;
    const truncatedBase = baseTitle.substring(0, availableLength);
    return `${truncatedBase} ${suffix}`;
  }

  return fullTitle;
}

// 保存防抖延迟 (ms)
const SAVE_DEBOUNCE_DELAY = 300;
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  // Motion actions
  setCurrentMotion: (motion) => {
    // 清理旧动效的图片、视频 Blob URL
    const { currentMotion: oldMotion } = get();
    if (oldMotion) {
      oldMotion.parameters.forEach((param) => {
        if (param.type === 'image' && param.imageValue) {
          revokeImageUrl(param.imageValue);
        }
        if (param.type === 'video' && param.videoValue) {
          revokeVideoUrl(param.videoValue);
        }
      });
    }

    set({ currentMotion: motion, isPlaying: false, currentTime: 0 });
    if (motion) {
      storageService.saveLastMotion(motion);
    }
  },

  updateMotionParameter: (parameterId, value) => {
    const { currentMotion } = get();
    if (!currentMotion) return;

    console.log('[AppStore] updateMotionParameter:', parameterId, value);

    const updatedParameters = currentMotion.parameters.map((param) => {
      if (param.id !== parameterId) return param;

      switch (param.type) {
        case 'number':
          return { ...param, value: value as number };
        case 'color':
          return { ...param, colorValue: value as string };
        case 'select':
          return { ...param, selectedValue: value as string };
        case 'boolean':
          return { ...param, boolValue: value as boolean };
        case 'image': {
          // 释放旧的 Blob URL
          if (param.imageValue) {
            revokeImageUrl(param.imageValue);
          }
          return { ...param, imageValue: value as string };
        }
        case 'string':
          // 字符串参数直接更新 (028-string-param)
          return { ...param, stringValue: value as string };
        default:
          return param;
      }
    });

    // 创建新的 motion 对象，保持相同的 ID（不触发渲染器重建）
    const updatedMotion: MotionDefinition = {
      ...currentMotion,
      parameters: updatedParameters,
      updatedAt: Date.now(),
    };

    set({ currentMotion: updatedMotion });
    storageService.saveLastMotion(updatedMotion);
  },

  // 视频参数更新 (019-video-input-support)
  updateVideoParameter: (parameterId, value, videoInfo) => {
    const { currentMotion } = get();
    if (!currentMotion) return;

    console.log('[AppStore] updateVideoParameter:', parameterId, videoInfo);

    const updatedParameters = currentMotion.parameters.map((param) => {
      if (param.id !== parameterId) return param;

      // 释放旧的视频 Blob URL
      if (param.videoValue) {
        revokeVideoUrl(param.videoValue);
      }

      return {
        ...param,
        videoValue: value,
        videoFileName: videoInfo?.originalFileName,
        videoDuration: videoInfo?.duration,
        videoWidth: videoInfo?.width,
        videoHeight: videoInfo?.height,
      };
    });

    // 注意：不再自动将动效时长设置为视频时长
    // 动态时长由 durationCode 控制 (025-dynamic-duration)

    const updatedMotion: MotionDefinition = {
      ...currentMotion,
      parameters: updatedParameters,
      updatedAt: Date.now(),
    };

    set({ currentMotion: updatedMotion });
    storageService.saveLastMotion(updatedMotion);
  },

  // Chat actions
  addMessage: (message) => {
    const messages = [...get().messages, message];
    set({ messages });
    storageService.saveChatHistory(messages);
  },

  clearMessages: () => {
    set({ messages: [] });
    storageService.saveChatHistory([]);
  },

  // LLM config actions
  setLLMConfig: (config) => {
    set({ llmConfig: config });
    if (config) {
      storageService.saveLLMConfig(config);
    }
  },

  // UI state actions
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setIsExporting: (isExporting) => set({ isExporting }),
  setExportProgress: (exportProgress) => set({ exportProgress }),
  setError: (error) => set({ error }),

  // Playback actions
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),

  // Dialog actions
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openExportDialog: () => set({ isExportDialogOpen: true, isPlaying: false }),
  closeExportDialog: () => set({ isExportDialogOpen: false }),

  // Aspect ratio actions
  setAspectRatio: (aspectRatio) => {
    set({ aspectRatio });
    saveAspectRatio(aspectRatio);
  },

  // Theme actions (已移除，仅保留默认主题)

  // Clarify actions
  setClarifySession: (session) => {
    set({ clarifySession: session });
    if (session) {
      saveClarifySession(session);
    } else {
      clearClarifySession();
    }
  },

  setIsClarifying: (isClarifying) => set({ isClarifying }),

  answerClarifyQuestion: (_questionId, answer) => {
    const { clarifySession } = get();
    if (!clarifySession) return;

    const updatedAnswers = [...clarifySession.answers, answer];
    const updatedSession: ClarifySession = {
      ...clarifySession,
      answers: updatedAnswers,
      updatedAt: Date.now(),
    };

    set({ clarifySession: updatedSession });
    saveClarifySession(updatedSession);
  },

  skipClarify: () => {
    const { clarifySession } = get();
    if (!clarifySession) return;

    const updatedSession: ClarifySession = {
      ...clarifySession,
      status: 'skipped',
      updatedAt: Date.now(),
    };

    set({ clarifySession: updatedSession, isClarifying: false });
    saveClarifySession(updatedSession);
  },

  nextClarifyQuestion: () => {
    const { clarifySession } = get();
    if (!clarifySession) return;

    const nextIndex = clarifySession.currentQuestionIndex + 1;
    const isComplete = nextIndex >= clarifySession.questions.length;

    const updatedSession: ClarifySession = {
      ...clarifySession,
      currentQuestionIndex: nextIndex,
      status: isComplete ? 'completed' : 'questioning',
      updatedAt: Date.now(),
    };

    set({ clarifySession: updatedSession });
    saveClarifySession(updatedSession);
  },

  setClarifyEnabled: (enabled) => {
    set({ clarifyEnabled: enabled });
    storageClarifyEnabled(enabled);
  },

  // Error actions (009-js-error-autofix)
  setRenderError: (error) => {
    const { fixAbortController } = get();
    // 取消任何进行中的修复请求
    if (fixAbortController) {
      fixAbortController.abort();
    }
    set({
      renderError: error,
      fixAttemptCount: 0, // 重置计数
      fixAbortController: null,
    });
  },

  setIsFixing: (isFixing) => set({ isFixing }),

  incrementFixAttempt: () => {
    const { fixAttemptCount } = get();
    set({ fixAttemptCount: fixAttemptCount + 1 });
  },

  resetFixAttempt: () => set({ fixAttemptCount: 0 }),

  setFixAbortController: (controller) => set({ fixAbortController: controller }),

  clearErrorState: () => {
    const { fixAbortController } = get();
    if (fixAbortController) {
      fixAbortController.abort();
    }
    set({
      renderError: null,
      isFixing: false,
      fixAttemptCount: 0,
      fixAbortController: null,
    });
  },

  // Persistence
  loadFromStorage: () => {
    const llmConfig = storageService.getLLMConfig();
    const messages = storageService.getChatHistory();
    const currentMotion = storageService.getLastMotion();
    const savedAspectRatio = loadAspectRatio();
    const savedClarifySession = getClarifySession();
    const clarifyEnabled = getClarifyEnabled();

    // 恢复澄清会话时检查是否需要继续
    const clarifySession = savedClarifySession;
    const isClarifying = savedClarifySession?.status === 'questioning' || false;

    set({
      llmConfig,
      messages,
      currentMotion,
      aspectRatio: savedAspectRatio || DEFAULT_ASPECT_RATIO,
      clarifySession,
      isClarifying,
      clarifyEnabled,
    });
  },

  saveToStorage: () => {
    const { llmConfig, messages, currentMotion } = get();
    if (llmConfig) storageService.saveLLMConfig(llmConfig);
    storageService.saveChatHistory(messages);
    if (currentMotion) storageService.saveLastMotion(currentMotion);
  },

  // Conversation actions (013-history-panel)
  initConversations: () => {
    // 加载对话索引
    let conversationList = getConversationIndex();
    let currentConversationId = getCurrentConversationId();

    // 数据迁移：如果没有对话索引，检查是否有旧数据
    if (!conversationList) {
      const oldMessages = storageService.getChatHistory();
      const oldMotion = storageService.getLastMotion();

      if (oldMessages.length > 0 || oldMotion) {
        // 创建一个对话来容纳旧数据
        const id = generateUUID();
        const now = Date.now();
        const title = generateTitleFromMessages(oldMessages);

        const conversation: Conversation = {
          id,
          title,
          messages: oldMessages,
          motion: oldMotion,
          createdAt: now,
          updatedAt: now,
        };

        saveConversation(conversation);
        conversationList = [{ id, title, updatedAt: now }];
        saveConversationIndex(conversationList);
        currentConversationId = id;
        setCurrentConversationId(id);
      } else {
        conversationList = [];
      }
    }

    // 如果有对话列表但没有当前对话，取最新的一个
    if (conversationList.length > 0 && !currentConversationId) {
      const sorted = [...conversationList].sort((a, b) => b.updatedAt - a.updatedAt);
      currentConversationId = sorted[0].id;
      setCurrentConversationId(currentConversationId);
    }

    // 加载当前对话数据
    if (currentConversationId) {
      const conversation = getConversation(currentConversationId);
      if (conversation) {
        set({
          conversationList,
          currentConversationId,
          messages: conversation.messages,
          currentMotion: conversation.motion,
        });
        return;
      }
    }

    set({
      conversationList,
      currentConversationId: null,
      messages: [],
      currentMotion: null,
    });
  },

  createConversation: () => {
    const { isGenerating, isClarifying, isFixing } = get();

    // 禁用检查
    if (isGenerating || isClarifying || isFixing) {
      return;
    }

    // 保存当前对话（立即执行）
    get().saveCurrentConversation(true);

    // 清理待发送附件 (031-multimodal-input T035)
    get().clearPendingAttachments();

    // 创建新对话
    const id = generateUUID();
    const now = Date.now();
    const newConversation: Conversation = {
      id,
      title: i18n.t(DEFAULT_CONVERSATION_TITLE),
      messages: [],
      motion: null,
      createdAt: now,
      updatedAt: now,
    };

    saveConversation(newConversation);

    // 更新索引
    const { conversationList } = get();
    const newMeta: ConversationMeta = { id, title: newConversation.title, updatedAt: now };
    const newList = [newMeta, ...conversationList];
    saveConversationIndex(newList);
    setCurrentConversationId(id);

    // 更新状态
    set({
      conversationList: newList,
      currentConversationId: id,
      messages: [],
      currentMotion: null,
      clarifySession: null,
      isClarifying: false,
    });
  },

  switchConversation: async (id: string) => {
    const { isGenerating, isClarifying, isFixing, currentConversationId } = get();

    // 禁用检查
    if (isGenerating || isClarifying || isFixing) {
      return;
    }

    // 如果是当前对话，直接返回
    if (id === currentConversationId) {
      return;
    }

    // 保存当前对话（立即执行）
    get().saveCurrentConversation(true);

    // 清理待发送附件 (031-multimodal-input T035)
    get().clearPendingAttachments();

    // 加载目标对话
    const conversation = getConversation(id);
    if (!conversation) {
      console.warn(`[AppStore] Conversation not found: ${id}`);
      return;
    }

    setCurrentConversationId(id);

    // 更新状态
    set({
      currentConversationId: id,
      messages: conversation.messages,
      currentMotion: conversation.motion,
      clarifySession: null,
      isClarifying: false,
      renderError: null,
      isFixing: false,
      fixAttemptCount: 0,
    });
  },

  saveCurrentConversation: (immediate = false) => {
    // 清除之前的防抖定时器
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = null;
    }

    const doSave = () => {
      const { currentConversationId, messages, currentMotion, conversationList } = get();

      if (!currentConversationId) {
        // 没有当前对话，创建一个新的
        if (messages.length === 0 && !currentMotion) {
          return; // 空对话不保存
        }

        const id = generateUUID();
        const now = Date.now();
        const title = generateTitleFromMessages(messages);
        const conversation: Conversation = {
          id,
          title,
          messages,
          motion: currentMotion,
          createdAt: now,
          updatedAt: now,
        };

        saveConversation(conversation);

        const newMeta: ConversationMeta = { id, title, updatedAt: now };
        const newList = [newMeta, ...conversationList];
        saveConversationIndex(newList);
        setCurrentConversationId(id);

        set({
          conversationList: newList,
          currentConversationId: id,
        });
        return;
      }

      // 更新现有对话（保留原有的 updatedAt，不更新时间）
      const existingConversation = getConversation(currentConversationId);
      const existingMeta = conversationList.find((m) => m.id === currentConversationId);
      const now = Date.now();

      // 保留原有的 updatedAt
      const preservedUpdatedAt = existingConversation?.updatedAt || existingMeta?.updatedAt || now;
      const title = existingConversation?.title || generateTitleFromMessages(messages);

      const conversation: Conversation = {
        id: currentConversationId,
        title,
        messages,
        motion: currentMotion,
        createdAt: existingConversation?.createdAt || now,
        // 保留原有的 updatedAt，不在保存时更新（由 touchConversation 负责更新）
        updatedAt: preservedUpdatedAt,
      };

      saveConversation(conversation);

      // 同步 conversationList 中的标题（但不更新 updatedAt）
      // 这确保 UI 中显示正确的标题
      const updatedList = conversationList.map((meta) =>
        meta.id === currentConversationId ? { ...meta, title } : meta
      );
      saveConversationIndex(updatedList);
      set({ conversationList: updatedList });
    };

    if (immediate) {
      doSave();
    } else {
      saveDebounceTimer = setTimeout(doSave, SAVE_DEBOUNCE_DELAY);
    }
  },

  deleteConversation: (id: string) => {
    const { isGenerating, isClarifying, isFixing, currentConversationId, conversationList } = get();

    // 如果删除当前对话且有进行中的操作，禁止删除
    if (id === currentConversationId && (isGenerating || isClarifying || isFixing)) {
      return;
    }

    // 删除对话中所有消息的附件 (031-multimodal-input T036)
    const conversation = getConversation(id);
    if (conversation) {
      const messagesWithAttachments = conversation.messages.filter(
        (m) => m.attachmentIds && m.attachmentIds.length > 0
      );
      if (messagesWithAttachments.length > 0) {
        // 异步删除附件，不阻塞对话删除
        import('../services/storage/attachmentStorage').then(({ deleteAttachmentsByMessageId }) => {
          for (const msg of messagesWithAttachments) {
            deleteAttachmentsByMessageId(msg.id).catch((err) => {
              console.error('[AppStore] 删除附件失败:', err);
            });
          }
        });
      }
    }

    // 从存储中删除
    deleteConversationFromStorage(id);

    // 更新列表
    const newList = conversationList.filter((meta) => meta.id !== id);
    saveConversationIndex(newList);

    // 如果删除的是当前对话
    if (id === currentConversationId) {
      if (newList.length > 0) {
        // 切换到最新的对话
        const sorted = [...newList].sort((a, b) => b.updatedAt - a.updatedAt);
        const nextId = sorted[0].id;
        const nextConversation = getConversation(nextId);

        setCurrentConversationId(nextId);
        set({
          conversationList: newList,
          currentConversationId: nextId,
          messages: nextConversation?.messages || [],
          currentMotion: nextConversation?.motion || null,
        });
      } else {
        // 没有剩余对话
        setCurrentConversationId(null);
        set({
          conversationList: [],
          currentConversationId: null,
          messages: [],
          currentMotion: null,
        });
      }
    } else {
      set({ conversationList: newList });
    }
  },

  touchConversation: () => {
    const { currentConversationId, conversationList } = get();
    if (!currentConversationId) return;

    const now = Date.now();

    // 更新索引中的修改时间
    const updatedList = conversationList.map((meta) =>
      meta.id === currentConversationId ? { ...meta, updatedAt: now } : meta
    );

    // 重新排序列表（最新在前）
    updatedList.sort((a, b) => b.updatedAt - a.updatedAt);

    saveConversationIndex(updatedList);
    set({ conversationList: updatedList });
  },

  toggleHistoryPanel: () => {
    set((state) => ({ isHistoryPanelOpen: !state.isHistoryPanelOpen }));
  },

  updateConversationTitle: (id: string, title: string) => {
    const { conversationList } = get();
    if (!id) return;

    // 更新存储中的对话（保持原有的 updatedAt）
    const conversation = getConversation(id);
    if (conversation) {
      const updatedConversation: Conversation = {
        ...conversation,
        title,
        // 不更新 updatedAt，标题更新不算修改时间变动
      };
      saveConversation(updatedConversation);
    }

    // 更新索引（只更新 title，不更新 updatedAt）
    const updatedList = conversationList.map((meta) =>
      meta.id === id ? { ...meta, title } : meta
    );
    saveConversationIndex(updatedList);

    set({ conversationList: updatedList });
  },

  // 复制对话 (018-duplicate-conversation)
  duplicateConversation: async (id: string) => {
    const { isGenerating, isClarifying, isFixing, conversationList } = get();

    // 禁用状态检查
    if (isGenerating || isClarifying || isFixing) {
      return null;
    }

    // 获取原对话
    const original = getConversation(id);
    if (!original) {
      console.warn(`[AppStore] Conversation not found: ${id}`);
      return null;
    }

    // 保存当前对话（立即执行）
    get().saveCurrentConversation(true);

    // 深拷贝原对话
    const cloned = structuredClone(original);

    // 生成新属性
    const newId = generateUUID();
    const now = Date.now();
    const existingTitles = conversationList.map((c) => c.title);
    const newTitle = generateDuplicateTitle(original.title, existingTitles);

    const newConversation: Conversation = {
      ...cloned,
      id: newId,
      title: newTitle,
      createdAt: now,
      updatedAt: now,
    };

    // 保存新对话到 localStorage
    saveConversation(newConversation);

    // 更新索引（新对话在最上方）
    const newMeta: ConversationMeta = { id: newId, title: newTitle, updatedAt: now };
    const newList = [newMeta, ...conversationList];
    saveConversationIndex(newList);
    setCurrentConversationId(newId);

    // 更新状态（自动切换到新对话）
    set({
      conversationList: newList,
      currentConversationId: newId,
      messages: newConversation.messages,
      currentMotion: newConversation.motion,
      clarifySession: null,
      isClarifying: false,
      renderError: null,
      isFixing: false,
      fixAttemptCount: 0,
    });

    return newId;
  },

  // 导入对话 (030-session-export)
  importConversations: (conversations: Conversation[]) => {
    const { conversationList } = get();

    if (conversations.length === 0) {
      return [];
    }

    const importedIds: string[] = [];
    const newMetas: ConversationMeta[] = [];

    // 保存每个对话到 localStorage
    for (const conversation of conversations) {
      saveConversation(conversation);
      importedIds.push(conversation.id);
      newMetas.push({
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
      });
    }

    // 更新索引（新导入的对话在最上方）
    const newList = [...newMetas, ...conversationList];
    saveConversationIndex(newList);

    // 自动切换到第一个导入的对话
    const firstImportedId = importedIds[0];
    const firstConversation = conversations[0];
    setCurrentConversationId(firstImportedId);

    // 更新状态
    set({
      conversationList: newList,
      currentConversationId: firstImportedId,
      messages: firstConversation.messages,
      currentMotion: firstConversation.motion,
      clarifySession: null,
      isClarifying: false,
      renderError: null,
      isFixing: false,
      fixAttemptCount: 0,
    });

    return importedIds;
  },

  // Multi LLM config actions (015-multi-llm-config)
  initLLMConfigs: async () => {
    set({ isLoadingConfigs: true });

    try {
      // 尝试迁移旧配置
      const migratedList = await migrateOldConfig();
      if (migratedList) {
        // 迁移加密方式
        const { configs: migrated, changed } = await migrateEncryptionIfNeeded(migratedList.configs);
        if (changed) {
          saveLLMConfigs({ configs: migrated, activeConfigId: migratedList.activeConfigId });
        }
        set({
          llmConfigs: migrated,
          activeConfigId: migratedList.activeConfigId,
          isLoadingConfigs: false,
        });
        return;
      }

      // 加载现有多配置
      const configList = getLLMConfigs();
      if (configList) {
        // 迁移加密方式
        const { configs: migrated, changed } = await migrateEncryptionIfNeeded(configList.configs);
        if (changed) {
          saveLLMConfigs({ configs: migrated, activeConfigId: configList.activeConfigId });
        }
        set({
          llmConfigs: migrated,
          activeConfigId: configList.activeConfigId,
          isLoadingConfigs: false,
        });
      } else {
        set({
          llmConfigs: [],
          activeConfigId: null,
          isLoadingConfigs: false,
        });
      }
    } catch (error) {
      console.error('[AppStore] Failed to init LLM configs:', error);
      set({
        llmConfigs: [],
        activeConfigId: null,
        isLoadingConfigs: false,
      });
    }
  },

  setLLMConfigs: (configs: LLMConfigItem[]) => {
    const { activeConfigId } = get();
    set({ llmConfigs: configs });
    // 同步到存储
    const configList: LLMConfigList = {
      configs,
      activeConfigId,
    };
    saveLLMConfigs(configList);
  },

  setActiveConfigId: (id: string | null) => {
    const { llmConfigs } = get();
    set({ activeConfigId: id });
    // 同步到存储
    const configList: LLMConfigList = {
      configs: llmConfigs,
      activeConfigId: id,
    };
    saveLLMConfigs(configList);
  },

  addLLMConfig: (config: LLMConfigItem) => {
    const { llmConfigs, activeConfigId } = get();
    const newConfigs = [...llmConfigs, config];
    // 如果是第一个配置，自动设为活跃
    const newActiveId = llmConfigs.length === 0 ? config.id : activeConfigId;

    set({
      llmConfigs: newConfigs,
      activeConfigId: newActiveId,
    });

    // 同步到存储
    const configList: LLMConfigList = {
      configs: newConfigs,
      activeConfigId: newActiveId,
    };
    saveLLMConfigs(configList);
  },

  updateLLMConfig: (id: string, updates: Partial<LLMConfigItem>) => {
    const { llmConfigs, activeConfigId } = get();
    const newConfigs = llmConfigs.map((config) =>
      config.id === id
        ? { ...config, ...updates, updatedAt: new Date().toISOString() }
        : config
    );

    set({ llmConfigs: newConfigs });

    // 同步到存储
    const configList: LLMConfigList = {
      configs: newConfigs,
      activeConfigId,
    };
    saveLLMConfigs(configList);
  },

  deleteLLMConfig: (id: string) => {
    const { llmConfigs, activeConfigId } = get();
    const newConfigs = llmConfigs.filter((config) => config.id !== id);

    // 如果删除的是当前活跃配置，切换到第一个（如果有）
    let newActiveId = activeConfigId;
    if (activeConfigId === id) {
      newActiveId = newConfigs.length > 0 ? newConfigs[0].id : null;
    }

    set({
      llmConfigs: newConfigs,
      activeConfigId: newActiveId,
    });

    // 同步到存储
    const configList: LLMConfigList = {
      configs: newConfigs,
      activeConfigId: newActiveId,
    };
    saveLLMConfigs(configList);
  },

  getActiveConfig: async (): Promise<DecryptedLLMConfig | null> => {
    const { llmConfigs, activeConfigId } = get();

    if (!activeConfigId) {
      return null;
    }

    const activeConfig = llmConfigs.find((c) => c.id === activeConfigId);
    if (!activeConfig) {
      return null;
    }

    try {
      const existingSalt = getCryptoSalt();
      const salt = getOrCreateSalt(existingSalt);
      const decryptedApiKey = await decrypt(activeConfig.apiKey, salt);

      return {
        id: activeConfig.id,
        name: activeConfig.name,
        baseURL: activeConfig.baseURL,
        apiKey: decryptedApiKey,
        model: activeConfig.model,
        createdAt: activeConfig.createdAt,
        updatedAt: activeConfig.updatedAt,
      };
    } catch (error) {
      console.error('[AppStore] Failed to decrypt active config:', error);
      return null;
    }
  },

  // Asset pack export actions (017-export-asset-pack)
  openAssetPackExportDialog: () => {
    set({
      isAssetPackExportDialogOpen: true,
      isPlaying: false,
      assetPackExportState: {
        ...INITIAL_ASSET_PACK_EXPORT_STATE,
        status: 'configuring',
      },
    });
  },

  closeAssetPackExportDialog: () => {
    set({
      isAssetPackExportDialogOpen: false,
      assetPackExportState: INITIAL_ASSET_PACK_EXPORT_STATE,
    });
  },

  setAssetPackExportState: (stateUpdate: Partial<AssetPackExportState>) => {
    const { assetPackExportState } = get();
    set({
      assetPackExportState: {
        ...assetPackExportState,
        ...stateUpdate,
      },
    });
  },

  updateAssetPackExportConfig: (configUpdate: Partial<AssetPackExportConfig>) => {
    const { assetPackExportState } = get();
    const currentConfig = assetPackExportState.config || {
      filename: 'motion-preview',
      selectedParameterIds: [],
      showPanelTitle: true,
    };
    set({
      assetPackExportState: {
        ...assetPackExportState,
        config: {
          ...currentConfig,
          ...configUpdate,
        },
      },
    });
  },

  resetAssetPackExportState: () => {
    set({
      assetPackExportState: INITIAL_ASSET_PACK_EXPORT_STATE,
    });
  },

  // ========== Attachment actions (031-multimodal-input) ==========

  addPendingAttachment: (attachment: AttachmentUploadState) => {
    const { pendingAttachments } = get();
    set({
      pendingAttachments: [...pendingAttachments, attachment],
    });
  },

  updatePendingAttachment: (tempId: string, updates: Partial<AttachmentUploadState>) => {
    const { pendingAttachments } = get();
    set({
      pendingAttachments: pendingAttachments.map((att) =>
        att.tempId === tempId ? { ...att, ...updates } : att
      ),
    });
  },

  removePendingAttachment: (tempId: string) => {
    const { pendingAttachments } = get();
    const attachment = pendingAttachments.find((att) => att.tempId === tempId);

    // 释放 Blob URL
    if (attachment?.previewUrl) {
      revokeImageUrl(attachment.previewUrl);
    }

    set({
      pendingAttachments: pendingAttachments.filter((att) => att.tempId !== tempId),
    });
  },

  clearPendingAttachments: () => {
    const { pendingAttachments } = get();

    // 释放所有 Blob URL
    for (const att of pendingAttachments) {
      if (att.previewUrl) {
        revokeImageUrl(att.previewUrl);
      }
    }

    set({ pendingAttachments: [] });
  },

  loadMessageAttachments: async (messageId: string): Promise<ChatAttachment[]> => {
    const { getAttachmentsByMessageId } = await import('../services/storage/attachmentStorage');
    return getAttachmentsByMessageId(messageId);
  },

  // ========== Preview background actions (033-preview-background) ==========

  setPreviewBackgroundUrl: (url: string | null) => {
    const { previewBackgroundUrl: oldUrl } = get();
    // 释放旧的 Blob URL
    if (oldUrl && oldUrl.startsWith('blob:')) {
      URL.revokeObjectURL(oldUrl);
    }
    set({ previewBackgroundUrl: url });
  },

  // ========== Toast actions (034-preview-performance-guard) ==========

  addToast: (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastMessage = { ...toast, id };
    const { toasts } = get();
    set({ toasts: [...toasts, newToast] });

    // 自动消失
    const duration = toast.duration ?? TOAST_DEFAULT_DURATION_MS;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id: string) => {
    const { toasts } = get();
    set({ toasts: toasts.filter((t: ToastMessage) => t.id !== id) });
  },

  // ========== Navigation actions (036-game-ui-redesign) ==========

  setCurrentPath: (path: string) => {
    set({ currentPath: path });
  },

  setIsMobileMenuOpen: (isOpen: boolean) => {
    set({ isMobileMenuOpen: isOpen });
  },

  toggleMobileMenu: () => {
    const { isMobileMenuOpen } = get();
    set({ isMobileMenuOpen: !isMobileMenuOpen });
  },

  setLocale: (locale) => {
    localStorage.setItem('neon-locale', locale);
    i18n.changeLanguage(locale);
    set({ locale });
  },
}));

export default useAppStore;
