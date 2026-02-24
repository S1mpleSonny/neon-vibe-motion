/**
 * DemoCard Component
 *
 * Displays a single demo effect card with thumbnail, title, and hover effects.
 * Handles image loading errors with a fallback placeholder.
 */

import { useState } from 'react';
import type { DemoItem } from '../../types/demo-gallery';
import { resolvePublicPath } from '../../config/demo-gallery';

interface DemoCardProps {
  demo: DemoItem;
  onClick: (demo: DemoItem) => void;
}

export function DemoCard({ demo, onClick }: DemoCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = () => {
    onClick(demo);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Get first letter of title for placeholder
  const placeholderLetter = demo.title.charAt(0).toUpperCase();

  return (
    <button
      onClick={handleClick}
      className="group relative w-full cursor-pointer text-left transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={{ textShadow: 'var(--glow-pink)' }}
    >
      {/* Card Container */}
      <div className="overflow-hidden rounded-lg bg-surface-primary/50 backdrop-blur-sm ring-1 ring-accent-tertiary/20 transition-shadow duration-200 group-hover:ring-accent-tertiary/50">
        {/* Thumbnail - 16:9 Aspect Ratio */}
        <div className="relative aspect-video w-full bg-surface-secondary">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 animate-pulse bg-surface-secondary" />
          )}

          {imageError ? (
            // Fallback placeholder
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 text-4xl font-display font-bold text-accent-primary">
              {placeholderLetter}
            </div>
          ) : (
            <img
              src={resolvePublicPath(demo.thumbnail)}
              alt={demo.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={handleImageError}
              onLoad={handleImageLoad}
              loading="lazy"
            />
          )}

          {/* Play button overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/20 group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/90 text-white shadow-lg">
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="p-3">
          <h3 className="truncate font-display font-medium text-text-primary group-hover:text-accent-primary">
            {demo.title}
          </h3>
          {demo.description && (
            <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
              {demo.description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
