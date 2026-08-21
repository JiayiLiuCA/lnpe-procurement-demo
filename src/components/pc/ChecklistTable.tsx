"use client";

import Link from "next/link";
import { Check, FileText } from "lucide-react";
import type { ChecklistRow, Sheet } from "@/lib/types";
import { sheetStats } from "@/lib/derive";
import { StatusPill } from "@/components/ui/StatusPill";
import { CollapsibleText } from "@/components/ui/CollapsibleText";
import { useAppStore } from "@/store/useAppStore";
import { contractSubPill } from "./ContractCard";
import { supplierById } from "@/fixtures/suppliers";

function qtyText(r: ChecklistRow): string {
  return typeof r.qty === "number" ? `${r.qty} ${r.unit}` : `${r.qty} ${r.unit !== "件" ? r.unit : ""}`.trim() || "若干";
}

function AllocCell({ r }: { r: ChecklistRow }) {
  const { allocated, need, status } = r.alloc;
  if (status === "allocated") return <StatusPill tone="success">已分配 {allocated}</StatusPill>;
  if (status === "need") {
    return <StatusPill tone="primarySoft">需采购 {typeof r.qty === "number" ? need : "若干"}</StatusPill>;
  }
  if (status === "partial") {
    return (
      <div className="flex flex-col gap-1">
        <StatusPill tone="success">已分配 {allocated}</StatusPill>
        <StatusPill tone="primarySoft">需采购 {need}</StatusPill>
      </div>
    );
  }
  return <StatusPill tone="neutral">待核对</StatusPill>;
}

function ContractCell({ contractId }: { contractId?: string }) {
  const contracts = useAppStore((s) => s.contracts);
  if (!contractId) return <StatusPill tone="neutral">未生成</StatusPill>;
  const c = contracts.find((x) => x.id === contractId);
  if (!c) return <StatusPill tone="neutral">未生成</StatusPill>;
  const sub = contractSubPill(c, false);
  return (
    <Link href={`/contracts/${c.id}`} className="block">
      <div className="text-info-deep text-xs font-medium tabular-nums">…{c.no.slice(-14)}</div>
      <div className="text-sub text-[11.5px]">
        {supplierById(c.supplierId).short} · {sub.text}
      </div>
    </Link>
  );
}

function RowLine({
  r,
  sheetName,
  selected,
  onToggle,
}: {
  r: ChecklistRow;
  sheetName: string;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const selectable = r.alloc.status !== "allocated";
  return (
    <div className={`border-page flex items-start border-b px-4 py-3 text-[13px] ${selected ? "bg-[#FBFAF9]" : ""}`}>
      <div className="w-[34px] pt-0.5">
        <button
          type="button"
          disabled={!selectable}
          onClick={() => onToggle(r.id)}
          className={`flex h-[15px] w-[15px] cursor-pointer items-center justify-center rounded border-[1.5px] disabled:cursor-not-allowed disabled:opacity-40 ${
            selected ? "bg-primary border-primary" : "border-[#CFCCCA] bg-white"
          }`}
        >
          {selected && <Check size={10} strokeWidth={3.4} className="text-white" />}
        </button>
      </div>
      <div className="text-sub w-10 pt-0.5">{r.seq}</div>
      <div className="w-[250px] pr-3">
        <div className="font-medium">{r.name}</div>
        <div className="text-sub text-xs">
          {r.spec}
          {r.material && r.material !== "—" ? ` · ${r.material}` : ""}
        </div>
      </div>
      <div className="w-20 pt-0.5 tabular-nums">{qtyText(r)}</div>
      <div className="min-w-0 flex-1 pr-3.5">
        <CollapsibleText
          text={r.techNote}
          lead={r.brands ? <span className="text-ink font-medium">品牌：{r.brands}</span> : undefined}
          footer={
            <>
              <span className="inline-flex items-center gap-1.5">
                <FileText size={13} strokeWidth={1.8} />
                附件：{r.hasDrawing ? "图纸 1 份" : "无图纸"}
              </span>
              <span>
                来源 sheet：{sheetName} · 第 {r.seq} 行
              </span>
            </>
          }
        />
      </div>
      <div className="w-[130px]">
        <AllocCell r={r} />
      </div>
      <div className="w-[180px]">
        <ContractCell contractId={r.contractId} />
      </div>
    </div>
  );
}

export function ChecklistTable({
  sheet,
  selection,
  onToggle,
}: {
  sheet: Sheet;
  selection: Set<string>;
  onToggle: (id: string) => void;
}) {
  const std = sheet.rows.filter((r) => r.section === "标准件");
  const custom = sheet.rows.filter((r) => r.section === "自制件");
  const stats = sheetStats(sheet);

  const sectionHeader = (title: string, rows: ChecklistRow[]) => {
    const allocated = rows.filter((r) => r.alloc.status === "allocated" || r.alloc.status === "partial").length;
    const need = rows.filter((r) => r.alloc.status === "need" || r.alloc.status === "partial").length;
    const contracted = rows.filter((r) => r.contractId).length;
    return (
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <div className="text-[13.5px] font-bold">{title}</div>
        <StatusPill tone="neutral">{rows.length} 项</StatusPill>
        {allocated > 0 && <StatusPill tone="success">已分配 {allocated}</StatusPill>}
        {need > 0 && <StatusPill tone="primarySoft">需采购 {need}</StatusPill>}
        {contracted > 0 && <StatusPill tone="info">已入合同 {contracted}</StatusPill>}
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {custom.length === 0 && (
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-1">
          <div className="text-[13.5px] font-bold">系统外购标准件</div>
          <StatusPill tone="neutral">{stats.total} 项</StatusPill>
          {stats.allocated > 0 && <StatusPill tone="success">已分配 {stats.allocated}</StatusPill>}
          {stats.need > 0 && <StatusPill tone="primarySoft">需采购 {stats.need}</StatusPill>}
          {stats.contracted > 0 && <StatusPill tone="info">已入合同 {stats.contracted}</StatusPill>}
          <div className="flex-1" />
          <div className="text-sub text-xs">本 sheet 无「系统自制件耗材」段</div>
        </div>
      )}
      <div className="text-sub border-line-soft mt-2 flex border-y bg-[#FBFAF9] px-4 py-2 text-xs font-medium">
        <div className="w-[34px]" />
        <div className="w-10">序号</div>
        <div className="w-[250px]">名称 / 规格 / 材质</div>
        <div className="w-20">数量</div>
        <div className="flex-1">品牌及技术要求</div>
        <div className="w-[130px]">库存核对</div>
        <div className="w-[180px]">合同</div>
      </div>
      {custom.length > 0 ? (
        <>
          {sectionHeader("系统外购标准件", std)}
          {std.map((r) => (
            <RowLine key={r.id} r={r} sheetName={sheet.name} selected={selection.has(r.id)} onToggle={onToggle} />
          ))}
          {sectionHeader("系统自制件耗材", custom)}
          {custom.map((r) => (
            <RowLine key={r.id} r={r} sheetName={sheet.name} selected={selection.has(r.id)} onToggle={onToggle} />
          ))}
        </>
      ) : (
        std.map((r) => <RowLine key={r.id} r={r} sheetName={sheet.name} selected={selection.has(r.id)} onToggle={onToggle} />)
      )}
    </div>
  );
}
