"use client";

import { MessageCircle, Truck, User } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export function MTabBar() {
  const pushToast = useAppStore((s) => s.pushToast);
  return (
    <div className="border-line-soft flex shrink-0 border-t bg-white pt-2.5 pb-6.5">
      <div className="text-primary-hover flex flex-1 flex-col items-center gap-0.75">
        <Truck size={22} strokeWidth={1.8} />
        <div className="text-[11px] font-bold">收货</div>
      </div>
      <button
        type="button"
        className="text-faint flex flex-1 cursor-pointer flex-col items-center gap-0.75"
        onClick={() => pushToast("演示版未包含「消息」模块")}
      >
        <MessageCircle size={22} strokeWidth={1.8} />
        <div className="text-[11px]">消息</div>
      </button>
      <button
        type="button"
        className="text-faint flex flex-1 cursor-pointer flex-col items-center gap-0.75"
        onClick={() => pushToast("演示版未包含「我的」模块")}
      >
        <User size={22} strokeWidth={1.8} />
        <div className="text-[11px]">我的</div>
      </button>
    </div>
  );
}
