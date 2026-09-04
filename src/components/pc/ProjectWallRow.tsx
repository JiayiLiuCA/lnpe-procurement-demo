"use client";

import Link from "next/link";
import type { Project } from "@/lib/types";
import { StepIcons, StepSummary, STEP_COL_W } from "@/components/ui/StepProgress";

export function ProjectWallRow({ project, isLast }: { project: Project; isLast?: boolean }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className={`hover:bg-page/60 flex items-center px-4.5 py-2.75 text-[13px] ${isLast ? "" : "border-page border-b"} ${
        project.closedAt ? "opacity-75" : ""
      }`}
    >
      <div className="w-[90px] font-bold tabular-nums">{project.code}</div>
      <div className="w-[210px]">{project.name}</div>
      <div className="shrink-0" style={{ width: STEP_COL_W }}>
        <StepIcons project={project} />
      </div>
      <StepSummary project={project} className="text-ink-2 min-w-0 flex-1 truncate px-3 text-[12.5px]" />
      <div className="text-ink-2 w-[70px]">{project.owner}</div>
    </Link>
  );
}
