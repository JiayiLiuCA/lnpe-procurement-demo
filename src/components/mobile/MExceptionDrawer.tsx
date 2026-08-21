"use client";

// 异常标记底部抽屉：类型单选（数量不符/破损）+ 实收数量 + 备注
import { useState } from "react";
import type { DeliveryLine } from "@/lib/types";

export function MExceptionDrawer({
  line,
  onClose,
  onSubmit,
}: {
  line: DeliveryLine;
  onClose: () => void;
  onSubmit: (exception: NonNullable<DeliveryLine["exception"]>) => void;
}) {
  const [type, setType] = useState<"数量不符" | "破损">(line.exception?.type ?? "数量不符");
  const [actualQty, setActualQty] = useState(String(line.exception?.actualQty ?? Math.max(0, line.qty - 1)));
  const [note, setNote] = useState(line.exception?.note ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(44,42,42,.45)]" onClick={onClose}>
      <div className="flex w-full max-w-[390px] flex-col gap-4 rounded-t-2xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="text-[15px] font-bold">
          标记异常 · {line.seq}. {line.name}
        </div>
        <div className="flex gap-2.5">
          {(["数量不符", "破损"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 cursor-pointer rounded-[10px] border-[1.5px] py-2.5 text-[13.5px] font-medium ${
                type === t ? "border-danger text-danger-deep bg-danger-bg" : "text-ink-2 border-[#CFCCCA]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {type === "数量不符" && (
          <label className="flex items-center gap-3 text-[13px]">
            <span className="text-ink-2 shrink-0">
              实收数量（应收 {line.qty} {line.unit}）
            </span>
            <input
              type="number"
              min={0}
              max={line.qty}
              value={actualQty}
              onChange={(e) => setActualQty(e.target.value)}
              className="border-line rounded-ctl w-24 border px-2.5 py-1.75 text-[14px] tabular-nums outline-none focus:border-danger"
            />
          </label>
        )}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注（如：缺 4 片，已联系司机核对）"
          rows={2}
          className="border-line rounded-ctl resize-none border px-3 py-2.5 text-[13px] outline-none focus:border-danger"
        />
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="text-ink-2 flex h-12 flex-1 cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] border-[#CFCCCA] text-sm font-medium"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() =>
              onSubmit({
                type,
                actualQty: type === "数量不符" ? Math.max(0, Number(actualQty) || 0) : undefined,
                note: note || (type === "数量不符" ? "数量与送货单不符" : "外包装/货物破损"),
              })
            }
            className="bg-danger flex h-12 flex-[2] cursor-pointer items-center justify-center rounded-[10px] text-[15px] font-bold text-white"
          >
            确认标记异常
          </button>
        </div>
      </div>
    </div>
  );
}
