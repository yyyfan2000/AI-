import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI热译",
  description: "把 AI 热点翻译成你的工作机会"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
