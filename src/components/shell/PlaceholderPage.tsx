"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Topbar, Crumb } from "./Topbar";
import { Btn } from "@/components/ui/Btn";

export function PlaceholderPage({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <Topbar crumbs={<Crumb>{title}</Crumb>} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <div className="bg-line-soft text-faint flex h-16 w-16 items-center justify-center rounded-2xl">
          <Icon size={30} strokeWidth={1.5} />
        </div>
        <div className="text-sub text-sm">演示版未包含该模块</div>
        <Link href="/">
          <Btn variant="secondary">返回工作台</Btn>
        </Link>
      </div>
    </div>
  );
}
