/**
 * 代码校验服务
 * 检测渲染代码中的非确定性模式
 * @module services/llm/codeValidator
 */

import type { CodeValidationResult, CodeValidationIssue } from '../../types';

/**
 * 校验规则定义
 */
interface ValidationPattern {
  id: string;
  pattern: RegExp;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
}

/**
 * 非确定性代码检测规则
 */
const NON_DETERMINISTIC_PATTERNS: ValidationPattern[] = [
  {
    id: 'math-random',
    pattern: /\bMath\.random\s*\(\s*\)/g,
    severity: 'error',
    message: '检测到 Math.random()',
    suggestion: '请使用 window.__motionUtils.seededRandom(time) 替代',
  },
  {
    id: 'date-now',
    pattern: /\bDate\.now\s*\(\s*\)/g,
    severity: 'warning',
    message: '检测到 Date.now()',
    suggestion: '请使用 render 函数的 time 参数替代',
  },
  {
    id: 'new-date',
    pattern: /\bnew\s+Date\s*\(/g,
    severity: 'warning',
    message: '检测到 new Date()',
    suggestion: '请使用 render 函数的 time 参数替代',
  },
  {
    id: 'performance-now',
    pattern: /\bperformance\.now\s*\(\s*\)/g,
    severity: 'warning',
    message: '检测到 performance.now()',
    suggestion: '请使用 render 函数的 time 参数替代',
  },
];

/**
 * 校验渲染代码的确定性
 * @param code - 待校验的代码字符串
 * @returns 校验结果
 */
export function validateMotionCode(code: string): CodeValidationResult {
  const issues: CodeValidationIssue[] = [];

  for (const rule of NON_DETERMINISTIC_PATTERNS) {
    // Reset regex lastIndex for global patterns
    rule.pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(code)) !== null) {
      issues.push({
        severity: rule.severity,
        message: rule.message,
        match: match[0],
        suggestion: rule.suggestion,
        position: match.index,
      });
    }
  }

  // Sort issues by position
  issues.sort((a, b) => a.position - b.position);

  return {
    isValid: !issues.some((issue) => issue.severity === 'error'),
    issues,
  };
}

/**
 * 快速检测代码是否包含非确定性模式
 * @param code - 待检测的代码字符串
 * @returns 是否包含非确定性代码
 */
export function hasNonDeterministicCode(code: string): boolean {
  for (const rule of NON_DETERMINISTIC_PATTERNS) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(code)) {
      return true;
    }
  }
  return false;
}

/**
 * 格式化校验结果为用户友好的消息
 * @param result - 校验结果
 * @returns 格式化的消息数组
 */
export function formatValidationMessages(result: CodeValidationResult): string[] {
  return result.issues.map((issue) => {
    const prefix = issue.severity === 'error' ? '❌' : '⚠️';
    return `${prefix} ${issue.message}: "${issue.match}" → ${issue.suggestion}`;
  });
}
