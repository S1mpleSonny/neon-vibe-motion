import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../common';
import { DEFAULT_BASE_URL } from '../../types';
import type { LLMConfigFormData } from '../../types';

interface ConfigFormProps {
  /** 初始数据，用于编辑模式 */
  initialData?: LLMConfigFormData;
  /** 保存回调 */
  onSave: (data: LLMConfigFormData) => void;
  /** 取消回调 */
  onCancel: () => void;
  /** 是否正在保存 */
  isSaving?: boolean;
  /** 是否为编辑模式 */
  isEditing?: boolean;
}

const DEFAULT_MODEL = 'gpt-4';

/**
 * 配置表单组件
 * 用于新增或编辑 LLM 配置
 */
export function ConfigForm({
  initialData,
  onSave,
  onCancel,
  isSaving = false,
  isEditing = false,
}: ConfigFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialData?.name || '');
  const [baseURL, setBaseURL] = useState(initialData?.baseURL || DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState(initialData?.apiKey || '');
  const [model, setModel] = useState(initialData?.model || DEFAULT_MODEL);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 编辑模式时，只有 apiKey 变化才重置
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setBaseURL(initialData.baseURL);
      setApiKey(initialData.apiKey);
      setModel(initialData.model);
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t('config.form.nameRequired');
    }

    if (!baseURL.trim()) {
      newErrors.baseURL = t('config.form.baseURLRequired');
    } else {
      try {
        const url = new URL(baseURL);
        if (!['http:', 'https:'].includes(url.protocol)) {
          newErrors.baseURL = t('config.form.baseURLInvalidProtocol');
        }
      } catch {
        newErrors.baseURL = t('config.form.baseURLInvalid');
      }
    }

    if (!apiKey.trim()) {
      newErrors.apiKey = t('config.form.apiKeyRequired');
    }

    if (!model.trim()) {
      newErrors.model = t('config.form.modelRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      name: name.trim(),
      baseURL: baseURL.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    });
  };

  return (
    <div className="space-y-4">
      <Input
        label={t('config.form.name')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder={t('config.form.namePlaceholder')}
        helperText={t('config.form.nameHelper')}
      />

      <Input
        label={t('config.form.baseURL')}
        value={baseURL}
        onChange={(e) => setBaseURL(e.target.value)}
        error={errors.baseURL}
        placeholder="https://api.openai.com/v1"
        helperText={t('config.form.baseURLHelper')}
      />

      <Input
        label="API Key"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        error={errors.apiKey}
        placeholder="sk-..."
        helperText={isEditing ? t('config.form.apiKeyEditHelper') : undefined}
      />

      <Input
        label={t('config.form.model')}
        value={model}
        onChange={(e) => setModel(e.target.value)}
        error={errors.model}
        placeholder={t('config.form.modelPlaceholder')}
        helperText={t('config.form.modelHelper')}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" onClick={handleSave} loading={isSaving}>
          {isEditing ? t('config.form.save') : t('config.add')}
        </Button>
      </div>
    </div>
  );
}

export default ConfigForm;
