"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
          <Card className="max-w-md bg-red-500/10 border-red-500/50 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-red-400 mb-2">
              Something went wrong
                </h2>
                <p className="text-red-300 text-sm mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
              </div>
            </div>
              <Button
              onClick={this.handleReset}
                variant="outline"
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
              >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
              </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
