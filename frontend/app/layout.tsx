"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // Don't show navigation on the home page (which redirects)
  const showNavigation = pathname !== '/';

  return (
    <html lang="en">
      <head>
        <title>Atarraya App</title>
        <meta name="description" content="Sistema de ventas y gestión agrícola" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-gray-50">
          {showNavigation && <Navigation />}
          <div className={showNavigation ? "pt-4" : ""}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
