import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/appStore';
import { NumberSlider } from './NumberSlider';
import { ColorPickerControl } from './ColorPickerControl';
import { SelectDropdown } from './SelectDropdown';
import { BooleanToggle } from './BooleanToggle';
import { ImageUploader } from './ImageUploader';
import { VideoUploader } from './VideoUploader';
import { StringInput } from './StringInput';
import type { AdjustableParameter, ProcessedVideo } from '../../types';

export function ParameterPanel() {
  const { t } = useTranslation();
  const { currentMotion, updateMotionParameter, updateVideoParameter, touchConversation, saveCurrentConversation } = useAppStore();

  const handleParameterChange = useCallback(
    (parameterId: string, value: unknown) => {
      if (!currentMotion) return;

      console.log('[ParameterPanel] 参数变更:', parameterId, value);

      // 使用 store 的 updateMotionParameter 方法，只更新参数不触发重新渲染
      updateMotionParameter(parameterId, value);

      // 更新对话时间和保存 (013-history-panel)
      touchConversation();
      saveCurrentConversation();
    },
    [currentMotion, updateMotionParameter, touchConversation, saveCurrentConversation]
  );

  // 视频参数变更处理 (019-video-input-support)
  const handleVideoParameterChange = useCallback(
    (parameterId: string, value: string, videoInfo?: ProcessedVideo) => {
      if (!currentMotion) return;

      console.log('[ParameterPanel] 视频参数变更:', parameterId, videoInfo);

      // 使用专门的视频参数更新方法，会同时更新时长
      updateVideoParameter(parameterId, value, videoInfo);

      // 更新对话时间和保存
      touchConversation();
      saveCurrentConversation();
    },
    [currentMotion, updateVideoParameter, touchConversation, saveCurrentConversation]
  );

  const renderParameterControl = (param: AdjustableParameter) => {
    switch (param.type) {
      case 'number':
        return (
          <NumberSlider
            key={param.id}
            parameter={param}
            onChange={(value) => handleParameterChange(param.id, value)}
          />
        );
      case 'color':
        return (
          <ColorPickerControl
            key={param.id}
            parameter={param}
            onChange={(value) => handleParameterChange(param.id, value)}
          />
        );
      case 'select':
        return (
          <SelectDropdown
            key={param.id}
            parameter={param}
            onChange={(value) => handleParameterChange(param.id, value)}
          />
        );
      case 'boolean':
        return (
          <BooleanToggle
            key={param.id}
            parameter={param}
            onChange={(value) => handleParameterChange(param.id, value)}
          />
        );
      case 'image':
        return (
          <ImageUploader
            key={param.id}
            parameter={param}
            onChange={(value) => handleParameterChange(param.id, value)}
          />
        );
      case 'video':
        return (
          <VideoUploader
            key={param.id}
            parameter={param}
            onChange={(value, videoInfo) => handleVideoParameterChange(param.id, value, videoInfo)}
          />
        );
      case 'string':
        return (
          <StringInput
            key={param.id}
            parameter={param}
            onChange={(value) => handleParameterChange(param.id, value)}
          />
        );
      default:
        return null;
    }
  };

  if (!currentMotion || currentMotion.parameters.length === 0) {
    return (
      <div className="text-center font-body text-text-muted py-8">
        {t('panel.emptyParameters')}
      </div>
    );
  }

  return (
    <div className="space-y-1 divide-y divide-border-default/50">
      {currentMotion.parameters.map(renderParameterControl)}
    </div>
  );
}

export default ParameterPanel;
