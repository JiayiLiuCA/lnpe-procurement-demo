"use client";

// 子合同「跟进」Tab 的主体：两根进度条总览 + 一条纵向时间线（货物与款项两轨合在一条线上，按先后排，过去在上、未来在下，中间一条「今天」线）。
// 每行 = 日期 · 状态点 · 轨别小标 · 标题 + 一句白话 · 金额 · 可做的动作。不需要学习：看日期列知道什么时候、看句子知道该干嘛。
import { AlertTriangle, Check, CircleDollarSign, Package } from "lucide-react";
import type { Contract } from "@/lib/types";
import { TODAY, daysUntil, fmtDate } from "@/lib/date";
import { buildContractTimeline, dateLabel, type TimelineEvent, type TimelineState } from "@/lib/contractTimeline";
import { Money } from "@/components/ui/Money";
import { StatusPill } from "@/components/ui/StatusPill";
import { MilestoneBar } from "@/components/ui/MilestoneBar";
import { ContractLane } from "./ContractCard";
import { contractStage } from "@/lib/steps";
import { overdueContracts } from "@/lib/derive";
import { useAppStore } from "@/store/useAppStore";

const DOT: Record<TimelineState, string> = {
  done: "bg-success border-success",
  overdue: "bg-danger border-danger",
  soon: "border-warning bg-white",
  current: "border-info bg-white",
  future: "border-line bg-white",
  tbd: "border-line border-dashed bg-white",
};

