/**
 * GalleryGrid Component
 *
 * Responsive grid layout for displaying demo effect cards.
 * Handles empty state and loading skeleton.
 */

import { useTranslation } from 'react-i18next';
import type { DemoItem } from '../../types/demo-gallery';
import { DemoCard } from './DemoCard';

interface GalleryGridProps {
  items: DemoItem[];
  isLoading?: boolean;
  onDemoClick: (demo: DemoItem) => void;
}

/**
 * Empty state component
 */
function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <div className="text-6xl mb-4">🎨</div>
      <h2 className="font-display text-2xl text-text-primary mb-2">
        {t('demo.empty.title')}
      </h2>
      <p className="text-text-secondary max-w-md">
        {t('demo.empty.descriptionShort')}
      </p>
    </div>
  );
}

/**
 * Loading skeleton component
 */
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-lg bg-surface-primary/50 ring-1 ring-accent-tertiary/20"
        >
          <div className="aspect-video bg-surface-secondary" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-surface-secondary rounded w-3/4" />
            <div className="h-3 bg-surface-secondary/50 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GalleryGrid({ items, isLoading = false, onDemoClick }: GalleryGridProps) {
  // Show loading skeleton
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Show empty state
  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {items.map((demo) => (
        <div key={demo.id} className="col-span-1">
          <DemoCard demo={demo} onClick={onDemoClick} />
        </div>
      ))}
    </div>
  );
}
