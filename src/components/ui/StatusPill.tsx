import type { ReactNode } from "react";

export type PillTone = "success" | "warning" | "danger" | "info" | "ai" | "neutral" | "primarySoft";

const TONE_CLASS: Record<PillTone, string> = {
  success: "bg-success-bg text-success-deep",
  warning: "bg-warning-bg text-warning-deep",
  danger: "bg-danger-bg text-danger-deep",
  info: "bg-info-bg text-info-deep",
  ai: "bg-ai-bg text-ai-deep",
  neutral: "bg-line-soft text-ink-2",
  primarySoft: "bg-primary-soft text-primary-hover",
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
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
