interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * LoadingIndicator component with game-style neon animation.
 * Shows a spinning neon circle with glow effect.
 */
export function LoadingIndicator({ size = 'md', className = '' }: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full border-t-accent-primary border-r-accent-primary border-b-transparent border-l-transparent animate-spin shadow-neon-soft`}
        style={{
          animationDuration: '1s',
        }}
      />
    </div>
  );
}

/**
 * FullPageLoading component for loading entire pages.
 * Centers the loading indicator with a dark backdrop.
 */
interface FullPageLoadingProps {
  message?: string;
  className?: string;
}

export function FullPageLoading({ message = '加载中...', className = '' }: FullPageLoadingProps) {
  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background-primary/80 backdrop-blur-sm ${className}`}>
      <LoadingIndicator size="lg" />
      {message && (
        <p className="mt-4 text-text-muted font-body animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
