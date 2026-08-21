"use client";

import { Check } from "lucide-react";
import type { Contract, Milestone } from "@/lib/types";
import { contractTotal, milestoneAmount } from "@/lib/rules";
import { daysUntil, fmtDate } from "@/lib/date";
import { Money } from "@/components/ui/Money";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAppStore } from "@/store/useAppStore";

function StatusDot({ m }: { m: Milestone }) {
  if (m.status === "paid") {
    return (
      <span className="bg-success flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
        <Check size={11} strokeWidth={3.2} className="text-white" />
      </span>
    );
  }
  if (m.status === "due" || m.status === "pending") {
    return <span className="border-primary h-5 w-5 shrink-0 rounded-full border-[2.5px] bg-white" />;
  }
  return <span className="bg-line h-5 w-5 shrink-0 rounded-full" />;
}

function StatusCell({ m }: { m: Milestone }) {
  if (m.status === "paid") return <StatusPill tone="success">已付 {fmtDate(m.paidAt)}</StatusPill>;
  if (m.status === "due" && m.dueAt) {
    const d = daysUntil(m.dueAt);
    if (d < 0) return <StatusPill tone="danger">逾期 {-d} 天</StatusPill>;
    if (d <= 7) return <StatusPill tone="warning">{d} 天后到期（{fmtDate(m.dueAt)}）</StatusPill>;
    return <StatusPill tone="neutral">{fmtDate(m.dueAt)} 到期</StatusPill>;
  }
  if (m.status === "pending") return <StatusPill tone="neutral">待触发</StatusPill>;
  return <StatusPill tone="neutral">未开始</StatusPill>;
}

function InfoCell({ c, m, amount }: { c: Contract; m: Milestone; amount: number }) {
  if (m.invoice) {
    return (
      <span>
        发票 {m.invoice.ratioLabel} · <Money value={m.invoice.amount} /> · {m.invoice.no}{" "}
        {m.invoice.receivedAt && <span className="text-success-deep">已收 {fmtDate(m.invoice.receivedAt)}</span>}
      </span>
    );
  }
  if (m.key === "M3") {
    return (
      <span>
        期限：验收合格或货到现场 +12 个月，以先到为准
        {m.dueAt ? (
          <>
            {" "}
            · <span className="text-warning-deep font-medium">{fmtDate(m.dueAt)} 到期</span>
          </>
        ) : (
          <>
            {" "}
            · <span className="text-sub">未到货，倒计时未启动</span>
          </>
        )}
      </span>
    );
  }
  if (m.key === "M4") {
    return (
      <span>
        期限：质保验收或货到现场 +24 个月，以先到为准
        {m.dueAt ? (
          <>
            {" "}
            · <span className="text-sub tabular-nums">{fmtDate(m.dueAt, "full")} 到期（剩 {daysUntil(m.dueAt)} 天）</span>
          </>
        ) : (
          <> · 到期前累计开足 100% 增值税专票</>
        )}
      </span>
    );
  }
  if (m.status === "paid") {
    return (
      <span>
        未登记发票 · 应开 {Math.round(m.ratio * 100)}% · <Money value={amount} />
      </span>
    );
  }
  return <span className="text-sub">{c.status === "ai_draft" || c.status === "reviewing" ? "定稿后启动" : "—"}</span>;
}

export function MilestoneTable({
  contract,
  onRegisterInvoice,
}: {
  contract: Contract;
  onRegisterInvoice: (mKey: Milestone["key"]) => void;
}) {
  const c = contract;
  const total = contractTotal(c);
  const markMilestonePaid = useAppStore((s) => s.markMilestonePaid);
  const pushToast = useAppStore((s) => s.pushToast);

  return (
    <div className="border-line-soft flex flex-col overflow-hidden rounded-[10px] border">
      {c.milestones.map((m, i) => {
        const amount = total != null ? milestoneAmount(total, m.ratio) : 0;
        const highlight = m.status === "due" || m.status === "pending";
        return (
          <div
            key={m.key}
            className={`flex items-center gap-3.5 px-4 py-3 ${i < c.milestones.length - 1 ? "border-page border-b" : ""} ${
              highlight ? "bg-[#FBFAF9]" : ""
            }`}
          >
            <StatusDot m={m} />
            <div className="w-[150px] shrink-0">
              <div className="text-[13.5px] font-bold">
                {m.key} {m.label} <span className="text-sub font-medium">{Math.round(m.ratio * 100)}%</span>
              </div>
              <div className="text-sub text-[11.5px]">{m.condition}</div>
            </div>
            <div className="w-[110px] shrink-0 text-sm font-bold">
              {total != null ? <Money value={amount} /> : <span className="text-faint text-xs font-medium">待定</span>}
            </div>
            <div className="w-[150px] shrink-0">
              <StatusCell m={m} />
            </div>
            <div className="text-ink-2 min-w-0 flex-1 text-[12.5px]">
              <InfoCell c={c} m={m} amount={amount} />
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              {m.status === "due" && !m.invoice && (
                <button type="button" className="text-primary-hover cursor-pointer text-xs font-medium" onClick={() => onRegisterInvoice(m.key)}>
                  登记发票
                </button>
              )}
              {m.status === "due" && (
                <button
                  type="button"
                  className="text-primary-hover cursor-pointer text-xs font-medium"
                  onClick={() => {
                    markMilestonePaid(c.id, m.key);
                    pushToast(`${m.key} ${m.label} 已标记为已付`);
                  }}
                >
                  标记已付
                </button>
              )}
              {m.status === "paid" && !m.invoice && (
                <button type="button" className="text-primary-hover cursor-pointer text-xs font-medium" onClick={() => onRegisterInvoice(m.key)}>
                  登记发票
                </button>
              )}
              {m.status === "pending" && m.key === "M3" && (
                <button
                  type="button"
                  className="text-primary-hover cursor-pointer text-xs font-medium"
                  onClick={() => pushToast("演示版：验收单上传已略过")}
                >
                  上传验收单
                </button>
              )}
              {m.status === "paid" && m.invoice && <span className="text-primary-hover text-xs">凭证</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
