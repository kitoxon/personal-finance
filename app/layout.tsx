import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeColorUpdater from "@/components/ThemeColorUpdater";
import AppProviders from "@/components/AppProviders";
import GlobalHeader from "@/components/GlobalHeader";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Personal Finance Tracker",
  description: "Track your expenses, income, and debts",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <AppProviders>
          <ThemeColorUpdater />
          <div className="relative flex min-h-screen flex-col">
            <GlobalHeader />
            <main className="flex-1">
              {children}
            </main>
            <Navigation />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
