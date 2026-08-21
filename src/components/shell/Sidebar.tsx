"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CircleDollarSign,
  FileText,
  Folder,
  LayoutGrid,
  Package,
  Truck,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAppStore } from "@/store/useAppStore";

// 采购清单不设独立入口：清单挂在项目（总合同）下，经「项目管理 → 采购清单阶段」进入
const NAV = [
  { href: "/", label: "工作台", icon: LayoutGrid },
  { href: "/projects", label: "项目管理", icon: Folder },
  { href: "/inventory", label: "库存管理", icon: Package },
  { href: "/contracts", label: "合同管理", icon: FileText },
  { href: "/finance", label: "付款与发票", icon: CircleDollarSign },
  { href: "/receipts", label: "收货记录", icon: Truck },
  { href: "/suppliers", label: "供应商", icon: Users },
  { href: "/notifications", label: "提醒中心", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const todoCount = useAppStore((s) => s.todos.filter((t) => !t.done).length);
  const resetDemo = useAppStore((s) => s.resetDemo);

  return (
    <aside className="bg-ink flex w-[220px] shrink-0 flex-col">
      <div className="flex items-center gap-2.5 px-5 pt-4.5 pb-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/lnpe-mark.png" alt="LNPE" className="h-[34px] w-[34px] rounded-lg" />
        <div>
          <div className="text-[15px] font-bold tracking-[2px] text-white">流能采购</div>
          <div className="text-sub mt-px text-[10.5px] tracking-[.4px]">LNPE PROCUREMENT</div>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 px-3 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.25 text-[13.5px] ${
                active ? "bg-[rgba(229,105,0,.16)] text-sidebar-active font-medium" : "text-faint hover:text-line-soft"
              }`}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
              {href === "/notifications" && todoCount > 0 && (
                <span className="bg-danger ml-auto rounded-full px-1.5 py-px text-[10.5px] font-bold text-white">{todoCount}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2.5 border-t border-[#403E3E] px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <Avatar name="赵小燕" size={30} />
          <div>
            <div className="text-line-soft text-[13px] font-medium">赵小燕</div>
            <div className="text-sub text-[11px]">采购部</div>
          </div>
        </div>
        <button type="button" onClick={resetDemo} className="text-sub hover:text-faint cursor-pointer self-start text-[11px]">
          重置演示数据
        </button>
      </div>
    </aside>
  );
}
