"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { Contract, Milestone } from "@/lib/types";
import { daysUntil, fmtDate } from "@/lib/date";
import { contractTotal, paidAmount, paidRatio } from "@/lib/rules";
import { contractStage, type ContractStage } from "@/lib/steps";
import { Money } from "@/components/ui/Money";
import { MilestoneBar } from "@/components/ui/MilestoneBar";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { AiBadge } from "@/components/ai/AiBadge";
import { supplierById } from "@/fixtures/suppliers";
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
      return { tone: "neutral", text: "已关闭" };
  }
}

/** 合同进度轨四段：签订 → 交货跟进（含现场收货）→ 验收质保（到货后结算）→ 完结。现场收货并入交货跟进，不单列 */
const LANE: { key: ContractStage; label: string }[] = [
  { key: "draft", label: "签订" },
  { key: "delivering", label: "交货跟进" },
  { key: "settling", label: "验收质保" },
  { key: "closed", label: "订单关闭" },
];

/**
 * 合同卡 / 合同页头部的货物轨：和款项轨（MilestoneBar）上下两行，同一套读法。
 * 已走过的段绿色、当前段青色（逾期 / 异常时红色）、未到的段灰色。
 */
export function ContractLane({ stage, danger = false, withLabels = false }: { stage: ContractStage; danger?: boolean; withLabels?: boolean }) {
  // 当前段的下标：草稿在「签订」段；在途与收货中都在「交货跟进」；到货后的验收 / 质保在「验收质保」；完结 = closed 时全绿
  const idx = stage === "draft" ? 0 : stage === "delivering" || stage === "receiving" ? 1 : stage === "settling" ? 2 : 3;
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

/** 下一笔款：先看到期的，再看待触发的，最后看未开始的 */
function nextMilestone(c: Contract): { m: Milestone; text: string } | null {
  const m = c.milestones.find((x) => x.status === "due") ?? c.milestones.find((x) => x.status === "pending") ?? c.milestones.find((x) => x.status === "not_started");
  if (!m) return null;
  const head = `${m.label} ${Math.round(m.ratio * 100)}%`;
  if (m.status === "due" && m.dueAt) {
    const d = daysUntil(m.dueAt);
    return { m, text: `${head} · ${d < 0 ? `逾期 ${-d} 天` : `${fmtDate(m.dueAt)} 到期`}` };
  }
  if (m.status === "due") return { m, text: `${head} · 到期未付` };
  if (m.status === "pending") return { m, text: `${head} · 待触发${m.dueAt ? `，不迟于 ${fmtDate(m.dueAt)}` : ""}` };
  return { m, text: `${head} · 未开始` };
}

/** 一句话告诉用户这份合同接下来该做什么（逾期只提醒，不做催办动作） */
function nextStepHint(c: Contract, stage: ContractStage, overdueDays: number, partialArrived: boolean): string {
  switch (c.status) {
    case "ai_draft":
      return "补齐单价、核对条款后提交校对";
    case "reviewing":
      return "校对无误后定稿";
    case "finalized":
      return "双方盖章后标记已签订，预付款 10% 随即启动";
    case "arrived":
      return "验收合格后付验收款 30%";
    case "warranty":
      return "质保期内 · 到期付质保金 10% 后完结";
    case "closed":
      return "已完结 · 全额付清";
    default:
      break;
  }
  if (overdueDays > 0) return `交货已逾期 ${overdueDays} 天 · 请与卖方经办 ${c.sellerContactName} 确认发货安排`;
  if (stage === "receiving" || partialArrived) return "现场收货中 · 收货员在小程序逐行确认，异常会回到这里处理";
  const m2 = c.milestones.find((m) => m.key === "M2");
  if (m2?.status === "due") return `发货款 50% 已到期 · 付款后卖方发货`;
  if (c.deliveryDate) return `等待卖方发货 · 剩 ${daysUntil(c.deliveryDate)} 天 · 发货前付发货款 50%`;
  return "等待卖方发货";
}

function Fact({ label, value, tone = "" }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-faint text-[10.5px]">{label}</div>
      <div className={`mt-0.5 truncate text-[12.5px] font-medium tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

/**
 * 子合同卡（项目详情两列网格）：
 * 头行 合同号 / 状态 / 金额 → 供应商与摘要 → 货物轨（带标签）→ 款项轨（带标签）→ 四格关键数据 → 一句「下一步」。
 */
export function ContractCard({ contract, partialArrived = false }: { contract: Contract; partialArrived?: boolean }) {
  const c = contract;
  const notes = useAppStore((s) => s.deliveryNotes);
  const total = contractTotal(c);
  const paid = paidAmount(c);
  const ratio = paidRatio(c);
  const sub = contractSubPill(c, partialArrived);
  const supplier = supplierById(c.supplierId);
  const isDraft = c.status === "ai_draft" || c.status === "reviewing" || c.status === "finalized";
  const stage = contractStage(c, notes);
  const overdueDays = c.status === "executing" && c.deliveryDate && daysUntil(c.deliveryDate) < 0 && !partialArrived ? -daysUntil(c.deliveryDate) : 0;
  const danger = overdueDays > 0;
  const next = nextMilestone(c);
  const lastVersion = c.versions[c.versions.length - 1];
  const hint = nextStepHint(c, stage, overdueDays, partialArrived);

  return (
    <Link
      href={`/contracts/${c.id}`}
      className={`rounded-card flex flex-col gap-3 border bg-white p-4 transition-shadow hover:shadow-md ${isDraft ? "border-dashed border-[#CFCCCA]" : "border-line"}`}
    >
      <div className="flex items-center gap-2">
        <div className="text-[13.5px] font-bold tabular-nums">{c.no}</div>
        <StatusPill tone={sub.tone}>{sub.text}</StatusPill>
        {isDraft && c.status !== "finalized" && <AiBadge text="AI 生成" />}
        <div className="ml-auto text-sm font-bold">
          {total != null ? <Money value={total} /> : <span className="text-faint text-xs font-medium">单价待补充</span>}
        </div>
      </div>
      <div className="text-ink-2 -mt-1 text-[12.5px]">
        {supplier.name} · {c.summary}
      </div>

      {/* 两条轨：上进度（货物轨）、下款项，都带标签 */}
      <div className="border-line-soft flex flex-col gap-2.5 border-y py-3">
        <div className="flex items-start gap-2.5">
          <span className="text-faint w-7 shrink-0 pt-px text-[10.5px]">进度</span>
          <div className="min-w-0 flex-1">
            <ContractLane stage={stage} danger={danger} withLabels />
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="text-faint w-7 shrink-0 pt-px text-[10.5px]">款项</span>
          <div className="min-w-0 flex-1">
            <MilestoneBar milestones={c.milestones} height={8} withLabels />
          </div>
        </div>
      </div>

      {/* 关键数据四格 */}
      {isDraft ? (
        <div className="grid grid-cols-4 gap-3">
          <Fact label="产品明细" value={`${c.lines.length} 项`} />
          <Fact label="单价" value={c.lines.every((l) => l.unitPrice != null) ? "已补齐" : `待补充 ${c.lines.filter((l) => l.unitPrice == null).length} 项`} tone={c.lines.every((l) => l.unitPrice != null) ? "" : "text-warning-deep"} />
          <Fact label="版本" value={lastVersion ? `v${c.versions.length} · ${fmtDate(lastVersion.at)}` : "—"} />
          <Fact label="付款条款" value="10 / 50 / 30 / 10" />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          <Fact label="签订" value={fmtDate(c.signedAt)} />
          <Fact
            label="交货期"
            value={
              c.deliveryDate
                ? `${fmtDate(c.deliveryDate)}${c.goodsArrivedAt ? ` · 货到 ${fmtDate(c.goodsArrivedAt)}` : overdueDays > 0 ? ` · 逾期 ${overdueDays} 天` : partialArrived ? " · 部分到货" : ` · 剩 ${daysUntil(c.deliveryDate)} 天`}`
                : "—"
            }
            tone={overdueDays > 0 ? "text-danger-deep" : ""}
          />
          <Fact
            label="已付"
            value={
              <>
                {Math.round(ratio * 100)}%{paid > 0 && <> · <Money value={paid} /></>}
              </>
            }
            tone={ratio > 0 ? "text-success-deep" : ""}
          />
          <Fact label="下一笔" value={next ? next.text : "已付清"} tone={next?.m.status === "due" ? (next.m.dueAt && daysUntil(next.m.dueAt) < 0 ? "text-danger-deep" : "text-warning-deep") : ""} />
        </div>
      )}

      {/* 下一步 */}
      <div className={`flex items-start gap-1 text-[12px] ${danger ? "text-danger-deep" : "text-ink-2"}`}>
        <ChevronRight size={14} strokeWidth={2} className="mt-px shrink-0" />
        <span>
          <span className="font-medium">下一步</span> · {hint}
        </span>
      </div>
    </Link>
  );
}
