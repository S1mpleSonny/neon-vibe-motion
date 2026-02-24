// ==========================================
// 动效预览与导出平台 - 类型定义
// ==========================================

// ---------- 动画元素类型 ----------

// ---------- 动画元素类型 ----------

export interface ElementProperties {
  // 通用属性
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;

  // 形状属性
  shape?: 'circle' | 'rectangle' | 'triangle' | 'polygon';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;

  // 粒子属性
  particleCount?: number;
  particleSize?: number;
  emissionRate?: number;

  // 文本属性
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

export interface Keyframe {
  offset: number; // 0-1 时间偏移
  properties: Partial<ElementProperties>;
}

export interface PhysicsConfig {
  gravity?: number;
  friction?: number;
  bounce?: number;
  velocity?: { x: number; y: number };
}

export interface PathConfig {
  points: { x: number; y: number }[];
  closed?: boolean;
}

export interface AnimationConfig {
  type: 'keyframe' | 'physics' | 'path';
  duration: number;
  delay: number;
  easing: string; // e.g., 'ease-in-out', 'linear'
  loop: boolean;
  keyframes?: Keyframe[];
  physics?: PhysicsConfig;
  path?: PathConfig;
}

export interface MotionElement {
  id: string;
  type: 'shape' | 'particle' | 'text' | 'image';
  properties: ElementProperties;
  animation: AnimationConfig;
}

// ---------- 可调参数类型 ----------

export interface ParameterOption {
  label: string;
  value: string;
}

export interface AdjustableParameter {
  id: string;
  name: string; // 显示名称（中文）
  type: 'number' | 'color' | 'select' | 'boolean' | 'image' | 'video' | 'string';
  path: string; // 在 MotionDefinition 中的路径

  // 数值类型
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  unit?: string; // CSS 单位（如 px, deg, s, ms）

  // 颜色类型
  colorValue?: string;

  // 选择类型
  options?: ParameterOption[];
  selectedValue?: string;

  // 布尔类型
  boolValue?: boolean;

  // 图片类型
  imageValue?: string; // Blob URL 或占位图 URL
  imageFileName?: string; // 原始文件名（用于显示）
  placeholderImage?: string; // 占位图 URL（LLM 生成的默认值）

  // 视频类型 (019-video-input-support)
  videoValue?: string; // Blob URL 或占位视频 URL
  videoFileName?: string; // 原始文件名（用于显示）
  placeholderVideo?: string; // 占位视频 URL（LLM 生成的默认值）
  videoDuration?: number; // 视频时长（毫秒）
  videoWidth?: number; // 视频宽度
  videoHeight?: number; // 视频高度

  // 视频起始时间 (024-video-start-time)
  videoStartTime?: number; // 固定起始时间（毫秒），视频在动效时间轴上开始播放的时刻
  videoStartTimeCode?: string; // LLM 生成的动态计算逻辑代码，用于根据其他参数动态计算起始时间

  // 字符串类型 (028-string-param)
  stringValue?: string;         // 当前字符串值
  placeholder?: string;         // 输入框占位提示文本
  maxLength?: number;           // 最大字符长度限制（可选）

}

// ---------- 动效定义 ----------

export interface MotionDefinition {
  id: string;
  renderMode: 'canvas'; // 渲染模式
  duration: number; // 动画总时长（毫秒）
  width: number;
  height: number;
  backgroundColor: string;
  elements: MotionElement[];
  parameters: AdjustableParameter[];
  code: string; // Canvas 绘制代码
  createdAt: number;
  updatedAt: number;

  // 动态时长计算 (025-dynamic-duration)
  durationCode?: string; // LLM 生成的动态计算逻辑代码，用于根据参数动态计算总时长

  // 后处理代码 (webgl-postprocess)
  postProcessCode?: string;
}

// ---------- 多模态输入类型 (031-multimodal-input) ----------

/** 多模态内容块 - 用于构建 LLM API 请求 */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

/** 附件类型 */
export type AttachmentType = 'image' | 'document';

/** 附件上传状态 */
export type AttachmentUploadStatus = 'pending' | 'processing' | 'ready' | 'error';

/** 附件数据 (存储于 IndexedDB) */
export interface ChatAttachment {
  /** 附件唯一标识符 (UUID v4) */
  id: string;
  /** 关联的消息 ID */
  messageId: string;
  /** 附件类型 */
  type: AttachmentType;
  /** 原始文件名 */
  fileName: string;
  /** 文件 MIME 类型 */
  mimeType: string;
  /**
   * 附件内容
   * - image: Base64 Data URL (如 "data:image/png;base64,...")
   * - document: 纯文本内容
   */
  content: string;
  /** 图片预览 URL (仅 image 类型，运行时生成的 Blob URL) */
  previewUrl?: string;
  /** 是否被压缩 (仅 image 类型) */
  wasCompressed?: boolean;
  /** 原始尺寸 (仅 image 类型) */
  originalDimensions?: { width: number; height: number };
  /** 创建时间戳 */
  createdAt: number;
}

/** 附件上传状态 (UI 使用) */
export interface AttachmentUploadState {
  /** 临时 ID (上传完成前使用) */
  tempId: string;
  /** 原始文件 */
  file: File;
  /** 上传状态 */
  status: AttachmentUploadStatus;
  /** 预览 URL (Blob URL) */
  previewUrl?: string;
  /** 处理后的附件数据 (status='ready' 时存在) */
  attachment?: ChatAttachment;
  /** 错误信息 (status='error' 时存在) */
  error?: string;
  /** 是否被压缩 */
  wasCompressed?: boolean;
}

/** 附件约束常量 */
export const ATTACHMENT_CONSTRAINTS = {
  /** 单张图片最大大小 (10MB) */
  MAX_IMAGE_SIZE: 10 * 1024 * 1024,
  /** 单次消息最大附件数 */
  MAX_ATTACHMENTS: 5,
  /** 图片短边压缩阈值 (像素) */
  IMAGE_SHORT_EDGE_LIMIT: 1080,
  /** 支持的图片格式 */
  ACCEPTED_IMAGE_FORMATS: ['image/png', 'image/jpeg', 'image/webp'] as const,
  /** 支持的文档格式 */
  ACCEPTED_DOCUMENT_FORMATS: ['text/plain', 'text/markdown'] as const,
  /** 支持的文档扩展名 */
  ACCEPTED_DOCUMENT_EXTENSIONS: ['.txt', '.md'] as const,
} as const;

/** 附件错误消息 i18n 键映射 */
export const ATTACHMENT_ERROR_MESSAGES: Record<string, string> = {
  INVALID_IMAGE_FORMAT: 'error.attachment.invalidImageFormat',
  INVALID_DOCUMENT_FORMAT: 'error.attachment.invalidDocumentFormat',
  FILE_TOO_LARGE: 'error.attachment.fileTooLarge',
  EMPTY_DOCUMENT: 'error.attachment.emptyDocument',
  READ_ERROR: 'error.attachment.readError',
  MAX_ATTACHMENTS_REACHED: 'error.attachment.maxAttachmentsReached',
  CORRUPTED_FILE: 'error.attachment.corruptedFile',
};

// ---------- 对话消息 ----------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  motionSnapshot?: string; // 关联的动效定义 ID（可选）
  /** @deprecated 提示词优化功能已移除，保留字段以兼容历史数据 */
  optimization?: {
    original: string;
    optimized: string;
    wasOptimized: boolean;
    changes: string[];
  };
  /** 附件 ID 列表 (031-multimodal-input) */
  attachmentIds?: string[];
}

