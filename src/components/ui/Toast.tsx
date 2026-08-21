"use client";

// 右上滑入自动消失
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

function ToastItem({ id, text }: { id: number; text: string }) {
  const removeToast = useAppStore((s) => s.removeToast);
  useEffect(() => {
    const t = setTimeout(() => removeToast(id), 3200);
    return () => clearTimeout(t);
  }, [id, removeToast]);
  return (
    <div className="border-line animate-[toast-in_.25s_ease-out] flex items-center gap-2.5 rounded-[10px] border bg-white px-4 py-3 shadow-lg">
      <CheckCircle2 size={17} className="text-success shrink-0" strokeWidth={1.8} />
      <div className="text-[13px] font-medium">{text}</div>
    </div>
  );
}

export function ToastHost() {
  const toasts = useAppStore((s) => s.toasts);
  return (
    <>
      <style>{`@keyframes toast-in { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
      <div className="fixed top-4 right-4 z-[100] flex w-[320px] flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} id={t.id} text={t.text} />
        ))}
      </div>
    </>
  );
}
