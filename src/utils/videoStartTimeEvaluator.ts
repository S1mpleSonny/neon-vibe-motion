/**
 * 视频起始时间评估器模块
 * 用于安全执行 LLM 生成的动态计算逻辑代码
 *
 * 架构说明：
 * - 核心逻辑定义为可序列化的字符串（EVALUATOR_CODE）
 * - 同时用于运行时执行和素材包导出
 * - 消除 TypeScript 版本和 JavaScript 版本的代码重复
 *
 * @module utils/videoStartTimeEvaluator
 */

import type { AdjustableParameter } from '@/types';

// ============================================
// 核心评估器代码（可序列化，用于素材包导出）
// ============================================

/**
 * 视频起始时间评估器的核心代码
 * 这段代码会被：
 * 1. 在运行时通过 new Function 执行
 * 2. 直接嵌入素材包的 HTML 中
 */
export const EVALUATOR_CODE = `
var VideoStartTimeEvaluator = {
  /**
   * 从参数数组构建评估上下文
   * 返回简化的上下文结构：
   * - params.numberParam → 数值
   * - params.videoParam.videoDuration → 视频时长（毫秒）
   */
  buildParamsContext: function(parameters, runtimeParams) {
    var context = {};
    for (var i = 0; i < parameters.length; i++) {
      var param = parameters[i];
      var runtimeValue = runtimeParams ? runtimeParams[param.id] : undefined;

      switch (param.type) {
        case 'number':
          context[param.id] = typeof runtimeValue === 'number' ? runtimeValue : (param.value || 0);
          break;
        case 'color':
          context[param.id] = typeof runtimeValue === 'string' ? runtimeValue : (param.colorValue || '#000000');
          break;
        case 'boolean':
          context[param.id] = typeof runtimeValue === 'boolean' ? runtimeValue : (param.boolValue || false);
          break;
        case 'select':
          context[param.id] = typeof runtimeValue === 'string' ? runtimeValue : (param.selectedValue || '');
          break;
        case 'video':
          var videoContext = {};
          if (runtimeValue && runtimeValue.tagName === 'VIDEO') {
            videoContext.videoDuration = (runtimeValue.duration || 0) * 1000;
            videoContext.videoWidth = runtimeValue.videoWidth || 0;
            videoContext.videoHeight = runtimeValue.videoHeight || 0;
          } else {
            videoContext.videoDuration = param.videoDuration || 0;
            videoContext.videoWidth = param.videoWidth || 0;
            videoContext.videoHeight = param.videoHeight || 0;
          }
          videoContext.videoStartTime = param.videoStartTime || 0;
          context[param.id] = videoContext;
          break;
      }
    }
    return context;
  },

  /**
   * 安全执行动态计算代码
   */
  evaluateCode: function(code, paramsContext) {
    if (!code || code.trim() === '') {
      return { value: 0, success: true };
    }

    try {
      var fn = new Function('params', 'Math', '"use strict"; return (' + code + ');');
      var result = fn(paramsContext, Math);

      if (typeof result !== 'number' || !isFinite(result)) {
        return { value: 0, success: false, error: '计算结果不是有效数值: ' + result };
      }

      return { value: Math.max(0, result), success: true };
    } catch (e) {
      console.warn('[VideoStartTimeEvaluator] 代码执行失败:', e.message);
      return { value: 0, success: false, error: e.message };
    }
  },

  /**
   * 获取视频参数的有效起始时间
   */
  getEffectiveStartTime: function(param, parameters, runtimeParams) {
    if (param.type !== 'video') return 0;

    if (param.videoStartTimeCode && param.videoStartTimeCode.trim() !== '') {
      var context = this.buildParamsContext(parameters, runtimeParams);
      var result = this.evaluateCode(param.videoStartTimeCode, context);
      if (result.success) {
        return result.value;
      }
      console.warn('[VideoStartTimeEvaluator] 参数', param.id, '的动态计算失败:', result.error);
    }

    return Math.max(0, param.videoStartTime || 0);
  },

  /**
   * 获取所有视频参数的起始时间映射
   */
  getAllVideoStartTimes: function(parameters, runtimeParams) {
    var result = {};
    for (var i = 0; i < parameters.length; i++) {
      var param = parameters[i];
      if (param.type === 'video') {
        result[param.id] = this.getEffectiveStartTime(param, parameters, runtimeParams);
      }
    }
    return result;
  },

  /**
   * 计算动态时长 (025-dynamic-duration)
   * @param {string} code - 动态计算代码
   * @param {object} paramsContext - 参数上下文
   * @param {number} fallbackDuration - 降级默认值
   * @returns {{ value: number, success: boolean, error?: string }}
   */
  evaluateDuration: function(code, paramsContext, fallbackDuration) {
    var MIN_DURATION = 1000;
    var MAX_DURATION = 60000;

    if (!code || code.trim() === '') {
      return { value: fallbackDuration, success: true };
    }

    var result = this.evaluateCode(code, paramsContext);

    if (!result.success) {
      console.warn('[DynamicEvaluator] Duration 计算失败，使用降级值:', result.error);
      return { value: fallbackDuration, success: false, error: result.error };
    }

    var duration = result.value;

    // 边界校验：处理 NaN、Infinity、负数
    if (!isFinite(duration) || duration < 0) {
      console.warn('[DynamicEvaluator] Duration 为无效值，使用降级值:', duration);
      return { value: fallbackDuration, success: false, error: '计算结果为无效值: ' + duration };
    }

    // 边界校验：最小值
    if (duration < MIN_DURATION) {
      console.warn('[DynamicEvaluator] Duration 低于最小值，使用 1000ms');
      duration = MIN_DURATION;
    }

    // 边界校验：最大值
    if (duration > MAX_DURATION) {
      console.warn('[DynamicEvaluator] Duration 超过最大值，使用 60000ms');
      duration = MAX_DURATION;
    }

    return { value: duration, success: true };
  },

  /**
   * 获取有效的动效时长 (025-dynamic-duration)
   * @param {object} motion - MotionDefinition (需要包含 duration, durationCode, parameters)
   * @param {object} runtimeParams - 运行时参数值
   * @returns {number} 有效时长（毫秒）
   */
  getEffectiveDuration: function(motion, runtimeParams) {
    if (!motion) {
      return 5000; // 默认 5 秒
    }

    if (!motion.durationCode || motion.durationCode.trim() === '') {
      return motion.duration || 5000;
    }

    var context = this.buildParamsContext(motion.parameters || [], runtimeParams);
    var result = this.evaluateDuration(motion.durationCode, context, motion.duration || 5000);
    return result.value;
  }
};
`.trim();

