import type { DemoItem } from '../../types';
import { DemoCard } from './DemoCard';

interface DemoListProps {
  demos: DemoItem[];
  onPlay: (id: string) => void;
  className?: string;
}

/**
 * DemoList component - Responsive grid of demo cards.
 * Displays demos in a masonry-style grid layout.
 */
export function DemoList({ demos, onPlay, className = '' }: DemoListProps) {
  if (demos.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="font-body text-text-muted mb-4">
          暂无Demo内容
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
      {demos.map((demo) => (
        <DemoCard
          key={demo.id}
          demo={demo}
          onPlay={onPlay}
        />
      ))}
    </div>
  );
}

/**
 * FeaturedDemoList component - Shows only featured demos.
 */
interface FeaturedDemoListProps {
  demos: DemoItem[];
  onPlay: (id: string) => void;
  className?: string;
}

export function FeaturedDemoList({ demos, onPlay, className = '' }: FeaturedDemoListProps) {
  const featuredDemos = demos.filter(demo => demo.featured);

  if (featuredDemos.length === 0) {
    return null;
  }

  return (
    <section className={`mb-12 ${className}`}>
      <h2 className="font-display text-2xl text-text-primary mb-6">
        精选Demo
      </h2>
      <DemoList demos={featuredDemos} onPlay={onPlay} />
    </section>
  );
}
