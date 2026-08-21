"use client";

import { useState } from "react";
import { Sparkles, UploadCloud } from "lucide-react";
import type { ChecklistRow } from "@/lib/types";
import { Btn } from "@/components/ui/Btn";

export function SelectionFooter({
  selectedRows,
  onMarkAllocation,
  onGenerate,
  onUploadContract,
}: {
  selectedRows: ChecklistRow[];
  onMarkAllocation: (qty: number) => void;
  onGenerate: () => void;
  onUploadContract?: () => void;
}) {
  const [allocOpen, setAllocOpen] = useState(false);
  const [allocQty, setAllocQty] = useState("1");
  const n = selectedRows.length;
  const needSum = selectedRows.reduce((s, r) => s + (typeof r.qty === "number" ? r.alloc.need || r.qty : 0), 0);
  const brands = [...new Set(selectedRows.map((r) => r.brands).filter(Boolean))].join("、");

  return (
    <div className="border-line-soft mt-auto flex items-center gap-3.5 border-t bg-white px-4 py-3">
      <div className="text-[13px]">
        已选 <span className="text-primary-hover font-bold">{n}</span> 项{needSum > 0 && <> · 需采购 {needSum} 台套</>}
      </div>
      <div className="text-sub text-[12.5px]">
        {brands ? `候选品牌：${brands} · ` : ""}跨子系统同供应商项将自动合并为一份合同
      </div>
      <div className="flex-1" />
      <div className="relative">
        <Btn variant="secondary" disabled={n === 0} onClick={() => setAllocOpen((v) => !v)}>
          标记库存分配
        </Btn>
        {allocOpen && (
          <div className="border-line absolute right-0 bottom-full z-20 mb-2 flex w-[230px] flex-col gap-2.5 rounded-[10px] border bg-white p-3.5 shadow-xl">
            <div className="text-[13px] font-bold">标记库存分配</div>
            <label className="text-sub flex items-center gap-2 text-xs">
              分配数量
              <input
                type="number"
                min={0}
                value={allocQty}
                onChange={(e) => setAllocQty(e.target.value)}
                className="border-line rounded-ctl text-ink w-20 border px-2 py-1 text-[13px] tabular-nums outline-none focus:border-[#CFCCCA]"
              />
            </label>
            <div className="text-faint text-[11px]">分配数 ≥ 需求数记为「已分配」，否则记为「部分分配」</div>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" size="sm" onClick={() => setAllocOpen(false)}>
                取消
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                onClick={() => {
                  onMarkAllocation(Math.max(0, Number(allocQty) || 0));
                  setAllocOpen(false);
                }}
              >
                确认
              </Btn>
            </div>
          </div>
        )}
      </div>
      {onUploadContract && (
        <Btn variant="secondary" disabled={n === 0} onClick={onUploadContract}>
          <UploadCloud size={14} strokeWidth={1.8} />
          上传合同（勾选覆盖）
        </Btn>
      )}
      <Btn variant="primary" disabled={n === 0} onClick={onGenerate}>
        <Sparkles size={14} strokeWidth={1.8} />
        AI 生成采购合同
      </Btn>
    </div>
  );
}
