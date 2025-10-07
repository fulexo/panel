/**
 * @fileoverview Root layout for the Fulexo fulfillment control panel.
 * @description Wraps every page with the shared providers, theme configuration,
 * application context, and global error boundary so that the dashboard renders
 * consistently across routes.
 */

// "use client"; // This should be removed for root layout

import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { AppProvider } from '@/contexts/AppContext';
import { CurrencyProvider } from '@/contexts/CurrencyProvider';
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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <title>Fulexo Fulfillment Platform</title>
        <meta
          name="description"
          content="Multi-tenant fulfillment operations with integrated WooCommerce syncing and Karrio-powered shipping tools"
        />
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
                <CurrencyProvider>
                  <AuthProvider>
                    <ClientLayout>{children}</ClientLayout>
                    <NotificationContainer />
                  </AuthProvider>
                </CurrencyProvider>
              </AppProvider>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
