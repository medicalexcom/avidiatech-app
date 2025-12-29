"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Client error boundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <div className="max-w-2xl mx-auto rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <div className="font-semibold">Client runtime error</div>
            <div className="mt-2 text-sm whitespace-pre-wrap">
              {this.state.error.message}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