function Dot({ state }: { state: TimelineState }) {
  return (
    <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${DOT[state]}`}>
      {state === "done" && <Check size={10} strokeWidth={3.4} className="text-white" />}
      {state === "overdue" && <AlertTriangle size={9} strokeWidth={3} className="text-white" />}
    </span>
  );
}

function StatePill({ e }: { e: TimelineEvent }) {
  if (e.state === "done") return <StatusPill tone="success">已完成</StatusPill>;
  if (e.state === "overdue" && e.date) return <StatusPill tone="danger">逾期 {-daysUntil(e.date)} 天</StatusPill>;
  if (e.state === "soon" && e.date) return <StatusPill tone="warning">{daysUntil(e.date) === 0 ? "就是今天" : `还剩 ${daysUntil(e.date)} 天`}</StatusPill>;
  if (e.state === "current") return <StatusPill tone="info">进行中</StatusPill>;
  return <StatusPill tone="neutral">{e.dateKind === "tbd" ? "待触发" : "未到"}</StatusPill>;
}

export function ContractTimeline({ contract: c, onRegisterInvoice }: { contract: Contract; onRegisterInvoice: (mKey: "M1" | "M2" | "M3" | "M4") => void }) {
  const notes = useAppStore((s) => s.deliveryNotes);
  const markMilestonePaid = useAppStore((s) => s.markMilestonePaid);
  const pushToast = useAppStore((s) => s.pushToast);
  const events = buildContractTimeline(c, notes);
  const stage = contractStage(c, notes);
  const overdue = overdueContracts([c], notes).length > 0;
  // 「今天」线插在第一条还没发生的事件前面
  const isPast = (e: TimelineEvent) => e.state === "done" || (!!e.date && e.date <= TODAY && e.dateKind === "actual");
  const todayIdx = events.findIndex((e) => !isPast(e));

  const line = (e: TimelineEvent) => {
    const { main, hint } = dateLabel(e);
    return (
      <div key={e.key} className="flex items-stretch gap-3.5">
        <div className="w-[92px] shrink-0 pt-3 text-right">
          {hint && <div className="text-faint text-[11px]">{hint}</div>}
          <div className={`text-[13px] tabular-nums ${e.state === "overdue" ? "text-danger-deep font-bold" : e.state === "done" ? "text-ink font-medium" : e.dateKind === "tbd" ? "text-faint" : "text-ink-2"}`}>{main}</div>
        </div>
        <div className="flex w-[18px] shrink-0 flex-col items-center">
          <div className="bg-line-soft w-0.5 flex-none" style={{ height: 14 }} />
          <Dot state={e.state} />
          <div className="bg-line-soft w-0.5 flex-1" />
        </div>
        <div className={`mb-1.5 flex min-w-0 flex-1 items-center gap-3.5 rounded-[10px] px-3.5 py-2.5 ${e.state === "overdue" ? "bg-danger-bg/60" : e.state === "soon" || e.state === "current" ? "bg-[#FBFAF9]" : ""}`}>
          <span className={`inline-flex w-[52px] shrink-0 items-center justify-center gap-1 rounded-full py-px text-[11px] font-medium ${e.lane === "goods" ? "bg-line-soft text-ink-2" : "bg-info-bg text-info-deep"}`}>
            {e.lane === "goods" ? <Package size={11} strokeWidth={2} /> : <CircleDollarSign size={11} strokeWidth={2} />}
            {e.lane === "goods" ? "进度" : "款项"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-[13.5px] font-bold ${e.state === "future" || e.state === "tbd" ? "text-ink-2" : ""}`}>{e.title}</span>
              <StatePill e={e} />
            </div>
            <div className={`mt-0.5 text-[12.5px] ${e.state === "overdue" ? "text-danger-deep" : "text-ink-2"}`}>{e.desc}</div>
          </div>
          <div className="w-[110px] shrink-0 text-right text-[13.5px] font-bold tabular-nums">
            {e.amount != null ? <Money value={e.amount} className={e.state === "done" ? "text-success-deep" : ""} /> : e.lane === "money" ? <span className="text-faint text-xs font-medium">待定稿</span> : null}
          </div>
          <div className="flex w-[150px] shrink-0 items-center justify-end gap-2.5">
            {e.actions.includes("invoice") && e.mKey && (
              <button type="button" className="text-primary-hover cursor-pointer text-xs font-medium" onClick={() => onRegisterInvoice(e.mKey!)}>
                登记发票
              </button>
            )}
            {e.actions.includes("pay") && e.mKey && (
              <button
                type="button"
                className="text-primary-hover cursor-pointer text-xs font-medium"
                onClick={() => {
                  markMilestonePaid(c.id, e.mKey!);
                  pushToast(`${e.title} 已标记为已付`);
                }}
              >
                标记已付
              </button>
            )}
            {e.actions.includes("acceptance") && (
              <button type="button" className="text-primary-hover cursor-pointer text-xs font-medium" onClick={() => pushToast("演示版：验收单上传已略过")}>
                上传验收单
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const todayLine = (
    <div key="today" className="flex items-center gap-3.5">
      <div className="text-info-deep w-[92px] shrink-0 text-right text-[12px] font-bold tabular-nums">今天 {fmtDate(TODAY)}</div>
      <div className="flex w-[18px] shrink-0 justify-center">
        <span className="bg-info h-2.5 w-2.5 rounded-full ring-4 ring-[#E1F4F5]" />
      </div>
      <div className="border-info/40 mb-1.5 flex-1 border-t border-dashed" />
    </div>
  );

  return (
    <div className="flex flex-col gap-3.5">
      {/* 时间线：先两根进度条（进度轨 / 款项轨）总览，再逐节点展开 */}
      <div className="border-line rounded-card border bg-white px-5 pt-3.5 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="text-[15px] font-bold">时间线</div>
          <span className="text-sub text-xs">进度与款项按先后排在一条线上 · 上面是已经发生的，下面是接下来的 · 「最迟」是合同期限，「预计」是按交货期推算</span>
        </div>
        <div className="border-line-soft mt-3 flex flex-col gap-3 rounded-[10px] border bg-[#FBFAF9] px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="text-sub w-8 shrink-0 pt-px text-[11.5px] font-medium">进度</span>
            <div className="min-w-0 flex-1">
              <ContractLane stage={stage} danger={overdue} withLabels />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-sub w-8 shrink-0 pt-px text-[11.5px] font-medium">款项</span>
            <div className="min-w-0 flex-1">
              <MilestoneBar milestones={c.milestones} height={8} withLabels />
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-col">
          {events.map((e, i) => (
            <div key={e.key} className="contents">
              {i === todayIdx && todayLine}
              {line(e)}
            </div>
          ))}
          {todayIdx === -1 && todayLine}
        </div>
      </div>
    </div>
  );
}