// ---------- 对话会话 (013-history-panel) ----------

/**
 * 完整对话实体
 * 代表一次完整的用户与系统的交互会话
 */
export interface Conversation {
  /** 唯一标识符 (UUID v4) */
  id: string;

  /** 对话标题（首条用户消息的前 30 个字符） */
  title: string;

  /** 消息列表 */
  messages: ChatMessage[];

  /** 关联的动效定义（可为空，新对话未生成时） */
  motion: MotionDefinition | null;

  /** 创建时间 (Unix timestamp ms) */
  createdAt: number;

  /** 修改时间 (Unix timestamp ms) */
  updatedAt: number;
}

/**
 * 对话元数据（用于列表展示）
 * 轻量级元数据，避免加载完整对话数据
 */
export interface ConversationMeta {
  /** 对话 ID */
  id: string;

  /** 对话标题 */
  title: string;

  /** 修改时间 */
  updatedAt: number;
}

/** 对话标题最大长度 */
export const MAX_CONVERSATION_TITLE_LENGTH = 30;

/** 新对话默认标题 */
export const DEFAULT_CONVERSATION_TITLE = 'history.newConversation';

// ---------- LLM 配置 ----------

/** 旧版单配置（保留用于向后兼容） */
export interface LLMConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

// ---------- 多 LLM 配置管理 (015-multi-llm-config) ----------

/**
 * 加密数据结构
 */
export interface EncryptedData {
  /** Base64 编码的密文 */
  ciphertext: string;
  /** Base64 编码的初始化向量 (12 bytes) */
  iv: string;
}

/**
 * 单个 LLM API 配置项（存储格式，API Key 加密）
 */
export interface LLMConfigItem {
  /** 唯一标识符 (UUID v4) */
  id: string;
  /** 配置名称 (用户可识别，如 "OpenAI GPT-4", "DeepSeek") */
  name: string;
  /** API 服务地址 */
  baseURL: string;
  /** API 密钥 (加密存储) */
  apiKey: EncryptedData;
  /** 模型名称 */
  model: string;
  /** 创建时间 (ISO 8601) */
  createdAt: string;
  /** 更新时间 (ISO 8601) */
  updatedAt: string;
}

/**
 * 配置列表管理实体，存储于 localStorage
 */
export interface LLMConfigList {
  /** 配置项数组 */
  configs: LLMConfigItem[];
  /** 当前激活的配置 ID (null 表示无激活配置) */
  activeConfigId: string | null;
}

/**
 * 运行时使用的解密后配置（内存中）
 */
export interface DecryptedLLMConfig {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string; // 明文
  model: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 配置表单数据（用于新增/编辑）
 */
export interface LLMConfigFormData {
  name: string;
  baseURL: string;
  apiKey: string; // 明文输入
  model: string;
}

/** 默认 API 地址 */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

// ---------- 画面比例与分辨率配置 ----------

/**
 * 支持的画面比例 ID
 */
export type AspectRatioId =
  | '16:9'
  | '4:3'
  | '1:1'
  | '9:16'
  | '21:9'
  | '2.35:1';

/**
 * 画面比例完整定义
 */
export interface AspectRatio {
  id: AspectRatioId;
  label: string;
  ratio: number; // width / height
  isVertical: boolean;
}

/**
 * 支持的导出分辨率 ID
 */
export type ExportResolutionId = '720p' | '1080p' | '4k';

/**
 * 导出分辨率完整定义
 */
export interface ExportResolution {
  id: ExportResolutionId;
  label: string;
  baseHeight: number;
}

/**
 * 画布尺寸（像素）
 */
export interface CanvasDimensions {
  width: number;
  height: number;
}

/**
 * 归一化坐标（0-1 范围）
 */
export interface NormalizedPosition {
  x: number; // 0 = 左边缘, 1 = 右边缘
  y: number; // 0 = 上边缘, 1 = 下边缘
}

/**
 * 归一化尺寸（0-1 范围）
 */
export interface NormalizedSize {
  width: number;  // 画布宽度的百分比
  height: number; // 画布高度的百分比
}

// ---------- 导出配置 ----------

export type Resolution = '720p' | '1080p' | '4k';
export type FrameRate = 24 | 30 | 60;
export type ExportFormat = 'webm' | 'mp4';

export interface ExportConfig {
  resolution: Resolution;
  frameRate: FrameRate;
  format: ExportFormat;
  aspectRatio?: AspectRatioId;
}

export const RESOLUTION_MAP: Record<Resolution, { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
};

export type Locale = 'zh' | 'en';

// ---------- 应用状态 ----------

export interface AppState {
  // 当前动效
  currentMotion: MotionDefinition | null;

