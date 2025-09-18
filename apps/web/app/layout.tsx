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
        <style jsx global>{`
          :root {
            --background: 0 0% 100%;
            --foreground: 222.2 84% 4.9%;
            --card: 0 0% 100%;
            --card-foreground: 222.2 84% 4.9%;
            --popover: 0 0% 100%;
            --popover-foreground: 222.2 84% 4.9%;
            --primary: 221.2 83.2% 53.3%;
            --primary-foreground: 210 40% 98%;
            --secondary: 210 40% 96%;
            --secondary-foreground: 222.2 84% 4.9%;
            --muted: 210 40% 96%;
            --muted-foreground: 215.4 16.3% 46.9%;
            --accent: 210 40% 96%;
            --accent-foreground: 222.2 84% 4.9%;
            --destructive: 0 84.2% 60.2%;
            --destructive-foreground: 210 40% 98%;
            --border: 214.3 31.8% 91.4%;
            --input: 214.3 31.8% 91.4%;
            --ring: 221.2 83.2% 53.3%;
            --radius: 0.75rem;
            --success: 142.1 76.2% 36.3%;
            --success-foreground: 355.7 100% 97.3%;
            --warning: 32.5 94.6% 43.7%;
            --warning-foreground: 210 40% 98%;
            --info: 199.4 89.1% 48.4%;
            --info-foreground: 210 40% 98%;
          }

          .dark {
            --background: 222.2 84% 4.9%;
            --foreground: 210 40% 98%;
            --card: 222.2 84% 4.9%;
            --card-foreground: 210 40% 98%;
            --popover: 222.2 84% 4.9%;
            --popover-foreground: 210 40% 98%;
            --primary: 217.2 91.2% 59.8%;
            --primary-foreground: 222.2 84% 4.9%;
            --secondary: 217.2 32.6% 17.5%;
            --secondary-foreground: 210 40% 98%;
            --muted: 217.2 32.6% 17.5%;
            --muted-foreground: 215 20.2% 65.1%;
            --accent: 217.2 32.6% 17.5%;
            --accent-foreground: 210 40% 98%;
            --destructive: 0 62.8% 30.6%;
            --destructive-foreground: 210 40% 98%;
            --border: 217.2 32.6% 17.5%;
            --input: 217.2 32.6% 17.5%;
            --ring: 224.3 76.3% 94.1%;
            --success: 142.1 70.6% 45.3%;
            --success-foreground: 144.9 80.4% 10%;
            --warning: 32.5 94.6% 43.7%;
            --warning-foreground: 20.5 90.2% 4.3%;
            --info: 199.4 89.1% 48.4%;
            --info-foreground: 210 40% 98%;
          }
        `}</style>
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
