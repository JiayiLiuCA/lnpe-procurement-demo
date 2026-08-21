"use client";

// 人工上传已签合同 xlsx → AI 解析（模拟）→ 勾选合同 cover 的采购项 → 确认后更新采购单 coverage
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Checklist } from "@/lib/types";
import { AiSimDialog } from "./AiSimDialog";
import { Money } from "@/components/ui/Money";
import { useAppStore } from "@/store/useAppStore";
import { uploadContractParse } from "@/fixtures/ai/upload-contract-parse";

export function UploadContractDialog({
  open,
  onClose,
  checklist,
  preselectedRowIds,
}: {
  open: boolean;
  onClose: () => void;
  checklist: Checklist;
  preselectedRowIds?: string[];
}) {
  const router = useRouter();
  const uploadContractCover = useAppStore((s) => s.uploadContractCover);
  const pushToast = useAppStore((s) => s.pushToast);
  const [sel, setSel] = useState<Set<string>>(new Set());

  // 未覆盖的需采购行（need / partial 且未入合同）
  const uncovered = checklist.sheets
    .flatMap((sh) => sh.rows.map((r) => ({ row: r, sheetName: sh.name })))
    .filter(({ row }) => (row.alloc.status === "need" || row.alloc.status === "partial") && !row.contractId);

  useEffect(() => {
    if (open) {
      const valid = new Set(uncovered.map(({ row }) => row.id));
      setSel(new Set((preselectedRowIds ?? []).filter((id) => valid.has(id))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <AiSimDialog
      open={open}
      onClose={onClose}
      title="上传采购合同 · 更新覆盖"
      steps={uploadContractParse.steps}
      uploadHint="上传已签订的合同 xlsx，演示中不读取文件内容"
      renderResult={() => (
        <div className="flex flex-col gap-3.5">
          <div className="border-line-soft grid grid-cols-2 gap-x-6 gap-y-2 rounded-[10px] border bg-[#FBFAF9] px-4 py-3.5 text-[13px]">
            <div>
              <span className="text-sub">合同号：</span>
              <span className="font-bold tabular-nums">{uploadContractParse.no}</span>
            </div>
            <div>
              <span className="text-sub">签订日期：</span>
              {uploadContractParse.signedAt}
            </div>
            <div>
              <span className="text-sub">卖方：</span>
              {uploadContractParse.supplierName}
            </div>
            <div>
              <span className="text-sub">交货期：</span>
              {uploadContractParse.deliveryDate}
            </div>
            <div>
              <span className="text-sub">含税总额：</span>
              <Money value={uploadContractParse.amountInclTax} className="font-bold" />
            </div>
            <div className="text-sub col-span-2 text-xs">{uploadContractParse.termsSummary}</div>
          </div>

          <div className="text-[13px] font-bold">
            勾选本合同 cover 的采购项 <span className="text-sub font-normal">（未覆盖的需采购项 {uncovered.length} 项）</span>
          </div>
          <div className="border-line-soft flex max-h-[260px] flex-col overflow-y-auto rounded-[10px] border">
            {uncovered.map(({ row, sheetName }) => {
              const checked = sel.has(row.id);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => toggle(row.id)}
                  className={`border-page flex cursor-pointer items-center gap-3 border-b px-3.5 py-2.5 text-left text-[13px] last:border-b-0 ${
                    checked ? "bg-[#FBFAF9]" : ""
                  }`}
                >
                  <span
                    className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded border-[1.5px] ${
                      checked ? "bg-primary border-primary" : "border-[#CFCCCA] bg-white"
                    }`}
                  >
                    {checked && <Check size={10} strokeWidth={3.4} className="text-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{row.name}</span>
                    <span className="text-sub ml-2 text-xs">{row.spec}</span>
                  </span>
                  <span className="w-20 shrink-0 tabular-nums">
                    {typeof row.qty === "number" ? `${row.alloc.need || row.qty} ${row.unit}` : "若干"}
                  </span>
                  <span className="text-faint w-24 shrink-0 truncate text-xs">{sheetName}</span>
                </button>
              );
            })}
            {uncovered.length === 0 && <div className="text-faint py-6 text-center text-[13px]">所有需采购项均已入合同</div>}
          </div>
          <div className="text-sub text-xs">
            已勾选 <span className="text-primary-hover font-bold">{sel.size}</span> 项 · 确认后建立已签合同并更新采购单覆盖
          </div>
        </div>
      )}
      confirmLabel="确认入库并更新覆盖"
      disabled={() => sel.size === 0}
      onConfirm={() => {
        const id = uploadContractCover(checklist.id, [...sel]);
        onClose();
        if (id) {
          pushToast(`合同 ${uploadContractParse.no} 已入库，覆盖 ${sel.size} 项采购`);
          router.push(`/contracts/${id}`);
        }
      }}
    />
  );
}