  // 对话历史
  messages: ChatMessage[];

  // LLM 配置
  llmConfig: LLMConfig | null;

  // UI 状态
  isGenerating: boolean;
  isExporting: boolean;
  exportProgress: number;
  error: string | null;

  // 预览控制
  isPlaying: boolean;
  currentTime: number;

  // 对话框状态
  isSettingsOpen: boolean;
  isExportDialogOpen: boolean;

  // 画面比例设置
  aspectRatio: AspectRatioId;

  // 澄清问答状态
  clarifySession: ClarifySession | null;
  isClarifying: boolean;
  clarifyEnabled: boolean;

  // 渲染错误状态 (009-js-error-autofix)
  /** 当前渲染错误（null 表示无错误） */
  renderError: RenderError | null;
  /** 是否正在执行修复请求 */
  isFixing: boolean;
  /** 当前错误的修复尝试次数（0-3） */
  fixAttemptCount: number;
  /** 修复请求的 AbortController（用于取消正在进行的请求） */
  fixAbortController: AbortController | null;

  // 对话管理状态 (013-history-panel)
  /** 对话列表（仅元数据） */
  conversationList: ConversationMeta[];
  /** 当前对话 ID */
  currentConversationId: string | null;
  /** 历史面板是否展开 */
  isHistoryPanelOpen: boolean;

  // 多 LLM 配置状态 (015-multi-llm-config)
  /** 多配置列表（加密格式） */
  llmConfigs: LLMConfigItem[];
  /** 当前活跃配置 ID */
  activeConfigId: string | null;
  /** 配置是否正在加载中 */
  isLoadingConfigs: boolean;

  // 素材包导出状态 (017-export-asset-pack)
  /** 素材包导出对话框是否打开 */
  isAssetPackExportDialogOpen: boolean;
  /** 素材包导出状态 */
  assetPackExportState: AssetPackExportState;

  // 附件上传状态 (031-multimodal-input)
  /** 当前待发送的附件列表 */
  pendingAttachments: AttachmentUploadState[];

  // 预览背景图状态 (033-preview-background)
  /** 预览背景图 URL (Blob URL)，null 表示无背景图 */
  previewBackgroundUrl: string | null;

  // Toast 状态 (034-preview-performance-guard)
  /** 当前显示的 Toast 消息列表 */
  toasts: ToastMessage[];

  // 导航状态 (036-game-ui-redesign)
  /** 当前路由路径 */
  currentPath: string;
  /** 移动端菜单是否打开 */
  isMobileMenuOpen: boolean;

  // i18n 语言设置
  locale: Locale;
}

// ---------- 存储键 ----------

export const STORAGE_KEYS = {
  LLM_CONFIG: 'motion-platform:llm-config',
  CHAT_HISTORY: 'motion-platform:chat-history',
  LAST_MOTION: 'motion-platform:last-motion',
} as const;

// ---------- 错误类型 ----------

export type LLMErrorCode = 'INVALID_CONFIG' | 'API_ERROR' | 'PARSE_ERROR' | 'RATE_LIMIT';

export interface LLMError extends Error {
  code: LLMErrorCode;
  details?: string;
}

// ---------- 渲染错误类型 (009-js-error-autofix) ----------

/**
 * 错误类型枚举
 * - syntax: 语法错误，在代码加载阶段发生
 * - runtime: 运行时错误，在帧渲染阶段发生
 * - export: 导出过程错误 (023-unified-renderer)
 * - encode: 编码过程错误 (023-unified-renderer)
 */
export type RenderErrorType = 'syntax' | 'runtime' | 'export' | 'encode';

/**
 * 渲染错误
 * 表示在画布渲染器中检测到的 JavaScript 错误
 */
export interface RenderError {
  /** 错误唯一标识，格式：error_{timestamp}_{random} */
  id: string;

  /** 错误类型 */
  type: RenderErrorType;

  /** 原始错误消息（技术详情，用于 LLM 修复） */
  message: string;

  /** 用户友好的错误描述（显示给用户） */
  friendlyMessage: string;

  /** 错误发生的代码行号（非标准属性，可能不可用） */
  lineNumber?: number;

  /** 错误发生的代码列号（非标准属性，可能不可用） */
  columnNumber?: number;

  /** 导致错误的完整代码（用于修复请求） */
  code: string;

  /** 错误来源：render 代码或 postProcess 代码 */
  source?: 'render' | 'postProcess';

  /** 错误发生时间戳（毫秒） */
  timestamp: number;
}

/**
 * 修复尝试状态
 * - pending: 修复请求进行中
 * - success: 修复成功，代码已更新
 * - failed: 修复失败，错误仍然存在或产生新错误
 */
export type FixAttemptStatus = 'pending' | 'success' | 'failed';

/**
 * 修复尝试记录
 * 跟踪单次修复尝试的状态和结果
 */
export interface FixAttempt {
  /** 尝试唯一标识，格式：fix_{timestamp}_{random} */
  id: string;

  /** 关联的错误 ID */
  errorId: string;

  /** 尝试序号（从 1 开始，最大 3） */
  attemptNumber: number;

  /** 尝试状态 */
  status: FixAttemptStatus;

  /** 尝试开始时间戳 */
  startedAt: number;

  /** 尝试完成时间戳（成功或失败时设置） */
  completedAt?: number;

  /** 修复后的代码（仅当 status === 'success' 时存在） */
  fixedCode?: string;

  /** 失败原因（仅当 status === 'failed' 时存在） */
  failureReason?: string;
}

/**
 * 修复请求数据结构
 */
export interface FixRequest {
  /** 当前损坏的代码 */
  brokenCode: string;

  /** 错误信息 */
  error: {
    type: RenderErrorType;
    message: string;
    lineNumber?: number;
    columnNumber?: number;
  };

  /** 当前动效的参数定义 */
  parameters: AdjustableParameter[];

