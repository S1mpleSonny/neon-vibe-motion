import type { DemoItem } from '../types';

/**
 * Static demo items configuration.
 * These are placeholder demos for the demo gallery page.
 * In the future, this could be populated from actual saved motions.
 *
 * title/description/category use i18n keys, resolved at render time.
 */
export const DEMO_ITEMS: DemoItem[] = [
  {
    id: 'demo-particle-burst',
    titleKey: 'demos.particleBurst.title',
    descriptionKey: 'demos.particleBurst.description',
    thumbnail: '/thumbnails/particle-burst.jpg',
    previewConfig: {
      id: 'preview-particle-burst',
      renderMode: 'canvas',
      duration: 3000,
      width: 1280,
      height: 720,
      backgroundColor: '#0A0A0F',
      elements: [],
      parameters: [],
      code: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    categoryKey: 'demos.particleBurst.category',
    featured: true,
  },
  {
    id: 'demo-wave-motion',
    titleKey: 'demos.waveMotion.title',
    descriptionKey: 'demos.waveMotion.description',
    thumbnail: '/thumbnails/wave-motion.jpg',
    previewConfig: {
      id: 'preview-wave-motion',
      renderMode: 'canvas',
      duration: 5000,
      width: 1280,
      height: 720,
      backgroundColor: '#0A0A0F',
      elements: [],
      parameters: [],
      code: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    categoryKey: 'demos.waveMotion.category',
    featured: false,
  },
  {
    id: 'demo-geometric-shapes',
    titleKey: 'demos.geometricShapes.title',
    descriptionKey: 'demos.geometricShapes.description',
    thumbnail: '/thumbnails/geometric-shapes.jpg',
    previewConfig: {
      id: 'preview-geometric-shapes',
      renderMode: 'canvas',
      duration: 4000,
      width: 1280,
      height: 720,
      backgroundColor: '#0A0A0F',
      elements: [],
      parameters: [],
      code: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    categoryKey: 'demos.geometricShapes.category',
    featured: true,
  },
  {
    id: 'demo-text-reveal',
    titleKey: 'demos.textReveal.title',
    descriptionKey: 'demos.textReveal.description',
    thumbnail: '/thumbnails/text-reveal.jpg',
    previewConfig: {
      id: 'preview-text-reveal',
      renderMode: 'canvas',
      duration: 2500,
      width: 1280,
      height: 720,
      backgroundColor: '#0A0A0F',
      elements: [],
      parameters: [],
      code: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    categoryKey: 'demos.textReveal.category',
    featured: false,
  },
];

/**
 * Get demo item by ID.
 */
export function getDemoById(id: string): DemoItem | undefined {
  return DEMO_ITEMS.find(demo => demo.id === id);
}

/**
 * Get featured demos.
 */
export function getFeaturedDemos(): DemoItem[] {
  return DEMO_ITEMS.filter(demo => demo.featured);
}

/**
 * Get demos by category key.
 */
export function getDemosByCategory(categoryKey: string): DemoItem[] {
  return DEMO_ITEMS.filter(demo => demo.categoryKey === categoryKey);
}

/**
 * Get all unique category keys.
 */
export function getCategories(): string[] {
  const categories = new Set(DEMO_ITEMS.map(demo => demo.categoryKey).filter((c): c is string => Boolean(c)));
  return Array.from(categories);
}
