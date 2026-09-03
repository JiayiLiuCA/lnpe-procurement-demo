// 跨页面共享的派生选择器：一律由种子数据推导，不另造数
import type { Checklist, Contract, DeliveryNote, Milestone, Project, Sheet } from "./types";
import { contractTotal, milestoneAmount, paidAmount } from "./rules";
import { daysUntil } from "./date";

export interface RowCounts {
  total: number;
  /** 有分配（含部分） */
  allocated: number;
  /** 需采购（need 或 partial） */
  need: number;
  /** 已入合同 */
  contracted: number;
  /** 待核对 */
  pending: number;
  /** 安排生产（公司自制，不计入需采购） */
  produce: number;
}

export function sheetStats(sheet: Sheet): RowCounts {
  const rows = sheet.rows;
  return {
    total: rows.length,
    allocated: rows.filter((r) => r.alloc.status === "allocated" || r.alloc.status === "partial").length,
    need: rows.filter((r) => r.alloc.status === "need" || r.alloc.status === "partial").length,
    contracted: rows.filter((r) => r.contractId).length,
    pending: rows.filter((r) => r.alloc.status === "pending").length,
    produce: rows.filter((r) => r.alloc.status === "produce").length,
  };
}

export function checklistStats(cl: Checklist): RowCounts {
  return cl.sheets.reduce(
    (acc, sh) => {
      const s = sheetStats(sh);
      return {
        total: acc.total + s.total,
        allocated: acc.allocated + s.allocated,
        need: acc.need + s.need,
        contracted: acc.contracted + s.contracted,
        pending: acc.pending + s.pending,
        produce: acc.produce + s.produce,
      };
    },
    { total: 0, allocated: 0, need: 0, contracted: 0, pending: 0, produce: 0 },
  );
}

export interface PaymentPlanRow {
  contract: Contract;
  milestone: Milestone;
  dueAt: string;
  amount: number;
}

/** 近 30 天付款计划：全部 status='due' 且有 dueAt 的里程碑，按日期升序 */
export function paymentPlan(contracts: Contract[]): PaymentPlanRow[] {
  const rows: PaymentPlanRow[] = [];
  for (const c of contracts) {
    const total = contractTotal(c);
    if (total == null) continue;
    for (const m of c.milestones) {
      if (m.status === "due" && m.dueAt) {
        rows.push({ contract: c, milestone: m, dueAt: m.dueAt, amount: milestoneAmount(total, m.ratio) });
      }
    }
  }
  return rows.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

/**
 * 交货逾期合同（工作台 / 项目页 / 合同页共用口径）：执行中、已过交货期、且货还没到场。
 * 已有送货单在收货或已收完的按「部分到货」看待，不再作逾期提醒；卖方刚发出、送货单还是待收货的仍算逾期。
 */
export function overdueContracts(contracts: Contract[], notes: DeliveryNote[]): Contract[] {
  return contracts.filter(
    (c) =>
      c.status === "executing" &&
      !!c.deliveryDate &&
      daysUntil(c.deliveryDate) < 0 &&
      !notes.some((n) => n.contractIds.includes(c.id) && n.status !== "pending"),
  );
}

export function projectContracts(contracts: Contract[], projectId: string): Contract[] {
  return contracts.filter((c) => c.projectId === projectId);
}

/** 项目统计：合同数 / 已签数 / 已签总额 / 累计已付 */
export function projectContractStats(contracts: Contract[], projectId: string) {
  const list = projectContracts(contracts, projectId);
  const signed = list.filter((c) => c.signedAt);
  const signedTotal = signed.reduce((s, c) => s + (contractTotal(c) ?? 0), 0);
  const paid = list.reduce((s, c) => s + paidAmount(c), 0);
  return { count: list.length, signedCount: signed.length, signedTotal, paid };
}

/**
 * 阶段内进度概括（项目列表 / 工作台阶段列末尾的小字）：说明当前阶段走到哪一步，
 * 并给出项目级的汇总进度（合同覆盖 54/62、到货 0/1 份、收货中 2/4 项…）。
 * 不出现某一份子合同的明细（逾期、异常等）——那些在截止列、详情页各自展示。
 */
export function phaseSummary(project: Project, contracts: Contract[], checklists: Checklist[], notes: DeliveryNote[]): string {
  if (project.closedAt) return "已结束";
  const cls = checklists.filter((cl) => cl.projectId === project.id);
  const list = projectContracts(contracts, project.id);
  const st = cls.reduce(
    (acc, cl) => {
      const s = checklistStats(cl);
      return { total: acc.total + s.total, need: acc.need + s.need, contracted: acc.contracted + s.contracted, pending: acc.pending + s.pending };
    },
    { total: 0, need: 0, contracted: 0, pending: 0 },
  );
  switch (project.phase) {
    case 1:
      return "订单已入库 · 待采购清单";
    case 2: {
      if (cls.length === 0) return "待上传采购清单";
      const approved = cls.filter((cl) => cl.status === "已批准").length;
      if (approved < cls.length) return `清单审批 ${approved}/${cls.length} 批`;
      if (st.pending > 0) return `库存核对 ${st.total - st.pending}/${st.total} 项`;
      return `库存已核对 · 需采购 ${st.need} 项`;
    }
    case 3: {
      // 出合同 → 生产发货 → 收货 → 结算：每一步都报项目级汇总数。
      // 合同分批出，只要还有合同在拟稿/校对/待签就按「合同覆盖」报；否则按已签合同走到的最远一步报。
      const drafting = list.some((c) => c.status === "ai_draft" || c.status === "reviewing" || c.status === "finalized");
      if (drafting || list.length === 0) return `合同覆盖 ${st.contracted}/${st.need}`;
      const mine = (n: DeliveryNote) => n.lines.filter((l) => l.projectCode === project.code);
      if (notes.some((n) => n.status === "in_progress" && mine(n).length > 0)) {
        const lines = notes.flatMap(mine);
        const done = lines.filter((l) => l.state !== "unconfirmed").length;
        return `收货中 ${done}/${lines.length} 项`;
      }
      const arrived = list.filter((c) => c.status === "arrived" || c.status === "warranty" || c.status === "closed").length;
      if (arrived < list.length) return `到货 ${arrived}/${list.length} 份`;
      const ms = list.flatMap((c) => c.milestones);
      const paid = ms.filter((m) => m.status === "paid").length;
      return paid < ms.length ? `已收货 · 付款 ${paid}/${ms.length} 笔` : "已收货 · 待关闭";
    }
    default:
      return "已结束";
  }
}
