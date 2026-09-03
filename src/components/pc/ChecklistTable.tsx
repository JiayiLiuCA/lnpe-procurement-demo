"use client";

// 采购清单行表：分「系统外购标准件 / 系统自制件耗材」两段；段头的状态标签可点击作筛选（再点一次取消）
import { useState } from "react";
import Link from "next/link";
import { Check, FileText, Sparkles } from "lucide-react";
import type { ChecklistRow, Sheet } from "@/lib/types";
import { StatusPill, PILL_TONE_CLASS, type PillTone } from "@/components/ui/StatusPill";
import { CollapsibleText } from "@/components/ui/CollapsibleText";
import { useAppStore } from "@/store/useAppStore";
import { contractSubPill } from "./ContractCard";
import { supplierById } from "@/fixtures/suppliers";
import { fmtDate } from "@/lib/date";
import { fmtNum } from "@/lib/money";
import { pctSigned, usePartsCatalog, type CostForecast } from "@/lib/parts";

/** 行的 AI 预估信息：无采购记录 → 需询价；未跑预测 → 未预测 */
interface EstInfo {
  forecast: CostForecast | null;
  hasHistory: boolean;
}

function EstimateCell({ est }: { est: EstInfo | null }) {
  if (!est || !est.hasHistory) return <span className="text-faint text-xs">需询价</span>;
  if (!est.forecast) return <span className="text-faint text-xs">未预测</span>;
  const f = est.forecast;
  const tone = f.change > 0.005 ? "text-danger-deep" : f.change < -0.005 ? "text-success-deep" : "text-sub";
  return (
    <div>
      <div className="text-[13px] font-medium tabular-nums">¥{fmtNum(f.predicted)}</div>
      <div className={`text-[11.5px] tabular-nums ${tone}`}>较上次 {pctSigned(f.change)}</div>
    </div>
  );
}

/** 段头标签即筛选器：按库存核对结果 / 是否入合同筛行 */
type RowFilter = "all" | "allocated" | "need" | "produce" | "pending" | "contracted";

const FILTERS: { key: Exclude<RowFilter, "all">; label: string; tone: PillTone }[] = [
  { key: "allocated", label: "已分配", tone: "success" },
  { key: "need", label: "需采购", tone: "warning" },
  { key: "produce", label: "安排生产", tone: "info" },
  { key: "pending", label: "待核对", tone: "neutral" },
  { key: "contracted", label: "已入合同", tone: "info" },
];

function matches(r: ChecklistRow, f: RowFilter): boolean {
  switch (f) {
    case "all":
      return true;
    case "allocated":
      return r.alloc.status === "allocated" || r.alloc.status === "partial";
    case "need":
      return r.alloc.status === "need" || r.alloc.status === "partial";
    case "produce":
      return r.alloc.status === "produce";
    case "pending":
      return r.alloc.status === "pending";
    case "contracted":
      return !!r.contractId;
  }
}

