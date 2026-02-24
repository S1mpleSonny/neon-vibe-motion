import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../config/routes';
import { useAppStore } from '../../stores/appStore';

interface NavbarProps {
  className?: string;
}

/**
 * Navbar - Fixed top navigation bar with game-style neon effects.
 * Shows logo and navigation links with active highlighting.
 */
export function Navbar({ className = '' }: NavbarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { isMobileMenuOpen, toggleMobileMenu, locale, setLocale } = useAppStore();

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 h-16 bg-background-elevated/90 backdrop-blur-md border-b border-border-default ${className}`}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="font-display text-xl text-accent-primary hover:opacity-80 transition-opacity cursor-pointer"
          style={{ textShadow: 'var(--text-glow)' }}
        >
          Neon
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {ROUTES.filter(route => route.showInNav).map(route => (
            <Link
              key={route.path}
              to={route.path}
              className={`font-body text-sm transition-all duration-200 cursor-pointer ${
                isActiveRoute(route.path)
                  ? 'text-accent-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t(route.labelKey)}
            </Link>
          ))}
          <button
            onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
            className="px-2 py-1 text-xs font-medium rounded-md border border-border-default text-text-muted hover:text-accent-primary hover:border-accent-primary transition-colors cursor-pointer"
            title={locale === 'zh' ? 'Switch to English' : '切换为中文'}
          >
            {locale === 'zh' ? 'EN' : '中'}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 text-text-muted hover:text-text-primary cursor-pointer"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-background-elevated border-b border-border-default py-4 px-4">
          <div className="flex flex-col gap-4">
            {ROUTES.filter(route => route.showInNav).map(route => (
              <Link
                key={route.path}
                to={route.path}
                onClick={toggleMobileMenu}
                className={`font-body text-sm transition-all duration-200 cursor-pointer ${
                  isActiveRoute(route.path)
                    ? 'text-accent-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {t(route.labelKey)}
              </Link>
            ))}
            <button
              onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
              className="self-start px-2 py-1 text-xs font-medium rounded-md border border-border-default text-text-muted hover:text-accent-primary hover:border-accent-primary transition-colors cursor-pointer"
            >
              {locale === 'zh' ? 'EN' : '中'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
