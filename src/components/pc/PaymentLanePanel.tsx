"use client";

// 付款开票面板：点项目头部款项轨的某个节点后，在步骤条下方展开。
// 列出本项目每份已签子合同在这一笔款上的状态（已付 / 到期 / 逾期 / 待触发）、发票与动作。
// 发票 OCR 核验仍在合同页完成，这里只给入口。
import Link from "next/link";
import { X } from "lucide-react";
import type { Contract, Milestone, MilestoneKey } from "@/lib/types";
import { LANE_STEP, STEP_LABELS, isSignedContract } from "@/lib/steps";
import { contractTotal, milestoneAmount } from "@/lib/rules";
import { daysUntil, fmtDate } from "@/lib/date";
import { Money } from "@/components/ui/Money";
import { StatusPill } from "@/components/ui/StatusPill";
import { Btn } from "@/components/ui/Btn";
import { useAppStore } from "@/store/useAppStore";
import { supplierById } from "@/fixtures/suppliers";

const META: Record<MilestoneKey, { label: string; ratio: number; trigger: string; note: string }> = {
  M1: { label: "预付款", ratio: 0.1, trigger: "合同签订后支付", note: "签订即触发，交财务付款" },
  M2: { label: "发货款", ratio: 0.5, trigger: "卖方发货前支付", note: "一般在这一笔开票，收到发票后 OCR 核验登记" },
  M3: { label: "验收款", ratio: 0.3, trigger: "凭《交付验收合格单》", note: "不迟于货到现场 12 个月" },
  M4: { label: "质保金", ratio: 0.1, trigger: "凭《质保验收单》30 天内付清", note: "不迟于货到现场 24 个月，到期前累计开足 100% 专票" },
};

/** 某一笔款的状态标签（已付 / 逾期 / 到期 / 待触发 / 未开始），订单关闭步的尾款表也用 */
export function MilestonePill({ m }: { m: Milestone }) {
  if (m.status === "paid") return <StatusPill tone="success">已付 {fmtDate(m.paidAt)}</StatusPill>;
  if (m.status === "due" && m.dueAt) {
    const d = daysUntil(m.dueAt);
    if (d < 0) return <StatusPill tone="danger">逾期 {-d} 天</StatusPill>;
    if (d <= 7) return <StatusPill tone="warning">{d} 天后到期</StatusPill>;
    return <StatusPill tone="neutral">{fmtDate(m.dueAt)} 到期</StatusPill>;
  }
  if (m.status === "due") return <StatusPill tone="warning">到期未付</StatusPill>;
  if (m.status === "pending") return <StatusPill tone="neutral">待触发</StatusPill>;
  return <StatusPill tone="neutral">未开始</StatusPill>;
}

export function PaymentLanePanel({ contracts, mKey, onClose }: { contracts: Contract[]; mKey: MilestoneKey; onClose: () => void }) {
  const markMilestonePaid = useAppStore((s) => s.markMilestonePaid);
  const pushToast = useAppStore((s) => s.pushToast);
  const meta = META[mKey];
  const signed = contracts.filter(isSignedContract);
  const drafts = contracts.length - signed.length;
  const rows = signed
    .map((c) => ({ c, m: c.milestones.find((x) => x.key === mKey) }))
    .filter((r): r is { c: Contract; m: Milestone } => !!r.m);
  const paidCount = rows.filter((r) => r.m.status === "paid").length;
  const amountTotal = rows.reduce((s, r) => s + (contractTotal(r.c) != null ? milestoneAmount(contractTotal(r.c)!, r.m.ratio) : 0), 0);
  const amountPaid = rows.filter((r) => r.m.status === "paid").reduce((s, r) => s + (contractTotal(r.c) != null ? milestoneAmount(contractTotal(r.c)!, r.m.ratio) : 0), 0);

  return (
    <div className="border-line rounded-card border bg-white">
      <div className="border-line-soft flex items-center gap-3 border-b px-5 py-3">
        <div className="text-[15px] font-bold">
          付款开票 · {meta.label} {Math.round(meta.ratio * 100)}%
        </div>
        <div className="text-sub text-xs">
          对齐步骤「{STEP_LABELS[LANE_STEP[mKey] - 1]}」 · 触发：{meta.trigger} · {meta.note}
        </div>
        <div className="flex-1" />
        <div className="text-ink-2 text-[12.5px] tabular-nums">
          已付 <span className="text-ink font-bold">{paidCount}</span>/{rows.length} 份 · <Money value={amountPaid} className="font-bold" /> / <Money value={amountTotal} />
        </div>
        <button type="button" onClick={onClose} className="text-sub hover:text-ink ml-1 cursor-pointer" title="收起">
          <X size={16} strokeWidth={1.8} />
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="text-faint px-5 py-6 text-center text-[12.5px]">尚无已签子合同，签订后这里会列出每份合同的{meta.label}</div>
      ) : (
        <div className="flex flex-col">
          {rows.map(({ c, m }, i) => {
            const total = contractTotal(c);
            const amount = total != null ? milestoneAmount(total, m.ratio) : 0;
            return (
              <div key={c.id} className={`flex items-center gap-3.5 px-5 py-2.75 text-[13px] ${i < rows.length - 1 ? "border-page border-b" : ""}`}>
                <Link href={`/contracts/${c.id}`} className="text-info-deep w-[190px] shrink-0 font-medium tabular-nums hover:underline">
                  {c.no}
                </Link>
                <div className="text-ink-2 w-[120px] shrink-0 truncate">{supplierById(c.supplierId).short}</div>
                <div className="w-[110px] shrink-0 font-bold">
                  <Money value={amount} />
                </div>
                <div className="w-[130px] shrink-0">
                  <MilestonePill m={m} />
                </div>
                <div className="text-ink-2 min-w-0 flex-1 truncate text-[12.5px]">
                  {m.invoice ? (
                    <>
                      发票 {m.invoice.no} · {m.invoice.ratioLabel}
                      {m.invoice.receivedAt && <span className="text-success-deep"> · 已收 {fmtDate(m.invoice.receivedAt)}</span>}
                    </>
                  ) : m.status === "paid" || m.status === "due" ? (
                    <span className="text-warning-deep">未登记发票</span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.status === "due" && (
                    <Btn
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        markMilestonePaid(c.id, m.key);
                        pushToast(`${c.no} ${m.label} 已标记为已付`);
                      }}
                    >
                      标记已付
                    </Btn>
                  )}
                  {(m.status === "due" || m.status === "paid") && !m.invoice && (
                    <Link href={`/contracts/${c.id}`} className="text-primary-hover text-xs font-medium">
                      去登记发票
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {drafts > 0 && <div className="text-faint border-line-soft border-t px-5 py-2 text-[11.5px]">另有 {drafts} 份草稿合同未签订，签订后才产生付款节点</div>}
    </div>
  );
}
