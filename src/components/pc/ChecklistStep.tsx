"use client";

// 采购清单步：清单卡（头信息 + 动作 + 批次与版本记录）+ 所选批次的只读明细（校对用），样式仿项目合同卡。
// 技术部发来的表已经过其内部审核，这里只留「批准」一个入口；修正 = 同一批次上传新版本（回到待批准），
// 追加 = 新建批次。每一版都能「查看原件」（模拟 Excel，多 sheet 可切换）。
import { useState } from "react";
import { Check, Download, Eye, FileSpreadsheet, Plus, UploadCloud } from "lucide-react";
import type { Checklist, ChecklistVersion, Project } from "@/lib/types";
import { fmtDate } from "@/lib/date";
import { checklistStats } from "@/lib/derive";
import { checklistXlsxSheets } from "@/lib/checklistXlsx";
import { Btn } from "@/components/ui/Btn";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { XlsxPreviewDialog } from "@/components/ui/XlsxPreviewDialog";
import { ChecklistParseDialog } from "@/components/ai/ChecklistParseDialog";
import { ChecklistWorkspace } from "./ChecklistWorkspace";
import { useAppStore } from "@/store/useAppStore";

const card = "border-line rounded-card border bg-white";

export function batchLabel(cl: Checklist): string {
  return cl.batchNo === 1 ? "第一批" : `追加第${cl.batchNo}批`;
}

