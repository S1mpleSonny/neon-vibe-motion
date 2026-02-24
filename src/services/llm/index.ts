import type { MotionDefinition, ChatMessage, LLMConfig, LLMService, RenderError, FixOptions, ContentPart } from '../../types';
import { LLMClient, ChatCompletionMessage } from './client';
import { getSystemPrompt, createGeneratePrompt, createModifyPrompt, extractJSON, getFixSystemPrompt, createFixPrompt } from './prompts';
import { logger, generateRequestId } from '../logging';
import { useAppStore } from '../../stores/appStore';

function generateId(): string {
  return `motion_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function normalizeElement(element: unknown, index: number): MotionDefinition['elements'][0] | null {
  if (!element || typeof element !== 'object') return null;

  const el = element as Record<string, unknown>;

  // Ensure properties exist with defaults
  const properties = (el.properties || {}) as Record<string, unknown>;

  // 保留 LLM 生成的 ID，确保与 CSS 类名匹配
  // 如果没有 ID，使用基于索引的可预测 ID
  const elementId = el.id ? String(el.id) : `el${index}`;

  return {
    id: elementId,
    type: (['shape', 'particle', 'text', 'image'].includes(el.type as string) ? el.type : 'shape') as 'shape' | 'particle' | 'text' | 'image',
    properties: {
      x: typeof properties.x === 'number' ? properties.x : 400,
      y: typeof properties.y === 'number' ? properties.y : 300,
      width: typeof properties.width === 'number' ? properties.width : 100,
      height: typeof properties.height === 'number' ? properties.height : 100,
      opacity: typeof properties.opacity === 'number' ? properties.opacity : 1,
      rotation: typeof properties.rotation === 'number' ? properties.rotation : 0,
      shape: properties.shape as 'circle' | 'rectangle' | 'triangle' | 'polygon' | undefined,
      fill: typeof properties.fill === 'string' ? properties.fill : '#3b82f6',
      stroke: properties.stroke as string | undefined,
      strokeWidth: properties.strokeWidth as number | undefined,
      borderRadius: properties.borderRadius as number | undefined,
      text: properties.text as string | undefined,
      fontSize: properties.fontSize as number | undefined,
      fontFamily: properties.fontFamily as string | undefined,
      color: properties.color as string | undefined,
    },
    animation: normalizeAnimation(el.animation),
  };
}

function normalizeAnimation(anim: unknown): MotionDefinition['elements'][0]['animation'] {
  if (!anim || typeof anim !== 'object') {
    return {
      type: 'keyframe',
      duration: 3000,
      delay: 0,
      easing: 'ease-in-out',
      loop: true,
    };
  }

  const a = anim as Record<string, unknown>;
  return {
    type: (['keyframe', 'physics', 'path'].includes(a.type as string) ? a.type : 'keyframe') as 'keyframe' | 'physics' | 'path',
    duration: typeof a.duration === 'number' ? a.duration : 3000,
    delay: typeof a.delay === 'number' ? a.delay : 0,
    easing: typeof a.easing === 'string' ? a.easing : 'ease-in-out',
    loop: typeof a.loop === 'boolean' ? a.loop : true,
    keyframes: Array.isArray(a.keyframes) ? a.keyframes : undefined,
  };
}

function createMotionFromResponse(data: unknown): MotionDefinition {
  if (typeof data !== 'object' || data === null) {
    throw new Error('LLM 返回的数据格式无效');
  }

  const obj = data as Record<string, unknown>;
  const now = Date.now();

  // Normalize elements array
  const rawElements = Array.isArray(obj.elements) ? obj.elements : [];
  const elements = rawElements
    .map((el, index) => normalizeElement(el, index))
    .filter((el): el is NonNullable<typeof el> => el !== null);

  // Normalize parameters array
  const parameters = Array.isArray(obj.parameters) ? obj.parameters : [];

  // 从 LLM 响应中提取 renderMode，默认为 canvas
  const renderMode = 'canvas';

  const result: MotionDefinition = {
    id: generateId(),
    renderMode,
    duration: typeof obj.duration === 'number' && obj.duration >= 100 && obj.duration <= 30000 ? obj.duration : 3000,
    // 动态时长计算代码 (025-dynamic-duration)
    durationCode: typeof obj.durationCode === 'string' ? obj.durationCode : undefined,
    width: typeof obj.width === 'number' ? obj.width : 800,
    height: typeof obj.height === 'number' ? obj.height : 600,
    backgroundColor: typeof obj.backgroundColor === 'string' ? obj.backgroundColor : '#ffffff',
    elements,
    parameters,
    code: typeof obj.code === 'string' ? obj.code : '',
    // 后处理代码 (webgl-postprocess)
    postProcessCode: typeof obj.postProcessCode === 'string' ? obj.postProcessCode : undefined,
    createdAt: now,
    updatedAt: now,
  };

  // 调试：检查 postProcessCode 是否被提取
  console.log('[createMotionFromResponse] obj.postProcessCode 原始值:', obj.postProcessCode);
  console.log('[createMotionFromResponse] obj.postProcessCode 类型:', typeof obj.postProcessCode);
  console.log('[createMotionFromResponse] result.postProcessCode:', result.postProcessCode ? `存在 (${result.postProcessCode.length} chars)` : '不存在');

  return result;
}

export function createLLMService(config: LLMConfig): LLMService {
  const client = new LLMClient(config);

  return {
    async generateMotion(prompt: string | ContentPart[]): Promise<MotionDefinition> {
      const requestId = generateRequestId();
      const isMultimodal = Array.isArray(prompt);
      const promptLength = isMultimodal
        ? prompt.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('').length
        : prompt.length;
      logger.info('LLMService', '开始生成动效', { requestId, promptLength, isMultimodal });

      // 构建用户消息内容 (031-multimodal-input)
      let userContent: string | ContentPart[];
      if (isMultimodal) {
        // 多模态：将系统提示包装进 ContentPart 数组
        const textPrompt = createGeneratePrompt(
          prompt.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('\n')
        );
        // 图片放前面，文字放后面
        const imageParts = prompt.filter((p) => p.type === 'image_url');
        userContent = [...imageParts, { type: 'text', text: textPrompt }];
      } else {
        userContent = createGeneratePrompt(prompt);
      }

      const locale = useAppStore.getState().locale;
      const response = await client.chatCompletion([
        { role: 'system', content: getSystemPrompt(locale) },
        { role: 'user', content: userContent },
      ], { temperature: 1 });

      logger.debug('LLMService', '收到原始响应', { requestId, responseLength: response.length });

      const jsonStr = extractJSON(response);
      logger.debug('LLMService', '提取的 JSON', { requestId, jsonLength: jsonStr.length });

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
        logger.debug('LLMService', 'JSON 解析成功', { requestId });
      } catch (e) {
        logger.error('LLMService', 'JSON 解析失败', { requestId, error: e instanceof Error ? e.message : String(e) });
        console.error('[LLMService] generateMotion JSON 解析失败，完整响应内容:');
        console.error('--- RAW RESPONSE START ---');
        console.error(response);
        console.error('--- RAW RESPONSE END ---');
        console.error('--- EXTRACTED JSON START ---');
        console.error(jsonStr);
        console.error('--- EXTRACTED JSON END ---');
        throw new Error(`Failed to parse LLM response as JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }

      const motion = createMotionFromResponse(parsed);
      logger.info('LLMService', '动效生成完成', { requestId, motionId: motion.id });

      // 记录代码生成日志 (T019)
      // 多模态情况下只记录文本部分
      const promptForLog = isMultimodal
        ? prompt.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('\n')
        : prompt;
      logger.logCodeGeneration(requestId, promptForLog, response, motion.code);

      return motion;
    },

    async modifyMotion(
      instruction: string | ContentPart[],
      currentMotion: MotionDefinition,
      history: ChatMessage[]
    ): Promise<MotionDefinition> {
      const requestId = generateRequestId();
      const isMultimodal = Array.isArray(instruction);
      const instructionLength = isMultimodal
        ? instruction.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('').length
        : instruction.length;
      logger.info('LLMService', '开始修改动效', { requestId, instructionLength, historyCount: history.length, isMultimodal });

      const locale = useAppStore.getState().locale;
      // Build conversation history for context
      const messages: ChatCompletionMessage[] = [
        { role: 'system', content: getSystemPrompt(locale) },
      ];

      // Add recent history (limit to last 5 exchanges)
      const recentHistory = history.slice(-10);
      recentHistory.forEach((msg) => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });

      // Add current modification request
      const motionJSON = JSON.stringify(
        {
          renderMode: currentMotion.renderMode,
          duration: currentMotion.duration,
          // 动态时长计算代码 (025-dynamic-duration)
          durationCode: currentMotion.durationCode,
          width: currentMotion.width,
          height: currentMotion.height,
          backgroundColor: currentMotion.backgroundColor,
          elements: currentMotion.elements,
          parameters: currentMotion.parameters,
          code: currentMotion.code,
          postProcessCode: currentMotion.postProcessCode,
        },
        null,
        2
      );

      // 构建用户消息内容 (031-multimodal-input)
      let userContent: string | ContentPart[];
      if (isMultimodal) {
        // 多模态：提取文本部分构建修改提示词
        const textInstruction = instruction
          .filter((p) => p.type === 'text')
          .map((p) => (p as { type: 'text'; text: string }).text)
          .join('\n');
        const modifyPromptText = createModifyPrompt(motionJSON, textInstruction);
        // 图片放前面，修改提示词放后面
        const imageParts = instruction.filter((p) => p.type === 'image_url');
        userContent = [...imageParts, { type: 'text', text: modifyPromptText }];
      } else {
        userContent = createModifyPrompt(motionJSON, instruction);
      }

      messages.push({
        role: 'user',
        content: userContent,
      });

      const response = await client.chatCompletion(messages, { temperature: 1 });
      logger.debug('LLMService', '收到修改响应', { requestId, responseLength: response.length });

      const jsonStr = extractJSON(response);

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
        logger.debug('LLMService', '修改响应解析成功', { requestId });
      } catch (e) {
        logger.error('LLMService', '修改响应解析失败', { requestId, error: e instanceof Error ? e.message : String(e) });
        console.error('[LLMService] modifyMotion JSON 解析失败，完整响应内容:');
        console.error('--- RAW RESPONSE START ---');
        console.error(response);
        console.error('--- RAW RESPONSE END ---');
        console.error('--- EXTRACTED JSON START ---');
        console.error(jsonStr);
        console.error('--- EXTRACTED JSON END ---');
        throw new Error(`Failed to parse LLM response as JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }

      // Preserve original ID and creation time
      const updatedMotion = createMotionFromResponse(parsed);
      logger.info('LLMService', '动效修改完成', { requestId, motionId: updatedMotion.id });

      // 记录代码修改日志（多模态时只记录文本部分）
      const instructionForLog = isMultimodal
        ? instruction.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('\n')
        : instruction;
      logger.logCodeGeneration(requestId, instructionForLog, response, updatedMotion.code);

      return {
        ...updatedMotion,
        id: currentMotion.id,
        createdAt: currentMotion.createdAt,
        updatedAt: Date.now(),
      };
    },

    async validateConfig(config: LLMConfig): Promise<boolean> {
      const testClient = new LLMClient(config);
      const result = await testClient.validateConnection();
      return result.success;
    },

    async fixMotion(
      currentMotion: MotionDefinition,
      error: RenderError,
      options?: FixOptions
    ): Promise<MotionDefinition> {
      const requestId = generateRequestId();
      logger.info('LLMService', '开始修复动效代码', { requestId, errorType: error.type, errorMessage: error.message });

      // Build fix request data
      const fixRequest = {
        brokenCode: currentMotion.code,
        postProcessCode: currentMotion.postProcessCode,
        error: {
          type: error.type,
          message: error.message,
          lineNumber: error.lineNumber,
          columnNumber: error.columnNumber,
          source: (error.source || 'render') as 'render' | 'postProcess',
        },
        parameters: currentMotion.parameters,
        elements: currentMotion.elements,
        metadata: {
          duration: currentMotion.duration,
          // 动态时长计算代码 (025-dynamic-duration)
          durationCode: currentMotion.durationCode,
          width: currentMotion.width,
          height: currentMotion.height,
          backgroundColor: currentMotion.backgroundColor,
        },
      };

      const locale = useAppStore.getState().locale;
      const response = await client.chatCompletion(
        [
          { role: 'system', content: getFixSystemPrompt(locale) },
          { role: 'user', content: createFixPrompt(fixRequest) },
        ],
        {
          temperature: 1, // Lower temperature for more deterministic fixes
          signal: options?.signal,
        }
      );

      logger.debug('LLMService', '收到修复响应', { requestId, responseLength: response.length });

      const jsonStr = extractJSON(response);

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        logger.error('LLMService', '修复代码解析失败', { requestId, error: e instanceof Error ? e.message : String(e) });
        console.error('[LLMService] fixMotion JSON 解析失败，完整响应内容:');
        console.error('--- RAW RESPONSE START ---');
        console.error(response);
        console.error('--- RAW RESPONSE END ---');
        console.error('--- EXTRACTED JSON START ---');
        console.error(jsonStr);
        console.error('--- EXTRACTED JSON END ---');
        throw new Error(`修复代码解析失败: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }

      // Create motion from response and preserve original ID and creation time
      const fixedMotion = createMotionFromResponse(parsed);
      logger.info('LLMService', '代码修复完成', { requestId, motionId: fixedMotion.id });

      // 记录代码修复日志 (T020)
      logger.logCodeFix(
        requestId,
        createFixPrompt(fixRequest),
        response,
        fixedMotion.code,
        currentMotion.code,
        error.message
      );

      return {
        ...fixedMotion,
        id: currentMotion.id,
        createdAt: currentMotion.createdAt,
        updatedAt: Date.now(),
      };
    },
  };
}

export default createLLMService;

// 导出澄清服务
export { createClarifyService } from './clarifyService';
export type { ClarifyService } from './clarifyService';