// ============================================
// 运行时评估器实例（通过执行 EVALUATOR_CODE 创建）
// ============================================

interface MotionLike {
  duration?: number;
  durationCode?: string;
  parameters?: AdjustableParameter[];
}

interface EvaluatorInstance {
  buildParamsContext: (
    parameters: AdjustableParameter[],
    runtimeParams?: Record<string, unknown>
  ) => Record<string, unknown>;
  evaluateCode: (
    code: string,
    paramsContext: Record<string, unknown>
  ) => { value: number; success: boolean; error?: string };
  getEffectiveStartTime: (
    param: AdjustableParameter,
    parameters: AdjustableParameter[],
    runtimeParams?: Record<string, unknown>
  ) => number;
  getAllVideoStartTimes: (
    parameters: AdjustableParameter[],
    runtimeParams?: Record<string, unknown>
  ) => Record<string, number>;
  // 025-dynamic-duration: 动态时长计算
  evaluateDuration: (
    code: string,
    paramsContext: Record<string, unknown>,
    fallbackDuration: number
  ) => { value: number; success: boolean; error?: string };
  getEffectiveDuration: (
    motion: MotionLike,
    runtimeParams?: Record<string, unknown>
  ) => number;
}

// 创建运行时评估器实例
const createEvaluator = (): EvaluatorInstance => {
  const fn = new Function(EVALUATOR_CODE + '\nreturn VideoStartTimeEvaluator;');
  return fn() as EvaluatorInstance;
};

// 单例实例
const evaluator = createEvaluator();

// ============================================
// 导出的 TypeScript 接口（包装评估器方法）
// ============================================

/**
 * 评估结果类型
 */
export interface EvaluationResult {
  value: number;
  success: boolean;
  error?: string;
}

/**
 * 获取所有视频参数的起始时间映射
 *
 * @param parameters - 参数定义数组
 * @param runtimeParams - 运行时参数值（可选）
 * @returns 视频参数 ID 到起始时间的映射
 */
export function getAllVideoStartTimes(
  parameters: AdjustableParameter[],
  runtimeParams?: Record<string, unknown>
): Record<string, number> {
  return evaluator.getAllVideoStartTimes(parameters, runtimeParams);
}

/**
 * 获取视频参数的有效起始时间
 *
 * @param param - 视频参数
 * @param allParameters - 所有参数
 * @param runtimeParams - 运行时参数值（可选）
 * @returns 有效起始时间（毫秒）
 */
export function getEffectiveVideoStartTime(
  param: AdjustableParameter,
  allParameters: AdjustableParameter[],
  runtimeParams?: Record<string, unknown>
): number {
  return evaluator.getEffectiveStartTime(param, allParameters, runtimeParams);
}

/**
 * 构建评估上下文
 *
 * @param parameters - 参数定义数组
 * @param runtimeParams - 运行时参数值（可选）
 * @returns 参数上下文对象
 */
export function buildParamsContext(
  parameters: AdjustableParameter[],
  runtimeParams?: Record<string, unknown>
): Record<string, unknown> {
  return evaluator.buildParamsContext(parameters, runtimeParams);
}

/**
 * 执行动态计算代码
 *
 * @param code - LLM 生成的计算逻辑代码
 * @param paramsContext - 参数上下文对象
 * @returns 评估结果
 */
export function evaluateVideoStartTimeCode(
  code: string,
  paramsContext: Record<string, unknown>
): EvaluationResult {
  return evaluator.evaluateCode(code, paramsContext);
}

// ============================================
// 动态时长计算 (025-dynamic-duration)
// ============================================

/**
 * 执行动态时长计算代码
 *
 * @param code - LLM 生成的时长计算逻辑代码
 * @param paramsContext - 参数上下文对象
 * @param fallbackDuration - 计算失败时的降级值（毫秒）
 * @returns 评估结果
 */
export function evaluateDurationCode(
  code: string,
  paramsContext: Record<string, unknown>,
  fallbackDuration: number
): EvaluationResult {
  return evaluator.evaluateDuration(code, paramsContext, fallbackDuration);
}

/**
 * 获取动效的有效时长
 *
 * 优先使用 durationCode 动态计算，失败时降级到固定 duration 值。
 * 结果会进行边界校验：最小 1000ms，最大 60000ms。
 *
 * @param motion - 动效定义（需包含 duration, durationCode, parameters）
 * @param runtimeParams - 运行时参数值（可选，如已加载的视频元素）
 * @returns 有效时长（毫秒）
 */
export function getEffectiveDuration(
  motion: MotionLike,
  runtimeParams?: Record<string, unknown>
): number {
  return evaluator.getEffectiveDuration(motion, runtimeParams);
}
