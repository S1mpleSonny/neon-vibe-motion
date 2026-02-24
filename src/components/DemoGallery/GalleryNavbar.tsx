/**
 * GalleryNavbar Component
 *
 * Navigation bar for the demo gallery with back button.
 * Fixed at top when viewing a demo.
 */

import { useTranslation } from 'react-i18next';
import { useCurrentDemo, useDemoGalleryStore } from '../../stores/demoGalleryStore';

interface GalleryNavbarProps {
  onBack?: () => void;
}

export function GalleryNavbar({ onBack }: GalleryNavbarProps) {
  const { t } = useTranslation();
  const currentDemo = useCurrentDemo();
  const { setSelectedDemo } = useDemoGalleryStore();

  const handleBack = () => {
    setSelectedDemo(null);
    // Clear URL parameter
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.pushState({}, '', url.toString());

    onBack?.();
  };

  return (
    <nav className="sticky top-16 z-40 w-full border-b border-accent-tertiary/20 bg-background-primary/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 h-14">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-secondary transition-colors text-text-primary hover:text-accent-primary"
            aria-label={t('common.back')}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm font-medium">{t('common.back')}</span>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Current demo title (when viewing) */}
          {currentDemo && (
            <div className="hidden sm:block text-sm text-text-secondary">
              {t('demo.viewing')}<span className="text-text-primary">{currentDemo.title}</span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
