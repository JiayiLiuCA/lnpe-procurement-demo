"use client";

// 采购清单列表
import { useRouter } from "next/navigation";
import { Topbar, Crumb } from "@/components/shell/Topbar";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAppStore } from "@/store/useAppStore";
import { checklistStats } from "@/lib/derive";
import { fmtDate } from "@/lib/date";

export default function ChecklistsPage() {
  const router = useRouter();
  const checklists = useAppStore((s) => s.checklists);
  const projects = useAppStore((s) => s.projects);

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar crumbs={<Crumb>采购清单</Crumb>} />
      <div className="flex flex-1 flex-col p-6">
        <div className="border-line rounded-card flex flex-col overflow-hidden border bg-white">
          <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-4.5 py-2 text-xs font-medium">
            <div className="flex-1">清单批次</div>
            <div className="w-[180px]">项目</div>
            <div className="w-[120px]">版本</div>
            <div className="w-[100px]">状态</div>
            <div className="w-[220px]">明细</div>
            <div className="w-[140px]">签核</div>
          </div>
          {checklists.map((cl) => {
            const p = projects.find((x) => x.id === cl.projectId);
            const stats = checklistStats(cl);
            return (
              <button
                key={cl.id}
                type="button"
                onClick={() => router.push(`/checklists/${cl.id}`)}
                className="hover:bg-page/60 flex cursor-pointer items-center px-4.5 py-3.5 text-left text-[13px]"
              >
                <div className="flex-1">
                  <div className="font-bold">{cl.title}</div>
                  <div className="text-sub text-xs">{cl.fileName}</div>
                </div>
                <div className="text-ink-2 w-[180px]">
                  {p?.code} {p?.name}
                </div>
                <div className="w-[120px] tabular-nums">
                  {cl.versions[cl.versions.length - 1]?.id} · {cl.versions.length} 版
                </div>
                <div className="w-[100px]">
                  <StatusPill tone={cl.status === "已批准" ? "success" : "warning"}>{cl.status}</StatusPill>
                </div>
                <div className="text-ink-2 w-[220px] text-[12.5px]">
                  {stats.total} 项 · 已分配 {stats.allocated} · 需采购 {stats.need}
                  {stats.produce > 0 && ` · 安排生产 ${stats.produce}`}
                </div>
                <div className="text-sub w-[140px] text-[12.5px]">
                  制表 {cl.signoff.maker} {fmtDate(cl.signoff.makerAt)}
                  {cl.signoff.approveAt && ` · 批准 ${fmtDate(cl.signoff.approveAt)}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
