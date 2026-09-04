"use client";

// 每一步顶部的「承接 / 本步 / 产出」说明条：用户不用学，看一眼就知道自己接了什么、要交出什么。
// 右侧放这一步唯一的主按钮（可选）。
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

function Seg({ label, text, strong }: { label: string; text: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-faint text-[10.5px] tracking-[.5px]">{label}</div>
      <div className={`mt-0.5 truncate text-[13px] ${strong ? "text-ink font-bold" : "text-ink-2"}`}>{text}</div>
    </div>
  );
}

export function StepIntro({ from, task, to, action }: { from: string; task: string; to: string; action?: ReactNode }) {
  return (
    <div className="border-line rounded-card flex items-center gap-4 border bg-white px-5 py-3">
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1.4fr_auto_1fr] items-center gap-3">
        <Seg label="承接" text={from} />
        <ChevronRight size={15} strokeWidth={1.8} className="text-faint" />
        <Seg label="本步" text={task} strong />
        <ChevronRight size={15} strokeWidth={1.8} className="text-faint" />
        <Seg label="产出" text={to} />
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
