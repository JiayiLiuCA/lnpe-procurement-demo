import type { Metadata } from "next";
import "./globals.css";
import { StoreHydrator } from "@/store/StoreHydrator";
import { ToastHost } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "流能采购 · LNPE PROCUREMENT",
  description: "绵阳流能粉体设备有限公司采购管理系统 Demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="text-ink bg-page antialiased">
        <StoreHydrator />
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
