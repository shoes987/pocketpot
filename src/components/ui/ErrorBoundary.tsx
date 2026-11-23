"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-6 sm:p-8 rounded-3xl bg-surface border border-borderMuted shadow-islandCard text-center space-y-4 max-w-lg mx-auto my-6 font-lexend">
          <div className="w-12 h-12 rounded-2xl bg-amberSurface text-brandSecondary mx-auto flex items-center justify-center text-xl font-bold shadow-xs">
            <AlertCircle className="w-6 h-6 text-brandSecondary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-primaryText">
              {this.props.fallbackTitle || "Let's puzzle this out together!"}
            </h3>
            <p className="text-xs sm:text-sm text-primaryText/70 leading-relaxed">
              {this.props.fallbackMessage ||
                "A small visual hiccup occurred while rendering this section. Your money and savings are completely safe."}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all active:scale-98"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