/** 可点击的状态标签：未选中沿用状态色，选中态用墨色（与筛选 chip / Tab 一致） */
function FilterPill({ tone, active, onClick, children }: { tone: PillTone; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? "再点一次取消筛选" : "只看这一类"}
      className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors ${
        active ? "bg-ink text-white" : `${PILL_TONE_CLASS[tone]} hover:brightness-95`
      }`}
    >
      {children}
    </button>
  );
}

function qtyText(r: ChecklistRow): string {
  return typeof r.qty === "number" ? `${r.qty} ${r.unit}` : `${r.qty} ${r.unit !== "件" ? r.unit : ""}`.trim() || "若干";
}

function AllocCell({ r }: { r: ChecklistRow }) {
  const { allocated, need, status, produceBy } = r.alloc;
  if (status === "allocated") return <StatusPill tone="success">已分配 {allocated}</StatusPill>;
  if (status === "need") {
    return <StatusPill tone="warning">需采购 {typeof r.qty === "number" ? need : "若干"}</StatusPill>;
  }
  if (status === "partial") {
    return (
      <div className="flex flex-col gap-1">
        <StatusPill tone="success">已分配 {allocated}</StatusPill>
        <StatusPill tone="warning">需采购 {need}</StatusPill>
      </div>
    );
  }
  if (status === "produce") {
    return (
      <div className="flex flex-col gap-1">
        <StatusPill tone="info">安排生产</StatusPill>
        {produceBy && <span className="text-sub text-[11.5px] tabular-nums">计划完工 {fmtDate(produceBy)}</span>}
      </div>
    );
  }
  return <StatusPill tone="neutral">待核对</StatusPill>;
}

function ContractCell({ r }: { r: ChecklistRow }) {
  const contracts = useAppStore((s) => s.contracts);
  if (r.alloc.status === "produce") {
    return (
      <div className="text-sub text-xs">
        公司自制 · 不出合同{r.alloc.produceNote && <div className="text-faint text-[11.5px]">{r.alloc.produceNote}</div>}
      </div>
    );
  }
  if (!r.contractId) return <StatusPill tone="neutral">未生成</StatusPill>;
  const c = contracts.find((x) => x.id === r.contractId);
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
  est,
}: {
  r: ChecklistRow;
  sheetName: string;
  selected: boolean;
  onToggle: (id: string) => void;
  est: EstInfo | null;
}) {
  // 已分配的行无需再操作；安排生产的行保留可选，便于撤销或改为库存分配
  const selectable = r.alloc.status !== "allocated";
  return (
    <div className={`border-page flex items-start border-b px-4 py-3 text-[13px] ${selected ? "bg-[#FBFAF9]" : ""}`}>
      <div className="w-[34px] pt-0.5">
        <button
          type="button"
          disabled={!selectable}
          onClick={() => onToggle(r.id)}
          className={`flex h-[15px] w-[15px] cursor-pointer items-center justify-center rounded border-[1.5px] disabled:cursor-not-allowed disabled:opacity-40 ${
            selected ? "bg-ink border-ink" : "border-[#CFCCCA] bg-white"
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
      <div className="w-[120px] pr-2">
        <EstimateCell est={est} />
      </div>
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
        <ContractCell r={r} />
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
  const [filter, setFilter] = useState<RowFilter>("all");
  const { estimateFor } = usePartsCatalog();
  const estOf = (r: ChecklistRow): EstInfo | null => {
    const e = estimateFor(r.name, r.spec);
    return e ? { forecast: e.forecast, hasHistory: e.part.history.length > 0 } : null;
  };
  const std = sheet.rows.filter((r) => r.section === "标准件");
  const custom = sheet.rows.filter((r) => r.section === "自制件");
  const toggleFilter = (f: RowFilter) => setFilter((cur) => (cur === f ? "all" : f));
  const activeLabel = FILTERS.find((f) => f.key === filter)?.label;
  const shownTotal = sheet.rows.filter((r) => matches(r, filter)).length;

  const sectionHeader = (title: string, rows: ChecklistRow[], note?: string) => (
    <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
      <div className="text-[13.5px] font-bold">{title}</div>
      <StatusPill tone="neutral">{rows.length} 项</StatusPill>
      {FILTERS.map((f) => {
        const n = rows.filter((r) => matches(r, f.key)).length;
        if (n === 0) return null;
        return (
          <FilterPill key={f.key} tone={f.tone} active={filter === f.key} onClick={() => toggleFilter(f.key)}>
            {f.label} {n}
          </FilterPill>
        );
      })}
      {note && (
        <>
          <div className="flex-1" />
          <div className="text-sub text-xs">{note}</div>
        </>
      )}
    </div>
  );

  const renderRows = (rows: ChecklistRow[]) => {
    const shown = rows.filter((r) => matches(r, filter));
    if (shown.length === 0) {
      return <div className="text-faint border-page border-b px-4 py-3 text-[12.5px]">本段无「{activeLabel}」行</div>;
    }
    return shown.map((r) => <RowLine key={r.id} r={r} sheetName={sheet.name} selected={selection.has(r.id)} onToggle={onToggle} est={estOf(r)} />);
  };

  return (
    <div className="flex flex-col">
      {custom.length === 0 && sectionHeader("系统外购标准件", std, "本 sheet 无「系统自制件耗材」段")}
      {filter !== "all" && (
        <div className="text-sub flex items-center gap-2 px-4 pt-1 pb-2 text-xs">
          已按「{activeLabel}」筛选 · 显示 {shownTotal}/{sheet.rows.length} 行
          <button type="button" onClick={() => setFilter("all")} className="text-primary-hover cursor-pointer font-medium">
            清除筛选
          </button>
        </div>
      )}
      <div className="text-sub border-line-soft mt-2 flex border-y bg-[#FBFAF9] px-4 py-2 text-xs font-medium">
        <div className="w-[34px]" />
        <div className="w-10">序号</div>
        <div className="w-[250px]">名称 / 规格 / 材质</div>
        <div className="w-20">数量</div>
        <div className="flex w-[120px] items-center gap-1">
          <Sparkles size={11} strokeWidth={2} className="text-ai-deep" />
          AI 预估单价
        </div>
        <div className="flex-1">品牌及技术要求</div>
        <div className="w-[130px]">库存核对</div>
        <div className="w-[180px]">合同</div>
      </div>
      {custom.length > 0 ? (
        <>
          {sectionHeader("系统外购标准件", std)}
          {renderRows(std)}
          {sectionHeader("系统自制件耗材", custom)}
          {renderRows(custom)}
        </>
      ) : (
        renderRows(std)
      )}
    </div>
  );
}