  /** 当前动效的元素定义 */
  elements: MotionElement[];

  /** 动效元数据 */
  metadata: {
    duration: number;
    width: number;
    height: number;
    backgroundColor: string;
  };
}

/**
 * 修复服务选项
 */
export interface FixOptions {
  /** 请求超时时间（毫秒），默认 30000 */
  timeout?: number;

  /** 用于取消请求的 AbortSignal */
  signal?: AbortSignal;
}

/**
 * 错误处理常量
 */
export const ERROR_CONSTANTS = {
  /** 最大修复尝试次数 */
  MAX_FIX_ATTEMPTS: 3,

  /** 修复请求超时时间（毫秒） */
  FIX_REQUEST_TIMEOUT: 30000,
} as const;

/**
 * 错误类型到友好消息的 i18n 键映射
 */
export const ERROR_FRIENDLY_MESSAGES: Record<string, string> = {
  SyntaxError: 'error.friendly.syntaxError',
  ReferenceError: 'error.friendly.referenceError',
  TypeError: 'error.friendly.typeError',
  RangeError: 'error.friendly.rangeError',
  EvalError: 'error.friendly.evalError',
  URIError: 'error.friendly.uriError',
  default: 'error.friendly.default',
};

/**
 * 获取友好错误消息
 */
export function getFriendlyMessage(errorName: string): string {
  return ERROR_FRIENDLY_MESSAGES[errorName] || ERROR_FRIENDLY_MESSAGES.default;
}

/**
 * 生成错误 ID
 */
export function generateErrorId(): string {
  return `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 生成修复尝试 ID
 */
export function generateFixAttemptId(): string {
  return `fix_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 从 MotionDefinition 创建 FixRequest
 */
export function createFixRequest(
  motion: MotionDefinition,
  error: RenderError
): FixRequest {
  return {
    brokenCode: motion.code,
    error: {
      type: error.type,
      message: error.message,
      lineNumber: error.lineNumber,
      columnNumber: error.columnNumber,
    },
    parameters: motion.parameters,
    elements: motion.elements,
    metadata: {
      duration: motion.duration,
      width: motion.width,
      height: motion.height,
      backgroundColor: motion.backgroundColor,
    },
  };
}

// ---------- 应用事件 ----------

export type AppEvent =
  | { type: 'MOTION_GENERATED'; payload: MotionDefinition }
  | { type: 'MOTION_UPDATED'; payload: MotionDefinition }
  | { type: 'PARAMETER_CHANGED'; payload: { id: string; value: unknown } }
  | { type: 'PLAYBACK_STATE_CHANGED'; payload: { isPlaying: boolean } }
  | { type: 'EXPORT_STARTED' }
  | { type: 'EXPORT_PROGRESS'; payload: { progress: number } }
  | { type: 'EXPORT_COMPLETED'; payload: { blob: Blob } }
  | { type: 'EXPORT_FAILED'; payload: { error: string } }
  | { type: 'ERROR'; payload: { message: string; code?: string } };

// ---------- 统一渲染器相关类型 (023-unified-renderer) ----------

/**
 * 导出准备选项
 */
export interface ExportPrepareOptions {
  /** 目标帧率 */
  fps?: number;

  /** 是否克隆视频 */
  cloneVideos?: boolean;
}

/**
 * 导出上下文
 */
export interface ExportContext {
  /** 离屏 Canvas */
  offscreenCanvas: HTMLCanvasElement;

  /** 克隆的视频对象 */
  clonedVideos: Record<string, HTMLVideoElement>;

  /** 原始渲染器引用 */
  renderer: unknown; // CoreRenderer, 避免循环依赖

  /** 配置的帧率 */
  fps: number;
}

/**
 * 帧数据
 */
export interface FrameData {
  /** 帧索引 */
  frameIndex: number;

  /** 帧时间（毫秒） */
  time: number;

  /** 图像数据 */
  imageData: ImageData;
}

/**
 * H.264 编码选项
 */
export interface H264Options {
  /** 帧率，默认 60 */
  frameRate?: number;

  /** 量化参数 0-51，越小质量越好，默认 28 */
  quality?: number;

  /** 编码速度 0-6，越小质量越好但越慢，默认 5 */
  speed?: number;

  /** 关键帧间隔（帧数），默认 60 */
  keyframeInterval?: number;
}

/**
 * 视频同步选项
 */
export interface VideoSyncOptions {
  /** 超时时间（毫秒） */
  timeout?: number;

  /** 是否循环处理 */
  loop?: boolean;
}

// ---------- 后处理类型 (webgl-postprocess) ----------

/**
 * 后处理 Pass 配置
 */
export interface PostProcessPass {
  /** Pass 名称（用于调试和缓存 key） */
  name: string;
  /** GLSL Fragment Shader 代码 */
  shader: string;
  /** 自定义 uniform 值 */
  uniforms?: Record<string, number | number[]>;
}

/**
 * 后处理函数签名
 * @param params - 参数对象（与 render 函数共享）
 * @param time - 当前时间（毫秒）
 * @returns PostProcessPass 数组，按顺序链式执行
 */
export type PostProcessFunction = (
  params: Record<string, unknown>,
  time: number
) => PostProcessPass[];

// ---------- 服务接口 ----------

export interface StorageService {
  saveLLMConfig(config: LLMConfig): void;
  getLLMConfig(): LLMConfig | null;
  saveChatHistory(messages: ChatMessage[]): void;
  getChatHistory(): ChatMessage[];
  saveLastMotion(motion: MotionDefinition): void;
  getLastMotion(): MotionDefinition | null;
  clearAll(): void;
}

export interface ParameterService {
  extractParameters(motion: MotionDefinition): AdjustableParameter[];
  applyParameter(
    motion: MotionDefinition,
    parameterId: string,
    value: unknown
  ): MotionDefinition;
  applyParameters(
    motion: MotionDefinition,
    updates: { parameterId: string; value: unknown }[]
  ): MotionDefinition;
}

export interface RendererService {
  initialize(container: HTMLElement, motion: MotionDefinition): void;
  play(): void;
  pause(): void;
  stop(): void;
  seek(time: number): void;
  updateParameter(parameterId: string, value: unknown): void;
  /** 更新动效时长 (019-video-input-support) */
  updateDuration?(newDuration: number): void;
  getCurrentTime(): number;
  getCanvas(): HTMLCanvasElement;
  destroy(): void;
}

export interface ExporterService {
  export(
    motion: MotionDefinition,
    config: ExportConfig,
    onProgress: (progress: number) => void
  ): Promise<Blob>;
  cancel(): void;
  isSupported(): { supported: boolean; reason?: string };
  download(blob: Blob, filename: string): void;
}

export interface LLMService {
  /** 生成动效，支持纯文本或多模态内容 (031-multimodal-input) */
  generateMotion(prompt: string | ContentPart[]): Promise<MotionDefinition>;
  /** 修改动效，支持纯文本或多模态内容 (031-multimodal-input) */
  modifyMotion(
    instruction: string | ContentPart[],
    currentMotion: MotionDefinition,
    history: ChatMessage[]
  ): Promise<MotionDefinition>;
  validateConfig(config: LLMConfig): Promise<boolean>;
  /**
   * 修复动效代码 (009-js-error-autofix)
   * @param currentMotion - 当前动效定义（包含损坏的代码）
   * @param error - 渲染错误详情
   * @param options - 可选配置（超时、取消信号）
   * @returns 修复后的完整动效定义
   */
  fixMotion(
    currentMotion: MotionDefinition,
    error: RenderError,
    options?: FixOptions
  ): Promise<MotionDefinition>;
}

// ---------- 图片上传相关类型 ----------

export type ImageValidationError =
  | 'INVALID_FORMAT' // 不支持的格式
  | 'FILE_TOO_LARGE' // 文件超过 10MB
  | 'DIMENSION_TOO_LARGE' // 尺寸超过 4096x4096
  | 'CORRUPTED_FILE' // 文件损坏无法读取
  | 'READ_ERROR'; // 读取失败

export interface ImageValidationResult {
  valid: boolean;
  error?: ImageValidationError;
  file?: File;
  dimensions?: { width: number; height: number };
}

export interface ProcessedImage {
  blobUrl: string; // 处理后的 Blob URL
  originalFileName: string; // 原始文件名
  width: number; // 处理后宽度
  height: number; // 处理后高度
  wasResized: boolean; // 是否进行了缩放
}

export const IMAGE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_DIMENSION: 4096, // 4096px
  ACCEPTED_FORMATS: ['image/png', 'image/jpeg'] as const,
  ACCEPTED_EXTENSIONS: ['.png', '.jpg', '.jpeg'] as const,
} as const;

export const IMAGE_MAGIC_NUMBERS = {
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const,
  JPEG: [0xff, 0xd8, 0xff] as const,
} as const;

export const PLACEHOLDER_IMAGE_VALUE = '__PLACEHOLDER__';

export const IMAGE_ERROR_MESSAGES: Record<ImageValidationError, string> = {
  INVALID_FORMAT: 'error.image.invalidFormat',
  FILE_TOO_LARGE: 'error.image.fileTooLarge',
  DIMENSION_TOO_LARGE: 'error.image.dimensionTooLarge',
  CORRUPTED_FILE: 'error.image.corruptedFile',
  READ_ERROR: 'error.image.readError',
};

// ---------- 视频上传相关类型 (019-video-input-support) ----------

/**
 * 视频验证错误类型
 */
export type VideoValidationError =
  | 'INVALID_FORMAT'        // 不支持的格式
  | 'FILE_TOO_LARGE'        // 文件超过 50MB
  | 'DURATION_TOO_LONG'     // 时长超过 60 秒
  | 'RESOLUTION_TOO_LARGE'  // 分辨率超过 4K（警告，不阻止上传）
  | 'CORRUPTED_FILE'        // 文件损坏无法播放
  | 'LOAD_ERROR';           // 加载失败

/**
 * 视频验证结果
 */
export interface VideoValidationResult {
  valid: boolean;
  error?: VideoValidationError;
  file?: File;
  metadata?: {
    duration: number;   // 毫秒
    width: number;
    height: number;
  };
}

/**
 * 处理后的视频信息
 */
export interface ProcessedVideo {
  blobUrl: string;           // 处理后的 Blob URL
  originalFileName: string;  // 原始文件名
  duration: number;          // 时长（毫秒）
  width: number;             // 宽度
  height: number;            // 高度
  wasResized: boolean;       // 是否进行了缩放（视频暂不支持自动缩放）
}

/**
 * 视频约束常量
 */
export const VIDEO_CONSTRAINTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024,        // 50MB
  MAX_DURATION: 60 * 1000,                 // 60 秒（毫秒）
  MAX_DIMENSION: 3840,                     // 4K 宽度
  ACCEPTED_FORMATS: ['video/mp4', 'video/webm'] as const,
  ACCEPTED_EXTENSIONS: ['.mp4', '.webm'] as const,
} as const;

