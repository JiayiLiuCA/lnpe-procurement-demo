"use client";

// AI 流程 2：清单解析（项目详情"上传采购清单"与清单页"上传新版本"共用）
import { useRouter } from "next/navigation";
import { AiSimDialog } from "./AiSimDialog";
import { CollapsibleText } from "@/components/ui/CollapsibleText";
import { checklistParse } from "@/fixtures/ai/checklist-parse";
import { useAppStore } from "@/store/useAppStore";

function Result() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap gap-2">
        {checklistParse.sheets.map((s) => (
          <span key={s.name} className="border-line-soft rounded-lg border bg-[#FBFAF9] px-2.5 py-1.5 text-[12.5px]">
            {s.name}
            {s.rows > 0 && <span className="text-faint ml-1">{s.rows}</span>}
          </span>
        ))}
      </div>
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
        签核信息：制表 <span className="font-medium">{checklistParse.maker}</span> · 审核/批准节点将按流程发起
      </div>
    </div>
  );
}

export function ChecklistParseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const upsertChecklistParse = useAppStore((s) => s.upsertChecklistParse);
  const pushToast = useAppStore((s) => s.pushToast);

  return (
    <AiSimDialog
      open={open}
      onClose={onClose}
      title="采购清单解析"
      steps={checklistParse.steps}
      uploadHint="支持 xls / xlsx，演示中不读取文件内容"
      renderResult={() => <Result />}
      confirmLabel="确认入库"
      onConfirm={() => {
        upsertChecklistParse();
        pushToast("清单已更新：20260510 第一批 · 版本 +1");
        onClose();
        router.push("/checklists/cl-20260510-1");
      }}
    />
  );
}
