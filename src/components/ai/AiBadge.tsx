import { Sparkles } from "lucide-react";

export function AiBadge({ text = "AI" }: { text?: string }) {
  return (
    <span className="bg-ai-bg text-ai-deep inline-flex w-fit items-center gap-1 rounded-full px-2 py-px text-[11px] font-medium">
      <Sparkles size={11} strokeWidth={1.8} />
      {text}
    </span>
  );
}
