/**
 * DemoPage - Gallery of demo effects
 *
 * Displays demo cards in a grid layout.
 * Click card to view demo in iframe.
 */

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageTransition } from '../components/common/PageTransition';
import { Navbar } from '../components/Navigation/Navbar';
import { GalleryGrid } from '../components/DemoGallery/GalleryGrid';
import { DemoViewer } from '../components/DemoGallery/DemoViewer';
import { GalleryNavbar } from '../components/DemoGallery/GalleryNavbar';
import {
  useDemoGalleryStore,
  useCurrentDemos,
  useCurrentDemo,
} from '../stores/demoGalleryStore';
import { loadConfig } from '../config/demo-gallery';
import type { DemoItem } from '../types/demo-gallery';

/**
 * DemoPage Component
 */
export function DemoPage() {
  const [searchParams] = useSearchParams();
  const demoId = searchParams.get('id');

  const {
    isLoading,
    error,
    viewMode,
    setSelectedDemo,
    setError,
    setItems,
    setLoading,
    scrollPosition,
    setScrollPosition,
  } = useDemoGalleryStore();

  const currentDemos = useCurrentDemos();
  const currentDemo = useCurrentDemo();
  const mainRef = useRef<HTMLDivElement>(null);

  // Load configuration on mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const config = await loadConfig();
        setItems(config.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load demos');
      } finally {
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle URL parameter for demo viewing
  useEffect(() => {
    if (demoId) {
      setSelectedDemo(demoId);
    } else {
      setSelectedDemo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoId]);

  // Restore scroll position when returning to grid view
  useEffect(() => {
    if (!demoId && scrollPosition > 0 && mainRef.current && viewMode === 'grid') {
      mainRef.current.scrollTop = scrollPosition;
    }
  }, [demoId, scrollPosition, viewMode]);

  // Save scroll position before navigating away
  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current && !demoId && viewMode === 'grid') {
        setScrollPosition(mainRef.current.scrollTop);
      }
    };

    const container = mainRef.current;
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoId, viewMode]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const newDemoId = params.get('id');
      if (!newDemoId) {
        setSelectedDemo(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDemoClick = (demo: DemoItem) => {
    setSelectedDemo(demo.id);
    // Update URL without navigating
    const url = new URL(window.location.href);
    url.searchParams.set('id', demo.id);
    window.history.pushState({}, '', url.toString());
  };

  const handleBackFromDemo = () => {
    setSelectedDemo(null);
    // Clear URL parameter
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.pushState({}, '', url.toString());
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background-primary">
        {/* Main Navigation - always visible */}
        <Navbar />

        {/* Demo Viewing Mode */}
        {viewMode === 'detail' && currentDemo && (
          <div className="fixed inset-0 z-50 pt-16">
            <GalleryNavbar onBack={handleBackFromDemo} />
            <div className="h-[calc(100vh-8rem)]">
              <DemoViewer demo={currentDemo} />
            </div>
          </div>
        )}

        {/* Gallery Grid Mode */}
        <main
          ref={mainRef}
          className={`pt-24 px-4 pb-8 transition-all ${
            viewMode === 'detail' ? 'opacity-0 pointer-events-none' : ''
          }`}
        >
          <div className="max-w-7xl mx-auto">
            {/* Error State */}
            {error && (
              <div className="mb-8 rounded-lg bg-red-500/10 border border-red-500/30 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="font-display font-medium text-text-primary">
                      加载失败
                    </h3>
                    <p className="text-sm text-text-secondary mt-1">{error}</p>
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="ml-auto px-4 py-2 rounded-lg bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary transition-colors"
                  >
                    重试
                  </button>
                </div>
              </div>
            )}

            {/* Header */}
            {!error && (
              <>
                <div className="mb-8 mt-6">
                  <h1 className="font-display text-3xl md:text-4xl text-text-primary mb-2">
                    效果Demo
                  </h1>
                  <p
                    className="font-display text-accent-tertiary"
                    style={{ textShadow: 'var(--glow-pink)' }}
                  >
                    探索各种精彩的动画效果Demo
                  </p>
                </div>

                {/* Gallery Grid */}
                <GalleryGrid
                  items={currentDemos}
                  isLoading={isLoading}
                  onDemoClick={handleDemoClick}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
