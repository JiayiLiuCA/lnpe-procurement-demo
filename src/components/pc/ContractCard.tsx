"use client";

import Link from "next/link";
import type { Contract } from "@/lib/types";
import { daysUntil } from "@/lib/date";
import { contractTotal, paidAmount, paidRatio } from "@/lib/rules";
import { contractStage, type ContractStage } from "@/lib/steps";
import { Money } from "@/components/ui/Money";
import { MilestoneBar } from "@/components/ui/MilestoneBar";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { AiBadge } from "@/components/ai/AiBadge";
import { supplierById } from "@/fixtures/suppliers";
import { fmtDate } from "@/lib/date";
import { useAppStore } from "@/store/useAppStore";

/** 合同卡的子状态 pill：执行中→逾期/生产中，已定稿→待签订，AI草稿→AI 初稿 */
export function contractSubPill(c: Contract, partialArrived: boolean): { tone: PillTone; text: string } {
  switch (c.status) {
    case "ai_draft":
      return { tone: "ai", text: "AI 初稿" };
    case "reviewing":
      return { tone: "ai", text: "待校对" };
    case "finalized":
      return { tone: "warning", text: "待签订" };
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

/** 合同货物轨四段：签订 → 交货跟进 → 现场收货 → 完结（与项目步骤 4 / 5 / 6 / 7 对应） */
const LANE: { key: ContractStage; label: string }[] = [
  { key: "draft", label: "签订" },
  { key: "delivering", label: "交货跟进" },
  { key: "receiving", label: "现场收货" },
  { key: "settling", label: "完结" },
];

/**
 * 合同卡 / 合同页头部的货物轨：和款项轨（MilestoneBar）上下两行，同一套读法。
 * 已走过的段绿色、当前段青色（逾期 / 异常时红色）、未到的段灰色。
 */
export function ContractLane({ stage, danger = false, withLabels = false }: { stage: ContractStage; danger?: boolean; withLabels?: boolean }) {
  // 当前段的下标：草稿在「签订」段；到货结算与完结都落在最后一段（完结 = closed 时全绿）
  const idx = stage === "draft" ? 0 : stage === "delivering" ? 1 : stage === "receiving" ? 2 : 3;
  const allDone = stage === "closed";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-[3px]" style={{ height: 6 }}>
        {LANE.map((seg, i) => {
          const cls = allDone || i < idx ? "bg-success" : i === idx ? (danger ? "bg-danger" : "bg-info") : "bg-line";
          return <div key={seg.key} className={`flex-1 rounded-[3px] ${cls}`} />;
        })}
      </div>
      {withLabels && (
        <div className="flex gap-[3px] text-[11.5px]">
          {LANE.map((seg, i) => {
            const tone = allDone || i < idx ? "text-success-deep" : i === idx ? (danger ? "text-danger-deep font-medium" : "text-info-deep font-medium") : "text-faint";
            return (
              <div key={seg.key} className={`flex-1 ${tone}`}>
                {seg.label}
                {(allDone || i < idx) && " ✓"}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ContractCard({ contract, partialArrived = false }: { contract: Contract; partialArrived?: boolean }) {
  const c = contract;
  const notes = useAppStore((s) => s.deliveryNotes);
  const total = contractTotal(c);
  const paid = paidAmount(c);
  const ratio = paidRatio(c);
  const sub = contractSubPill(c, partialArrived);
  const supplier = supplierById(c.supplierId);
  const dashed = c.status === "ai_draft" || c.status === "reviewing" || c.status === "finalized";
  const stage = contractStage(c, notes);

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
      {/* 上：货物轨；下：款项轨 */}
      <ContractLane stage={stage} danger={sub.tone === "danger"} />
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
