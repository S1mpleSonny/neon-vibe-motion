import type { LLMConfig, ClarifyAnalysisResult, ClarifySession, ClarifyQuestion, ContentPart } from '../../types';
import { LLMClient, ChatCompletionMessage } from './client';
import { getClarifySystemPrompt, createClarifyAnalysisPrompt, extractJSON } from './prompts';
import { logger, generateRequestId } from '../logging';
import { useAppStore } from '../../stores/appStore';

/**
 * 验证 LLM 返回的澄清分析结果
 */
function validateClarifyResponse(data: unknown): ClarifyAnalysisResult {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid response format');
  }

  const obj = data as Record<string, unknown>;

  // 验证 needsClarification
  if (typeof obj.needsClarification !== 'boolean') {
    throw new Error('needsClarification must be boolean');
  }

  // 验证 questions
  if (!Array.isArray(obj.questions)) {
    throw new Error('questions must be array');
  }

  // 限制问题数量到最多 5 个
  const questions: ClarifyQuestion[] = obj.questions.slice(0, 5).map((q: unknown, index: number) => {
    if (typeof q !== 'object' || q === null) {
      throw new Error(`question[${index}] must be object`);
    }

    const question = q as Record<string, unknown>;

    if (typeof question.id !== 'string' || !question.id) {
      throw new Error(`question[${index}].id must be non-empty string`);
    }
    if (typeof question.question !== 'string' || !question.question) {
      throw new Error(`question[${index}].question must be non-empty string`);
    }
    if (!Array.isArray(question.options) || question.options.length < 3) {
      throw new Error(`question[${index}].options must have at least 3 items`);
    }

    // 验证选项
    const options = question.options.map((opt: unknown, optIndex: number) => {
      if (typeof opt !== 'object' || opt === null) {
        throw new Error(`question[${index}].options[${optIndex}] must be object`);
      }
      const option = opt as Record<string, unknown>;
      if (typeof option.id !== 'string' || !option.id) {
        throw new Error(`question[${index}].options[${optIndex}].id must be non-empty string`);
      }
      if (typeof option.label !== 'string' || !option.label) {
        throw new Error(`question[${index}].options[${optIndex}].label must be non-empty string`);
      }
      return {
        id: option.id,
        label: option.label,
      };
    });

    return {
      id: question.id,
      question: question.question,
      options,
    };
  });

  // 验证 directPrompt
  if (!obj.needsClarification && typeof obj.directPrompt !== 'string') {
    throw new Error('directPrompt required when needsClarification is false');
  }

  return {
    needsClarification: obj.needsClarification,
    questions,
    directPrompt: typeof obj.directPrompt === 'string' ? obj.directPrompt : null,
  };
}

/**
 * 处理解析错误时的降级策略
 */
function handleParseError(originalPrompt: string, requestId: string): ClarifyAnalysisResult {
  logger.warn('ClarifyService', '解析 LLM 响应失败，跳过澄清流程', { requestId });
  return {
    needsClarification: false,
    questions: [],
    directPrompt: originalPrompt,
  };
}

export interface ClarifyService {
  /**
   * 分析用户需求是否需要澄清
   * 支持纯文本或多模态内容 (031-multimodal-input)
   */
  analyzePrompt(prompt: string | ContentPart[]): Promise<ClarifyAnalysisResult>;

  /**
   * 根据问答结果构建最终提示词
   */
  buildFinalPrompt(session: ClarifySession): string;
}

/**
 * 创建澄清服务实例
 */
export function createClarifyService(config: LLMConfig): ClarifyService {
  const client = new LLMClient(config);

  return {
    async analyzePrompt(prompt: string | ContentPart[]): Promise<ClarifyAnalysisResult> {
      const requestId = generateRequestId();
      const isMultimodal = Array.isArray(prompt);
      const promptLength = isMultimodal
        ? prompt.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('').length
        : prompt.length;
      logger.info('ClarifyService', '开始分析提示词', { requestId, promptLength, isMultimodal });

      // 提取文本部分用于降级处理
      const textPrompt = isMultimodal
        ? prompt.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('\n')
        : prompt;

      try {
        // 构建用户消息内容 (031-multimodal-input)
        let userContent: string | ContentPart[];
        if (isMultimodal) {
          // 多模态：图片放前面，分析提示词放后面
          const imageParts = prompt.filter((p) => p.type === 'image_url');
          const analysisPromptText = createClarifyAnalysisPrompt(textPrompt);
          userContent = [...imageParts, { type: 'text', text: analysisPromptText }];
        } else {
          userContent = createClarifyAnalysisPrompt(prompt);
        }

        const locale = useAppStore.getState().locale;
        const messages: ChatCompletionMessage[] = [
          { role: 'system', content: getClarifySystemPrompt(locale) },
          { role: 'user', content: userContent },
        ];

        const response = await client.chatCompletion(messages, { temperature: 1 });

        logger.debug('ClarifyService', '收到澄清分析响应', { requestId, responseLength: response.length });

        // 记录澄清分析的代码日志（只记录文本部分）
        logger.logCodeGeneration(requestId, textPrompt, response, '');

        const jsonStr = extractJSON(response);
        let parsed: unknown;

        try {
          parsed = JSON.parse(jsonStr);
          logger.debug('ClarifyService', '响应解析成功', { requestId });
        } catch (e) {
          logger.error('ClarifyService', 'JSON 解析错误', { requestId, error: e instanceof Error ? e.message : String(e) });
          return handleParseError(textPrompt, requestId);
        }

        const result = validateClarifyResponse(parsed);
        logger.info('ClarifyService', '澄清分析完成', { requestId, needsClarification: result.needsClarification, questionsCount: result.questions.length });

        return result;
      } catch (error) {
        logger.error('ClarifyService', '分析提示词出错', { requestId, error: error instanceof Error ? error.message : String(error) });
        return handleParseError(textPrompt, requestId);
      }
    },

    buildFinalPrompt(session: ClarifySession): string {
      const { originalPrompt, questions, answers } = session;

      // 构建答案摘要
      const answerSummary = answers
        .map((answer) => {
          const question = questions.find((q) => q.id === answer.questionId);
          if (!question) return '';

          const answerText = answer.selectedOptionId
            ? question.options.find((o) => o.id === answer.selectedOptionId)?.label
            : answer.customValue;

          return `${question.question} → ${answerText}`;
        })
        .filter(Boolean)
        .join('\n');

      if (!answerSummary) {
        return originalPrompt;
      }

      return `${originalPrompt}

补充说明：
${answerSummary}`;
    },
  };
}

export default createClarifyService;
