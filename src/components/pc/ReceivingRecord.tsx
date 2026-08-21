"use client";

import { AlertTriangle, Image as ImageIcon, Truck } from "lucide-react";
import type { Contract } from "@/lib/types";
import { fmtDate } from "@/lib/date";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/store/useAppStore";

/** 合同详情右栏 · 收货记录卡：提交收货后展示回传内容 */
export function ReceivingRecord({ contract }: { contract: Contract }) {
  const notes = useAppStore((s) => s.deliveryNotes);
  const related = notes.filter((n) => n.contractIds.includes(contract.id) && n.status !== "pending");

  if (related.length === 0) {
    return (
      <EmptyState
        icon={<Truck size={34} strokeWidth={1.5} className="text-[#CFCCCA]" />}
        text="暂无到货 · 卖方发货后将自动创建小程序收货任务"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {related.map((n) => {
        const lines = n.lines.filter((l) => l.contractId === contract.id);
        const photoTotal = lines.reduce((s, l) => s + l.photoCount, 0);
        const excs = lines.filter((l) => l.state === "exception");
        return (
          <div key={n.id} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-[13px] font-medium">
              送货单 {fmtDate(n.date)}
              {n.status === "done" ? <StatusPill tone="success">已提交</StatusPill> : <StatusPill tone="warning">收货中</StatusPill>}
            </div>
            <div className="flex flex-col gap-1.5">
              {lines.map((l) => (
                <div key={l.seq} className="flex items-center gap-2 text-[12.5px]">
                  <span className="text-ink-2 min-w-0 flex-1 truncate">
                    {l.name} × {l.qty} {l.unit}
                  </span>
                  {l.state === "confirmed" ? (
                    <StatusPill tone="success">已确认{l.confirmedAt ? ` ${l.confirmedAt}` : ""}</StatusPill>
                  ) : l.state === "exception" ? (
                    <StatusPill tone="danger">{l.exception?.type ?? "异常"}</StatusPill>
                  ) : (
                    <StatusPill tone="neutral">待确认</StatusPill>
                  )}
                </div>
              ))}
            </div>
            {photoTotal > 0 && (
              <div className="flex gap-1.5">
                {Array.from({ length: Math.min(photoTotal, 5) }, (_, i) => (
                  <span key={i} className="bg-page flex h-9 w-9 items-center justify-center rounded-lg">
                    <ImageIcon size={14} strokeWidth={1.6} className="text-faint" />
                  </span>
                ))}
                {photoTotal > 5 && (
                  <span className="bg-line-soft text-ink-2 flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold">
                    +{photoTotal - 5}
                  </span>
                )}
              </div>
            )}
            {excs.map((l) => (
              <div key={`exc-${l.seq}`} className="bg-danger-bg text-danger-deep flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px]">
                <AlertTriangle size={14} strokeWidth={1.8} className="shrink-0" />
                {l.name} {l.exception?.type}：实收 {l.exception?.actualQty}/{l.qty} {l.unit} · {l.exception?.note}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
