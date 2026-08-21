// 移动壳：max-w-[390px] 居中列，独立于 PC 壳
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-page mx-auto flex min-h-dvh max-w-[390px] flex-col shadow-[0_0_0_1px_rgba(0,0,0,.04)]">{children}</div>;
}
