"use client";

// 采购清单详情（独立路由保留，供历史链接直达；日常入口在项目详情「采购清单」阶段）
import { useParams } from "next/navigation";
import { Topbar, Crumb, CrumbLink } from "@/components/shell/Topbar";
import { ChecklistWorkspace } from "@/components/pc/ChecklistWorkspace";
import { useAppStore } from "@/store/useAppStore";

export default function ChecklistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const cl = useAppStore((s) => s.checklists.find((c) => c.id === id));
  const project = useAppStore((s) => s.projects.find((p) => p.id === cl?.projectId));

  if (!cl) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Topbar backHref="/projects" crumbs={<Crumb>采购清单</Crumb>} />
        <div className="text-sub p-10 text-center text-sm">未找到该清单</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar
        backHref={project ? `/projects/${project.id}?step=2` : "/projects"}
        crumbs={
          <>
            <CrumbLink href="/projects">项目管理</CrumbLink> /{" "}
            {project ? <CrumbLink href={`/projects/${project.id}`}>{project.code}</CrumbLink> : "—"} /{" "}
            <Crumb>第{cl.batchNo === 1 ? "一" : cl.batchNo}批采购清单</Crumb>
          </>
        }
      />
      <div className="flex flex-1 flex-col p-6">
        <ChecklistWorkspace checklist={cl} />
      </div>
    </div>
  );
}
