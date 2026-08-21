import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  valueSuffix,
  valueClassName = "",
  sub,
}: {
  label: string;
  value: ReactNode;
  valueSuffix?: string;
  valueClassName?: string;
  sub: ReactNode;
}) {
  return (
    <div className="border-line rounded-card flex flex-1 flex-col gap-1.5 border bg-white px-4.5 py-4">
      <div className="text-sub text-[12.5px]">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={`text-[28px] font-bold tabular-nums ${valueClassName}`}>{value}</span>
        {valueSuffix && <span className="text-sub text-[12.5px]">{valueSuffix}</span>}
      </div>
      <div className="text-sub text-xs">{sub}</div>
    </div>
  );
}
