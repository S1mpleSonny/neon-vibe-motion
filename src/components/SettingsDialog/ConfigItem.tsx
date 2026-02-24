import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import type { LLMConfigItem } from '../../types';

interface ConfigItemProps {
  /** 配置项数据 */
  config: LLMConfigItem;
  /** 是否为当前活跃配置 */
  isActive: boolean;
  /** 点击切换配置 */
  onSelect: () => void;
  /** 点击编辑按钮 */
  onEdit: () => void;
  /** 点击删除按钮 */
  onDelete: () => void;
  /** 是否禁用操作（如正在加载中） */
  disabled?: boolean;
}

/**
 * 配置项组件
 * 显示单个 LLM 配置的信息和操作按钮
 */
export function ConfigItem({
  config,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  disabled = false,
}: ConfigItemProps) {
  const { t } = useTranslation();
  // 从 URL 提取服务商名称作为图标提示
  const getProviderHint = (baseURL: string): string => {
    try {
      const hostname = new URL(baseURL).hostname;
      if (hostname.includes('openai')) return 'OpenAI';
      if (hostname.includes('deepseek')) return 'DeepSeek';
      if (hostname.includes('anthropic')) return 'Anthropic';
      if (hostname.includes('azure')) return 'Azure';
      return hostname.split('.')[0];
    } catch {
      return 'API';
    }
  };

  const providerHint = getProviderHint(config.baseURL);

  return (
    <div
      className={`
        p-3 rounded-lg border transition-colors cursor-pointer
        ${isActive
          ? 'border-accent-primary bg-accent-primary/10 shadow-neon-soft'
          : 'border-border-default hover:border-accent-secondary/50 hover:bg-background-secondary'
        }
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* 活跃状态指示器 */}
            {isActive && (
              <span className="w-2 h-2 rounded-full bg-accent-primary flex-shrink-0 shadow-neon-soft" />
            )}
            <h4 className="text-sm font-medium font-body text-text-primary truncate">
              {config.name}
            </h4>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs font-body text-text-muted">
            <span className="px-1.5 py-0.5 rounded bg-background-elevated border border-border-default truncate">
              {providerHint}
            </span>
            <span className="truncate">{config.model}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            disabled={disabled}
            className="!p-1.5"
            title={t('config.edit')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={disabled}
            className="!p-1.5 text-accent-tertiary hover:text-accent-tertiary hover:bg-accent-tertiary/10"
            title={t('config.delete')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfigItem;
