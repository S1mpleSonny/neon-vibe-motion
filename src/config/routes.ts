/**
 * Route configuration for the application.
 * Defines the navigation structure and metadata for each route.
 */

export interface RouteConfig {
  /** URL path (e.g., '/', '/demos', '/preview') */
  path: string;
  /** i18n key for display name */
  labelKey: string;
  /** Icon identifier (optional, for future use) */
  icon?: string;
  /** Whether to show in navigation bar */
  showInNav: boolean;
  /** Whether route requires authentication (future use) */
  protected?: boolean;
}

/**
 * Static route configuration array.
 * Used for navigation rendering, breadcrumbs, and route validation.
 */
export const ROUTES: RouteConfig[] = [
  { path: '/', labelKey: 'nav.home', showInNav: true },
  { path: '/neon-lab', labelKey: 'nav.neonLab', showInNav: true },
  { path: '/demos', labelKey: 'nav.demos', showInNav: true },
];

/**
 * Helper function to get route config by path.
 */
export function getRouteByPath(path: string): RouteConfig | undefined {
  return ROUTES.find(route => route.path === path);
}

/**
 * Helper function to get route config by index.
 */
export function getRouteByIndex(index: number): RouteConfig | undefined {
  return ROUTES[index];
}
