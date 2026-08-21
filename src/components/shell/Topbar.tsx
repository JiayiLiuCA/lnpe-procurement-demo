import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

/** 内容区顶栏 56px：返回箭头（可选）+ 面包屑/页标题 + 页面级动作按钮插槽 + 头像 */
export function Topbar({ crumbs, actions, backHref }: { crumbs: ReactNode; actions?: ReactNode; backHref?: string }) {
  return (
    <div className="border-line flex h-14 shrink-0 items-center gap-4 border-b bg-white px-6">
      {backHref && (
        <Link href={backHref} className="text-ink-2 hover:text-ink -ml-1.5 flex h-7 w-7 items-center justify-center rounded-md hover:bg-page">
          <ChevronLeft size={19} strokeWidth={1.9} />
        </Link>
      )}
      <div className="text-sub min-w-0 truncate text-[13px]">{crumbs}</div>
      <div className="flex-1" />
      {actions}
      <Avatar name="赵小燕" size={32} />
    </div>
  );
}

export function Crumb({ children }: { children: ReactNode }) {
  return <span className="text-ink font-medium">{children}</span>;
}

/** 可点击的面包屑上级节点 */
export function CrumbLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sub hover:text-primary-hover">
      {children}
    </Link>
  );
}
