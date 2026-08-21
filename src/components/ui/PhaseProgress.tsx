"use client";

// 四大阶段：订单接收 → 采购清单 → 合同执行 → 订单关闭
import { Check } from "lucide-react";
import type { Project } from "@/lib/types";
import { StatusPill } from "./StatusPill";
import { fmtDate } from "@/lib/date";

export const PHASE_LABELS = ["订单接收", "采购清单", "合同执行", "订单关闭"] as const;

/**
 * 表格行用的阶段标签条：已完成 = 橙底白勾 + 标签，当前 = 白底橙描边加粗，未开始 = 灰。
 * 已关闭项目全部打勾并追加「已结束」。
 */
export function PhaseChips({ project }: { project: Project }) {
  const danger = !project.closedAt && project.tags.includes("催发货");
  const closed = !!project.closedAt;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PHASE_LABELS.map((label, i) => {
        const n = i + 1;
        const done = closed || n < project.phase;
        const current = !closed && n === project.phase;
        if (done) {
          return (
            <span key={n} className="bg-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium text-white">
              <Check size={10} strokeWidth={3.2} />
              {label}
            </span>
          );
        }
        if (current) {
          return (
            <span
              key={n}
              className={`inline-flex items-center rounded-full border-[1.5px] bg-white px-2 py-0.5 text-[11.5px] font-bold ${
                danger ? "border-danger text-danger-deep" : "border-primary text-primary-hover"
              }`}
            >
              {label}
            </span>
          );
        }
        return (
          <span key={n} className="bg-line-soft text-faint inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px]">
            {label}
          </span>
        );
      })}
      {closed ? (
        <StatusPill tone="neutral">已结束 {fmtDate(project.closedAt)}</StatusPill>
      ) : danger ? (
        <StatusPill tone="danger">{project.stepNote}</StatusPill>
      ) : (
        <span className="text-primary-hover text-xs font-medium">{project.stepNote}</span>
      )}
    </div>
  );
}

/**
 * 项目详情头部的可点击阶段条：进度状态（勾/环/灰）展示项目实际进度，
 * 点击任意阶段切换下方内容；被选中查看的阶段标签加底色高亮。
 */
export function PhaseStepper({
  project,
  viewPhase,
  onSelect,
}: {
  project: Project;
  viewPhase: number;
  onSelect: (phase: number) => void;
}) {
  const danger = !project.closedAt && project.tags.includes("催发货");
  const closed = !!project.closedAt;
  return (
    <div className="flex items-start">
      {PHASE_LABELS.map((label, i) => {
        const n = i + 1;
        const done = closed || n < project.phase;
        const current = !closed && n === project.phase;
        const selected = n === viewPhase;
        return (
          <span key={n} className="contents">
            <button type="button" onClick={() => onSelect(n)} className="flex w-[86px] cursor-pointer flex-col items-center gap-1.5">
              {done ? (
                <span className="bg-primary flex h-[18px] w-[18px] items-center justify-center rounded-full">
                  <Check size={10} strokeWidth={3.4} className="text-white" />
                </span>
              ) : current ? (
                <span className={`h-[18px] w-[18px] rounded-full border-[3px] bg-white ${danger ? "border-danger" : "border-primary"}`} />
              ) : (
                <span className="bg-line h-[18px] w-[18px] rounded-full" />
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${selected ? "bg-primary-soft font-bold" : ""} ${
                  current ? (danger ? "text-danger-deep font-bold" : "text-primary-hover font-bold") : done ? "text-ink-2" : "text-faint"
                }`}
              >
                {label}
              </span>
            </button>
            {n < PHASE_LABELS.length && <span className={`mt-2 h-[2px] flex-1 ${done ? "bg-primary" : "bg-line"}`} />}
          </span>
        );
      })}
    </div>
  );
}
