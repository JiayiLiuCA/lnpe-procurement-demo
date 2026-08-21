"use client";

// 合同列表：状态筛选芯片 + 项目筛选下拉 + 表格
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar, Crumb } from "@/components/shell/Topbar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Money } from "@/components/ui/Money";
import { CountdownChip } from "@/components/ui/CountdownChip";
import { useAppStore } from "@/store/useAppStore";
import { CONTRACT_STATUS_LABEL, contractTotal, paidRatio } from "@/lib/rules";
import type { ContractStatus } from "@/lib/types";
import { supplierById } from "@/fixtures/suppliers";
import { contractSubPill } from "@/components/pc/ContractCard";

const STATUS_FILTERS: (ContractStatus | "all")[] = [
  "all",
  "ai_draft",
  "reviewing",
  "finalized",
  "signed",
  "executing",
  "arrived",
  "warranty",
  "closed",
];

export default function ContractsPage() {
  const router = useRouter();
  const contracts = useAppStore((s) => s.contracts);
  const projects = useAppStore((s) => s.projects);
  const deliveryNotes = useAppStore((s) => s.deliveryNotes);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const filtered = contracts.filter(
    (c) => (statusFilter === "all" || c.status === statusFilter) && (projectFilter === "all" || c.projectId === projectFilter),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar crumbs={<Crumb>合同管理</Crumb>} />
      <div className="flex flex-1 flex-col gap-3.5 p-6">
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`cursor-pointer rounded-full px-3 py-1.25 text-[12.5px] font-medium ${
                statusFilter === f ? "bg-primary text-white" : "border-line text-ink-2 border bg-white"
              }`}
            >
              {f === "all" ? "全部" : CONTRACT_STATUS_LABEL[f]}
            </button>
          ))}
          <div className="flex-1" />
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="border-line rounded-ctl text-ink-2 cursor-pointer border bg-white px-2.5 py-1.5 text-[12.5px] outline-none"
          >
            <option value="all">全部项目</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="border-line rounded-card flex flex-col overflow-hidden border bg-white">
          <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-4.5 py-2 text-xs font-medium">
            <div className="w-[190px]">合同号</div>
            <div className="w-[90px]">项目</div>
            <div className="w-[170px]">供应商</div>
            <div className="flex-1">摘要</div>
            <div className="w-[110px] text-right">金额</div>
            <div className="w-[80px] text-right">已付</div>
            <div className="w-[110px] pl-4">状态</div>
            <div className="w-[150px]">交货期</div>
          </div>
          {filtered.map((c, i) => {
            const p = projects.find((x) => x.id === c.projectId);
            const total = contractTotal(c);
            const partial = deliveryNotes.some((n) => n.contractIds.includes(c.id) && n.status === "in_progress");
            const sub = contractSubPill(c, partial);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => router.push(`/contracts/${c.id}`)}
                className={`hover:bg-page/60 flex cursor-pointer items-center px-4.5 py-3 text-left text-[13px] ${
                  i < filtered.length - 1 ? "border-page border-b" : ""
                }`}
              >
                <div className="w-[190px] font-bold tabular-nums">{c.no}</div>
                <div className="text-ink-2 w-[90px] tabular-nums">{p?.code}</div>
                <div className="text-ink-2 w-[170px] truncate pr-2">{supplierById(c.supplierId).name}</div>
                <div className="text-ink-2 flex-1 truncate pr-2 text-[12.5px]">{c.summary}</div>
                <div className="w-[110px] text-right font-bold">
                  {total != null ? <Money value={total} /> : <span className="text-faint text-xs font-medium">待补充</span>}
                </div>
                <div className="text-ink-2 w-[80px] text-right tabular-nums">
                  {paidRatio(c) > 0 ? `${Math.round(paidRatio(c) * 100)}%` : "—"}
                </div>
                <div className="w-[110px] pl-4">
                  <StatusPill tone={sub.tone}>{sub.text}</StatusPill>
                </div>
                <div className="w-[150px]">
                  <CountdownChip dueAt={c.deliveryDate} />
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <div className="text-faint py-8 text-center text-[13px]">无符合条件的合同</div>}
        </div>
      </div>
    </div>
  );
}
