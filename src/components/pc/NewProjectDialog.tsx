"use client";

// 新建项目：只填项目名称。编号按建档日期自动生成；合同在项目页「订单接收」步上传，AI 抓取后再补齐金额、交货期。
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, X } from "lucide-react";
import { Btn } from "@/components/ui/Btn";
import { TODAY } from "@/lib/date";
import { useAppStore } from "@/store/useAppStore";

/** 与 store.createProject 同一套编号规则：YYMMDD，同日重复加序号 */
export function nextProjectCode(codes: Iterable<string>): string {
  const base = TODAY.slice(2).replace(/-/g, "");
  const taken = new Set(codes);
  let code = base;
  for (let i = 2; taken.has(code); i++) code = `${base}-${i}`;
  return code;
}

export function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const createProject = useAppStore((s) => s.createProject);
  const pushToast = useAppStore((s) => s.pushToast);
  const projects = useAppStore((s) => s.projects);
  const [name, setName] = useState("");
  if (!open) return null;

  const code = nextProjectCode(projects.map((p) => p.code));
  const submit = () => {
    const n = name.trim();
    if (!n) return;
    const id = createProject(n);
    pushToast(`项目 ${code} 已建档，请上传项目合同`);
    setName("");
    onClose();
    router.push(`/projects/${id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(44,42,42,.45)] p-4" onClick={onClose}>
      <div className="rounded-card w-full max-w-[520px] overflow-hidden bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-line-soft flex items-center gap-2.5 border-b px-5 py-4">
          <span className="bg-primary-soft text-primary-hover flex h-8 w-8 items-center justify-center rounded-lg">
            <FolderPlus size={16} strokeWidth={1.8} />
          </span>
          <div className="text-[15px] font-bold">新建项目</div>
          <span className="text-sub ml-1 text-xs">先建档，合同到项目里再传</span>
          <button type="button" onClick={onClose} className="text-faint hover:text-ink ml-auto cursor-pointer">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sub text-xs">项目名称</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="如：青海泰丰磷酸铁锂二粉线"
              className="border-line focus:border-ink rounded-lg border px-3 py-2 text-[13.5px] outline-none"
            />
          </label>
          <div className="bg-page text-ink-2 flex flex-col gap-1 rounded-[10px] px-3.5 py-3 text-[12.5px]">
            <div>
              项目编号 <span className="text-ink font-medium tabular-nums">{code}</span> · 按建档日期自动生成 · 负责人 赵小燕
            </div>
            <div className="text-sub">建档后进入项目页，在「订单接收」步上传客户签章的项目合同，AI 自动抓取合同号、金额、交货期与重要条目。</div>
          </div>
        </div>

        <div className="border-line-soft flex items-center justify-end gap-2 border-t px-5 py-3.5">
          <Btn variant="secondary" onClick={onClose}>
            取消
          </Btn>
          <Btn variant="primary" onClick={submit} disabled={!name.trim()}>
            建档并进入项目
          </Btn>
        </div>
      </div>
    </div>
  );
}
