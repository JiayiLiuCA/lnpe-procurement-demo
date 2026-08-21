"use client";

import { Check, CircleAlert } from "lucide-react";
import type { DeliveryNote } from "@/lib/types";

export function MSubmitSummary({ note }: { note: DeliveryNote }) {
  const normal = note.lines.filter((l) => l.state === "confirmed");
  const excs = note.lines.filter((l) => l.state === "exception");
  const photos = note.lines.reduce((s, l) => s + l.photoCount, 0);
  const normalPieces = normal.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4">
      <div className="flex items-center gap-4">
        <div className="bg-success-bg flex flex-1 flex-col items-center gap-0.5 rounded-[10px] py-2.5">
          <div className="text-success-deep text-[22px] font-bold tabular-nums">{normal.length}</div>
          <div className="text-success-deep text-xs">正常确认</div>
        </div>
        <div className="bg-danger-bg flex flex-1 flex-col items-center gap-0.5 rounded-[10px] py-2.5">
          <div className="text-danger-deep text-[22px] font-bold tabular-nums">{excs.length}</div>
          <div className="text-danger-deep text-xs">异常</div>
        </div>
        <div className="bg-page flex flex-1 flex-col items-center gap-0.5 rounded-[10px] py-2.5">
          <div className="text-ink-2 text-[22px] font-bold tabular-nums">{photos}</div>
          <div className="text-ink-2 text-xs">照片</div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {normal.length > 0 && (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="bg-success flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
              <Check size={9} strokeWidth={3.4} className="text-white" />
            </span>
            <span className="text-ink-2">
              {normal[0].name} 等 {normal.length} 项 · 共 {normalPieces} 件 清点无误
            </span>
          </div>
        )}
        {excs.map((l) => (
          <div key={l.seq} className="flex items-start gap-2 text-[13px]">
            <CircleAlert size={16} strokeWidth={2} className="text-danger mt-px shrink-0" />
            <span className="text-danger-deep">
              {l.name} {l.exception?.type}
              {l.exception?.type === "数量不符" ? `：实收 ${l.exception?.actualQty}/${l.qty} ${l.unit}` : ""}
              <br />
              <span className="text-sub text-xs">提交后将自动通知采购负责人 赵小燕</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
