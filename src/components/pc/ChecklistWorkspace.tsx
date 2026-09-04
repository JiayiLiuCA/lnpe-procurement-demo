"use client";

// 采购清单工作区：同一张清单表在三个步骤复用，只换顶部汇总与底部动作——
//  review   步骤 2 采购清单：签核（审核通过 / 批准）、版本、下载；表只读
//  source   步骤 3 订货安排：逐行标记 库存分配 / 安排生产 / 需采购；顶部来源汇总
//  contract 步骤 4 子合同：勾需采购行 AI 生成初稿 / 上传合同；顶部合同覆盖
//  full     独立路由 /checklists/[id]：全部动作
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Download, UploadCloud } from "lucide-react";
import type { Checklist, ChecklistRow } from "@/lib/types";
import { Btn } from "@/components/ui/Btn";
import { StatusPill } from "@/components/ui/StatusPill";
import { TabBar } from "@/components/ui/TabBar";
import { CollapsibleText } from "@/components/ui/CollapsibleText";
import { ChecklistTable, type RowFilter } from "./ChecklistTable";
import { SelectionFooter } from "./SelectionFooter";
import { AiSimDialog } from "@/components/ai/AiSimDialog";
import { ChecklistParseDialog } from "@/components/ai/ChecklistParseDialog";
import { UploadContractDialog } from "@/components/ai/UploadContractDialog";
import { useAppStore } from "@/store/useAppStore";
import { fmtDate } from "@/lib/date";
import { checklistStats } from "@/lib/derive";
import { usePartsCatalog } from "@/lib/parts";
import { fmtNum } from "@/lib/money";
import { draftSteps, matchSupplier } from "@/fixtures/ai/contract-template";
import { supplierById } from "@/fixtures/suppliers";

export type WorkspaceMode = "review" | "source" | "contract" | "full";

/** 签核节点：已签 = 绿勾 + 日期；当前待签 = 青圈；之后的 = 灰圈 */
function SignNode({ label, at, current }: { label: string; at?: string; current?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5">
        {at ? (
          <span className="bg-success flex h-4 w-4 items-center justify-center rounded-full">
            <Check size={9} strokeWidth={3.4} className="text-white" />
          </span>
        ) : (
          <span className={`h-4 w-4 rounded-full border-2 ${current ? "border-info" : "border-line"}`} />
        )}
        <span className={`text-[12.5px] font-medium ${at || current ? "" : "text-faint"}`}>{label}</span>
      </div>
      <span className="text-faint text-[11px]">{at ? fmtDate(at) : current ? "待签" : "—"}</span>
    </div>
  );
}

