import { fmtNum } from "@/lib/money";

/** 千分位 + 可选 ¥ 前缀 + tabular-nums；金额永不手写字符串 */
export function Money({ value, prefix = true, className = "" }: { value: number; prefix?: boolean; className?: string }) {
  return (
    <span className={`tabular-nums ${className}`}>
      {prefix ? "¥" : ""}
      {fmtNum(value)}
    </span>
  );
}
