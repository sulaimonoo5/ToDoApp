import React from "react";
import { TriangleAlert } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-black px-4">
          <div className="max-w-md text-center space-y-4">
            <TriangleAlert className="w-12 h-12 text-amber-400 mx-auto" />
            <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
            <p className="text-zinc-400 text-sm">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <details className="text-left bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors">
                Error details
              </summary>
              <pre className="text-xs text-red-400 mt-2 whitespace-pre-wrap font-mono">
                {this.state.error?.message}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-200"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
