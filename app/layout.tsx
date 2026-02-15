import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import DailyGuidelineTicker from "@/components/DailyGuidelineTicker";
import { Web3Provider } from "@/providers/Web3Provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HOTTasks",
  description: "Post a small task. Fund escrow. Get it solved instantly.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DailyGuidelineTicker />
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
