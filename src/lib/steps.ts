// 项目步骤模型（2026-09-04 定稿）：货物轨 7 步 + 付款开票轨。
// 一切由清单 / 合同 / 送货单派生，不落库：当前步 = 最早未完成的步；
// 后面步骤已有合同走到时显示进度（青色半圆），逾期 / 异常显示红色感叹号。
import type { Checklist, Contract, DeliveryNote, MilestoneKey, Project } from "./types";
import { checklistStats, overdueContracts, projectContracts } from "./derive";
import { contractTotal, milestoneAmount } from "./rules";
import { daysUntil, fmtDate } from "./date";

export const STEP_LABELS = ["订单接收", "采购清单", "订货安排", "子合同", "交货跟进", "现场收货", "订单关闭"] as const;
export type StepNo = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const STEP_NOS: StepNo[] = [1, 2, 3, 4, 5, 6, 7];

/** 前 4 步项目级一次做完；后 3 步按子合同逐份走，项目上显示份数 */
export const STEP_GROUPS: { label: string; from: StepNo; to: StepNo; hint: string }[] = [
  { label: "采购准备", from: 1, to: 4, hint: "项目级 · 一次做完" },
  { label: "合同跟进", from: 5, to: 7, hint: "按子合同逐份走" },
];

export type StepMark = "done" | "current" | "partial" | "issue" | "idle";

export interface StepState {
  no: StepNo;
  label: string;
  mark: StepMark;
  /** 该步的项目级进度小字（覆盖 54/60、在途 3 份 · 逾期 1 份…） */
  note: string;
}

export interface ProjectTag {
  text: string;
  tone: "info" | "danger" | "neutral";
}

export interface ProjectProgress {
  /** null = 项目已关闭 */
  current: StepNo | null;
  states: StepState[];
  /** 列表「进展」列：当前步的一句话进度 */
  summary: string;
  /** 项目头部标签：当前步名（青）+ 逾期 / 异常（红）；已关闭只有「已结束」 */
  tags: ProjectTag[];
}

/* ------------------------------------------------------------------ 合同在货物轨上的位置 */

export type ContractStage = "draft" | "delivering" | "receiving" | "settling" | "closed";

export const CONTRACT_STAGE_ORDER: ContractStage[] = ["draft", "delivering", "receiving", "settling", "closed"];

export const CONTRACT_STAGE_LABEL: Record<ContractStage, string> = {
  draft: "子合同",
  delivering: "交货跟进",
  receiving: "现场收货",
  settling: "结算",
  closed: "完结",
};

/**
 * 合同当前走到货物轨的哪一段：
 * 拟稿 / 校对 / 定稿 → 子合同；签订后（executing）无送货单 → 交货跟进；
 * 送货单已在收货（in_progress）→ 现场收货；已到货 / 质保期 → 结算；已完结 → 完结。
 * 卖方刚发出、送货单还是待收货（pending）的仍算交货跟进（与逾期口径一致）。
 */
export function contractStage(c: Contract, notes: DeliveryNote[]): ContractStage {
  if (c.status === "closed") return "closed";
  if (c.status === "arrived" || c.status === "warranty") return "settling";
  if (c.status === "executing") {
    return notes.some((n) => n.contractIds.includes(c.id) && n.status === "in_progress") ? "receiving" : "delivering";
  }
  return "draft";
}

export function isSignedContract(c: Contract): boolean {
  return c.status !== "ai_draft" && c.status !== "reviewing" && c.status !== "finalized";
}

/* ------------------------------------------------------------------ 项目步骤 */

/** 与项目相关的送货单：按项目号或按其子合同关联（一张送货单可跨项目） */
export function projectDeliveryNotes(project: Project, contracts: Contract[], notes: DeliveryNote[]): DeliveryNote[] {
  const list = projectContracts(contracts, project.id);
  return notes.filter((n) => n.projectIds.includes(project.id) || n.contractIds.some((cid) => list.some((c) => c.id === cid)));
}

