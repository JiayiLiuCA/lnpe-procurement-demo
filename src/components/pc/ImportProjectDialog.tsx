"use client";

// 导入已有项目：把线下已在执行的项目一次性搬进系统。
// demo 仅做入口——弹窗说明需要准备哪些资料、导入后会落到哪一步，不读取任何文件。
import { FileSpreadsheet, FileText, FolderInput, List, Receipt, X } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAppStore } from "@/store/useAppStore";

const ITEMS = [
  {
    icon: FileSpreadsheet,
    title: "项目合同（客户签章版）",
    format: "xlsx / pdf",
    required: true,
    desc: "建档依据：项目号、客户、含税金额、交货期与付款条款由 AI 抓取后人工核对",
    lands: "订单接收",
  },
  {
    icon: List,
    title: "采购清单（技术部制表）",
    format: "xls / xlsx · 可多批",
    required: false,
    desc: "解析各子系统行明细，保留制表人与批准状态，随后进入订货安排",
    lands: "采购清单",
  },
  {
    icon: FileText,
    title: "已签采购合同",
    format: "xlsx · 可多份",
    required: false,
    desc: "按供应商建立子合同，回填清单覆盖关系，并按付款条款生成 M1–M4 里程碑",
    lands: "采购合同",
  },
  {
    icon: Receipt,
    title: "付款、发票与送货单记录",
    format: "xlsx / 图片",
    required: false,
    desc: "补齐已付款、已开票与已收货状态，后续只需从当前节点继续跟进",
    lands: "交货跟进 / 现场收货",
  },
];

export function ImportProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pushToast = useAppStore((s) => s.pushToast);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(44,42,42,.45)] p-4" onClick={onClose}>
      <div
        className="rounded-card flex max-h-[86dvh] w-full max-w-[600px] flex-col overflow-hidden bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-line-soft flex items-center gap-2.5 border-b px-5 py-4">
          <span className="bg-primary-soft text-primary-hover flex h-8 w-8 items-center justify-center rounded-lg">
            <FolderInput size={16} strokeWidth={1.8} />
          </span>
          <div className="text-[15px] font-bold">导入已有项目</div>
          <span className="text-sub ml-1 text-xs">线下已在执行的项目，一次性导入后从当前节点继续跟进</span>
          <button type="button" onClick={onClose} className="text-faint hover:text-ink ml-auto cursor-pointer">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-5">
          <div className="text-ink-2 text-[13px]">请准备以下资料。系统按资料完整度自动判断项目所处步段，资料齐全的项目导入后无需重新走流程。</div>

          <div className="border-line-soft overflow-hidden rounded-[10px] border">
            {ITEMS.map((it, i) => {
              const Icon = it.icon;
              return (
                <div key={it.title} className={`flex items-start gap-3.5 px-4 py-3.5 ${i < ITEMS.length - 1 ? "border-page border-b" : ""}`}>
                  <span className="bg-page text-ink-2 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon size={17} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-bold">{it.title}</span>
                      <span className="text-sub text-xs">{it.format}</span>
                      {it.required ? <StatusPill tone="warning">必需</StatusPill> : <StatusPill tone="neutral">可选</StatusPill>}
                    </div>
                    <div className="text-ink-2 mt-1 text-[12.5px] leading-snug">{it.desc}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-faint text-[11px]">导入后落到</div>
                    <div className="text-info-deep text-[12.5px] font-medium">{it.lands}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-page text-ink-2 rounded-[10px] px-4 py-3 text-[12.5px] leading-relaxed">
            仅有项目合同 → 停在「采购清单」，等技术部出清单；含采购清单 → 进入「订货安排」做库存 / 生产 / 采购分派；含已签合同 →
            进入「交货跟进」，付款开票与现场收货从导入的记录之后继续。导入结果先以草稿呈现，人工确认后再入库。
          </div>
          <div className="text-faint text-xs">演示版本：本入口仅展示导入所需资料与去向，不读取文件内容。</div>
        </div>

        <div className="border-line-soft flex items-center justify-end gap-2.5 border-t px-5 py-3.5">
          <Btn variant="secondary" onClick={onClose}>
            取消
          </Btn>
          <Btn
            variant="primary"
            onClick={() => {
              pushToast("演示版本：导入入口仅作展示，未处理文件");
              onClose();
            }}
          >
            <FolderInput size={14} strokeWidth={1.8} />
            选择资料并导入
          </Btn>
        </div>
      </div>
    </div>
  );
}