/**
 * 视频错误消息 i18n 键映射
 */
export const VIDEO_ERROR_MESSAGES: Record<VideoValidationError, string> = {
  INVALID_FORMAT: 'error.video.invalidFormat',
  FILE_TOO_LARGE: 'error.video.fileTooLarge',
  DURATION_TOO_LONG: 'error.video.durationTooLong',
  RESOLUTION_TOO_LARGE: 'error.video.resolutionTooLarge',
  CORRUPTED_FILE: 'error.video.corruptedFile',
  LOAD_ERROR: 'error.video.loadError',
};

/**
 * 视频占位符标识
 */
export const PLACEHOLDER_VIDEO_VALUE = '__VIDEO_PLACEHOLDER__';

// ---------- 澄清问答类型 ----------

/**
 * 澄清选项
 */
export interface ClarifyOption {
  id: string;           // 选项标识，如 "A", "B", "C"
  label: string;        // 选项显示文本
}

/**
 * 澄清问题
 */
export interface ClarifyQuestion {
  id: string;                   // 问题唯一标识，如 "q1", "q2"
  question: string;             // 问题文本
  options: ClarifyOption[];     // 预设选项列表，至少3个
}

/**
 * 澄清答案
 */
export interface ClarifyAnswer {
  questionId: string;                 // 关联的问题 ID
  selectedOptionId: string | null;    // 选中的预设选项 ID，自定义时为 null
  customValue: string | null;         // 自定义输入的文本，使用预设选项时为 null
}

