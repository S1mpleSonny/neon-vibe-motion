import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/appStore';
import { ASPECT_RATIOS, getAspectRatio } from '../../utils/coordinates';
import type { AspectRatioId } from '../../types';

// 霓虹风格画面比例选择器 - 确保高对比度
export function AspectRatioSelector() {
  const { t } = useTranslation();
  const { aspectRatio, setAspectRatio } = useAppStore();

  const handleSelect = (id: AspectRatioId) => {
    setAspectRatio(id);
  };

  const currentRatio = getAspectRatio(aspectRatio);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-body text-text-muted">{t('aspectRatio.label')}</span>
        <span className="text-xs font-medium font-body text-text-primary">{t(currentRatio.label)}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio.id}
            onClick={() => handleSelect(ratio.id)}
            className={`
              px-2 py-1 text-xs rounded-md border transition-colors cursor-pointer
              ${
                aspectRatio === ratio.id
                  ? 'bg-accent-primary text-black border-accent-primary shadow-neon-soft'
                  : 'bg-background-elevated text-text-muted border-border-default hover:border-accent-primary hover:text-accent-primary'
              }
            `}
            title={t(ratio.label)}
          >
            {ratio.id}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AspectRatioSelector;
