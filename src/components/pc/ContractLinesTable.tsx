"use client";

import type { Contract } from "@/lib/types";
import { fmtNum } from "@/lib/money";
import { Money } from "@/components/ui/Money";
import { CollapsibleText } from "@/components/ui/CollapsibleText";
import { useAppStore } from "@/store/useAppStore";

export function ContractLinesTable({ contract, editable = false }: { contract: Contract; editable?: boolean }) {
  const c = contract;
  const updateLinePrice = useAppStore((s) => s.updateLinePrice);
  const qtySum = c.lines.reduce((s, l) => s + l.qty, 0);
  const allPriced = c.lines.every((l) => l.unitPrice != null);
  const total = allPriced ? c.lines.reduce((s, l) => s + l.qty * (l.unitPrice ?? 0), 0) : null;
  const unitLabel = c.lines[0]?.unit ?? "套";

  return (
    <div className="flex flex-col">
      <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-5 py-2 text-xs font-medium">
        <div className="flex-[1.4]">品名 / 规格</div>
        <div className="w-[70px]">数量</div>
        <div className="w-[110px] text-right">单价</div>
        <div className="w-[120px] text-right">金额</div>
        <div className="flex-[2] pl-6">备注（技术要求）</div>
      </div>
      {c.lines.map((l) => (
        <div key={l.id} className="border-page flex items-center border-b px-5 py-2.75 text-[13px]">
          <div className="flex-[1.4]">
            <div className="font-medium">{l.name}</div>
            <div className="text-sub text-xs">{l.spec}</div>
          </div>
          <div className="w-[70px] tabular-nums">
            {l.qty} {l.unit}
          </div>
          <div className="w-[110px] text-right tabular-nums">
            {editable ? (
              <input
                type="number"
                min={0}
                value={l.unitPrice ?? ""}
                placeholder="待补充"
                onChange={(e) => {
                  const v = e.target.value;
                  updateLinePrice(c.id, l.id, v === "" ? null : Math.max(0, Number(v)));
                }}
                className="border-line rounded-ctl w-[100px] border px-2 py-1 text-right text-[13px] tabular-nums outline-none focus:border-primary"
              />
            ) : l.unitPrice != null ? (
              fmtNum(l.unitPrice)
            ) : (
              <span className="text-faint text-xs">待补充</span>
            )}
          </div>
          <div className="w-[120px] text-right font-bold tabular-nums">
            {l.unitPrice != null ? fmtNum(l.qty * l.unitPrice) : <span className="text-faint text-xs font-medium">—</span>}
          </div>
          <div className="min-w-0 flex-[2] pl-6">
            <CollapsibleText text={l.note} className="text-[12.5px]" />
          </div>
        </div>
      ))}
      <div className="mt-auto flex items-center bg-[#FBFAF9] px-5 py-2.75 text-[13px]">
        <div className="flex-[1.4] font-bold">合计（含税含运费）</div>
        <div className="w-[70px] tabular-nums">
          {qtySum} {unitLabel}
        </div>
        <div className="w-[110px]" />
        <div className="text-primary-hover w-[120px] text-right font-bold">
          {total != null ? <Money value={total} /> : <span className="text-faint text-xs font-medium">单价待补充</span>}
        </div>
        <div className="text-sub flex-[2] pl-6 text-xs">税率变化时不含税金额不变，按不含税金额加相应税率</div>
      </div>
    </div>
  );
}
