"use client";

import { logger } from "@/lib/logger";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Enhanced error logging
    const errorData = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      retryCount: this.retryCount,
      userId: this.getCurrentUserId(),
      tenantId: this.getCurrentTenantId(),
    };

    logger.error('ErrorBoundary caught an error:', errorData);
    
    // Log error to monitoring service
    if (typeof window !== 'undefined') {
      this.logErrorToService(errorData).catch((err) => {
        logger.error(err);
      });
    }

    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private async logErrorToService(errorData: Record<string, unknown>) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      });
    } catch (logError) {
      logger.error('Failed to log error to service:', logError);
    }
  }

  private getCurrentUserId(): string | null {
    try {
      const user = sessionStorage.getItem('user');
      return user ? JSON.parse(user).id : null;
    } catch {
      return null;
    }
  }

  private getCurrentTenantId(): string | null {
    try {
      const user = sessionStorage.getItem('user');
      return user ? JSON.parse(user).tenantId : null;
    } catch {
      return null;
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({ hasError: false });
    } else {
      // Reset retry count and reload page
      this.retryCount = 0;
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full bg-card shadow-lg rounded-lg p-6 border border-border">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-destructive/10 rounded-full">
              <svg
                className="w-6 h-6 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-medium text-foreground">
                Something went wrong
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We're sorry, but something unexpected happened. 
                {canRetry ? ' You can try again or refresh the page.' : ' Please refresh the page.'}
              </p>
              
              {this.state.errorId && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Error ID: {this.state.errorId}
                </p>
              )}

              <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Try Again ({this.maxRetries - this.retryCount} left)
                  </button>
                )}
                <button
                  onClick={this.handleReload}
                  className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Refresh Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Go Home
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="text-sm font-medium text-foreground cursor-pointer">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}