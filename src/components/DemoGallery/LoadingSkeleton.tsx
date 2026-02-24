/**
 * LoadingSkeleton Component
 *
 * Skeleton loading animation for demo cards.
 */

export function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg bg-surface-primary/50 ring-1 ring-accent-tertiary/20"
        >
          {/* Thumbnail skeleton */}
          <div className="aspect-video bg-surface-secondary animate-pulse" />
          {/* Title skeleton */}
          <div className="p-3 space-y-2">
            <div className="h-4 bg-surface-secondary/50 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-surface-secondary/30 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
