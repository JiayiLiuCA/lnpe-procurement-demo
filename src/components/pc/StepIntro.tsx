"use client";

// 头卡底部的「本步工作条」：左边第一行本步任务、第二行承接 → 产出；右边本步关键数字与主按钮。
// 步骤条本身就是承上启下的图，选中哪步这条就说哪步，用户不用再学一层结构。
// 数字按步筛选，只放和本步有关的 2～4 个（订货安排 / 子合同两步的数字工作区里已有条带，这里不放）。
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export interface StepFact {
  label: string;
  value: ReactNode;
  tone?: "danger" | "warning" | "success";
}

const TONE: Record<NonNullable<StepFact["tone"]>, string> = {
  danger: "text-danger-deep",
  warning: "text-warning-deep",
  success: "text-success-deep",
};

export function StepIntro({ from, task, to, facts = [], action }: { from: string; task: string; to: string; facts?: StepFact[]; action?: ReactNode }) {
  return (
    <div className="border-line-soft flex items-center gap-5 border-t bg-[#FBFAF9] px-5.5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-faint shrink-0 text-[10.5px] tracking-[.5px]">本步</span>
          <span className="text-ink truncate text-[13px] font-bold">{task}</span>
        </div>
        <div className="text-sub mt-1 flex items-center gap-1.5 text-[11.5px]">
          <span className="text-faint shrink-0">承接</span>
          <span className="truncate">{from}</span>
          <ChevronRight size={12} strokeWidth={2} className="text-faint shrink-0" />
          <span className="text-faint shrink-0">产出</span>
          <span className="truncate">{to}</span>
        </div>
      </div>
      {facts.length > 0 && (
        <div className="flex shrink-0 items-center gap-5">
          <span className="bg-line h-7 w-px" />
          {facts.map((f) => (
            <div key={f.label} className="flex flex-col whitespace-nowrap">
              <span className="text-sub text-[10.5px]">{f.label}</span>
              <span className={`max-w-[260px] truncate text-[13px] leading-tight font-bold tabular-nums ${f.tone ? TONE[f.tone] : "text-ink"}`}>{f.value}</span>
            </div>
          ))}
        </div>
      )}
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
