import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "ComicAI",
  description: "漫画创作与分镜生成平台",
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="zh-CN">
    <body className="bg-background text-foreground antialiased">
      <Providers>{children}</Providers>
    </body>
  </html>
);

export default RootLayout;
