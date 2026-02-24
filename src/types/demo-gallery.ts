/**
 * Demo Gallery Types
 *
 * Type definitions for the demo gallery feature.
 * Matches the JSON schema in specs/039-effect-demo-gallery/contracts/demo-config.schema.json
 */

/**
 * Base gallery item - can be either a demo or a directory
 */
export interface DemoGalleryItem {
  id: string;
  type: 'demo' | 'directory';
  title: string;
  parentId: string | null;
  order: number;
}

/**
 * Demo item - represents a viewable demo effect
 */
export interface DemoItem extends DemoGalleryItem {
  type: 'demo';
  thumbnail: string;
  htmlPath: string;
  description?: string;
  tags?: string[];
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Directory item - a container for organizing demos
 */
export interface DirectoryItem extends DemoGalleryItem {
  type: 'directory';
  description?: string;
  icon?: string;
}

/**
 * Root configuration structure from JSON file
 */
export interface DemoGalleryConfig {
  version: string;
  items: DemoGalleryItem[];
}

/**
 * Type guard for demo items
 */
export function isDemoItem(item: DemoGalleryItem): item is DemoItem {
  return item.type === 'demo';
}

/**
 * Type guard for directory items
 */
export function isDirectoryItem(item: DemoGalleryItem): item is DirectoryItem {
  return item.type === 'directory';
}

/**
 * Breadcrumb navigation item
 */
export interface BreadcrumbItem {
  id: string | null;
  title: string;
}

/**
 * View mode for the gallery
 */
export type GalleryViewMode = 'grid' | 'detail';

/**
 * Gallery view state
 */
export interface GalleryViewState {
  currentDirectoryId: string | null;
  selectedDemoId: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  viewMode: GalleryViewMode;
}

/**
 * Navigation history state
 */
export interface NavigationHistory {
  history: string[];
  currentIndex: number;
}
