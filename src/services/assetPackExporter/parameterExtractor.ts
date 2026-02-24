/**
 * 参数提取服务
 * 从 MotionDefinition 提取可导出参数
 * @module services/assetPackExporter/parameterExtractor
 */

import type {
  MotionDefinition,
  AdjustableParameter,
  ExportableParameter,
  ParameterControlConfig,
  ParameterControlType,
} from '../../types';

/**
 * 从动效定义中提取所有可导出参数
 * @param motion 动效定义
 * @returns 可导出参数列表
 */
export function extractExportableParameters(motion: MotionDefinition): ExportableParameter[] {
  if (!motion.parameters || motion.parameters.length === 0) {
    return [];
  }

  return motion.parameters.map((param) => ({
    parameter: param,
    selected: isParameterExportable(param), // 可导出的参数默认选中
    path: param.path,
    currentValue: getCurrentParameterValue(param),
    exportable: isParameterExportable(param),
  }));
}

/**
 * 判断参数是否可导出
 * 所有参数类型都支持导出（包括 image 类型）
 */
export function isParameterExportable(_param: AdjustableParameter): boolean {
  // 所有参数类型都支持导出
  void _param; // 明确忽略未使用的参数
  return true;
}

/**
 * 获取参数当前值
 */
export function getCurrentParameterValue(param: AdjustableParameter): number | string | boolean {
  switch (param.type) {
    case 'number':
      return param.value ?? param.min ?? 0;
    case 'color':
      return param.colorValue ?? '#000000';
    case 'boolean':
      return param.boolValue ?? false;
    case 'select':
      return param.selectedValue ?? param.options?.[0]?.value ?? '';
    case 'image':
      return param.imageValue ?? param.placeholderImage ?? '';
    case 'video':
      return param.videoValue ?? param.placeholderVideo ?? '';
    case 'string':
      return param.stringValue ?? '';
    default:
      return '';
  }
}

/**
 * 将参数类型映射到控件类型
 */
export function getControlType(paramType: AdjustableParameter['type']): ParameterControlType {
  switch (paramType) {
    case 'number':
      return 'slider';
    case 'color':
      return 'color';
    case 'boolean':
      return 'toggle';
    case 'select':
      return 'select';
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'string':
      return 'text';
    default:
      return 'slider';
  }
}

/**
 * 从可导出参数生成参数控件配置
 * @param exportableParams 可导出参数列表
 * @returns 参数控件配置列表
 */
export function generateParameterControlConfigs(
  exportableParams: ExportableParameter[]
): ParameterControlConfig[] {
  return exportableParams
    .filter((ep) => ep.selected && ep.exportable)
    .map((ep) => {
      const param = ep.parameter;
      const config: ParameterControlConfig = {
        id: param.id,
        label: param.name,
        controlType: getControlType(param.type),
        initialValue: ep.currentValue,
        path: ep.path,
      };

      // 数值类型添加额外配置
      if (param.type === 'number') {
        config.numberConfig = {
          min: param.min ?? 0,
          max: param.max ?? 100,
          step: param.step ?? 1,
          unit: param.unit,
        };
      }

      // 选择类型添加选项配置
      if (param.type === 'select' && param.options) {
        config.selectConfig = {
          options: param.options.map((opt) => ({
            value: opt.value,
            label: opt.label,
          })),
        };
      }

      return config;
    });
}

/**
 * 根据选中的参数 ID 过滤可导出参数
 * @param allParams 所有可导出参数
 * @param selectedIds 选中的参数 ID 列表
 * @returns 更新后的可导出参数列表
 */
export function updateParameterSelection(
  allParams: ExportableParameter[],
  selectedIds: string[]
): ExportableParameter[] {
  return allParams.map((ep) => ({
    ...ep,
    selected: ep.exportable && selectedIds.includes(ep.parameter.id),
  }));
}

/**
 * 获取所有选中的参数 ID
 */
export function getSelectedParameterIds(params: ExportableParameter[]): string[] {
  return params
    .filter((ep) => ep.selected && ep.exportable)
    .map((ep) => ep.parameter.id);
}

/**
 * 全选所有可导出参数
 */
export function selectAllParameters(params: ExportableParameter[]): ExportableParameter[] {
  return params.map((ep) => ({
    ...ep,
    selected: ep.exportable,
  }));
}

/**
 * 取消全选
 */
export function deselectAllParameters(params: ExportableParameter[]): ExportableParameter[] {
  return params.map((ep) => ({
    ...ep,
    selected: false,
  }));
}

/**
 * 切换单个参数的选中状态
 */
export function toggleParameter(
  params: ExportableParameter[],
  parameterId: string
): ExportableParameter[] {
  return params.map((ep) => {
    if (ep.parameter.id === parameterId && ep.exportable) {
      return {
        ...ep,
        selected: !ep.selected,
      };
    }
    return ep;
  });
}