/**
 * 澄清会话状态
 */
export type ClarifySessionStatus = 'analyzing' | 'questioning' | 'completed' | 'skipped';

/**
 * 澄清会话
 */
export interface ClarifySession {
  id: string;                       // 会话唯一标识
  originalPrompt: string;           // 用户原始输入的需求描述
  questions: ClarifyQuestion[];     // LLM 返回的问题列表（0-5个）
  answers: ClarifyAnswer[];         // 用户已回答的答案列表
  currentQuestionIndex: number;     // 当前展示的问题索引（0-based）
  status: ClarifySessionStatus;     // 会话状态
  createdAt: number;                // 会话创建时间戳
  updatedAt: number;                // 最后更新时间戳
  attachments?: ChatAttachment[];   // 附件列表 (031-multimodal-input)
}

/**
 * LLM 澄清分析结果
 */
export interface ClarifyAnalysisResult {
  needsClarification: boolean;      // 是否需要澄清
  questions: ClarifyQuestion[];     // 澄清问题列表（当 needsClarification=true）
  directPrompt: string | null;      // 直接生成用的提示词（当 needsClarification=false）
}

// ---------- 日志服务类型 (011-system-logging) ----------

export type {
  LogLevel,
  CodeLogType,
  LogEntry,
  CodeLogEntry,
  LogExportData,
  Logger,
} from '@/services/logging/types';

// ---------- 确定性渲染类型 (016-deterministic-render) ----------

/**
 * 确定性渲染工具函数集合
 * 通过 window.__motionUtils 全局注入
 */
export interface MotionUtils {
  /**
   * 创建基于种子的随机数生成器
   * @param seed - 种子值（通常是时间戳）
   * @returns 返回 0-1 之间的随机数的函数
   */
  seededRandom: (seed: number) => () => number;

  /**
   * 生成基于种子的随机整数
   * @param seed - 种子值
   * @param min - 最小值（包含）
   * @param max - 最大值（包含）
   * @returns 指定范围内的随机整数
   */
  seededRandomInt: (seed: number, min: number, max: number) => number;

  /**
   * 生成基于种子的随机浮点数
   * @param seed - 种子值
   * @param min - 最小值（包含）
   * @param max - 最大值（不包含）
   * @returns 指定范围内的随机浮点数
   */
  seededRandomRange: (seed: number, min: number, max: number) => number;

  /**
   * 创建基于种子和计数器的随机数生成器
   * 用于需要在同一帧内生成多个随机数的场景
   * @param seed - 基础种子值
   * @returns 每次调用返回下一个随机数
   */
  createRandomSequence: (seed: number) => () => number;
}

/**
 * 代码校验结果
 */
export interface CodeValidationResult {
  /** 是否通过校验（无 error 级别问题） */
  isValid: boolean;

  /** 检测到的问题列表 */
  issues: CodeValidationIssue[];
}

/**
 * 单个校验问题
 */
export interface CodeValidationIssue {
  /** 问题严重程度 */
  severity: 'error' | 'warning';

  /** 问题描述 */
  message: string;

  /** 匹配到的代码片段 */
  match: string;

  /** 修复建议 */
  suggestion: string;

  /** 在代码中的位置（字符索引） */
  position: number;
}

// ---------- 素材包导出类型 (017-export-asset-pack) ----------

/**
 * 素材包导出配置
 */
export interface AssetPackExportConfig {
  /** 导出文件名（不含扩展名） */
  filename: string;

  /** 选中的参数 ID 列表 */
  selectedParameterIds: string[];

  /** 是否显示参数面板标题 */
  showPanelTitle: boolean;

  /** 自定义标题文本（可选） */
  customTitle?: string;

  /** 画面比例（可选，用于计算导出尺寸） */
  aspectRatio?: AspectRatioId;
}

/**
 * 默认素材包导出配置
 */
export const DEFAULT_ASSET_PACK_EXPORT_CONFIG: AssetPackExportConfig = {
  filename: 'motion-preview',
  selectedParameterIds: [],
  showPanelTitle: true,
  customTitle: undefined,
};

/**
 * 可导出参数（包装 AdjustableParameter）
 */
export interface ExportableParameter {
  /** 原始参数 */
  parameter: AdjustableParameter;

  /** 是否被选中导出 */
  selected: boolean;

  /** 参数在动效定义中的路径 */
  path: string;

  /** 当前值（导出时的快照） */
  currentValue: number | string | boolean;

  /** 是否可导出（image 类型不可导出） */
  exportable: boolean;
}

/**
 * 素材包导出状态
 */
export type AssetPackExportStatus =
  | 'idle'           // 初始状态
  | 'configuring'    // 配置中
  | 'generating'     // 生成中
  | 'downloading'    // 下载中
  | 'completed'      // 完成
  | 'error';         // 错误

/**
 * 素材包导出状态对象
 */
export interface AssetPackExportState {
  status: AssetPackExportStatus;
  config: AssetPackExportConfig | null;
  progress: number;  // 0-100
  error: string | null;
}

/**
 * 初始素材包导出状态
 */
export const INITIAL_ASSET_PACK_EXPORT_STATE: AssetPackExportState = {
  status: 'idle',
  config: null,
  progress: 0,
  error: null,
};

/**
 * 素材包元信息
 */
export interface AssetPackMetadata {
  exportedAt: number;
  exportedFrom: string;
  version: string;
}

/**
 * 素材包内容
 */
export interface AssetPackContent {
  /** 动效定义（核心数据） */
  motionDefinition: MotionDefinition;

