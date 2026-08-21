import { Check, Sparkles } from "lucide-react";
import type { Version } from "@/lib/types";
import { AiBadge } from "@/components/ai/AiBadge";
import { fmtDate } from "@/lib/date";

export function VersionList({ versions }: { versions: Version[] }) {
  const list = [...versions].reverse();
  return (
    <div className="flex flex-col">
      {list.map((v, i) => (
        <div key={v.id} className={`flex items-center gap-2.5 py-2 ${i < list.length - 1 ? "border-page border-b" : ""}`}>
          {v.final ? (
            <span className="bg-success flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full">
              <Check size={10} strokeWidth={3.2} className="text-white" />
            </span>
          ) : v.ai ? (
            <span className="bg-ai-bg flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full">
              <Sparkles size={10} strokeWidth={2} className="text-ai-deep" />
            </span>
          ) : (
            <span className="bg-line-soft h-[18px] w-[18px] shrink-0 rounded-full" />
          )}
          <div className="min-w-0 flex-1">
            <div className={`text-[13px] ${v.final ? "font-medium" : ""}`}>
              {v.name} {v.ai && <AiBadge />}
            </div>
            <div className="text-sub text-[11.5px]">
              {fmtDate(v.at)} · {v.by}
            </div>
          </div>
          <span className="text-primary-hover shrink-0 text-xs">{v.final || !v.ai ? "对比" : "查看"}</span>
        </div>
      ))}
    </div>
  );
}
