// 子合同的跟进时间线：把货物轨（签订 → 交货期 → 货到现场 → 完结）和款项轨（预付 / 发货 / 验收 / 质保）
// 合成一条按时间排的事件列表，过去用实际日期、未来用期限或推算日期，每条都配一句白话说明。
// 纯派生：不落库，合同字段 / 里程碑 / 送货单一变，时间线随之变。
import type { Contract, DeliveryNote, MilestoneKey } from "./types";
import { TODAY, addMonths, daysUntil, fmtDate } from "./date";
import { fmtNum } from "./money";
import { contractTotal, milestoneAmount } from "./rules";

export type TimelineLane = "goods" | "money";
export type TimelineState = "done" | "overdue" | "soon" | "current" | "future" | "tbd";
export type DateKind = "actual" | "deadline" | "estimated" | "planned" | "tbd";

export interface TimelineEvent {
  key: string;
  lane: TimelineLane;
  title: string;
  /** 实际发生日 / 期限 / 推算日；tbd 时为空 */
  date?: string;
  dateKind: DateKind;
  state: TimelineState;
  /** 一句白话：发生了什么 / 该做什么 / 为什么还没启动 */
  desc: string;
  amount?: number;
  mKey?: MilestoneKey;
  /** 可做的动作（登记发票 / 标记已付 / 上传验收单） */
  actions: ("invoice" | "pay" | "acceptance")[];
}

function stateByDue(dueAt: string): TimelineState {
  const d = daysUntil(dueAt);
  if (d < 0) return "overdue";
  if (d <= 7) return "soon";
  return "current";
}

/** 日期列文案：实际发生 → 日期；期限 → 最迟 x；推算 → 预计 x；待定 */
export function dateLabel(e: TimelineEvent): { main: string; hint?: string } {
  if (!e.date || e.dateKind === "tbd") return { main: "待定" };
  const main = fmtDate(e.date, e.date.slice(0, 4) === TODAY.slice(0, 4) ? "short" : "full");
  if (e.dateKind === "deadline") return { main, hint: "最迟" };
  if (e.dateKind === "estimated") return { main, hint: "预计" };
  if (e.dateKind === "planned") return { main, hint: "约定" };
  return { main };
}

