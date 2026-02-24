/**
 * ErrorBoundary Component
 *
 * Catches React errors in demo gallery components and displays a friendly error message.
 */

import { Component, ReactNode } from 'react';
import i18n from '../../locales/i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center px-4">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="font-display text-2xl text-text-primary mb-2">
              {i18n.t('demo.error.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {i18n.t('demo.error.description')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-accent-primary text-white hover:bg-accent-primary/80 transition-colors"
            >
              {i18n.t('demo.error.refresh')}
            </button>
            {this.state.error && (
              <details className="mt-4 text-left text-sm text-text-tertiary">
                <summary className="cursor-pointer">{i18n.t('demo.error.details')}</summary>
                <pre className="mt-2 p-4 bg-surface-secondary rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
