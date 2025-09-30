import {
  inter,
  jetbrains,
  noto,
  ubuntu,
  oxygen,
} from "@karrio/ui/fonts/font";
import { ErrorBoundary } from "@karrio/ui/core/components/error-boudaries";
import { Toaster } from "@karrio/ui/components/ui/toaster";
import { Providers } from "@karrio/console/hooks/providers";
import { PublicEnvScript } from "next-runtime-env";
import { auth } from "@karrio/console/apis/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Karrio Platform",
  description: "Karrio Platform",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const props = {
    session: await auth(),
  };

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} ${noto.variable} ${ubuntu.variable} ${oxygen.variable}`}
    >
      <head>
        <PublicEnvScript />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <ErrorBoundary>
          <Providers {...props}>{children}</Providers>
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  );
}