export function projectProgress(project: Project, checklists: Checklist[], contracts: Contract[], notes: DeliveryNote[]): ProjectProgress {
  const cls = checklists.filter((cl) => cl.projectId === project.id);
  const list = projectContracts(contracts, project.id);
  const st = cls.reduce(
    (acc, cl) => {
      const s = checklistStats(cl);
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
  const approved = cls.filter((cl) => cl.status === "已批准").length;
  const stages = list.map((c) => contractStage(c, notes));
  const drafts = stages.filter((s) => s === "draft").length;
  const delivering = stages.filter((s) => s === "delivering").length;
  const signed = list.length - drafts;
  const settlingPlus = stages.filter((s) => s === "settling" || s === "closed").length;
  const overdue = overdueContracts(list, notes);
  const pNotes = projectDeliveryNotes(project, contracts, notes);
  // 只统计已开始收货（in_progress / done）的送货单行；卖方刚发出、还没到场的只报「待收货 n 张」
  const myLines = pNotes
    .filter((n) => n.status !== "pending")
    .flatMap((n) => n.lines.filter((l) => l.projectCode === project.code || list.some((c) => c.id === l.contractId)));
  const linesDone = myLines.filter((l) => l.state !== "unconfirmed").length;
  const excOpen = myLines.filter((l) => l.state === "exception" && !l.exception?.resolvedAt).length;
  const pendingNotes = pNotes.filter((n) => n.status === "pending").length;
  const tailDue = list.flatMap((c) => c.milestones).filter((m) => m.status === "due").length;
  const closed = !!project.closedAt;

  // 完成条件（每一步都以前一步完成为前提）
  const done: Record<StepNo, boolean> = { 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false };
  done[2] = cls.length > 0 && approved === cls.length;
  done[3] = done[2] && st.pending === 0;
  done[4] = done[3] && st.contracted >= st.need && drafts === 0;
  done[5] = done[4] && stages.every((s) => s !== "draft" && s !== "delivering");
  done[6] = done[5] && stages.every((s) => s === "settling" || s === "closed") && excOpen === 0 && pNotes.every((n) => n.status === "done");
  done[7] = closed;

  const current: StepNo | null = closed ? null : (STEP_NOS.find((n) => !done[n]) ?? 7);

  const notesByStep: Record<StepNo, string> = {
    1: "项目合同已入库",
    2: cls.length === 0 ? "待技术部提供清单" : approved < cls.length ? `审核 ${approved}/${cls.length} 批` : `已批准 ${cls.length} 批`,
    3: st.pending > 0 ? `待核对 ${st.pending} 项` : `库存 ${st.allocated} · 生产 ${st.produce} · 采购 ${st.need}`,
    4: `覆盖 ${st.contracted}/${st.need}${drafts > 0 ? ` · 待签 ${drafts} 份` : signed > 0 ? ` · 已签 ${signed} 份` : ""}`,
    5:
      list.length === 0
        ? ""
        : delivering > 0
          ? `在途 ${delivering} 份${overdue.length > 0 ? ` · 逾期 ${overdue.length} 份` : ""}`
          : signed > 0
            ? `已到 ${signed} 份`
            : "",
    6:
      myLines.length > 0
        ? `收货 ${linesDone}/${myLines.length} 项${excOpen > 0 ? ` · 异常 ${excOpen} 项` : ""}`
        : pendingNotes > 0
          ? `待收货 ${pendingNotes} 张`
          : "",
    7: closed ? `已结束 ${fmtDate(project.closedAt)}` : settlingPlus > 0 ? (tailDue > 0 ? `待付 ${tailDue} 笔` : `已到货 ${settlingPlus} 份`) : "",
  };

  const issueAt = (n: StepNo) => (n === 5 ? overdue.length > 0 : n === 6 ? excOpen > 0 : false);
  const progressAt = (n: StepNo) =>
    n === 4 ? list.length > 0 : n === 5 ? signed > 0 : n === 6 ? pNotes.length > 0 || settlingPlus > 0 : n === 7 ? settlingPlus > 0 : false;

  const states: StepState[] = STEP_NOS.map((n) => {
    let mark: StepMark;
    if (closed || (current !== null && n < current)) mark = "done";
    else if (n === current) mark = issueAt(n) ? "issue" : "current";
    else mark = issueAt(n) ? "issue" : progressAt(n) ? "partial" : "idle";
    return { no: n, label: STEP_LABELS[n - 1], mark, note: notesByStep[n] };
  });

  let summary: string;
  if (closed) summary = notesByStep[7];
  else if (current === 7) summary = tailDue > 0 ? `待付 ${tailDue} 笔 · 可关闭` : "可关闭";
  else summary = notesByStep[current ?? 7];

  const tags: ProjectTag[] = closed
    ? [{ text: "已结束", tone: "neutral" }]
    : [
        { text: STEP_LABELS[(current ?? 7) - 1], tone: "info" },
        ...(overdue.length > 0
          ? [{ text: `交货逾期 ${Math.max(...overdue.map((c) => -daysUntil(c.deliveryDate!)))} 天`, tone: "danger" as const }]
          : []),
        ...(excOpen > 0 ? [{ text: `收货异常 ${excOpen} 项`, tone: "danger" as const }] : []),
      ];

  return { current, states, summary, tags };
}

/* ------------------------------------------------------------------ 付款开票轨 */

export interface LaneNode {
  key: MilestoneKey;
  label: string;
  ratio: number;
  /** 对齐的货物步骤：预付款→子合同、发货款→交货跟进、验收款→现场收货、质保金→订单关闭 */
  step: StepNo;
  /** 已签子合同份数（草稿不计） */
  total: number;
  paid: number;
  due: number;
  overdue: number;
  invoiced: number;
  amountPaid: number;
  amountTotal: number;
}

export const LANE_STEP: Record<MilestoneKey, StepNo> = { M1: 4, M2: 5, M3: 6, M4: 7 };
const LANE_META: Record<MilestoneKey, { label: string; ratio: number }> = {
  M1: { label: "预付款", ratio: 0.1 },
  M2: { label: "发货款", ratio: 0.5 },
  M3: { label: "验收款", ratio: 0.3 },
  M4: { label: "质保金", ratio: 0.1 },
};

export function paymentLane(contracts: Contract[]): LaneNode[] {
  const signed = contracts.filter(isSignedContract);
  return (["M1", "M2", "M3", "M4"] as MilestoneKey[]).map((key) => {
    const node: LaneNode = {
      key,
      ...LANE_META[key],
      step: LANE_STEP[key],
      total: signed.length,
      paid: 0,
      due: 0,
      overdue: 0,
      invoiced: 0,
      amountPaid: 0,
      amountTotal: 0,
    };
    for (const c of signed) {
      const m = c.milestones.find((x) => x.key === key);
      if (!m) continue;
      const total = contractTotal(c);
      const amount = total != null ? milestoneAmount(total, m.ratio) : 0;
      node.amountTotal += amount;
      if (m.status === "paid") {
        node.paid += 1;
        node.amountPaid += amount;
      } else if (m.status === "due") {
        node.due += 1;
        if (m.dueAt && daysUntil(m.dueAt) < 0) node.overdue += 1;
      }
      if (m.invoice) node.invoiced += 1;
    }
    return node;
  });
}
