import { useTranslation } from 'react-i18next';
import { PageTransition } from '../components/common/PageTransition';
import { Navbar } from '../components/Navigation/Navbar';
import { NAVIGATION_ENTRIES } from '../config/navigation';
import { Link } from 'react-router-dom';
import type { NavigationEntry } from '../types';
import { FireworksOverlay } from '../components/FireworksOverlay';

/**
 * HomePage - Entry point for the application.
 * Displays navigation entry cards for different features.
 */
export function HomePage() {
  const { t } = useTranslation();
  return (
    <PageTransition>
      <div className="min-h-screen bg-background-primary">
        <Navbar />
        <FireworksOverlay />
        <main className="pt-16 px-4 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="text-center py-12">
              <h1 className="font-display text-4xl md:text-6xl text-accent-primary mb-4" style={{ textShadow: 'var(--text-glow)' }}>
                Neon
              </h1>
              <p className="font-body text-text-muted text-lg md:text-xl">
                {t('nav.heroSubtitle')}
              </p>
            </div>

            {/* Entry Cards Grid - 2x2 layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {NAVIGATION_ENTRIES.map((entry: NavigationEntry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}

interface EntryCardProps {
  entry: NavigationEntry;
}

function EntryCard({ entry }: EntryCardProps) {
  const { t } = useTranslation();
  const isPlanning = entry.status === 'planning';

  const colorStyles = {
    cyan: isPlanning
      ? 'hover:border-accent-primary hover:bg-accent-primary/5 hover:shadow-neon-soft'
      : 'hover:border-accent-primary hover:shadow-neon-soft group-hover:shadow-neon-medium',
    magenta: isPlanning
      ? 'hover:border-accent-tertiary hover:bg-accent-tertiary/5 hover:shadow-neon-pink'
      : 'hover:border-accent-tertiary hover:shadow-neon-pink',
    purple: isPlanning
      ? 'hover:border-accent-secondary hover:bg-accent-secondary/5 hover:shadow-neon-purple'
      : 'hover:border-accent-secondary hover:shadow-neon-purple',
    green: isPlanning
      ? 'hover:border-accent-success hover:bg-accent-success/5 hover:shadow-neon-green'
      : 'hover:border-accent-success hover:shadow-neon-green',
  };

  const iconStyles = {
    cyan: 'text-accent-primary',
    magenta: 'text-accent-tertiary',
    purple: 'text-accent-secondary',
    green: 'text-accent-success',
  };

  // Lab icons
  const labIcons: Record<string, string> = {
    'neon-lab': '🎬',
    'neon-studio': '🌌',
  };

  const cardContent = (
    <>
      <div className={`text-5xl mb-4 ${iconStyles[entry.colorScheme]}`}>
        {labIcons[entry.id] || entry.icon || '⚡'}
      </div>
      <h3 className={`font-display text-2xl mb-2 ${isPlanning ? 'text-text-muted' : 'text-text-primary group-hover:text-accent-primary'} transition-colors`}>
        {entry.title}
      </h3>
      <p className="font-body text-text-muted text-sm">
        {t(entry.descriptionKey)}
      </p>
      {/* Status Badge */}
      {isPlanning && (
        <span className="absolute top-4 right-4 px-2 py-0.5 text-xs font-mono font-bold text-text-muted border border-text-muted/30 rounded bg-text-muted/10">
          Planning
        </span>
      )}
      {!isPlanning && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-accent-primary text-sm font-body">→</span>
        </div>
      )}
    </>
  );

  const baseClasses = `group relative min-h-[200px] p-8 rounded-xl border border-border-default bg-gradient-to-br from-background-secondary to-background-elevated transition-all duration-200 ${colorStyles[entry.colorScheme]}`;

  if (isPlanning) {
    return (
      <div className={baseClasses}>
        {cardContent}
      </div>
    );
  }

  return (
    <Link to={entry.route} className={`${baseClasses} cursor-pointer hover:scale-[1.02]`}>
      {cardContent}
    </Link>
  );
}
