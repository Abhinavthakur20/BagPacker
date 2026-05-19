import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error("React error boundary caught an error", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
          <span className="material-symbols-outlined text-5xl text-error">error</span>
          <h1 className="mt-4 font-headline text-3xl font-black text-primary">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm text-on-surface-variant">
            Refresh the page or return home to continue.
          </p>
          <a
            href="/"
            className="mt-6 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white"
          >
            Go Home
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}
