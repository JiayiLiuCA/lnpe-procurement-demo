"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { overdueContracts, paymentPlan } from "@/lib/derive";
import { dueTone } from "@/lib/rules";
import { fmtDate, overdueDays } from "@/lib/date";
import { Money } from "@/components/ui/Money";
import { useAppStore } from "@/store/useAppStore";
import { projects as allProjects } from "@/fixtures/projects";
import { supplierById } from "@/fixtures/suppliers";

export function PaymentPlanPanel() {
  const contracts = useAppStore((s) => s.contracts);
  const deliveryNotes = useAppStore((s) => s.deliveryNotes);
  const rows = paymentPlan(contracts);

  // 交货逾期提醒（只提示，不做催办动作）
  const overdue = overdueContracts(contracts, deliveryNotes);

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
      {overdue.length > 0 && (
        <div className="bg-danger-bg mt-auto flex flex-col gap-1.5 px-4.5 py-3">
          {overdue.map((c) => (
            <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center gap-2.5">
              <AlertTriangle size={15} strokeWidth={1.8} className="text-danger-deep shrink-0" />
              <span className="text-danger-deep min-w-0 flex-1 truncate text-[12.5px]">
                {supplierById(c.supplierId).short}合同 交货逾期 <span className="font-bold">{overdueDays(c.deliveryDate!)}</span> 天 · 交货期 {fmtDate(c.deliveryDate!)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
