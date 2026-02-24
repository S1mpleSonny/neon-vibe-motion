import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../common';
import { ClarifyQuestion } from '../ClarifyQuestion';
import { ErrorWarning } from './ErrorWarning';
import { AttachmentButton } from './AttachmentButton';
import { AttachmentList } from './AttachmentList';
import { MessageAttachment } from './MessageAttachment';
import { HistoryPanel } from '../HistoryPanel';
import { useAppStore } from '../../stores/appStore';
import { createLLMService, createClarifyService } from '../../services/llm';
import { buildMultimodalContent } from '../../services/llm/multimodal';
import { saveAttachments } from '../../services/storage/attachmentStorage';
import { importFromFile } from '../../services/sessionExporter/importer';
import { generateId } from '../../utils/id';
import {
  validateAttachmentImageFormat,
  compressImageByShortEdge,
  imageToBase64,
  getImageDimensions,
} from '../../utils/imageUtils';
import { validateDocumentFormat, readDocumentAsText, getFileType } from '../../utils/documentUtils';
import type {
  ChatMessage,
  ClarifySession,
  ClarifyAnswer,
  LLMConfig,
  ChatAttachment,
  ContentPart,
} from '../../types';
import { ERROR_CONSTANTS, ATTACHMENT_CONSTRAINTS, ATTACHMENT_ERROR_MESSAGES } from '../../types';

const generateMessageId = generateId;

