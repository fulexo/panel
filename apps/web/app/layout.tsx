import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../components/AuthProvider';
import ClientLayout from '../components/ClientLayout';

export const metadata: Metadata = {
  title: 'Fulexo Platform - BaseLinker Integration',
  description: 'Comprehensive self-hosted platform for managing BaseLinker integrations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
