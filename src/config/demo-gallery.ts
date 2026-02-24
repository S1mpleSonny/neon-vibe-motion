/**
 * Demo Gallery Configuration Loader
 *
 * Handles loading and validation of the demo gallery JSON configuration.
 */

import i18n from '../locales/i18n';
import type {
  DemoGalleryConfig,
  DemoGalleryItem,
  DemoItem,
  DirectoryItem,
} from '../types/demo-gallery';

/**
 * Resolve a public asset path relative to Vite's base URL.
 */
export function resolvePublicPath(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/+$/, '')}${path}`;
}

const CONFIG_PATH = '/demos/config.json';

/**
 * Configuration cache
 */
let cachedConfig: DemoGalleryConfig | null = null;

/**
 * Load the demo gallery configuration from JSON file
 */
export async function loadConfig(forceReload = false): Promise<DemoGalleryConfig> {
  if (cachedConfig && !forceReload) {
    return cachedConfig;
  }

  try {
    const response = await fetch(resolvePublicPath(CONFIG_PATH));
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
    }

    const config: DemoGalleryConfig = await response.json();

    // Validate the config
    validateConfig(config);

    cachedConfig = config;
    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`ConfigLoadError: ${error.message}`);
    }
    throw new Error('ConfigLoadError: Unknown error');
  }
}

/**
 * Validate the configuration structure
 */
export function validateConfig(config: DemoGalleryConfig): void {
  if (!config.version) {
    throw new Error('Invalid config: missing version');
  }

  if (!Array.isArray(config.items) || config.items.length === 0) {
    throw new Error('Invalid config: items must be a non-empty array');
  }

  if (config.items.length > 100) {
    throw new Error('Invalid config: too many items (max 100)');
  }

  // Check for circular references and max depth
  const maxDepth = 2;
  const visited = new Set<string>();

  function checkDepth(itemId: string | null, depth: number): void {
    if (itemId === null) return;
    if (depth > maxDepth) {
      throw new Error(`Invalid config: directory depth exceeds ${maxDepth}`);
    }
    if (visited.has(itemId)) {
      throw new Error(`Invalid config: circular reference detected at item ${itemId}`);
    }

    visited.add(itemId);
    const item = config.items.find((i) => i.id === itemId);
    if (item && item.type === 'directory') {
      checkDepth(item.parentId, depth + 1);
    }
    visited.delete(itemId);
  }

  // Validate each item
  const itemIds = new Set<string>();

  for (const item of config.items) {
    // Check unique IDs
    if (itemIds.has(item.id)) {
      throw new Error(`Invalid config: duplicate item id ${item.id}`);
    }
    itemIds.add(item.id);

    // Validate ID format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(item.id)) {
      throw new Error(`Invalid config: invalid id format ${item.id}`);
    }

    // Validate title
    if (!item.title || item.title.length < 1 || item.title.length > 50) {
      throw new Error(`Invalid config: invalid title for item ${item.id}`);
    }

    // Validate parentId exists
    if (item.parentId !== null) {
      const parentExists = config.items.some((i) => i.id === item.parentId);
      if (!parentExists) {
        throw new Error(`Invalid config: parent directory ${item.parentId} not found for item ${item.id}`);
      }
    }

    // Type-specific validation
    if (item.type === 'demo') {
      const demo = item as DemoItem;
      if (!demo.thumbnail || !demo.thumbnail.startsWith('/demos/thumbnails/')) {
        throw new Error(`Invalid config: invalid thumbnail path for demo ${item.id}`);
      }
      const htmlPathPattern = /^\/demos\/html\/.+\.html$/;
      if (!demo.htmlPath || !htmlPathPattern.test(demo.htmlPath)) {
        throw new Error(`Invalid config: invalid html path for demo ${item.id}`);
      }
    }

    // Check depth from root
    checkDepth(item.id, 0);
  }
}

/**
 * Get items by parent directory ID
 */
export function getItemsByParentId(config: DemoGalleryConfig, parentId: string | null): DemoGalleryItem[] {
  return config.items.filter((item) => item.parentId === parentId).sort((a, b) => a.order - b.order);
}

/**
 * Get demo by ID
 */
export function getDemoById(config: DemoGalleryConfig, id: string): DemoItem | null {
  const item = config.items.find((i) => i.id === id);
  return item && item.type === 'demo' ? (item as DemoItem) : null;
}

/**
 * Get directory by ID
 */
export function getDirectoryById(config: DemoGalleryConfig, id: string): DirectoryItem | null {
  const item = config.items.find((i) => i.id === id);
  return item && item.type === 'directory' ? (item as DirectoryItem) : null;
}

/**
 * Get all directories
 */
export function getDirectories(config: DemoGalleryConfig): DirectoryItem[] {
  return config.items.filter((item) => item.type === 'directory') as DirectoryItem[];
}

/**
 * Get breadcrumbs for a directory
 */
export interface BreadcrumbItem {
  id: string | null;
  title: string;
}

export function getBreadcrumbs(config: DemoGalleryConfig, directoryId: string | null): BreadcrumbItem[] {
  if (directoryId === null) {
    return [{ id: null, title: i18n.t('gallery.all') }];
  }

  const breadcrumbs: BreadcrumbItem[] = [{ id: null, title: i18n.t('gallery.all') }];
  let currentId: string | null = directoryId;

  while (currentId !== null) {
    const item = config.items.find((i) => i.id === currentId);
    if (!item) break;
    breadcrumbs.push({ id: item.id, title: item.title });
    currentId = item.parentId;
  }

  return breadcrumbs;
}

/**
 * Clear cached config (useful for testing or forcing reload)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}