export function ChecklistWorkspace({ checklist, mode = "full" }: { checklist: Checklist; mode?: WorkspaceMode }) {
  const cl = checklist;
  const router = useRouter();
  const project = useAppStore((s) => s.projects.find((p) => p.id === cl.projectId));
  const markAllocation = useAppStore((s) => s.markAllocation);
  const generateDraftContracts = useAppStore((s) => s.generateDraftContracts);
  const markProduction = useAppStore((s) => s.markProduction);
  const signoffChecklist = useAppStore((s) => s.signoffChecklist);
  const pushToast = useAppStore((s) => s.pushToast);

  const [activeSheet, setActiveSheet] = useState<string>(cl.sheets[0]?.id ?? "s1");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [genOpen, setGenOpen] = useState(false);
  const [uploadClOpen, setUploadClOpen] = useState(false);
  const [uploadCtOpen, setUploadCtOpen] = useState(false);

  const allRows = useMemo(() => cl.sheets.flatMap((sh) => sh.rows), [cl]);
  const selectedRows = allRows.filter((r) => selection.has(r.id));
  const sheet = cl.sheets.find((s) => s.id === activeSheet) ?? cl.sheets[0];
  const stats = checklistStats(cl);
  const coverPct = stats.need > 0 ? Math.round((stats.contracted / stats.need) * 100) : 100;
  // 来源分配的互斥分桶（部分分配单列，避免库存 / 需采购重复计数）
  const buckets = {
    allocated: allRows.filter((r) => r.alloc.status === "allocated").length,
    partial: allRows.filter((r) => r.alloc.status === "partial").length,
    need: allRows.filter((r) => r.alloc.status === "need").length,
    produce: allRows.filter((r) => r.alloc.status === "produce").length,
    pending: allRows.filter((r) => r.alloc.status === "pending").length,
  };
  const showSignoff = mode === "review" || mode === "full";
  const showSource = mode === "source" || mode === "full";
  const showCoverage = mode === "contract" || mode === "full";
  const readOnly = mode === "review";
  const initialFilter: RowFilter = mode === "source" ? (stats.pending > 0 ? "pending" : "all") : mode === "contract" ? "uncovered" : "all";

  // AI 预估采购额：需采购行（含部分分配）按预估单价 × 需采购数；自制、已分配、待核对不计
  const { estimateFor } = usePartsCatalog();
  const estimateRow = (r: ChecklistRow): number => {
    if (!(r.alloc.status === "need" || r.alloc.status === "partial") || typeof r.qty !== "number") return 0;
    const e = estimateFor(r.name, r.spec);
    return e?.forecast ? e.forecast.predicted * (r.alloc.need || r.qty) : 0;
  };
  const clEstimate = allRows.reduce((s, r) => s + estimateRow(r), 0);
  const uncoveredEstimate = allRows.filter((r) => !r.contractId).reduce((s, r) => s + estimateRow(r), 0);
  const selEstimate = selectedRows.reduce((s, r) => s + estimateRow(r), 0);
  const tableCardRef = useRef<HTMLDivElement>(null);

  const toggle = (rowId: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  // 切换 sheet 时自动滚到表格顶部，用户无需手动 scroll
  const switchSheet = (key: string) => {
    setActiveSheet(key);
    requestAnimationFrame(() => {
      tableCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // AI 生成初稿预览：按品牌→供应商映射分组（安排生产的自制行不出合同）
  const groups = (() => {
    const map = new Map<string, typeof selectedRows>();
    for (const r of selectedRows) {
      if (r.alloc.status === "produce") continue;
      const sid = matchSupplier(r.brands, r.section);
      const g = map.get(sid) ?? [];
      g.push(r);
      map.set(sid, g);
    }
    return [...map.entries()];
  })();

  const signoffAction =
    showSignoff && cl.status !== "已批准" ? (
      !cl.signoff.reviewAt ? (
        <Btn
          variant="primary"
          size="sm"
          onClick={() => {
            signoffChecklist(cl.id, "review");
            pushToast("清单审核通过，待批准");
          }}
        >
          <Check size={13} strokeWidth={2.4} />
          审核通过
        </Btn>
      ) : (
        <Btn
          variant="primary"
          size="sm"
          onClick={() => {
            signoffChecklist(cl.id, "approve");
            pushToast("清单已批准，进入订货安排");
          }}
        >
          <Check size={13} strokeWidth={2.4} />
          批准
        </Btn>
      )
    ) : null;

  return (
    <div className="flex flex-col gap-3.5">
      {/* 清单头：标题 + 签核 + 文件操作 */}
      <div className="border-line rounded-card flex items-center gap-5 border bg-white px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="text-[15px] font-bold">{cl.title}</div>
            <StatusPill tone={cl.status === "已批准" ? "success" : "warning"}>{cl.status}</StatusPill>
          </div>
          <div className="text-sub mt-1 text-xs">
            {cl.fileName} · 当前版本 {cl.version}
            {project && ` · 交货期 ${project.deliveryDeadline}`} · AI 解析入库 · 人工校对签核
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex shrink-0 items-center">
          <SignNode label={`制表 ${cl.signoff.maker}`} at={cl.signoff.makerAt} />
          <div className={`mx-2 mb-4 h-0.5 w-9 ${cl.signoff.reviewAt ? "bg-success" : "bg-line-soft"}`} />
          <SignNode label="审核" at={cl.signoff.reviewAt} current={!cl.signoff.reviewAt} />
          <div className={`mx-2 mb-4 h-0.5 w-9 ${cl.signoff.approveAt ? "bg-success" : "bg-line-soft"}`} />
          <SignNode label="批准" at={cl.signoff.approveAt} current={!!cl.signoff.reviewAt && !cl.signoff.approveAt} />
        </div>
        <div className="flex shrink-0 gap-2 pl-3">
          <a href="/samples/checklist-sample.xls" download={cl.fileName}>
            <Btn variant="secondary" size="sm">
              <Download size={13} strokeWidth={1.8} />
              下载 xlsx
            </Btn>
          </a>
          <Btn variant="secondary" size="sm" onClick={() => setUploadClOpen(true)}>
            <UploadCloud size={13} strokeWidth={1.8} />
            上传新版本
          </Btn>
          {signoffAction}
        </div>
      </div>

      {/* 订货安排汇总：库存 / 生产 / 采购 / 待核对 互斥分桶 */}
      {showSource && (
        <div className="border-line rounded-card flex items-center gap-4 border bg-white px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 text-[13px]">
              <span className="font-bold">订货安排</span>
              <span className="text-ink-2">
                共 <span className="text-ink font-bold">{stats.total}</span> 项 · 库存分配{" "}
                <span className="text-success-deep font-bold">{buckets.allocated}</span>
                {buckets.partial > 0 && (
                  <>
                    {" "}
                    · 部分分配 <span className="text-success-deep font-bold">{buckets.partial}</span>
                  </>
                )}{" "}
                · 安排生产 <span className="text-info-deep font-bold">{buckets.produce}</span> · 需采购{" "}
                <span className="text-warning-deep font-bold">{buckets.need}</span> · 待核对{" "}
                <span className={`font-bold ${buckets.pending > 0 ? "text-ink" : "text-faint"}`}>{buckets.pending}</span>
              </span>
              <span className="text-sub text-xs">勾选行后在底栏标记；需采购项将进入子合同</span>
            </div>
            <div className="bg-line-soft mt-2 flex h-2 gap-px overflow-hidden rounded">
              <div className="bg-success" style={{ width: `${((buckets.allocated + buckets.partial) / Math.max(stats.total, 1)) * 100}%` }} />
              <div className="bg-info" style={{ width: `${(buckets.produce / Math.max(stats.total, 1)) * 100}%` }} />
              <div className="bg-warning" style={{ width: `${(buckets.need / Math.max(stats.total, 1)) * 100}%` }} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sub text-xs">待核对</div>
            <div className={`text-[19px] font-bold tabular-nums ${buckets.pending > 0 ? "text-ink" : "text-success-deep"}`}>{buckets.pending}</div>
          </div>
        </div>
      )}

      {/* 合同覆盖（子合同步）：需采购项有多少已入合同 */}
      {showCoverage && (
        <div className="border-line rounded-card flex items-center gap-4 border bg-white px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 text-[13px]">
              <span className="font-bold">合同覆盖</span>
              <span className="text-ink-2">
                需采购 <span className="text-ink font-bold">{stats.need}</span> · 已入合同{" "}
                <span className="text-info-deep font-bold">{stats.contracted}</span> · 待出合同{" "}
                <span className="text-warning-deep font-bold">{stats.need - stats.contracted}</span>
              </span>
              <span className="text-sub text-xs">
                库存已分配 {stats.allocated} 项{stats.produce > 0 && ` · 安排生产 ${stats.produce} 项`}
                {clEstimate > 0 && (
                  <>
                    {" "}
                    · AI 预估采购额 <span className="text-ink font-medium tabular-nums">¥{fmtNum(clEstimate)}</span>
                    {uncoveredEstimate > 0 && `（未入合同 ¥${fmtNum(uncoveredEstimate)}）`}
                  </>
                )}
              </span>
            </div>
            <div className="bg-line-soft mt-2 flex h-2 overflow-hidden rounded">
              <div className={coverPct >= 100 ? "bg-success" : "bg-info"} style={{ width: `${coverPct}%` }} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sub text-xs">覆盖率</div>
            <div className={`text-[19px] font-bold tabular-nums ${coverPct >= 100 ? "text-success-deep" : "text-info-deep"}`}>{coverPct}%</div>
          </div>
        </div>
      )}

      {/* 全局要求黄条（电气资料及要求等纯说明 sheet 下不显示） */}
      {!sheet.infoOnly && (
        <div className="flex items-center gap-2.5 rounded-[10px] border border-[#EFE1B8] bg-warning-bg px-4 py-2.5">
          <CircleAlert size={15} strokeWidth={1.8} className="text-warning-deep shrink-0" />
          <CollapsibleText text={cl.globalNote} className="text-warning-deep flex-1 text-[12.5px]" />
        </div>
      )}

      {/* sheet Tab + 表格 + 吸底操作栏 */}
      <div ref={tableCardRef} className="border-line rounded-card flex scroll-mt-4 flex-col overflow-clip border bg-white">
        <div className="px-4 pt-1">
          <TabBar
            tabs={cl.sheets.map((s) => ({ key: s.id, label: s.name, badge: s.infoOnly ? undefined : s.rows.length }))}
            active={sheet.id}
            onChange={switchSheet}
          />
        </div>
        {sheet.infoOnly ? (
          <div className="px-5.5 py-4.5 text-[13px] leading-[2] whitespace-pre-line">{sheet.infoText}</div>
        ) : (
          <>
            <ChecklistTable key={`${sheet.id}-${mode}`} sheet={sheet} selection={selection} onToggle={toggle} initialFilter={initialFilter} selectable={!readOnly} />
            {!readOnly && (
              <div className="sticky bottom-0 z-10">
                <SelectionFooter
                  mode={mode}
                  selectedRows={selectedRows}
                  estimate={selEstimate}
                  onMarkAllocation={(qty) => {
                    markAllocation(cl.id, [...selection], qty);
                    pushToast(`已更新 ${selection.size} 行库存分配`);
                    setSelection(new Set());
                  }}
                  onMarkNeed={() => {
                    markAllocation(cl.id, [...selection], 0);
                    pushToast(`已标记 ${selection.size} 行需采购`);
                    setSelection(new Set());
                  }}
                  onArrangeProduction={(plan) => {
                    const eligible = selectedRows.filter((r) => !r.contractId && (plan ? r.alloc.status !== "produce" : r.alloc.status === "produce")).length;
                    markProduction(cl.id, [...selection], plan);
                    pushToast(plan ? `已安排生产 ${eligible} 行 · 计划完工 ${plan.produceBy}` : `已撤销 ${eligible} 行生产安排，改回需采购`);
                    setSelection(new Set());
                  }}
                  onGenerate={() => setGenOpen(true)}
                  onUploadContract={() => setUploadCtOpen(true)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* AI 生成采购合同初稿 */}
      <AiSimDialog
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title="AI 生成采购合同初稿"
        steps={draftSteps}
        autoStart
        renderResult={() => (
          <div className="flex flex-col gap-3.5">
            {groups.map(([sid, rows]) => {
              const sup = supplierById(sid);
              return (
                <div key={sid} className="border-line-soft flex flex-col gap-2.5 rounded-[10px] border p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="text-[13.5px] font-bold">{sup.name}</div>
                    <StatusPill tone="ai">1 份初稿</StatusPill>
                    <div className="text-sub ml-auto text-xs">{rows.length} 项</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {rows.map((r) => (
                      <div key={r.id} className="flex items-center text-[12.5px]">
                        <span className="text-ink-2 flex-1">
                          {r.name} {r.spec}
                        </span>
                        <span className="w-20 tabular-nums">{typeof r.qty === "number" ? `${r.alloc.need || r.qty} ${r.unit}` : "若干"}</span>
                        <span className="text-faint w-16 text-right text-xs">待补充</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-sub border-line-soft border-t pt-2 text-xs">
                    模板条款：交货期按项目要求 · 付款 10-50-30-10 · 13% 增值税专票
                  </div>
                </div>
              );
            })}
            {groups.length === 0 && <div className="text-faint py-6 text-center text-[13px]">未选择可采购的清单行（安排生产的自制件不出合同）</div>}
          </div>
        )}
        confirmLabel="生成草稿合同"
        onConfirm={() => {
          const ids = generateDraftContracts(cl.id, [...selection]);
          setGenOpen(false);
          setSelection(new Set());
          if (ids.length > 0) {
            pushToast(`已生成 ${ids.length} 份 AI 草稿合同，单价待补充`);
            router.push(`/contracts/${ids[0]}`);
          }
        }}
        disabled={() => groups.length === 0}
      />
      <ChecklistParseDialog open={uploadClOpen} onClose={() => setUploadClOpen(false)} />
      <UploadContractDialog
        open={uploadCtOpen}
        onClose={() => {
          setUploadCtOpen(false);
          setSelection(new Set());
        }}
        checklist={cl}
        preselectedRowIds={[...selection]}
      />
    </div>
  );
}
