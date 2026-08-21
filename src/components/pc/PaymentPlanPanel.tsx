"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { paymentPlan } from "@/lib/derive";
import { dueTone, penalty } from "@/lib/rules";
import { fmtDate, overdueDays } from "@/lib/date";
import { Money } from "@/components/ui/Money";
import { useAppStore } from "@/store/useAppStore";
import { projects as allProjects } from "@/fixtures/projects";

export function PaymentPlanPanel() {
  const contracts = useAppStore((s) => s.contracts);
  const rows = paymentPlan(contracts);

  // 开山逾期违约金（派生：7,392,000 × 82 × 1‰ = 606,144）
  const kaishan = contracts.find((c) => c.id === "c-kaishan-1");
  const kaishanOverdue = kaishan?.deliveryDate ? overdueDays(kaishan.deliveryDate) : 0;
  const kaishanPenalty = kaishan?.amountInclTax ? penalty(kaishan.amountInclTax, kaishanOverdue) : 0;

  return (
    <div className="border-line rounded-card flex flex-1 flex-col overflow-hidden border bg-white">
      <div className="border-line-soft flex items-center justify-between border-b px-4.5 py-3.5">
        <div className="text-[15px] font-bold">近 30 天付款计划</div>
        <span className="text-primary-hover text-[12.5px]">付款台账</span>
      </div>
      <div className="flex flex-col py-1">
        {rows.map((r) => {
          const project = allProjects.find((p) => p.id === r.contract.projectId);
          const tone = dueTone(r.dueAt);
          return (
            <Link
              key={`${r.contract.id}-${r.milestone.key}`}
              href={`/contracts/${r.contract.id}`}
              className="border-page hover:bg-page/60 flex items-center gap-3 border-b px-4.5 py-2.75"
            >
              <div className="w-11 shrink-0 text-center">
                <div
                  className={`text-[15px] font-bold tabular-nums ${
                    tone === "danger" ? "text-danger-deep" : tone === "warning" ? "text-warning-deep" : "text-ink-2"
                  }`}
                >
                  {fmtDate(r.dueAt)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium tabular-nums">
                  …{r.contract.no.slice(-14)} · {r.milestone.label} {Math.round(r.milestone.ratio * 100)}%
                </div>
                <div className="text-sub text-[11.5px]">
                  {project?.name} · {project?.code}
                </div>
              </div>
              <Money value={r.amount} className="text-[13.5px] font-bold" />
            </Link>
          );
        })}
      </div>
      {kaishan && kaishanOverdue > 0 && (
        <div className="bg-danger-bg mt-auto flex items-center gap-2.5 px-4.5 py-3">
          <AlertTriangle size={17} strokeWidth={1.8} className="text-danger-deep shrink-0" />
          <div className="text-danger-deep flex-1 text-[12.5px]">
            开山合同交货逾期 {kaishanOverdue} 天，累计违约金约 <Money value={kaishanPenalty} className="font-bold" />
            （按 1‰/日）
          </div>
        </div>
      )}
    </div>
  );
}
