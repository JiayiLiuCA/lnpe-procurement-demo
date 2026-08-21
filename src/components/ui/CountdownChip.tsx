import { daysUntil, fmtDate } from "@/lib/date";

/** dueAt → "剩 x 天"（≤7 黄）/ "逾期 x 天"（红）/ 日期（灰） */
export function CountdownChip({ dueAt, prefix = "" }: { dueAt?: string; prefix?: string }) {
  if (!dueAt) return <span className="text-faint text-xs">—</span>;
  const d = daysUntil(dueAt);
  if (d < 0) {
    return (
      <span className="text-danger-deep text-xs font-medium">
        {prefix}
        {fmtDate(dueAt)} · 逾期 {-d} 天
      </span>
    );
  }
  if (d <= 7) {
    return (
      <span className="text-warning-deep text-xs font-medium">
        {prefix}
        {fmtDate(dueAt)} · 剩 {d} 天
      </span>
    );
  }
  return (
    <span className="text-sub text-xs">
      {prefix}
      {fmtDate(dueAt)} · 剩 {d} 天
    </span>
  );
}
