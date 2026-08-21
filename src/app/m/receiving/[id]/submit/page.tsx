"use client";

// 移动端 · 提交收货
import { useParams, useRouter } from "next/navigation";
import { Check, ChevronLeft, Image as ImageIcon } from "lucide-react";
import { MSubmitSummary } from "@/components/mobile/MSubmitSummary";
import { Avatar } from "@/components/ui/Avatar";
import { useAppStore } from "@/store/useAppStore";

export default function MobileSubmitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const note = useAppStore((s) => s.deliveryNotes.find((n) => n.id === id));
  const submitReceiving = useAppStore((s) => s.submitReceiving);

  if (!note) {
    return <div className="text-sub p-10 text-center text-sm">未找到该收货任务</div>;
  }

  const photos = note.lines.reduce((s, l) => s + l.photoCount, 0);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex shrink-0 items-center gap-3 bg-white px-4 pt-13 pb-3.5">
        <button type="button" className="cursor-pointer" onClick={() => router.push(`/m/receiving/${note.id}`)}>
          <ChevronLeft size={22} strokeWidth={1.9} />
        </button>
        <div className="text-[16px] font-bold">提交收货</div>
        <div className="flex-1" />
        <div className="text-sub text-xs">送货单 {note.date}</div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3.5">
        <MSubmitSummary note={note} />

        <div className="flex flex-col gap-2.5 rounded-xl bg-white px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="text-[13.5px] font-bold">现场照片 {photos} 张</div>
            <span className="text-primary-hover text-xs">查看全部</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: Math.min(photos, 5) }, (_, i) => (
              <div key={i} className="bg-page flex aspect-square items-center justify-center rounded-lg">
                <ImageIcon size={16} strokeWidth={1.6} className="text-faint" />
              </div>
            ))}
            {photos > 5 && (
              <div className="bg-line-soft text-ink-2 flex aspect-square items-center justify-center rounded-lg text-xs font-bold">
                +{photos - 5}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 rounded-xl bg-white px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="text-[13.5px] font-bold">确认人签字</div>
            <span className="text-primary-hover text-xs">重新签名</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Avatar name={note.receiverName} size={30} />
            <div className="flex-1">
              <div className="text-[13px] font-medium">{note.receiverName}</div>
              <div className="text-sub text-[11.5px] tabular-nums">{note.receiverPhone} · 现场收货员</div>
            </div>
          </div>
          <div className="flex h-[88px] items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-[#CFCCCA] bg-[#FBFAF9]">
            {/* 静态签名 SVG */}
            <svg width="150" height="56" viewBox="0 0 150 56" fill="none" stroke="#403E3E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 38c8-16 14-24 18-22 4 2-4 20 0 22 4 2 10-14 16-14 5 0 2 12 7 12 6 0 10-18 17-18 6 0 1 20 7 20 5 0 9-10 14-12" />
              <path d="M96 22c10-4 26-6 42 8" />
            </svg>
          </div>
        </div>
      </div>

      <div className="border-line-soft flex shrink-0 flex-col gap-2 border-t bg-white px-4 pt-3 pb-7">
        <button
          type="button"
          onClick={() => {
            submitReceiving(note.id);
            router.push("/m");
          }}
          className="bg-primary flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[16px] font-bold text-white"
        >
          <Check size={18} strokeWidth={2.4} />
          提交收货结果
        </button>
        <div className="text-faint text-center text-[11.5px]">提交后同步至合同跟进 · 异常项将通知采购负责人</div>
      </div>
    </div>
  );
}
