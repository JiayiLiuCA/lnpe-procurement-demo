"use client";

import { Camera, ChevronRight } from "lucide-react";
import type { DeliveryNote } from "@/lib/types";
import { TODAY, fmtDate } from "@/lib/date";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAppStore } from "@/store/useAppStore";

export function MTaskCard({ note, onStart, onContinue }: { note: DeliveryNote; onStart: () => void; onContinue: () => void }) {
  const contracts = useAppStore((s) => s.contracts);
  const kinds = note.lines.length;
  const pieces = note.lines.reduce((s, l) => s + l.qty, 0);
  const processed = note.lines.filter((l) => l.state !== "unconfirmed").length;
  const excCount = note.lines.filter((l) => l.state === "exception").length;
  const progress = Math.round((processed / note.lines.length) * 100);
  const isToday = note.date === TODAY;
  const inProgress = note.status === "in_progress";
  const done = note.status === "done";

  return (
    <div
      className={`flex flex-col gap-3 rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(44,42,42,.05)] ${
        inProgress ? "border-[1.5px] border-info" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="text-[15px] font-bold">送货单 · {fmtDate(note.date)}</div>
        {done ? (
          <StatusPill tone="success">已完成</StatusPill>
        ) : excCount > 0 ? (
          <StatusPill tone="danger">异常 {excCount} 项</StatusPill>
        ) : isToday ? (
          <StatusPill tone="info">今日到货</StatusPill>
        ) : note.date > TODAY ? (
          <StatusPill tone="neutral">明日预计</StatusPill>
        ) : null}
        <div className="flex-1" />
        <ChevronRight size={16} strokeWidth={1.8} className="text-faint" />
      </div>
      {!inProgress && !done && <div className="text-ink-2 text-[13px]">发货方：{note.fromName}</div>}
      <div className="flex flex-wrap gap-1.5">
        <span className="bg-page text-ink-2 rounded-md px-2 py-0.5 text-[11.5px]">
          项目 {note.projectId.replace("p-", "")}
        </span>
        <span className="bg-page text-ink-2 rounded-md px-2 py-0.5 text-[11.5px] tabular-nums">
          合同 …{(contracts.find((c) => c.id === note.contractId)?.no ?? "").slice(-14)}
        </span>
        <span className="bg-page text-ink-2 rounded-md px-2 py-0.5 text-[11.5px]">
          {kinds} 类 {pieces} 件
        </span>
      </div>
      {(inProgress || done) && (
        <div className="flex flex-col gap-1.5">
          <div className="text-sub flex justify-between text-xs">
            <span>已处理 {processed}/{note.lines.length} 项</span>
            <span className="text-info-deep font-medium">{progress}%</span>
          </div>
          <div className="bg-line-soft h-1.5 overflow-hidden rounded-[3px]">
            <div className={`${progress >= 100 ? "bg-success" : "bg-info"} h-full`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {!done &&
        (inProgress ? (
          <button
            type="button"
            onClick={onContinue}
            className="border-[#CFCCCA] text-ink flex h-[46px] cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] bg-white text-[15px] font-bold"
          >
            继续收货
          </button>
        ) : isToday ? (
          <button
            type="button"
            onClick={onStart}
            className="border-[#CFCCCA] text-ink flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-[10px] border-[1.5px] bg-white text-[15px] font-bold"
          >
            <Camera size={17} strokeWidth={1.8} />
            开始收货
          </button>
        ) : null)}
    </div>
  );
}
