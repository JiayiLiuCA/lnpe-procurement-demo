"use client";

// 移动端 · 收货任务列表 + AI 流程 6（拍送货单开始收货）
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { MTaskCard } from "@/components/mobile/MTaskCard";
import { MTabBar } from "@/components/mobile/MTabBar";
import { AiSimDialog } from "@/components/ai/AiSimDialog";
import { useAppStore } from "@/store/useAppStore";
import { deliveryScan } from "@/fixtures/ai/delivery-scan";

type Filter = "pending" | "in_progress" | "done";

export default function MobileTasksPage() {
  const router = useRouter();
  const notes = useAppStore((s) => s.deliveryNotes);
  const pushToast = useAppStore((s) => s.pushToast);
  const [filter, setFilter] = useState<Filter>("pending");
  const [scanOpen, setScanOpen] = useState(false);

  const pending = notes.filter((n) => n.status === "pending");
  const inProgress = notes.filter((n) => n.status === "in_progress");
  const done = notes.filter((n) => n.status === "done");
  const shown = filter === "pending" ? pending : filter === "in_progress" ? inProgress : done;

  const seg = (key: Filter, label: string, count: number) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      className={`flex-1 cursor-pointer rounded-lg py-2 text-center text-[13.5px] ${
        filter === key ? "text-primary-hover bg-white font-bold shadow-[0_1px_3px_rgba(44,42,42,.08)]" : "text-ink-2"
      }`}
    >
      {label} <span className={filter === key ? "text-primary" : ""}>{count}</span>
    </button>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex shrink-0 items-center gap-2.5 bg-white px-5 pt-13 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/lnpe-mark.png" alt="LNPE" className="h-[30px] w-[30px] rounded-[7px]" />
        <div className="text-lg font-bold">收货任务</div>
        <div className="flex-1" />
        <Avatar name="敬宏" size={32} />
      </div>
      <div className="shrink-0 bg-white px-5 pt-1.5 pb-3.5">
        <div className="bg-page flex rounded-[10px] p-0.75">
          {seg("pending", "待收货", pending.length)}
          {seg("in_progress", "进行中", inProgress.length)}
          {seg("done", "已完成", done.length)}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {shown.map((n) => (
          <MTaskCard
            key={n.id}
            note={n}
            onStart={() => setScanOpen(true)}
            onContinue={() => router.push(`/m/receiving/${n.id}`)}
          />
        ))}
        {filter === "pending" && inProgress.length > 0 && (
          <>
            <div className="text-faint px-1 text-xs">进行中</div>
            {inProgress.map((n) => (
              <MTaskCard key={n.id} note={n} onStart={() => setScanOpen(true)} onContinue={() => router.push(`/m/receiving/${n.id}`)} />
            ))}
          </>
        )}
        {shown.length === 0 && filter !== "pending" && (
          <div className="text-faint py-10 text-center text-[13px]">暂无{filter === "in_progress" ? "进行中" : "已完成"}任务</div>
        )}
      </div>

      <div className="shrink-0 bg-white px-4 pt-3 pb-2">
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="bg-primary flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white"
        >
          <Camera size={18} strokeWidth={1.8} />
          拍摄送货单 开始收货
        </button>
      </div>
      <MTabBar />

      {/* AI 流程 6：送货单拍照识别 */}
      <AiSimDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        title="送货单拍照识别"
        steps={deliveryScan.steps}
        samples={[{ id: "d0609", label: "样例 · 06-09 纸质送货单", thumb: "/samples/delivery-note.jpg" }]}
        uploadHint="拍照或上传送货单照片，演示中不读取文件内容"
        renderResult={() => (
          <div className="flex flex-col gap-3">
            <div className="border-line-soft flex flex-col gap-2 rounded-[10px] border bg-[#FBFAF9] px-3.5 py-3">
              <div className="text-[13px] font-bold">送货单 · {deliveryScan.date}</div>
              <div className="flex flex-wrap gap-1.5">
                {deliveryScan.projectCodes.map((p) => (
                  <span key={p} className="bg-primary-soft rounded-md px-2 py-0.5 text-[11.5px] font-medium text-[#A34A00]">
                    项目 {p}
                  </span>
                ))}
                <span className="bg-line-soft text-ink-2 rounded-md px-2 py-0.5 text-[11.5px]">合同 {deliveryScan.contractCount} 份</span>
                <span className="bg-line-soft text-ink-2 rounded-md px-2 py-0.5 text-[11.5px]">收货人 {deliveryScan.receiver}</span>
              </div>
            </div>
            <div className="border-line-soft overflow-hidden rounded-[10px] border">
              <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-3 py-2 text-xs font-medium">
                <div className="flex-1">名称 / 规格</div>
                <div className="w-14">数量</div>
                <div className="w-10">包装</div>
                <div className="w-14">项目</div>
                <div className="w-24">合同</div>
              </div>
              {deliveryScan.lines.map((l) => (
                <div key={l.spec} className="border-page flex items-center border-b px-3 py-1.75 text-xs last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium">{l.name}</div>
                    <div className="text-sub tabular-nums">{l.spec}</div>
                  </div>
                  <div className="w-14 tabular-nums">{l.qty}</div>
                  <div className="w-10">{l.packaging}</div>
                  <div className="text-sub w-14 tabular-nums">{l.projectCode}</div>
                  <div className="text-sub w-24 truncate tabular-nums">{l.contractNoTail}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        confirmLabel="生成收货任务"
        onConfirm={() => {
          // d-0609 已存在则直接打开并保留进度（幂等，可重复演示）
          setScanOpen(false);
          pushToast("已匹配到进行中的收货任务");
          router.push("/m/receiving/d-0609");
        }}
      />
    </div>
  );
}
