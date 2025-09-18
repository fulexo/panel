/**
 * @fileoverview Root Layout Component for Fulexo Web Application
 * @description This is the root layout component that wraps all pages in the application.
 * It provides global providers, theme configuration, and error boundaries.
 * @author Fulexo Team
 * @version 1.0.0
 */

// "use client"; // This should be removed for root layout

import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { AppProvider } from '@/contexts/AppContext';
import ClientLayout from '@/components/ClientLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NotificationContainer } from '@/contexts/AppContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { QueryProvider } from '@/components/QueryProvider';

// Metadata is handled by Next.js head management

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <title>Fulexo - AI-Powered File Management Platform</title>
        <meta name="description" content="Advanced file management with AI-powered features" />
      </head>
      <body className="h-full bg-background text-foreground antialiased">
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <AppProvider>
                <AuthProvider>
                  <ClientLayout>{children}</ClientLayout>
                  <NotificationContainer />
                </AuthProvider>
              </AppProvider>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
