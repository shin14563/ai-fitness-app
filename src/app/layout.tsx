import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Fitness Squad",
  description: "Group fitness tracking powered by AI posture detection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen flex flex-col`}>
        <main className="flex-1 flex flex-col items-center w-full justify-center">
          {children}
        </main>
      </body>
    </html>
  );
}