export function ChecklistStep({
  project,
  checklists,
  batch,
  onSelectBatch,
}: {
  project: Project;
  /** 本项目的清单，按批次升序 */
  checklists: Checklist[];
  /** 当前查看的批次下标（与订货安排 / 子合同步共用） */
  batch: number;
  onSelectBatch: (index: number) => void;
}) {
  const approveChecklist = useAppStore((s) => s.approveChecklist);
  const pushToast = useAppStore((s) => s.pushToast);
  const [xlsx, setXlsx] = useState<{ cl: Checklist; v: ChecklistVersion } | null>(null);
  const [parse, setParse] = useState<{ checklist?: Checklist } | null>(null);

  const cl = checklists[Math.min(batch, Math.max(checklists.length - 1, 0))];

  const parseDialog = (
    <ChecklistParseDialog
      open={!!parse}
      onClose={() => setParse(null)}
      projectId={project.id}
      checklist={parse?.checklist}
      onDone={(id) => {
        const idx = useAppStore
          .getState()
          .checklists.filter((c) => c.projectId === project.id)
          .findIndex((c) => c.id === id);
        if (idx >= 0) onSelectBatch(idx);
      }}
    />
  );

  if (!cl) {
    return (
      <>
        <div className={`${card} flex flex-col items-center py-10`}>
          <EmptyState
            icon={<FileSpreadsheet size={30} strokeWidth={1.5} className="text-[#CFCCCA]" />}
            text="等待技术部提供采购清单 · 收到 xlsx 后上传，AI 自动解析各子系统明细，人工校对后批准"
          />
          <Btn variant="primary" onClick={() => setParse({})}>
            <UploadCloud size={14} strokeWidth={1.8} />
            上传采购清单 xlsx
          </Btn>
        </div>
        {parseDialog}
      </>
    );
  }

  const latest = cl.versions[cl.versions.length - 1];
  const total = checklists.reduce((s, c) => s + checklistStats(c).total, 0);
  const approvedCount = checklists.filter((c) => c.status === "已批准").length;
  // 版本记录：批次倒序、版本倒序，最新的在最上面
  const rows = [...checklists]
    .sort((a, b) => b.batchNo - a.batchNo)
    .flatMap((c) => [...c.versions].reverse().map((v) => ({ cl: c, v, latest: v === c.versions[c.versions.length - 1] })));

  return (
    <>
      <div className={card}>
        <div className="flex items-center gap-4.5 px-5 py-4">
          <div className="bg-primary-soft text-primary-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]">
            <FileSpreadsheet size={21} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="text-[15px] font-bold">采购清单</div>
              <StatusPill tone={cl.status === "已批准" ? "success" : "warning"}>
                {batchLabel(cl)} · {cl.status}
              </StatusPill>
              <div className="text-sub text-xs">
                {checklists.length} 批 · 共 {total} 项 · 已批准 {approvedCount}/{checklists.length} 批 · 以各批最新版为准
              </div>
            </div>
            <div className="text-ink-2 mt-1.5 text-[12.5px]">
              {batchLabel(cl)} {latest?.id} · {cl.fileName} · 制表 技术部 {cl.signoff.maker}{" "}
              <span className="tabular-nums">{fmtDate(cl.signoff.makerAt)}</span>
              {cl.signoff.approveAt ? (
                <>
                  {" "}
                  · 批准 {cl.signoff.approvedBy} <span className="tabular-nums">{fmtDate(cl.signoff.approveAt)}</span>
                </>
              ) : (
                <span className="text-warning-deep"> · 待批准（技术部已审核，批准后进入订货安排）</span>
              )}
              {project.deliveryDeadline && (
                <>
                  {" "}
                  · 交货期 <span className="font-medium tabular-nums">{project.deliveryDeadline}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <a href="/samples/checklist-sample.xls" download={cl.fileName}>
              <Btn variant="secondary">
                <Download size={14} strokeWidth={1.8} />
                下载 xlsx
              </Btn>
            </a>
            <Btn variant="secondary" onClick={() => setParse({ checklist: cl })} title={`${batchLabel(cl)}上传修正版（版本 +1，重新批准）`}>
              <UploadCloud size={14} strokeWidth={1.8} />
              上传新版本
            </Btn>
            <Btn variant="secondary" onClick={() => setParse({})} title="技术部追加的清单作为新批次入库">
              <Plus size={14} strokeWidth={1.8} />
              追加批次
            </Btn>
            {cl.status !== "已批准" ? (
              <Btn
                variant="primary"
                onClick={() => {
                  approveChecklist(cl.id);
                  pushToast(`${batchLabel(cl)}清单 ${latest?.id} 已批准，进入订货安排`);
                }}
              >
                <Check size={14} strokeWidth={2.4} />
                批准 {latest?.id}
              </Btn>
            ) : (
              <Btn variant="primary" onClick={() => latest && setXlsx({ cl, v: latest })}>
                <Eye size={14} strokeWidth={1.8} />
                查看清单
              </Btn>
            )}
          </div>
        </div>

        <div className="border-line-soft border-t px-5 pt-2.5 pb-2">
          <div className="text-sub flex items-center gap-2 text-xs font-medium">
            批次与版本记录
            <span className="text-faint font-normal">每一版上传后 AI 自动解析入库 · 点行切换下方明细 · 修正版需重新批准</span>
          </div>
          <div className="mt-1 flex flex-col">
            {rows.map(({ cl: c, v, latest: isLatest }) => {
              const selected = c.id === cl.id && isLatest;
              return (
                <div
                  key={`${c.id}-${v.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectBatch(checklists.indexOf(c))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSelectBatch(checklists.indexOf(c));
                  }}
                  className={`-mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-[13px] ${selected ? "bg-line-soft" : "hover:bg-page"}`}
                >
                  {v.approveAt ? (
                    <span className="bg-success flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full">
                      <Check size={10} strokeWidth={3.2} className="text-white" />
                    </span>
                  ) : isLatest ? (
                    <span className="border-warning h-[18px] w-[18px] shrink-0 rounded-full border-2" />
                  ) : (
                    <span className="bg-line-soft h-[18px] w-[18px] shrink-0 rounded-full" />
                  )}
                  <span className={`w-[230px] shrink-0 truncate ${isLatest ? "font-medium" : "text-ink-2"}`}>
                    {batchLabel(c)} · {v.name}
                  </span>
                  <span className="text-sub w-[150px] shrink-0 text-[12px]">
                    {fmtDate(v.at)} · {v.by}
                  </span>
                  <span className="w-[130px] shrink-0">
                    <StatusPill tone="ai">AI 已解析 {v.rows} 行</StatusPill>
                  </span>
                  <span className="text-sub min-w-0 flex-1 truncate text-[12.5px]">{v.changes ?? (v.id === "v1" ? "技术部初版" : "—")}</span>
                  <span className="w-[120px] shrink-0 text-[12.5px]">
                    {v.approveAt ? (
                      <span className="text-success-deep">
                        已批准 {fmtDate(v.approveAt)}
                      </span>
                    ) : isLatest ? (
                      <StatusPill tone="warning">待批准</StatusPill>
                    ) : (
                      <span className="text-faint">已被 {c.versions[c.versions.length - 1]?.id} 取代</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setXlsx({ cl: c, v });
                    }}
                    className="text-primary-hover shrink-0 cursor-pointer text-xs font-medium"
                  >
                    查看原件
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 所选批次的只读明细：校对 AI 解析结果（不显示订货安排 / 合同两列） */}
      <ChecklistWorkspace key={cl.id} checklist={cl} mode="review" />

      <XlsxPreviewDialog
        open={!!xlsx}
        onClose={() => setXlsx(null)}
        fileName={xlsx?.v.fileName ?? cl.fileName}
        sheets={xlsx ? checklistXlsxSheets(xlsx.cl, xlsx.v) : []}
        downloadHref="/samples/checklist-sample.xls"
        downloadName={xlsx?.v.fileName ?? cl.fileName}
      />
      {parseDialog}
    </>
  );
}
