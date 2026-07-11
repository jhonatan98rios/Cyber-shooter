import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cybershot",
  description: "FPS prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0 overflow-hidden">{children}</body>
    </html>
  );
}
