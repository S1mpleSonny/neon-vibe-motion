import { Link, useLocation } from 'react-router-dom';
import type { BreadcrumbItem as BreadcrumbItemType } from '../../types';

interface BreadcrumbProps {
  items?: BreadcrumbItemType[];
  className?: string;
}

/**
 * Breadcrumb component for navigation trail.
 * Automatically generates breadcrumbs based on current route,
 * or uses custom items if provided.
 */
export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const location = useLocation();

  // Auto-generate breadcrumbs from route if not provided
  const breadcrumbItems: BreadcrumbItemType[] = items || generateBreadcrumbs(location.pathname);

  // Don't show breadcrumbs on home page
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-sm ${className}`}>
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <span className="text-text-muted">/</span>
          )}
          {item.path ? (
            <Link
              to={item.path}
              className="font-body text-text-muted hover:text-accent-primary transition-colors cursor-pointer"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-body text-text-primary">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}

/**
 * Generate breadcrumb items from a path.
 */
function generateBreadcrumbs(pathname: string): BreadcrumbItemType[] {
  const pathSegments = pathname.split('/').filter(Boolean);

  const items: BreadcrumbItemType[] = [
    { label: '首页', path: '/' },
  ];

  let currentPath = '';
  const routeLabels: Record<string, string> = {
    demos: '效果Demo',
    preview: '动效预览窗口',
  };

  for (const segment of pathSegments) {
    currentPath += `/${segment}`;
    items.push({
      label: routeLabels[segment] || segment,
      path: currentPath,
    });
  }

  // Mark the last item as current (no path)
  if (items.length > 0) {
    items[items.length - 1].path = undefined;
  }

  return items;
}
