import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Suspense } from "react";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import NavbarWrapper from "@/components/NavbarWrapper";
import TopProgressBar from "@/components/TopProgressBar";
import ThemeProvider from "@/components/ThemeProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Python 答题平台",
  description: "在线 Python 答题平台，支持考试模式与练习模式",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <ThemeProvider>
          <SessionProviderWrapper>
            <Suspense fallback={null}>
              <TopProgressBar />
            </Suspense>
            <NavbarWrapper />
            <main>{children}</main>
          </SessionProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
