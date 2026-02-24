/**
 * EmptyState Component
 *
 * Displayed when there are no demos in the current directory.
 */

import { useTranslation } from 'react-i18next';

export function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center px-4">
      <div className="text-6xl mb-4">🎨</div>
      <h2 className="font-display text-2xl text-text-primary mb-2">
        {t('demo.empty.title')}
      </h2>
      <p className="text-text-secondary max-w-md">
        {t('demo.empty.description')}
      </p>
    </div>
  );
}
