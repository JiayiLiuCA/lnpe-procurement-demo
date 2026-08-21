"use client";

import Link from "next/link";
import type { Contract } from "@/lib/types";
import { daysUntil } from "@/lib/date";
import { contractTotal, paidAmount, paidRatio } from "@/lib/rules";
import { Money } from "@/components/ui/Money";
import { MilestoneBar } from "@/components/ui/MilestoneBar";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { AiBadge } from "@/components/ai/AiBadge";
import { supplierById } from "@/fixtures/suppliers";
import { fmtDate } from "@/lib/date";

/** 合同卡的子状态 pill：执行中→逾期/生产中，已定稿→待签订，AI草稿→AI 初稿 */
export function contractSubPill(c: Contract, partialArrived: boolean): { tone: PillTone; text: string } {
  switch (c.status) {
    case "ai_draft":
      return { tone: "ai", text: "AI 初稿" };
    case "reviewing":
      return { tone: "ai", text: "待校对" };
    case "finalized":
      return { tone: "warning", text: "待签订" };
    case "signed":
      return { tone: "info", text: "已签订" };
    case "executing": {
      if (c.deliveryDate) {
        const d = daysUntil(c.deliveryDate);
        if (d < 0) return { tone: "danger", text: `逾期 ${-d} 天` };
      }
      if (partialArrived) return { tone: "warning", text: "部分到货" };
      return { tone: "info", text: "生产中" };
    }
    case "arrived":
      return { tone: "success", text: "已到货" };
    case "warranty":
      return { tone: "info", text: "质保期" };
    case "closed":
      return { tone: "neutral", text: "已完结" };
  }
}

export function ContractCard({ contract, partialArrived = false }: { contract: Contract; partialArrived?: boolean }) {
  const c = contract;
  const total = contractTotal(c);
  const paid = paidAmount(c);
  const ratio = paidRatio(c);
  const sub = contractSubPill(c, partialArrived);
  const supplier = supplierById(c.supplierId);
  const dashed = c.status === "ai_draft" || c.status === "reviewing" || c.status === "finalized";

  return (
    <Link
      href={`/contracts/${c.id}`}
      className={`rounded-card flex flex-col gap-2.5 border bg-white p-4 transition-shadow hover:shadow-md ${
        dashed ? "border-dashed border-[#CFCCCA]" : "border-line"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="text-[13px] font-bold tabular-nums">{c.no}</div>
        <StatusPill tone={sub.tone}>{sub.text}</StatusPill>
        <div className="ml-auto text-sm font-bold">
          {total != null ? <Money value={total} /> : <span className="text-faint text-xs font-medium">单价待补充</span>}
        </div>
      </div>
      <div className="text-ink-2 text-[12.5px]">
        {supplier.name} · {c.summary}
      </div>
      <MilestoneBar milestones={c.milestones} height={8} />
      <div className="text-sub flex items-center text-xs">
        {c.status === "ai_draft" || c.status === "reviewing" ? (
          <>
            <span>单价待补充 · 待校对定稿</span>
            <span className="ml-auto">
              <AiBadge text="AI 生成" />
            </span>
          </>
        ) : c.status === "finalized" ? (
          <span>定稿已校对 · 待双方盖章</span>
        ) : (
          <>
            <span>
              已付 {Math.round(ratio * 100)}% · {paid > 0 ? <Money value={paid} /> : "—"}
            </span>
            {c.deliveryDate && (
              <span className={`ml-auto ${daysUntil(c.deliveryDate) < 0 ? "text-danger-deep font-medium" : ""}`}>
                交货 {fmtDate(c.deliveryDate)}
                {daysUntil(c.deliveryDate) < 0 ? " · 待发货" : ` · 剩 ${daysUntil(c.deliveryDate)} 天`}
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
