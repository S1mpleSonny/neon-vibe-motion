/**
 * DemoViewer Component
 *
 * Displays demo HTML content in an iframe with loading states and error handling.
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { DemoItem } from '../../types/demo-gallery';
import { resolvePublicPath } from '../../config/demo-gallery';

interface DemoViewerProps {
  demo: DemoItem | null;
}

export function DemoViewer({ demo }: DemoViewerProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!demo) {
      setIsLoading(true);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // Set a timeout for loading
    const loadingTimer = setTimeout(() => {
      // Still loading after 1 second - that's ok, some demos are large
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(loadingTimer);
  }, [demo]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);

    // Inject script to handle viewport height in iframe
    const iframe = iframeRef.current;
    if (iframe && iframe.contentDocument) {
      const script = iframe.contentDocument.createElement('script');
      script.textContent = `
        (function() {
          // Listen for height updates from parent
          window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'SET_CONTAINER_HEIGHT') {
              const height = event.data.height;
              // Set CSS variable for use in styles
              document.documentElement.style.setProperty('--iframe-height', height + 'px');
              // Also directly override vh units
              const style = document.createElement('style');
              style.textContent = \`
                html, body {
                  height: \${height}px !important;
                  min-height: \${height}px !important;
                }
              \`;
              document.head.appendChild(style);
            }
          });
        })();
      `;
      iframe.contentDocument.head.appendChild(script);

      // Initial height send
      if (iframe.contentWindow && containerRef.current) {
        iframe.contentWindow.postMessage(
          { type: 'SET_CONTAINER_HEIGHT', height: containerRef.current.clientHeight },
          '*'
        );
      }
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!demo) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-text-secondary">{t('demo.selectHint')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-full flex-col">
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center flex-1 bg-surface-secondary">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-text-secondary">{t('demo.loading')}</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="flex items-center justify-center flex-1 bg-surface-secondary">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="font-display text-lg text-text-primary mb-2">
              {t('demo.loadFailed')}
            </h3>
            <p className="text-text-secondary mb-4">
              {t('demo.loadFailedDescription')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-accent-primary text-white hover:bg-accent-primary/80 transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        </div>
      )}

      {/* Iframe */}
      {!hasError && !isLoading && (
        <div className="flex-1 bg-black" style={{ height: '100%' }}>
          <iframe
            ref={iframeRef}
            key={demo.id}
            src={resolvePublicPath(demo.htmlPath)}
            title={demo.title}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