  /** 导出的参数列表 */
  exportedParameters: ExportableParameter[];

  /** 渲染器代码（内联 JavaScript） */
  rendererCode: string;

  /** 样式代码（内联 CSS） */
  styleCode: string;

  /** 工具函数代码（deterministicRandom 等） */
  utilsCode: string;

  /** 图片资源（paramId -> Base64） */
  imageAssets: Record<string, string>;

  /** 元信息 */
  metadata: AssetPackMetadata;
}

/**
 * 参数控件类型
 */
export type ParameterControlType = 'slider' | 'color' | 'toggle' | 'select' | 'image' | 'video' | 'text';

/**
 * 数值控件配置
 */
export interface NumberControlConfig {
  min: number;
  max: number;
  step: number;
  unit?: string;
}

/**
 * 选择控件配置
 */
export interface SelectControlConfig {
  options: { value: string; label: string }[];
}

/**
 * 参数控件配置
 */
export interface ParameterControlConfig {
  /** 参数 ID */
  id: string;

  /** 显示名称 */
  label: string;

  /** 控件类型 */
  controlType: ParameterControlType;

  /** 初始值 */
  initialValue: number | string | boolean;

  /** 数值类型特有属性 */
  numberConfig?: NumberControlConfig;

  /** 选择类型特有属性 */
  selectConfig?: SelectControlConfig;

  /** 在动效定义中的路径 */
  path: string;
}

/**
 * 素材包导出事件类型
 */
export type AssetPackExportEvent =
  | { type: 'OPEN_DIALOG'; motion: MotionDefinition }
  | { type: 'UPDATE_CONFIG'; config: Partial<AssetPackExportConfig> }
  | { type: 'TOGGLE_PARAMETER'; parameterId: string }
  | { type: 'SELECT_ALL_PARAMETERS' }
  | { type: 'DESELECT_ALL_PARAMETERS' }
  | { type: 'START_EXPORT' }
  | { type: 'EXPORT_PROGRESS'; progress: number }
  | { type: 'EXPORT_COMPLETE' }
  | { type: 'EXPORT_ERROR'; error: string }
  | { type: 'CLOSE_DIALOG' };

/**
 * 素材包导出服务接口
 */
export interface IAssetPackExporter {
  /**
   * 准备导出，返回可导出参数列表
   * @param motion 动效定义
   * @returns 可导出参数列表
   */
  prepareExport(motion: MotionDefinition): ExportableParameter[];

  /**
   * 生成素材包 HTML 内容
   * @param motion 动效定义
   * @param config 导出配置
   * @param onProgress 进度回调
   * @returns HTML 内容字符串
   */
  generateHtml(
    motion: MotionDefinition,
    config: AssetPackExportConfig,
    onProgress?: (progress: number) => void
  ): Promise<string>;

  /**
   * 下载生成的 HTML 文件
   * @param htmlContent HTML 内容
   * @param filename 文件名
   */
  downloadHtml(htmlContent: string, filename: string): void;

  /**
   * 估算导出文件大小
   * @param motion 动效定义
   * @param config 导出配置
   * @returns 估算大小（字节）
   */
  estimateFileSize(motion: MotionDefinition, config: AssetPackExportConfig): number;
}

// 扩展 Window 类型以包含 __motionUtils
declare global {
  interface Window {
    __motionUtils?: MotionUtils;
  }
}

// ---------- 对话会话导出与导入类型 (030-session-export) ----------

/**
 * 序列化后的参数
 * 图片 Blob URL 转为 Base64 Data URL
 * 视频/模型/贴图/序列帧保留占位符
 */
export interface SerializedParameter extends AdjustableParameter {
  // imageValue 继承自 AdjustableParameter，导出时为 Base64 Data URL
  // videoValue 继承自 AdjustableParameter，导出时为 __VIDEO_PLACEHOLDER__
}

/**
 * 序列化后的动效定义
 * 继承 MotionDefinition，parameters 中的资源已序列化
 */
export interface SerializedMotionDefinition extends Omit<MotionDefinition, 'parameters'> {
  /** 序列化后的参数列表 */
  parameters: SerializedParameter[];
}

/**
 * 序列化后的对话数据
 * 与现有 Conversation 类型结构一致，但资源已序列化
 */
export interface SerializedConversation {
  /** 原始对话 ID（导入时会重新生成） */
  id: string;

  /** 对话标题 */
  title: string;

  /** 消息列表 */
  messages: ChatMessage[];

  /** 关联的动效定义（可为 null） */
  motion: SerializedMotionDefinition | null;

  /** 原始创建时间 */
  createdAt: number;

  /** 原始修改时间 */
  updatedAt: number;
}

/**
 * 导出的对话
 * 文件扩展名: .neon
 *
 * 单个导出：直接存储此对象
 * 批量导出：存储此对象的数组
 */
export interface ExportedConversation {
  /** 导出格式版本号（应用版本），用于兼容性检测 */
  version: string;

  /** 导出时间戳 (Unix timestamp ms) */
  exportedAt: number;

  /** 完整对话数据 */
  conversation: SerializedConversation;
}

/**
 * 批量导出格式 - 简单数组
 * 判断逻辑：Array.isArray(parsed) ? 'bundle' : 'single'
 */
export type ExportedConversationBundle = ExportedConversation[];

/**
 * 导入错误类型
 */
export type ImportErrorType =
  | 'PARSE_ERROR'           // JSON 解析失败
  | 'VERSION_INCOMPATIBLE'  // 版本不兼容
  | 'INVALID_FORMAT'        // 格式错误（缺少必需字段）
  | 'DATA_CORRUPTED'        // 数据损坏
  | 'STORAGE_FULL';         // 存储空间不足

/**
 * 单个导入错误
 */
export interface ImportError {
  /** 对话索引（批量导入时） */
  index?: number;

  /** 原始对话标题（如果可解析） */
  title?: string;

  /** 错误类型 */
  type: ImportErrorType;

  /** 错误消息 */
  message: string;
}

/**
 * 导入操作结果
 */