export function ChatPanel() {
  const { t } = useTranslation();
  const {
    messages,
    llmConfigs,
    activeConfigId,
    getActiveConfig,
    currentMotion,
    isGenerating,
    error,
    currentConversationId,
    conversationList,
    addMessage,
    setCurrentMotion,
    setIsGenerating,
    setError,
    // Clarify state
    clarifySession,
    isClarifying,
    clarifyEnabled,
    setClarifySession,
    setIsClarifying,
    answerClarifyQuestion,
    skipClarify,
    nextClarifyQuestion,
    // Error state (009-js-error-autofix)
    renderError,
    isFixing,
    fixAttemptCount,
    setIsFixing,
    incrementFixAttempt,
    setFixAbortController,
    clearErrorState,
    // Conversation actions (013-history-panel)
    touchConversation,
    updateConversationTitle,
    saveCurrentConversation,
    importConversations,
    // Toast actions (034-preview-performance-guard)
    addToast,
    // Attachment actions (031-multimodal-input)
    pendingAttachments,
    addPendingAttachment,
    updatePendingAttachment,
    removePendingAttachment,
    clearPendingAttachments,
  } = useAppStore();

  // 判断是否有有效的 LLM 配置
  const hasValidConfig = llmConfigs.length > 0 && activeConfigId !== null;

  // 判断是否应该显示预设导入按钮：
  // - 已配置 LLM
  // - 对话列表为空（新手状态）
  // - 当前消息为空
  const shouldShowPresetImport = hasValidConfig && conversationList.length === 0 && messages.length === 0;

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 生成临时 ID
  const generateTempId = useCallback(() => {
    return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // 处理文件选择 (031-multimodal-input)
  const handleFileSelect = useCallback(async (files: FileList) => {
    const remainingSlots = ATTACHMENT_CONSTRAINTS.MAX_ATTACHMENTS - pendingAttachments.length;

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      const tempId = generateTempId();
      const fileType = getFileType(file);

      if (!fileType) {
        // 不支持的格式
        addPendingAttachment({
          tempId,
          file,
          status: 'error',
          error: ATTACHMENT_ERROR_MESSAGES.INVALID_IMAGE_FORMAT,
        });
        continue;
      }

      // 添加 pending 状态的附件
      const previewUrl = fileType === 'image' ? URL.createObjectURL(file) : undefined;
      addPendingAttachment({
        tempId,
        file,
        status: 'pending',
        previewUrl,
      });

      // 异步处理文件
      processFile(tempId, file, fileType);
    }
  }, [pendingAttachments.length, addPendingAttachment, generateTempId]);

  // 处理单个文件 (031-multimodal-input)
  const processFile = useCallback(async (tempId: string, file: File, fileType: 'image' | 'document') => {
    updatePendingAttachment(tempId, { status: 'processing' });

    try {
      if (fileType === 'image') {
        // 验证文件大小
        if (file.size > ATTACHMENT_CONSTRAINTS.MAX_IMAGE_SIZE) {
          throw new Error('FILE_TOO_LARGE');
        }

        // 验证图片格式（魔数检查）
        const isValidFormat = await validateAttachmentImageFormat(file);
        if (!isValidFormat) {
          throw new Error('INVALID_IMAGE_FORMAT');
        }

        // 获取原始尺寸
        const originalDimensions = await getImageDimensions(file);

        // 压缩图片（如果需要）
        const { blob, wasCompressed } = await compressImageByShortEdge(file);

        // 转换为 Base64
        const base64Content = await imageToBase64(blob);

        // 创建附件对象
        const attachment: ChatAttachment = {
          id: generateTempId(),
          messageId: '', // 发送时再设置
          type: 'image',
          fileName: file.name,
          mimeType: file.type,
          content: base64Content,
          wasCompressed,
          originalDimensions,
          createdAt: Date.now(),
        };

        updatePendingAttachment(tempId, {
          status: 'ready',
          attachment,
          wasCompressed,
        });
      } else {
        // 文档处理
        if (!validateDocumentFormat(file)) {
          throw new Error('INVALID_DOCUMENT_FORMAT');
        }

        const textContent = await readDocumentAsText(file);

        const attachment: ChatAttachment = {
          id: generateTempId(),
          messageId: '',
          type: 'document',
          fileName: file.name,
          mimeType: file.type || 'text/plain',
          content: textContent,
          createdAt: Date.now(),
        };

        updatePendingAttachment(tempId, {
          status: 'ready',
          attachment,
        });
      }
    } catch (err) {
      const errorKey = err instanceof Error ? err.message : 'READ_ERROR';
      const errorMessage = ATTACHMENT_ERROR_MESSAGES[errorKey] || ATTACHMENT_ERROR_MESSAGES.READ_ERROR;
      updatePendingAttachment(tempId, {
        status: 'error',
        error: errorMessage,
      });
    }
  }, [updatePendingAttachment, generateTempId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理粘贴事件（支持从剪贴板粘贴图片）(031-multimodal-input T031)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        // 不阻止默认行为，允许文本继续粘贴
        // 只处理图片文件
        const dataTransfer = new DataTransfer();
        imageFiles.forEach((file) => dataTransfer.items.add(file));
        handleFileSelect(dataTransfer.files);
      }
    },
    [handleFileSelect]
  );

  // 生成动效的核心函数（不添加用户消息，用户消息由调用方负责添加）
  // 支持纯文本或多模态内容 (031-multimodal-input)
  const generateMotionOnly = useCallback(async (promptToUse: string | ContentPart[]) => {
    setIsGenerating(true);

    try {
      const isMultimodal = Array.isArray(promptToUse);
      console.log('[ChatPanel] 开始调用 LLM 服务，使用提示词:', isMultimodal ? '[多模态内容]' : promptToUse);
      const activeConfig = await getActiveConfig();
      if (!activeConfig) {
        throw new Error(t('chat.configError'));
      }
      const llmConfig: LLMConfig = {
        baseURL: activeConfig.baseURL,
        apiKey: activeConfig.apiKey,
        model: activeConfig.model,
      };
      const llmService = createLLMService(llmConfig);

      let motion;
      if (currentMotion) {
        console.log('[ChatPanel] 修改现有动效', isMultimodal ? '[多模态内容]' : '');
        // 修改动效支持多模态内容 (031-multimodal-input)
        motion = await llmService.modifyMotion(
          promptToUse,
          currentMotion,
          messages
        );
      } else {
        console.log('[ChatPanel] 生成新动效');
        motion = await llmService.generateMotion(promptToUse);
      }

      console.log('[ChatPanel] 收到动效定义, 设置 currentMotion:', motion);
      setCurrentMotion(motion);

      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: currentMotion
          ? t('chat.motionUpdated')
          : t('chat.motionGenerated'),
        timestamp: Date.now(),
        motionSnapshot: motion.id,
      };

      addMessage(assistantMessage);

      // 更新对话时间和保存 (013-history-panel)
      touchConversation();
      saveCurrentConversation();
    } catch (err) {
      console.error('[ChatPanel] 生成动效失败:', err);
      const errorMessage = err instanceof Error ? err.message : t('chat.generateError');
      setError(errorMessage);

      const errorAssistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: t('chat.generateErrorDetail', { message: errorMessage }),
        timestamp: Date.now(),
      };

      addMessage(errorAssistantMessage);
    } finally {
      setIsGenerating(false);
      // 清理澄清会话
      setClarifySession(null);
      setIsClarifying(false);
    }
  }, [t, getActiveConfig, currentMotion, messages, addMessage, setIsGenerating, setCurrentMotion, setError, setClarifySession, setIsClarifying, touchConversation, saveCurrentConversation]);

  // 处理澄清选项选择
  const handleClarifyOptionSelect = useCallback(async (optionId: string) => {
    if (!clarifySession || !hasValidConfig) return;

    const currentQuestion = clarifySession.questions[clarifySession.currentQuestionIndex];
    if (!currentQuestion) return;

    // 找到选中的选项标签
    const selectedOption = currentQuestion.options.find(opt => opt.id === optionId);
    const answerText = selectedOption ? selectedOption.label : optionId;

    // 将问答添加到对话框（显示为用户回复）
    const qaMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: `${currentQuestion.question}\n→ ${answerText}`,
      timestamp: Date.now(),
    };
    addMessage(qaMessage);

    const answer: ClarifyAnswer = {
      questionId: currentQuestion.id,
      selectedOptionId: optionId,
      customValue: null,
    };

    answerClarifyQuestion(currentQuestion.id, answer);

    // 检查是否是最后一个问题
    const isLastQuestion = clarifySession.currentQuestionIndex >= clarifySession.questions.length - 1;

    if (isLastQuestion) {
      // 所有问题回答完毕，构建最终提示词并生成
      const activeConfig = await getActiveConfig();
      if (!activeConfig) return;

      const llmConfig: LLMConfig = {
        baseURL: activeConfig.baseURL,
        apiKey: activeConfig.apiKey,
        model: activeConfig.model,
      };
      const clarifyService = createClarifyService(llmConfig);
      const updatedSession: ClarifySession = {
        ...clarifySession,
        answers: [...clarifySession.answers, answer],
        status: 'completed',
      };
      const finalPrompt = clarifyService.buildFinalPrompt(updatedSession);
      console.log('[ChatPanel] 澄清完成，最终提示词:', finalPrompt);

      // 构建多模态内容（如果有附件）(031-multimodal-input)
      const contentToSend = clarifySession.attachments && clarifySession.attachments.length > 0
        ? buildMultimodalContent(finalPrompt, clarifySession.attachments)
        : finalPrompt;
      await generateMotionOnly(contentToSend);
    } else {
      // 进入下一个问题
      nextClarifyQuestion();
    }
  }, [clarifySession, hasValidConfig, getActiveConfig, addMessage, answerClarifyQuestion, nextClarifyQuestion, generateMotionOnly]);

  // 处理自定义答案提交
  const handleClarifyCustomSubmit = useCallback(async (customValue: string) => {
    if (!clarifySession || !hasValidConfig) return;

    const currentQuestion = clarifySession.questions[clarifySession.currentQuestionIndex];
    if (!currentQuestion) return;

    // 将问答添加到对话框（显示为用户回复）
    const qaMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: `${currentQuestion.question}\n→ ${customValue}`,
      timestamp: Date.now(),
    };
    addMessage(qaMessage);

    const answer: ClarifyAnswer = {
      questionId: currentQuestion.id,
      selectedOptionId: null,
      customValue,
    };

    answerClarifyQuestion(currentQuestion.id, answer);

    const isLastQuestion = clarifySession.currentQuestionIndex >= clarifySession.questions.length - 1;

    if (isLastQuestion) {
      const activeConfig = await getActiveConfig();
      if (!activeConfig) return;

      const llmConfig: LLMConfig = {
        baseURL: activeConfig.baseURL,
        apiKey: activeConfig.apiKey,
        model: activeConfig.model,
      };
      const clarifyService = createClarifyService(llmConfig);
      const updatedSession: ClarifySession = {
        ...clarifySession,
        answers: [...clarifySession.answers, answer],
        status: 'completed',
      };
      const finalPrompt = clarifyService.buildFinalPrompt(updatedSession);
      console.log('[ChatPanel] 澄清完成（自定义答案），最终提示词:', finalPrompt);

      // 构建多模态内容（如果有附件）(031-multimodal-input)
      const contentToSend = clarifySession.attachments && clarifySession.attachments.length > 0
        ? buildMultimodalContent(finalPrompt, clarifySession.attachments)
        : finalPrompt;
      await generateMotionOnly(contentToSend);
    } else {
      nextClarifyQuestion();
    }
  }, [clarifySession, hasValidConfig, getActiveConfig, addMessage, answerClarifyQuestion, nextClarifyQuestion, generateMotionOnly]);

  // 处理跳过澄清
  const handleSkipClarify = useCallback(async () => {
    if (!clarifySession) return;

    skipClarify();
    // 使用原始提示词直接生成（用户消息已在 handleSubmit 中添加）
    // 构建多模态内容（如果有附件）(031-multimodal-input)
    const contentToSend = clarifySession.attachments && clarifySession.attachments.length > 0
      ? buildMultimodalContent(clarifySession.originalPrompt, clarifySession.attachments)
      : clarifySession.originalPrompt;
    await generateMotionOnly(contentToSend);
  }, [clarifySession, skipClarify, generateMotionOnly]);

  // 处理修复请求 (009-js-error-autofix)
  const handleFix = useCallback(async () => {
    if (!currentMotion || !renderError || !hasValidConfig || isFixing) return;
    if (fixAttemptCount >= ERROR_CONSTANTS.MAX_FIX_ATTEMPTS) return;

    console.log('[ChatPanel] 开始修复, 尝试次数:', fixAttemptCount + 1);

    const controller = new AbortController();
    setFixAbortController(controller);
    setIsFixing(true);
    incrementFixAttempt();

    try {
      const activeConfig = await getActiveConfig();
      if (!activeConfig) {
        throw new Error('无法获取 LLM 配置');
      }

      const llmConfig: LLMConfig = {
        baseURL: activeConfig.baseURL,
        apiKey: activeConfig.apiKey,
        model: activeConfig.model,
      };
      const llmService = createLLMService(llmConfig);
      const fixedMotion = await llmService.fixMotion(
        currentMotion,
        renderError,
        { signal: controller.signal }
      );

      console.log('[ChatPanel] 修复成功，更新动效');
      setCurrentMotion(fixedMotion);

      // 添加修复成功消息
      const successMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: t('chat.fixSuccess'),
        timestamp: Date.now(),
        motionSnapshot: fixedMotion.id,
      };
      addMessage(successMessage);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        console.log('[ChatPanel] 修复请求已取消');
        return;
      }

      console.error('[ChatPanel] 修复失败:', err);
      const errorMessage = err instanceof Error ? err.message : t('chat.fixError');

      // 添加修复失败消息
      const failMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: t('chat.fixErrorDetail', { message: errorMessage }),
        timestamp: Date.now(),
      };
      addMessage(failMessage);
    } finally {
      setIsFixing(false);
      setFixAbortController(null);
    }
  }, [t, currentMotion, renderError, hasValidConfig, isFixing, fixAttemptCount, getActiveConfig, setFixAbortController, setIsFixing, incrementFixAttempt, setCurrentMotion, addMessage]);

  // PostProcess shader 错误自动触发修复
  useEffect(() => {
    if (
      renderError?.source === 'postProcess' &&
      !isFixing &&
      fixAttemptCount < ERROR_CONSTANTS.MAX_FIX_ATTEMPTS &&
      hasValidConfig &&
      currentMotion
    ) {
      handleFix();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderError?.id]);

  // 处理预设对话导入 (039-starter-conversation-preset)
  const handleImportPreset = useCallback(async () => {
    const existingTitles = conversationList.map((c) => c.title);

    try {
      // 从 public 目录加载预设 .neon 文件
      const response = await fetch(`${import.meta.env.BASE_URL}preset-starter.neon`);
      if (!response.ok) {
        throw new Error('Failed to load preset file');
      }
      const content = await response.text();

      // 创建虚拟 File 对象
      const blob = new Blob([content], { type: 'application/json' });
      const presetFile = new File([blob], 'preset-starter.neon', { type: 'application/json' });

      const result = await importFromFile(presetFile, existingTitles);

      if (result.success && result.conversations) {
        importConversations(result.conversations);
        addToast({
          type: 'success',
          message: t('chat.importSuccess'),
        });
      } else {
        addToast({
          type: 'error',
          message: result.errors[0]?.message || t('chat.importFailed'),
        });
      }
    } catch (err) {
      console.error('[ChatPanel] 导入预设对话失败:', err);
      addToast({
        type: 'error',
        message: t('chat.importError'),
      });
    }
  }, [t, conversationList, importConversations, addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || !hasValidConfig || isGenerating || isClarifying) return;

    const userInput = input.trim();
    setInput('');
    setError(null);
    // 清理错误状态（新生成时取消进行中的修复）(009-js-error-autofix)
    clearErrorState();

    // 收集准备好的附件 (031-multimodal-input)
    const readyAttachments = pendingAttachments
      .filter((a) => a.status === 'ready' && a.attachment)
      .map((a) => a.attachment!);

    // 获取解密后的配置
    const activeConfig = await getActiveConfig();
    if (!activeConfig) {
      setError(t('chat.configError'));
      return;
    }
    const llmConfig: LLMConfig = {
      baseURL: activeConfig.baseURL,
      apiKey: activeConfig.apiKey,
      model: activeConfig.model,
    };

    // Step 1: 立即添加用户消息（让用户立即看到自己的输入）
    const messageId = generateMessageId();

    // 保存附件到 IndexedDB (031-multimodal-input)
    if (readyAttachments.length > 0) {
      const attachmentsWithMessageId = readyAttachments.map((a) => ({
        ...a,
        messageId,
      }));
      try {
        await saveAttachments(attachmentsWithMessageId);
      } catch (err) {
        console.error('[ChatPanel] 保存附件失败:', err);
        // 继续发送消息，附件保存失败不阻塞
      }
    }

    const userMessage: ChatMessage = {
      id: messageId,
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
      attachmentIds: readyAttachments.length > 0 ? readyAttachments.map((a) => a.id) : undefined,
    };
    addMessage(userMessage);

    // 清理待发送附件 (031-multimodal-input)
    if (pendingAttachments.length > 0) {
      clearPendingAttachments();
    }

    // 更新对话标题（首条用户消息）(013-history-panel)
    if (messages.length === 0 && currentConversationId) {
      const title = userInput.length <= 30 ? userInput : userInput.substring(0, 30) + '...';
      updateConversationTitle(currentConversationId, title);
    }
    // 更新对话时间
    touchConversation();

    // Step 3: Check if clarification is enabled and no current motion (only for new generations)
    let promptToUse = userInput; // 直接使用用户输入，无优化
    if (clarifyEnabled && !currentMotion) {
      setIsClarifying(true);
      try {
        console.log('[ChatPanel] 开始分析是否需要澄清');
        const clarifyService = createClarifyService(llmConfig);
        // 澄清分析也传入多模态内容，让 LLM 看到图片 (031-multimodal-input)
        const analyzeContent = readyAttachments.length > 0
          ? buildMultimodalContent(promptToUse, readyAttachments)
          : promptToUse;
        const analysisResult = await clarifyService.analyzePrompt(analyzeContent);

        if (analysisResult.needsClarification && analysisResult.questions.length > 0) {
          // 需要澄清，创建会话（保存附件以便澄清完成后使用）(031-multimodal-input)
          const newSession: ClarifySession = {
            id: `clarify_${Date.now()}`,
            originalPrompt: userInput,
            questions: analysisResult.questions,
            answers: [],
            currentQuestionIndex: 0,
            status: 'questioning',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            attachments: readyAttachments.length > 0 ? readyAttachments : undefined,
          };
          setClarifySession(newSession);
          console.log('[ChatPanel] 需要澄清，创建会话:', newSession);

          // 添加系统提示消息
          const clarifyMessage: ChatMessage = {
            id: generateMessageId(),
            role: 'assistant',
            content: t('chat.clarifyIntro'),
            timestamp: Date.now(),
          };
          addMessage(clarifyMessage);

          return; // 等待用户回答问题
        } else {
          // 不需要澄清，使用 directPrompt 或原始提示词
          promptToUse = analysisResult.directPrompt || promptToUse;
          console.log('[ChatPanel] 无需澄清，直接生成');
          setIsClarifying(false);
        }
      } catch (err) {
        console.error('[ChatPanel] 澄清分析失败，跳过澄清:', err);
        setIsClarifying(false);
        // 降级：直接生成
      }
    }

    // Step 4: Generate motion directly (用户消息已添加，这里不再重复)
    // 构建多模态内容（如果有附件）(031-multimodal-input)
    const contentToSend = readyAttachments.length > 0
      ? buildMultimodalContent(promptToUse, readyAttachments)
      : promptToUse;
    await generateMotionOnly(contentToSend);
  };

  return (
    <div className="flex flex-col h-full">
      {/* History Panel */}
      <HistoryPanel />

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-text-muted py-8">
            {shouldShowPresetImport ? (
              <>
                <p className="mb-4 font-body text-text-primary text-base">{t('chat.emptyTitle')}</p>
                <p className="mb-6 font-body text-sm text-text-secondary">{t('chat.emptyDescription')}</p>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleImportPreset}
                  disabled={isGenerating}
                >
                  {t('chat.importDemo')}
                </Button>
              </>
            ) : (
              <>
                <p className="mb-2 font-body">{t('chat.emptyFallbackTitle')}</p>
                <p className="text-sm font-body">{t('chat.emptyFallbackHint')}</p>
              </>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm font-body ${
                message.role === 'user'
                  ? 'bg-accent-primary text-black'
                  : 'bg-background-elevated text-text-primary border border-border-default'
              }`}
            >
              {message.content}
              {/* 消息附件显示 (031-multimodal-input) */}
              {message.role === 'user' && message.attachmentIds && message.attachmentIds.length > 0 && (
                <MessageAttachment
                  messageId={message.id}
                  attachmentIds={message.attachmentIds}
                />
              )}
            </div>
          </div>
        ))}

        {/* Analyzing clarify state (when isClarifying but no session yet) */}
        {isClarifying && !clarifySession && (
          <div className="flex justify-start">
            <div className="bg-background-elevated rounded-lg px-3 py-2 text-sm font-body text-text-muted border border-border-default">
              <span className="inline-flex items-center gap-1">
                <span className="animate-pulse">{t('chat.analyzing')}</span>
                <span className="animate-bounce">...</span>
              </span>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-background-elevated rounded-lg px-3 py-2 text-sm font-body text-text-muted border border-border-default">
              <span className="inline-flex items-center gap-1">
                <span className="animate-pulse">{t('chat.generating')}</span>
                <span className="animate-bounce">...</span>
              </span>
            </div>
          </div>
        )}

        {/* Clarify question display */}
        {clarifySession && clarifySession.status === 'questioning' && (
          <div className="flex justify-start">
            <div className="w-full max-w-[90%] bg-background-elevated rounded-lg px-3 py-3 border border-border-default">
              <ClarifyQuestion
                question={clarifySession.questions[clarifySession.currentQuestionIndex]}
                progress={{
                  current: clarifySession.currentQuestionIndex + 1,
                  total: clarifySession.questions.length,
                }}
                onSelectOption={handleClarifyOptionSelect}
                onSubmitCustom={handleClarifyCustomSubmit}
                onSkip={handleSkipClarify}
                disabled={isGenerating}
              />
            </div>
          </div>
        )}

        {/* Error warning display (009-js-error-autofix) */}
        {renderError && (
          <div className="flex justify-start">
            <div className="w-full max-w-[90%]">
              <ErrorWarning
                error={renderError}
                onFix={handleFix}
                loading={isFixing}
                disabled={isFixing || isGenerating}
                attemptCount={fixAttemptCount}
                maxAttempts={ERROR_CONSTANTS.MAX_FIX_ATTEMPTS}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-3 py-2 bg-accent-tertiary/10 border-t border-accent-tertiary/20">
          <p className="text-sm font-body text-accent-tertiary">{error}</p>
        </div>
      )}

      {/* Attachment list (031-multimodal-input) */}
      {pendingAttachments.length > 0 && (
        <AttachmentList
          attachments={pendingAttachments}
          onRemove={removePendingAttachment}
          disabled={isGenerating}
        />
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border-default">
        <div className="flex gap-2 items-center">
          {/* Attachment button (031-multimodal-input) */}
          <AttachmentButton
            onFileSelect={handleFileSelect}
            disabled={isGenerating || isClarifying || !hasValidConfig}
            currentCount={pendingAttachments.length}
          />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            placeholder={
              isClarifying
                ? t('chat.placeholder3')
                : currentMotion
                  ? t('chat.placeholder2')
                  : t('chat.placeholder1')
            }
            disabled={isGenerating || isClarifying || !hasValidConfig}
            className="flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!input.trim() || isGenerating || isClarifying || !hasValidConfig}
            loading={isGenerating}
          >
            {t('chat.send')}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ChatPanel;
