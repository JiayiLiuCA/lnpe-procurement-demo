import type { ReactNode } from "react";

// success=已完成/通过 · info=进行中/当前 · warning=待处理/临期 · danger=逾期/异常 · neutral=未开始/已结束 · ai=AI 产物
export type PillTone = "success" | "warning" | "danger" | "info" | "ai" | "neutral";

export const PILL_TONE_CLASS: Record<PillTone, string> = {
  success: "bg-success-bg text-success-deep",
  warning: "bg-warning-bg text-warning-deep",
  danger: "bg-danger-bg text-danger-deep",
  info: "bg-info-bg text-info-deep",
  ai: "bg-ai-bg text-ai-deep",
  neutral: "bg-line-soft text-ink-2",
};

export function StatusPill({
  tone,
  children,
  className = "",
}: {
  tone: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${PILL_TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