export interface ImportResult {
  /** 是否整体成功 */
  success: boolean;

  /** 成功导入的对话数量 */
  importedCount: number;

  /** 跳过的对话数量（因数据损坏） */
  skippedCount: number;

  /** 导入的对话 ID 列表 */
  importedIds: string[];

  /** 错误详情列表 */
  errors: ImportError[];

  /** 警告信息列表（如版本不兼容警告） */
  warnings?: string[];

  /** 导入的对话列表（用于批量导入后直接使用） */
  conversations?: Conversation[];
}

/**
 * 导出警告类型
 */
export type ExportWarningType = 'LARGE_FILE' | 'MISSING_RESOURCES' | 'PLACEHOLDER_RESOURCES';

/**
 * 导出警告
 */
export interface ExportWarning {
  type: ExportWarningType;
  message: string;
  /** 受影响的参数 ID 列表 */
  affectedParams?: string[];
}

/**
 * 导出验证结果
 */
export interface ExportValidationResult {
  /** 是否可导出 */
  canExport: boolean;

  /** 估算文件大小（字节） */
  estimatedSize: number;

  /** 警告列表 */
  warnings: ExportWarning[];
}

/**
 * 文件验证结果
 */
export interface FileValidationResult {
  /** 是否有效 */
  valid: boolean;

  /** 错误类型 */
  error?: ImportErrorType;

  /** 错误消息 */
  errorMessage?: string;

  /** 解析后的导出项列表（验证通过时） */
  items?: ExportedConversation[];

  /** 警告信息列表（如版本不兼容） */
  warnings?: string[];
}

// ---------- 性能保护类型 (034-preview-performance-guard) ----------

/** 单帧渲染超时阈值（毫秒） */
export const FRAME_RENDER_TIMEOUT_MS = 2000;

/** Toast 默认显示时长（毫秒） */
export const TOAST_DEFAULT_DURATION_MS = 5000;

/**
 * 渲染性能警告
 * 当单帧渲染超时时触发
 */
export interface PerformanceWarning {
  /** 实际渲染耗时（毫秒） */
  elapsed: number;
  /** 触发警告的阈值（毫秒） */
  threshold: number;
  /** 警告发生的时间戳 */
  timestamp: number;
}

/**
 * Toast 消息
 * 用于显示系统通知
 */
export interface ToastMessage {
  /** 唯一标识 */
  id: string;
  /** 消息类型 */
  type: 'warning' | 'error' | 'info' | 'success';
  /** 消息内容 */
  message: string;
  /** 自动消失时间（毫秒），undefined 表示不自动消失 */
  duration?: number;
}

/**
 * 性能警告回调函数类型
 */
export type PerformanceWarningCallback = (warning: PerformanceWarning) => void;

// ---------- 游戏风格 UI 多级导航类型 (036-game-ui-redesign) ----------

/**
 * 路由配置
 */
export interface RouteConfig {
  /** URL 路径 (如 '/', '/demos', '/preview') */
  path: string;
  /** 导航显示名称的 i18n key */
  labelKey: string;
  /** 图标标识符（可选） */
  icon?: string;
  /** 是否在导航栏显示 */
  showInNav: boolean;
  /** 是否需要认证（未来使用） */
  protected?: boolean;
}

/**
 * 霓虹配色方案
 */
export type ColorScheme = 'cyan' | 'magenta' | 'purple' | 'green';

/**
 * 卡片状态
 */
export type CardStatus = 'available' | 'planning';

/**
 * 导航入口卡片
 */
export interface NavigationEntry {
  /** 唯一标识符 */
  id: string;
  /** 卡片标题 */
  title: string;
  /** 卡片描述的 i18n key */
  descriptionKey: string;
  /** 图标/表情符号（可选） */
  icon?: string;
  /** 目标路由路径 */
  route: string;
  /** 霓虹配色变体 */
  colorScheme: ColorScheme;
  /** 显示顺序 */
  order: number;
  /** 卡片状态 - planning 状态显示徽章且不可点击 */
  status?: CardStatus;
}

/**
 * Demo 项目
 */
export interface DemoItem {
  /** 唯一标识符 */
  id: string;
  /** 显示标题的 i18n key */
  titleKey: string;
  /** 简短描述的 i18n key */
  descriptionKey: string;
  /** 缩略图路径（assets/demo/thumbnails/） */
  thumbnail: string;
  /** 预览配置（复用现有 MotionDefinition） */
  previewConfig: MotionDefinition;
  /** 分类的 i18n key（可选） */
  categoryKey?: string;
  /** 是否重点展示（可选） */
  featured?: boolean;
}

/**
 * 主题配色方案
 */
export interface ThemeColorScheme {
  /** 配色方案名称 */
  name: string;
  /** 基础色值（十六进制） */
  base: string;
  /** 浅色变体（十六进制） */
  light: string;
  /** 深色变体（十六进制） */
  dark: string;
  /** 发光效果色（rgba） */
  glow: string;
}

/**
 * UI 主题配置
 */
export interface UITheme {
  /** 背景色 */
  background: string;
  /** 面板背景色 */
  surface: string;
  /** 抬升面板背景色 */
  surfaceElevated: string;

  /** 文字主色 */
  textPrimary: string;
  /** 文字次要色 */
  textSecondary: string;

  /** 边框色 */
  border: string;
  /** 激活边框色 */
  borderActive: string;

  /** 霓虹青色 */
  neonCyan: ThemeColorScheme;
  /** 霓虹品红 */
  neonMagenta: ThemeColorScheme;
  /** 霓虹紫色 */
  neonPurple: ThemeColorScheme;
  /** 霓虹绿色 */
  neonGreen: ThemeColorScheme;

  /** 成功色 */
  success: string;
  /** 错误色 */
  error: string;
  /** 警告色 */
  warning: string;
}

/**
 * 面包屑项目
 */
export interface BreadcrumbItem {
  /** 显示标签 */
  label: string;
  /** 可选的目标路径（最后一项无路径） */
  path?: string;
}
