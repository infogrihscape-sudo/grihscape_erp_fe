import React from 'react';
import { RefreshCw } from 'lucide-react';

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <RefreshCw size={24} />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Something went wrong</h2>
          <p className="text-[12px] text-[var(--text-muted)] mt-1 max-w-sm">{this.state.message}</p>
        </div>
        <button
          onClick={() => this.setState({ hasError: false, message: '' })}
          className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-br from-[#b89047] to-[#9e7735] cursor-pointer border-0"
        >
          Try again
        </button>
      </div>
    );
  }
}
