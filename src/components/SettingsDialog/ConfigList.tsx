import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ConfirmDialog } from '../common';
import { ConfigItem } from './ConfigItem';
import { ConfigForm } from './ConfigForm';
import { useAppStore } from '../../stores/appStore';
import { encrypt, getOrCreateSalt, saltToBase64, decrypt } from '../../services/crypto';
import { getCryptoSalt, saveCryptoSalt } from '../../services/storage';
import { generateId } from '../../utils/id';
import type { LLMConfigItem, LLMConfigFormData, EncryptedData } from '../../types';

type ViewMode = 'list' | 'add' | 'edit';

/**
 * 配置列表组件
 * 管理多个 LLM 配置的添加、编辑、删除和切换
 */
export function ConfigList() {
  const { t } = useTranslation();
  const {
    llmConfigs,
    activeConfigId,
    isLoadingConfigs,
    addLLMConfig,
    updateLLMConfig,
    deleteLLMConfig,
    setActiveConfigId,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingConfig, setEditingConfig] = useState<LLMConfigItem | null>(null);
  const [editingFormData, setEditingFormData] = useState<LLMConfigFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LLMConfigItem | null>(null);

  // 获取或创建盐值
  const getSalt = (): Uint8Array => {
    const existingSalt = getCryptoSalt();
    const salt = getOrCreateSalt(existingSalt);
    if (!existingSalt) {
      saveCryptoSalt(saltToBase64(salt));
    }
    return salt;
  };

  // 处理添加配置
  const handleAdd = async (formData: LLMConfigFormData) => {
    setIsSaving(true);
    try {
      const salt = getSalt();
      const encryptedApiKey: EncryptedData = await encrypt(formData.apiKey, salt);

      const now = new Date().toISOString();
      const newConfig: LLMConfigItem = {
        id: generateId(),
        name: formData.name,
        baseURL: formData.baseURL,
        apiKey: encryptedApiKey,
        model: formData.model,
        createdAt: now,
        updatedAt: now,
      };

      addLLMConfig(newConfig);
      setViewMode('list');
    } catch (error) {
      console.error('[ConfigList] Failed to add config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 进入编辑模式
  const handleStartEdit = async (config: LLMConfigItem) => {
    try {
      const salt = getSalt();
      const decryptedApiKey = await decrypt(config.apiKey, salt);

      setEditingConfig(config);
      setEditingFormData({
        name: config.name,
        baseURL: config.baseURL,
        apiKey: decryptedApiKey,
        model: config.model,
      });
      setViewMode('edit');
    } catch (error) {
      console.error('[ConfigList] Failed to decrypt config for editing:', error);
      // 解密失败可能是设备变更导致，提示用户
      alert(t('config.decryptFailed'));
    }
  };

  // 处理更新配置
  const handleUpdate = async (formData: LLMConfigFormData) => {
    if (!editingConfig) return;

    setIsSaving(true);
    try {
      const salt = getSalt();

      // 检查 API Key 是否变化
      let encryptedApiKey: EncryptedData;
      if (formData.apiKey && formData.apiKey !== editingFormData?.apiKey) {
        // API Key 发生变化，重新加密
        encryptedApiKey = await encrypt(formData.apiKey, salt);
      } else {
        // 保持原有加密数据
        encryptedApiKey = editingConfig.apiKey;
      }

      updateLLMConfig(editingConfig.id, {
        name: formData.name,
        baseURL: formData.baseURL,
        apiKey: encryptedApiKey,
        model: formData.model,
      });

      setViewMode('list');
      setEditingConfig(null);
      setEditingFormData(null);
    } catch (error) {
      console.error('[ConfigList] Failed to update config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理删除配置
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteLLMConfig(deleteTarget.id);
    setDeleteTarget(null);
  };

  // 取消编辑/添加
  const handleCancel = () => {
    setViewMode('list');
    setEditingConfig(null);
    setEditingFormData(null);
  };

  // 渲染列表视图
  const renderListView = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium font-body text-text-primary">
          {t('config.title')}
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setViewMode('add')}
          disabled={isLoadingConfigs}
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('config.add')}
        </Button>
      </div>

      {isLoadingConfigs ? (
        <div className="py-8 text-center text-sm font-body text-text-muted">
          {t('config.loading')}
        </div>
      ) : llmConfigs.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm font-body text-text-muted">
            {t('config.empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {llmConfigs.map((config) => (
            <ConfigItem
              key={config.id}
              config={config}
              isActive={config.id === activeConfigId}
              onSelect={() => setActiveConfigId(config.id)}
              onEdit={() => handleStartEdit(config)}
              onDelete={() => setDeleteTarget(config)}
              disabled={isLoadingConfigs}
            />
          ))}
        </div>
      )}

      {llmConfigs.length > 0 && (
        <p className="text-xs font-body text-text-muted mt-2">
          {t('config.switchHint')}
        </p>
      )}
    </div>
  );

  // 渲染添加表单
  const renderAddView = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="!p-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <h3 className="text-sm font-medium font-body text-text-primary">
          {t('config.add')}
        </h3>
      </div>

      <ConfigForm
        onSave={handleAdd}
        onCancel={handleCancel}
        isSaving={isSaving}
      />
    </div>
  );

  // 渲染编辑表单
  const renderEditView = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="!p-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <h3 className="text-sm font-medium font-body text-text-primary">
          {t('config.edit')}
        </h3>
      </div>

      {editingFormData && (
        <ConfigForm
          initialData={editingFormData}
          onSave={handleUpdate}
          onCancel={handleCancel}
          isSaving={isSaving}
          isEditing
        />
      )}
    </div>
  );

  return (
    <>
      {viewMode === 'list' && renderListView()}
      {viewMode === 'add' && renderAddView()}
      {viewMode === 'edit' && renderEditView()}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('config.delete')}
        message={t('config.deleteConfirmMessage', { name: deleteTarget?.name })}
        confirmLabel={t('config.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

export default ConfigList;
