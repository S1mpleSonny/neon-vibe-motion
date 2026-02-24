/**
 * 参数选择器组件
 * 用于在导出素材包时选择要导出的参数
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ExportableParameter } from '../../types';

interface ParameterSelectorProps {
  /** 可导出参数列表 */
  parameters: ExportableParameter[];
  /** 参数选中状态变化回调 */
  onToggle: (parameterId: string) => void;
  /** 全选回调 */
  onSelectAll: () => void;
  /** 取消全选回调 */
  onDeselectAll: () => void;
}

/**
 * 获取参数类型的图标
 */
function getParameterTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    number: '🔢',
    color: '🎨',
    boolean: '🔘',
    select: '📋',
    image: '🖼️',
  };
  return icons[type] || '📌';
}

export const ParameterSelector: React.FC<ParameterSelectorProps> = ({
  parameters,
  onToggle,
  onSelectAll,
  onDeselectAll,
}) => {
  const { t } = useTranslation();

  const getParameterTypeLabel = (type: string): string => {
    const key = `paramSelector.type.${type}`;
    const translated = t(key);
    return translated !== key ? translated : type;
  };

  const formatParameterValue = (param: ExportableParameter): string => {
    const { parameter, currentValue } = param;

    switch (parameter.type) {
      case 'number': {
        const value = currentValue as number;
        return parameter.unit ? `${value}${parameter.unit}` : String(value);
      }
      case 'color':
        return currentValue as string;
      case 'boolean':
        return currentValue ? t('paramSelector.booleanOn') : t('paramSelector.booleanOff');
      case 'select': {
        const selectedOption = parameter.options?.find((opt) => opt.value === currentValue);
        return selectedOption?.label || (currentValue as string);
      }
      case 'image':
        return t('paramSelector.imageValue');
      default:
        return String(currentValue);
    }
  };
  // 计算选中数量
  const exportableParams = parameters.filter((p) => p.exportable);
  const selectedCount = exportableParams.filter((p) => p.selected).length;
  const totalCount = exportableParams.length;
  const allSelected = selectedCount === totalCount && totalCount > 0;
  const noneSelected = selectedCount === 0;

  // 所有参数都可导出（包括图片类型）
  const exportableList = parameters.filter((p) => p.exportable);

  if (parameters.length === 0) {
    return (
      <div className="parameter-selector-empty">
        <p className="text-gray-400 text-sm">{t('paramSelector.empty')}</p>
      </div>
    );
  }

  return (
    <div className="parameter-selector">
      {/* 头部操作栏 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">
          {t('paramSelector.selectedCount', { selected: selectedCount, total: totalCount })}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={allSelected}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              allSelected
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-cyan-400 hover:bg-cyan-400/10'
            }`}
          >
            {t('paramSelector.selectAll')}
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            disabled={noneSelected}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              noneSelected
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-cyan-400 hover:bg-cyan-400/10'
            }`}
          >
            {t('paramSelector.deselectAll')}
          </button>
        </div>
      </div>

      {/* 可导出参数列表 */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {exportableList.map((param) => (
          <label
            key={param.parameter.id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              param.selected
                ? 'bg-cyan-500/10 border-cyan-500/30'
                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
            }`}
          >
            <input
              type="checkbox"
              checked={param.selected}
              onChange={() => onToggle(param.parameter.id)}
              className="w-4 h-4 accent-cyan-500 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base" title={getParameterTypeLabel(param.parameter.type)}>
                  {getParameterTypeIcon(param.parameter.type)}
                </span>
                <span className="font-medium text-gray-200 truncate">
                  {param.parameter.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span className="px-1.5 py-0.5 bg-gray-700/50 rounded">
                  {getParameterTypeLabel(param.parameter.type)}
                </span>
                <span className="truncate">{t('paramSelector.currentValue', { value: formatParameterValue(param) })}</span>
              </div>
            </div>
          </label>
        ))}
      </div>

    </div>
  );
};

export default ParameterSelector;
