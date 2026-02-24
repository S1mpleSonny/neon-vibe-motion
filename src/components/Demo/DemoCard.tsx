import { useTranslation } from 'react-i18next';
import type { DemoItem } from '../../types';

interface DemoCardProps {
  demo: DemoItem;
  onPlay: (id: string) => void;
  className?: string;
}

/**
 * DemoCard component for displaying a single demo item.
 * Shows thumbnail, title, description, and play button with hover effects.
 */
export function DemoCard({ demo, onPlay, className = '' }: DemoCardProps) {
  const { t } = useTranslation();
  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onPlay(demo.id);
  };

  return (
    <div className={`group relative aspect-video bg-background-elevated rounded-xl overflow-hidden border border-border-default hover:border-accent-primary transition-all duration-200 cursor-pointer ${className}`}>
      {/* Thumbnail / Placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-background-secondary to-background-elevated flex items-center justify-center">
        {/* Play Button Overlay */}
        <button
          onClick={handlePlayClick}
          className="w-12 h-12 bg-accent-primary rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200 shadow-neon-soft"
          aria-label={t(demo.titleKey)}
        >
          <svg
            className="w-6 h-6 text-black ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>

      {/* Info Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        {demo.categoryKey && (
          <span className="text-xs font-body text-accent-primary mb-1 inline-block">
            {t(demo.categoryKey)}
          </span>
        )}
        <h3 className="font-display text-lg text-text-primary mb-1">
          {t(demo.titleKey)}
        </h3>
        <p className="font-body text-sm text-text-muted line-clamp-2">
          {t(demo.descriptionKey)}
        </p>
      </div>

      {/* Featured Badge */}
      {demo.featured && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-accent-tertiary/90 rounded-full">
          <span className="text-xs font-body text-white">Featured</span>
        </div>
      )}
    </div>
  );
}
