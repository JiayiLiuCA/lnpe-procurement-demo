import type { ReactNode } from "react";

export function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="text-faint flex flex-1 flex-col items-center justify-center gap-2 py-6">
      {icon}
      <div className="text-[12.5px]">{text}</div>
    </div>
  );
}
