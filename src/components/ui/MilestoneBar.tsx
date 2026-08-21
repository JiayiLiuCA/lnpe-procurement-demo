import type { Milestone } from "@/lib/types";

const SHORT_LABEL: Record<string, string> = { M1: "预付", M2: "发货", M3: "验收", M4: "质保" };

export function MilestoneBar({
  milestones,
  height = 8,
  withLabels = false,
}: {
  milestones: Milestone[];
  height?: 8 | 10 | 12;
  withLabels?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-[3px]" style={{ height }}>
        {milestones.map((m) => (
          <div
            key={m.key}
            className={`rounded-[3px] ${m.status === "paid" ? "bg-primary" : "bg-line"}`}
            style={{ width: `${m.ratio * 100}%` }}
          />
        ))}
      </div>
      {withLabels && (
        <div className="text-sub flex gap-[3px] text-[11.5px]">
          {milestones.map((m) => (
            <div key={m.key} style={{ width: `${m.ratio * 100}%` }}>
              {SHORT_LABEL[m.key]} {Math.round(m.ratio * 100)}%{m.status === "paid" ? " ✓" : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
