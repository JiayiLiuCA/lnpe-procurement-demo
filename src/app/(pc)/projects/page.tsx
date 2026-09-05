"use client";

// 项目列表 + 新建项目（只填名字，合同在项目页「订单接收」步上传）+ 导入已有项目入口（仅演示）
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderInput, Plus } from "lucide-react";
import { Topbar, Crumb } from "@/components/shell/Topbar";
import { Btn } from "@/components/ui/Btn";
import { StepHeader, StepIcons, StepSummary, STEP_COL_W } from "@/components/ui/StepProgress";
import { ImportProjectDialog } from "@/components/pc/ImportProjectDialog";
import { NewProjectDialog } from "@/components/pc/NewProjectDialog";
import { useAppStore } from "@/store/useAppStore";

type Filter = "all" | "open" | "closed";

export default function ProjectsPage() {
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const openProjects = projects.filter((p) => !p.closedAt);
  const closedProjects = projects.filter((p) => p.closedAt);
  const shown = filter === "open" ? openProjects : filter === "closed" ? closedProjects : projects;

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar
        crumbs={<Crumb>项目管理</Crumb>}
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="secondary" onClick={() => setImportOpen(true)}>
              <FolderInput size={14} strokeWidth={1.8} />
              导入已有项目
            </Btn>
            <Btn variant="primary" onClick={() => setNewOpen(true)}>
              <Plus size={14} strokeWidth={2} />
              新建项目
            </Btn>
          </div>
        }
      />
      <div className="flex flex-1 flex-col gap-3.5 p-6">
        <div className="flex items-center gap-2">
          {(
            [
              ["all", `全部 ${projects.length}`],
              ["open", `进行中 ${openProjects.length}`],
              ["closed", `已结束 ${closedProjects.length}`],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`cursor-pointer rounded-full px-3 py-1.25 text-[12.5px] font-medium ${
                filter === k ? "chip-selected" : "border-line text-ink-2 border bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="border-line rounded-card flex flex-col overflow-hidden border bg-white">
          <div className="text-sub border-line-soft flex items-end border-b bg-[#FBFAF9] px-4.5 py-2 text-xs font-medium">
            <div className="w-[80px]">项目号</div>
            <div className="w-[210px]">项目名称</div>
            <div className="w-[90px]">立项时间</div>
            <div className="shrink-0" style={{ width: STEP_COL_W }}>
              <StepHeader />
            </div>
            <div className="flex-1 px-3">进展</div>
            <div className="w-[64px]">负责人</div>
          </div>
          {shown.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => router.push(`/projects/${p.id}`)}
              className={`hover:bg-page/60 flex cursor-pointer items-center px-4.5 py-3 text-left text-[13px] ${
                i < shown.length - 1 ? "border-page border-b" : ""
              } ${p.closedAt ? "opacity-75" : ""}`}
            >
              <div className="w-[80px] font-bold tabular-nums">{p.code}</div>
              <div className="w-[210px] pr-2">{p.name}</div>
              <div className="text-ink-2 w-[90px] tabular-nums">{p.orderedAt.slice(2)}</div>
              <div className="shrink-0" style={{ width: STEP_COL_W }}>
                <StepIcons project={p} />
              </div>
              <StepSummary project={p} className="text-ink-2 min-w-0 flex-1 truncate px-3 text-[12.5px]" />
              <div className="text-ink-2 w-[64px]">{p.owner}</div>
            </button>
          ))}
          {shown.length === 0 && <div className="text-faint py-8 text-center text-[13px]">无符合条件的项目</div>}
        </div>
      </div>

      <ImportProjectDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
