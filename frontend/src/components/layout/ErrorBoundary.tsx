"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-6">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <h2 className="text-lg font-semibold text-gray-200">Something went wrong</h2>
          <p className="text-sm text-gray-500 max-w-md break-words">
            {this.state.error.message || "Unexpected error rendering this page."}
          </p>
          <button
            onClick={this.reset}
            className="mt-2 px-3 py-1.5 text-xs rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
