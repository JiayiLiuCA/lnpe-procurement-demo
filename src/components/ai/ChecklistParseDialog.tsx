"use client";

// AI 流程 2：采购清单解析。三种用法共用一个弹窗——
//  首批：项目尚无清单 → 解析 7 个子系统 sheet（71 行）建第一批
//  追加：已有批次 → 建「追加第 n 批」（电气元件 + 自制钣金件）
//  修正：传入 checklist → 同一批次上传新版本，列出相对当前版的变更
// 入库后一律待批准；技术部发来的表已经过其内部审核，采购软件里只留批准一个入口。
import type { Checklist } from "@/lib/types";
import { AiSimDialog } from "./AiSimDialog";
import { CollapsibleText } from "@/components/ui/CollapsibleText";
import { checklistParse } from "@/fixtures/ai/checklist-parse";
import { APPEND_BATCH_SPECS } from "@/fixtures/checklist-20260510";
import { useAppStore } from "@/store/useAppStore";

type Intent = "first" | "append" | "version";

/** 修正版演示改动的行：与 store.addChecklistVersion 同口径（前 2 行未入合同的需采购 / 待核对行，数量 +1） */
function revisionTargets(cl: Checklist) {
  return cl.sheets
    .flatMap((sh) => sh.rows.map((r) => ({ r, sheet: sh.name })))
    .filter(({ r }) => !r.contractId && typeof r.qty === "number" && (r.alloc.status === "need" || r.alloc.status === "pending"))
    .slice(0, 2);
}

function SheetChips({ sheets }: { sheets: { name: string; rows: number }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {sheets.map((s) => (
        <span key={s.name} className="border-line-soft rounded-lg border bg-[#FBFAF9] px-2.5 py-1.5 text-[12.5px]">
          {s.name}
          {s.rows > 0 && <span className="text-faint ml-1">{s.rows}</span>}
        </span>
      ))}
    </div>
  );
}

