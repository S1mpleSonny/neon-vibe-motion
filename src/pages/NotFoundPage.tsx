import { PageTransition } from '../components/common/PageTransition';
import { Navbar } from '../components/Navigation/Navbar';
import { Link } from 'react-router-dom';

/**
 * NotFoundPage - 404 error page.
 * Shown when user navigates to a non-existent route.
 */
export function NotFoundPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-16">
          <h1 className="font-display text-8xl md:text-9xl text-accent-primary mb-4" style={{ textShadow: 'var(--glow-medium)' }}>
            404
          </h1>
          <h2 className="font-display text-2xl md:text-3xl text-text-primary mb-4">
            页面未找到
          </h2>
          <p className="font-body text-text-muted mb-8 text-center">
            您访问的页面不存在或已被移除
          </p>
          <Link
            to="/"
            className="px-6 py-2.5 bg-accent-primary text-black rounded-lg font-medium cursor-pointer hover:bg-accent-primary/90 transition-all duration-200 inline-block"
          >
            返回首页
          </Link>
        </main>
      </div>
    </PageTransition>
  );
}
