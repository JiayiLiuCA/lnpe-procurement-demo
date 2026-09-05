// 业务规则纯函数：凡能由种子数据推导的一律派生，不另造数
import type { Contract, ContractStatus, Milestone } from "./types";
import { addMonths, daysUntil } from "./date";

/** 里程碑金额 = 合同含税总额 × ratio（种子总额均可被整除） */
export function milestoneAmount(total: number, ratio: number): number {
  return Math.round(total * ratio);
}

export type DueTone = "danger" | "warning" | "neutral";

export function dueTone(dueAt: string): DueTone {
  const d = daysUntil(dueAt);
  if (d < 0) return "danger";
  if (d <= 7) return "warning";
  return "neutral";
}

/**
 * 到货后填充 M3/M4 期限：M3 dueAt ??= 到货 +12 月、M4 dueAt ??= 到货 +24 月。
 * 只在为空时填充（种子里已写明的 M3 / M4 期限不被覆盖）。
 */
export function deriveArrivalDeadlines(milestones: Milestone[], arrivedAt: string): Milestone[] {
  return milestones.map((m) => {
    if (m.key === "M3" && !m.dueAt) return { ...m, dueAt: addMonths(arrivedAt, 12), status: m.status === "not_started" ? "pending" : m.status };
    if (m.key === "M4" && !m.dueAt) return { ...m, dueAt: addMonths(arrivedAt, 24), status: m.status === "not_started" ? "pending" : m.status };
    return m;
  });
}

export const CONTRACT_STATUS_ORDER: ContractStatus[] = [
  "ai_draft",
  "reviewing",
  "finalized",
  "executing",
  "arrived",
  "warranty",
  "closed",
];

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  ai_draft: "AI草稿",
  reviewing: "待校对",
  finalized: "已定稿",
  executing: "执行中",
  arrived: "已到货",
  warranty: "质保期",
  closed: "已关闭",
};

/** 详情页主按钮文案；null 表示无推进动作。标记已签订后直接进入执行（交货跟进），没有单独的「开始执行」 */
export function nextAction(status: ContractStatus): string | null {
  switch (status) {
    case "ai_draft":
      return "提交校对";
    case "reviewing":
      return "定稿";
    case "finalized":
      return "标记已签订";
    case "arrived":
      return "进入质保期";
    case "warranty":
      return "订单关闭";
    default:
      return null;
  }
}

/** 合同含税总额：种子取 amountInclTax，草稿由行价求和（有 null 单价则为 null） */
export function contractTotal(c: Contract): number | null {
  if (c.amountInclTax != null) return c.amountInclTax;
  let sum = 0;
  for (const l of c.lines) {
    if (l.unitPrice == null) return null;
    sum += l.qty * l.unitPrice;
  }
  return sum;
}

export function paidAmount(c: Contract): number {
  const total = contractTotal(c);
  if (total == null) return 0;
  return c.milestones.filter((m) => m.status === "paid").reduce((s, m) => s + milestoneAmount(total, m.ratio), 0);
}

export function paidRatio(c: Contract): number {
  return c.milestones.filter((m) => m.status === "paid").reduce((s, m) => s + m.ratio, 0);
}

export function invoicedAmount(c: Contract): number {
  return c.milestones.filter((m) => m.invoice).reduce((s, m) => s + (m.invoice ? m.invoice.amount : 0), 0);
}

export function invoicedRatio(c: Contract): number {
  return c.milestones.filter((m) => m.invoice).reduce((s, m) => s + m.ratio, 0);
}