function Result({ intent, checklist, batchNo }: { intent: Intent; checklist?: Checklist; batchNo: number }) {
  if (intent === "version" && checklist) {
    const latest = checklist.versions[checklist.versions.length - 1];
    const targets = revisionTargets(checklist);
    return (
      <div className="flex flex-col gap-3.5">
        <SheetChips sheets={checklist.sheets.map((s) => ({ name: s.name, rows: s.infoOnly ? 0 : s.rows.length }))} />
        <div className="border-line-soft overflow-hidden rounded-[10px] border">
          <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-3.5 py-2 text-xs font-medium">
            <div className="flex-1">相对当前版本 {latest?.id} 的变更（{targets.length} 项）</div>
            <div className="w-24">原数量</div>
            <div className="w-24">修正为</div>
            <div className="w-32">来源 sheet</div>
          </div>
          {targets.map(({ r, sheet }) => (
            <div key={r.id} className="border-page flex items-center border-b px-3.5 py-2 text-[13px] last:border-b-0">
              <div className="flex-1">
                <span className="font-medium">{r.name}</span>
                <span className="text-sub ml-2 text-xs">{r.spec}</span>
              </div>
              <div className="text-faint w-24 tabular-nums line-through">
                {typeof r.qty === "number" ? r.qty : "若干"} {r.unit}
              </div>
              <div className="text-info-deep w-24 font-medium tabular-nums">
                {typeof r.qty === "number" ? r.qty + 1 : "若干"} {r.unit}
              </div>
              <div className="text-sub w-32 text-xs">{sheet}</div>
            </div>
          ))}
          {targets.length === 0 && <div className="text-faint px-3.5 py-3 text-[12.5px]">明细数量无变化，仅修正技术要求</div>}
        </div>
        <div className="text-ink-2 text-[13px]">
          已做的订货安排按行保留（已入合同的行不受影响）· 制表 <span className="font-medium">{checklist.signoff.maker}</span> · 入库后本批次回到待批准
        </div>
      </div>
    );
  }

  if (intent === "append") {
    const sheets = APPEND_BATCH_SPECS.map((t) => ({ name: t.name, rows: t.specs.length }));
    const rows = APPEND_BATCH_SPECS.flatMap((t) => t.specs.map((s) => ({ ...s, sheet: t.name })));
    return (
      <div className="flex flex-col gap-3.5">
        <SheetChips sheets={sheets} />
        <div className="border-line-soft overflow-hidden rounded-[10px] border">
          <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-3.5 py-2 text-xs font-medium">
            <div className="flex-1">追加第 {batchNo} 批明细（共 {rows.length} 行）</div>
            <div className="w-20">数量</div>
            <div className="w-32">来源 sheet</div>
          </div>
          {rows.map((r) => (
            <div key={r.name + r.spec} className="border-page flex items-center border-b px-3.5 py-2 text-[13px] last:border-b-0">
              <div className="flex-1">
                <span className="font-medium">{r.name}</span>
                <span className="text-sub ml-2 text-xs">{r.spec}</span>
              </div>
              <div className="w-20 tabular-nums">
                {r.qty} {r.unit}
              </div>
              <div className="text-sub w-32 text-xs">{r.sheet}</div>
            </div>
          ))}
        </div>
        <div className="text-ink-2 text-[13px]">
          追加批次与第一批需采购项合并出合同 · 制表 <span className="font-medium">{checklistParse.maker}</span> · 入库后待批准
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <SheetChips sheets={checklistParse.sheets} />
      <div className="border-line-soft overflow-hidden rounded-[10px] border">
        <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-3.5 py-2 text-xs font-medium">
          <div className="flex-1">抽样明细（共 71 行）</div>
          <div className="w-20">数量</div>
          <div className="w-32">来源 sheet</div>
        </div>
        {checklistParse.sampleRows.map((r) => (
          <div key={r.name + r.spec} className="border-page flex items-center border-b px-3.5 py-2 text-[13px] last:border-b-0">
            <div className="flex-1">
              <span className="font-medium">{r.name}</span>
              <span className="text-sub ml-2 text-xs">{r.spec}</span>
            </div>
            <div className="w-20 tabular-nums">{r.qty}</div>
            <div className="text-sub w-32 text-xs">{r.sheet}</div>
          </div>
        ))}
      </div>
      <div className="bg-warning-bg rounded-[10px] px-4 py-2.5 text-[12.5px]">
        <CollapsibleText text={checklistParse.globalNote} className="text-warning-deep" />
      </div>
      <div className="text-ink-2 text-[13px]">
        制表 <span className="font-medium">{checklistParse.maker}</span>（技术部已审核）· 入库后待批准，批准后进入订货安排
      </div>
    </div>
  );
}

export function ChecklistParseDialog({
  open,
  onClose,
  projectId,
  checklist,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** 传入 = 该批次上传修正版；不传 = 新建批次（项目无清单为首批，否则为追加批） */
  checklist?: Checklist;
  onDone?: (checklistId: string) => void;
}) {
  const batchCount = useAppStore((s) => s.checklists.filter((c) => c.projectId === projectId).length);
  const addChecklistVersion = useAppStore((s) => s.addChecklistVersion);
  const addChecklistBatch = useAppStore((s) => s.addChecklistBatch);
  const pushToast = useAppStore((s) => s.pushToast);

  const intent: Intent = checklist ? "version" : batchCount === 0 ? "first" : "append";
  const batchNo = checklist ? checklist.batchNo : batchCount + 1;
  const nextVersion = checklist ? `v${checklist.versions.length + 1}` : "v1";

  const title = intent === "version" ? `采购清单修正版解析 · 第 ${batchNo} 批 ${nextVersion}` : intent === "append" ? `追加第 ${batchNo} 批采购清单解析` : "采购清单解析";
  const steps =
    intent === "version"
      ? ["正在读取工作簿…", `识别 ${checklist?.sheets.length ?? 0} 个子系统 sheet…`, "与当前版本逐行比对…", "保留已做的订货安排…"]
      : intent === "append"
        ? ["正在读取工作簿…", "识别 2 个 sheet（电气元件 / 自制钣金件）…", "提取 6 行明细…", "校验制表信息…"]
        : checklistParse.steps;

  return (
    <AiSimDialog
      open={open}
      onClose={onClose}
      title={title}
      steps={steps}
      uploadHint="支持 xls / xlsx，演示中不读取文件内容"
      renderResult={() => <Result intent={intent} checklist={checklist} batchNo={batchNo} />}
      confirmLabel="确认入库"
      onConfirm={() => {
        if (intent === "version" && checklist) {
          addChecklistVersion(checklist.id);
          pushToast(`第 ${batchNo} 批清单已更新至 ${nextVersion} · 待批准`);
          onClose();
          onDone?.(checklist.id);
          return;
        }
        const id = addChecklistBatch(projectId);
        pushToast(intent === "first" ? "第一批采购清单已入库 · 待批准" : `追加第 ${batchNo} 批采购清单已入库 · 待批准`);
        onClose();
        if (id) onDone?.(id);
      }}
    />
  );
}
