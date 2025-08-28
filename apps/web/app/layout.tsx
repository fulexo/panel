import type { Metadata } from 'next';
import './globals.css';

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
        <div className="w-full bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
            <a href="/dashboard" className="font-semibold text-white">Fulexo</a>
            <form action="/search" className="flex-1 flex items-center gap-2">
              <input name="q" placeholder="Search orders, products, customers..." className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
            </form>
            <a href="/calendar" className="text-gray-300 hover:text-white">Calendar</a>
            <a href="/billing" className="text-gray-300 hover:text-white">Billing</a>
            <a href="/inbound" className="text-gray-300 hover:text-white">Inbound</a>
            <a href="/customers" className="text-gray-300 hover:text-white">Customers</a>
            <a href="/returns" className="text-gray-300 hover:text-white">Returns</a>
            <a href="/support" className="text-gray-300 hover:text-white">Support</a>
            <a href="/tenants" className="text-gray-300 hover:text-white">Tenants</a>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}