/**
 * Demo Gallery Store
 *
 * Zustand store for managing demo gallery state.
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  DemoGalleryItem,
  DemoItem,
  GalleryViewMode,
  NavigationHistory,
} from '../types/demo-gallery';

/**
 * Demo Gallery Store State
 */
interface DemoGalleryState {
  // Current view state
  currentDirectoryId: string | null;
  selectedDemoId: string | null;
  viewMode: GalleryViewMode;

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Data (loaded from config)
  items: DemoGalleryItem[];

  // Navigation history for back button
  navigationHistory: NavigationHistory;

  // Scroll position preservation
  scrollPosition: number;
}

/**
 * Demo Gallery Store Actions
 */
interface DemoGalleryActions {
  // Data management
  setItems: (items: DemoGalleryItem[]) => void;

  // Navigation actions
  setCurrentDirectory: (directoryId: string | null) => void;
  setSelectedDemo: (demoId: string | null) => void;
  setViewMode: (mode: GalleryViewMode) => void;

  // History navigation
  pushToHistory: (directoryId: string) => void;
  goBack: () => void;

  // Loading and error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Scroll position
  setScrollPosition: (position: number) => void;
}

/**
 * Combined store type
 */
type DemoGalleryStore = DemoGalleryState & DemoGalleryActions;

/**
 * Create and export the demo gallery store
 */
export const useDemoGalleryStore = create<DemoGalleryStore>()(
  devtools(
    (set) => ({
      // Initial state
      currentDirectoryId: null,
      selectedDemoId: null,
      viewMode: 'grid',
      isLoading: false,
      error: null,
      items: [],
      navigationHistory: {
        history: [],
        currentIndex: -1,
      },
      scrollPosition: 0,

      // Data management
      setItems: (items) => set({ items }),

      // Navigation actions
      setCurrentDirectory: (directoryId) =>
        set({ currentDirectoryId: directoryId, viewMode: 'grid', selectedDemoId: null }),

      setSelectedDemo: (demoId) =>
        set({ selectedDemoId: demoId, viewMode: demoId ? 'detail' : 'grid' }),

      setViewMode: (mode) => set({ viewMode: mode }),

      // History navigation
      pushToHistory: (directoryId) =>
        set((state) => {
          const newHistory = [
            ...state.navigationHistory.history.slice(0, state.navigationHistory.currentIndex + 1),
            directoryId,
          ];
          return {
            navigationHistory: {
              history: newHistory,
              currentIndex: newHistory.length - 1,
            },
          };
        }),

      goBack: () =>
        set((state) => {
          if (state.navigationHistory.currentIndex <= 0) {
            // Go to root
            return {
              currentDirectoryId: null,
              navigationHistory: { history: [], currentIndex: -1 },
            };
          }
          const prevIndex = state.navigationHistory.currentIndex - 1;
          const prevDirectoryId = state.navigationHistory.history[prevIndex];
          return {
            currentDirectoryId: prevDirectoryId,
            navigationHistory: {
              ...state.navigationHistory,
              currentIndex: prevIndex,
            },
          };
        }),

      // Loading and error
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Scroll position
      setScrollPosition: (position) => set({ scrollPosition: position }),
    }),
    { name: 'DemoGalleryStore' }
  )
);

/**
 * Get all demo items (root level only)
 */
export const useCurrentDemos = (): DemoItem[] => {
  const items = useDemoGalleryStore((state) => state.items);
  return useMemo(
    () =>
      items
        .filter((item) => item.type === 'demo' && item.parentId === null)
        .sort((a, b) => a.order - b.order) as DemoItem[],
    [items]
  );
};

/**
 * Get current demo (if viewing)
 */
export const useCurrentDemo = (): DemoItem | null => {
  const items = useDemoGalleryStore((state) => state.items);
  const selectedDemoId = useDemoGalleryStore((state) => state.selectedDemoId);
  return useMemo(() => {
    if (!selectedDemoId) return null;
    return items.find(
      (item) => item.id === selectedDemoId && item.type === 'demo'
    ) as DemoItem | null;
  }, [items, selectedDemoId]);
};

/**
 * Get demo by ID
 */
export const useDemoById = (id: string): DemoItem | null => {
  const items = useDemoGalleryStore((state) => state.items);
  return useMemo(
    () => items.find((item) => item.id === id && item.type === 'demo') as DemoItem | null,
    [items, id]
  );
};