export function buildContractTimeline(c: Contract, notes: DeliveryNote[]): TimelineEvent[] {
  const total = contractTotal(c);
  const amt = (ratio: number) => (total != null ? milestoneAmount(total, ratio) : undefined);
  const money = (n: number | undefined) => (n != null ? `¥${fmtNum(n)}` : "金额待定稿");
  const signed = c.status !== "ai_draft" && c.status !== "reviewing" && c.status !== "finalized";
  const myNotes = notes.filter((n) => n.contractId === c.id);
  const arrivedNote = myNotes.find((n) => n.status === "done") ?? myNotes.find((n) => n.status === "in_progress");
  const shippedNote = myNotes.find((n) => n.status === "pending");
  const arrivedAt = c.goodsArrivedAt ?? arrivedNote?.date;
  const arrived = !!arrivedAt || c.status === "arrived" || c.status === "warranty" || c.status === "closed";
  const receivingNote = myNotes.find((n) => n.status === "in_progress");
  const m = (k: MilestoneKey) => c.milestones.find((x) => x.key === k)!;
  const events: TimelineEvent[] = [];

  // 1 签订
  events.push(
    signed
      ? { key: "sign", lane: "goods", title: "合同签订", date: c.signedAt, dateKind: "actual", state: "done", desc: "双方盖章，合同生效，预付款可以支付", actions: [] }
      : {
          key: "sign",
          lane: "goods",
          title: "合同签订",
          dateKind: "tbd",
          state: c.status === "finalized" ? "current" : "future",
          desc: c.status === "finalized" ? "已定稿，等双方盖章后点「标记已签订」" : "先校对定稿，再双方盖章",
          actions: [],
        },
  );

  // 2 预付款
  const m1 = m("M1");
  events.push(
    m1.status === "paid"
      ? {
          key: "M1",
          lane: "money",
          title: "预付款 10%",
          date: m1.paidAt,
          dateKind: "actual",
          state: "done",
          desc: m1.invoice ? `已付，发票 ${m1.invoice.no} 已收` : "已付，卖方发票还没登记",
          amount: amt(0.1),
          mKey: "M1",
          actions: m1.invoice ? [] : ["invoice"],
        }
      : {
          key: "M1",
          lane: "money",
          title: "预付款 10%",
          date: m1.dueAt ?? c.signedAt,
          dateKind: m1.dueAt ? "deadline" : signed ? "planned" : "tbd",
          state: signed ? (m1.dueAt ? stateByDue(m1.dueAt) : "current") : "future",
          desc: signed ? `合同已签订，收到卖方 10% 发票后付款 ${money(amt(0.1))}` : "合同签订后支付",
          amount: amt(0.1),
          mKey: "M1",
          actions: signed ? ["invoice", "pay"] : [],
        },
  );

  // 3 发货款
  const m2 = m("M2");
  events.push(
    m2.status === "paid"
      ? {
          key: "M2",
          lane: "money",
          title: "发货款 50%",
          date: m2.paidAt,
          dateKind: "actual",
          state: "done",
          desc: m2.invoice ? `已付，发票 ${m2.invoice.no} 已收` : "已付，卖方发票还没登记",
          amount: amt(0.5),
          mKey: "M2",
          actions: m2.invoice ? [] : ["invoice"],
        }
      : {
          key: "M2",
          lane: "money",
          title: "发货款 50%",
          date: m2.dueAt ?? c.deliveryDate,
          dateKind: m2.dueAt ? "deadline" : c.deliveryDate ? "estimated" : "tbd",
          state: m2.status === "due" && m2.dueAt ? stateByDue(m2.dueAt) : signed ? "future" : "future",
          desc:
            m2.status === "due"
              ? `卖方发货前要付清 ${money(amt(0.5))}，不付卖方不发货`
              : signed
                ? "卖方通知发货时支付，一般在交货期前"
                : "签订后、卖方发货前支付",
          amount: amt(0.5),
          mKey: "M2",
          actions: m2.status === "due" ? ["invoice", "pay"] : [],
        },
  );

  // 4 交货期
  if (c.deliveryDate) {
    const late = daysUntil(c.deliveryDate);
    events.push(
      arrived
        ? { key: "delivery", lane: "goods", title: "约定交货期", date: c.deliveryDate, dateKind: "planned", state: "done", desc: late < 0 && arrivedAt && arrivedAt > c.deliveryDate ? `货已到，比约定晚 ${daysUntil(arrivedAt, c.deliveryDate)} 天` : "货已按期到场", actions: [] }
        : {
            key: "delivery",
            lane: "goods",
            title: "约定交货期",
            date: c.deliveryDate,
            dateKind: "planned",
            state: late < 0 ? "overdue" : late <= 7 ? "soon" : signed ? "current" : "future",
            desc:
              late < 0
                ? shippedNote
                  ? `已过交货期 ${-late} 天，卖方已发货，预计 ${fmtDate(shippedNote.date)} 到货，到货后在小程序收货`
                  : `已过交货期 ${-late} 天，货还没到，请与卖方经办 ${c.sellerContactName} 确认发货安排`
                : late <= 7
                  ? shippedNote
                    ? `卖方已发货，预计 ${fmtDate(shippedNote.date)} 到货`
                    : `还有 ${late} 天到交货期，提前与卖方确认发货`
                  : "卖方应在此之前把货运到现场",
            actions: [],
          },
    );
  }

  // 5 货到现场
  events.push(
    arrived
      ? {
          key: "arrive",
          lane: "goods",
          title: "货到现场",
          date: arrivedAt,
          dateKind: "actual",
          state: receivingNote ? "current" : "done",
          desc: receivingNote
            ? `送货单收货中 ${receivingNote.lines.filter((l) => l.state !== "unconfirmed").length}/${receivingNote.lines.length} 项，验收款和质保金倒计时从今天起算`
            : "已收货，验收款和质保金的倒计时从这天起算",
          actions: [],
        }
      : shippedNote
        ? { key: "arrive", lane: "goods", title: "货到现场", date: shippedNote.date, dateKind: "estimated", state: "soon", desc: "卖方已发货，到货后在小程序逐行收货", actions: [] }
        : { key: "arrive", lane: "goods", title: "货到现场", dateKind: "tbd", state: "future", desc: "卖方发货后自动生成收货任务；到货那天起，验收款 12 个月、质保金 24 个月倒计时开始", actions: [] },
  );

  // 6 验收款 / 7 质保金：期限 = 到货 + 12 / 24 个月；没到货就按交货期推算
  const basis = arrivedAt ?? c.deliveryDate;
  const tail = (k: MilestoneKey, months: number, title: string, ratio: number, doc: string) => {
    const mm = m(k);
    if (mm.status === "paid") {
      return { key: k, lane: "money" as const, title, date: mm.paidAt, dateKind: "actual" as const, state: "done" as const, desc: mm.invoice ? `已付，发票 ${mm.invoice.no} 已收` : "已付，卖方发票还没登记", amount: amt(ratio), mKey: k, actions: mm.invoice ? [] : (["invoice"] as TimelineEvent["actions"]) };
    }
    const due = mm.dueAt ?? (basis ? addMonths(basis, months) : undefined);
    const kind: DateKind = mm.dueAt ? "deadline" : arrivedAt ? "deadline" : basis ? "estimated" : "tbd";
    const state: TimelineState = mm.status === "due" && due ? stateByDue(due) : arrived && due ? "current" : "future";
    const desc =
      mm.status === "due"
        ? `凭${doc}付款 ${money(amt(ratio))}，${due ? `最迟 ${fmtDate(due, "full")}` : ""}`
        : arrived
          ? `货到后 ${months} 个月内凭${doc}付清，${due ? `最迟 ${fmtDate(due, "full")}` : ""}`
          : `货到后 ${months} 个月内凭${doc}付清；货还没到，倒计时没启动`;
    const actions: TimelineEvent["actions"] = mm.status === "due" ? ["invoice", "pay"] : arrived && k === "M3" ? ["acceptance"] : [];
    return { key: k, lane: "money" as const, title, date: due, dateKind: kind, state, desc, amount: amt(ratio), mKey: k, actions };
  };
  events.push(tail("M3", 12, "验收款 30%", 0.3, "《交付验收合格单》"));
  events.push(tail("M4", 24, "质保金 10%", 0.1, "《质保验收单》"));

  // 8 完结
  const m4 = m("M4");
  events.push(
    c.status === "closed"
      ? { key: "close", lane: "goods", title: "订单关闭", date: m4.paidAt, dateKind: "actual", state: "done", desc: "四笔款项付清，发票开足 100%，合同归档", actions: [] }
      : { key: "close", lane: "goods", title: "订单关闭", dateKind: "tbd", state: "future", desc: "质保金付清、发票开足后关闭", actions: [] },
  );

  return events;
}
