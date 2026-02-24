/**
 * DirectoryCard Component
 *
 * Displays a directory/folder card for organizing demo effects.
 * Visually distinct from DemoCard with folder icon styling.
 */

import type { DirectoryItem } from '../../types/demo-gallery';

interface DirectoryCardProps {
  directory: DirectoryItem;
  itemCount?: number;
  onClick: (directory: DirectoryItem) => void;
}

export function DirectoryCard({ directory, itemCount = 0, onClick }: DirectoryCardProps) {
  const handleClick = () => {
    onClick(directory);
  };

  // Use icon from config or default folder emoji
  const icon = directory.icon || '📁';

  return (
    <button
      onClick={handleClick}
      className="group relative w-full cursor-pointer text-left transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
    >
      {/* Card Container - distinct from DemoCard */}
      <div className="overflow-hidden rounded-lg bg-gradient-to-br from-surface-primary/80 to-surface-secondary/50 backdrop-blur-sm ring-1 ring-accent-secondary/30 transition-all duration-200 group-hover:ring-accent-secondary/60">
        {/* Icon Section - 16:9 Aspect Ratio to match DemoCard */}
        <div className="relative aspect-video w-full flex items-center justify-center bg-gradient-to-br from-accent-secondary/10 to-accent-primary/5">
          {/* Large Folder Icon */}
          <div className="transform transition-transform duration-300 group-hover:scale-110">
            <span className="text-6xl filter drop-shadow-lg">{icon}</span>
          </div>

          {/* Item count badge */}
          {itemCount > 0 && (
            <div className="absolute top-3 right-3 flex h-7 min-w-[28px] items-center justify-center rounded-full bg-surface-primary/90 px-2 text-sm font-medium text-text-primary shadow-md">
              {itemCount}
            </div>
          )}
        </div>

        {/* Title */}
        <div className="p-3 bg-surface-primary/50">
          <h3 className="flex items-center gap-2 truncate font-display font-medium text-text-primary group-hover:text-accent-secondary">
            <span className="text-lg">{icon}</span>
            {directory.title}
          </h3>
          {directory.description && (
            <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
              {directory.description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
