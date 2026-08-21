"use client";

import { useRouter } from "next/navigation";
import type { Todo, TodoKind } from "@/lib/types";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { Btn } from "@/components/ui/Btn";

const KIND_TONE: Record<TodoKind, PillTone> = {
  review: "warning",
  ai_draft: "ai",
  payment_due: "warning",
  expedite: "danger",
  receive_exception: "danger",
};

export function TodoList({ todos }: { todos: Todo[] }) {
  const router = useRouter();
  return (
    <div className="flex flex-col">
      {todos.map((t, i) => (
        <div key={t.id} className={`flex items-center gap-3 px-4.5 py-3 ${i < todos.length - 1 ? "border-page border-b" : ""}`}>
          <StatusPill tone={KIND_TONE[t.kind]}>{t.pillText}</StatusPill>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-medium">{t.title}</div>
            <div className="text-sub text-xs">{t.sub}</div>
          </div>
          <Btn
            variant={t.kind === "expedite" ? "danger" : "secondary"}
            size="sm"
            className="shrink-0"
            onClick={() => router.push(t.href)}
          >
            {t.actionLabel}
          </Btn>
        </div>
      ))}
    </div>
  );
}
