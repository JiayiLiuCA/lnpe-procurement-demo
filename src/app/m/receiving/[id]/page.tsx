"use client";

// 移动端 · 送货单收货
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronLeft } from "lucide-react";
import { MReceiveLineCard } from "@/components/mobile/MReceiveLineCard";
import { MExceptionDrawer } from "@/components/mobile/MExceptionDrawer";
import { useAppStore } from "@/store/useAppStore";
import { BUYER } from "@/fixtures/suppliers";
import type { DeliveryLine } from "@/lib/types";

function contractTail(no: string): string {
  return `…${no.slice(-10)}`;
}

export default function MobileReceivingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const note = useAppStore((s) => s.deliveryNotes.find((n) => n.id === id));
  const contracts = useAppStore((s) => s.contracts);
  const confirmDeliveryLine = useAppStore((s) => s.confirmDeliveryLine);
  const markLineException = useAppStore((s) => s.markLineException);
  const addLinePhoto = useAppStore((s) => s.addLinePhoto);
  const pushToast = useAppStore((s) => s.pushToast);
  const [excLine, setExcLine] = useState<DeliveryLine | null>(null);
  const [showRest, setShowRest] = useState(false);

  if (!note) {
    return <div className="text-sub p-10 text-center text-sm">未找到该收货任务</div>;
  }

  const processed = note.lines.filter((l) => l.state !== "unconfirmed");
  const confirmed = note.lines.filter((l) => l.state === "confirmed");
  const excs = note.lines.filter((l) => l.state === "exception");
  const unconfirmed = note.lines.filter((l) => l.state === "unconfirmed");
  const currentSeq = unconfirmed[0]?.seq;
  const restLines = unconfirmed.slice(1);
  const progress = Math.round((processed.length / note.lines.length) * 100);
  const allDone = unconfirmed.length === 0;

  const tailFor = (contractId: string) => {
    const c = contracts.find((x) => x.id === contractId);
    return c ? contractTail(c.no) : "—";
  };

  // 已处理行 + 当前行按 seq 顺序渲染；其余未确认行折叠
  const visible = note.lines.filter((l) => l.state !== "unconfirmed" || l.seq === currentSeq);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex shrink-0 items-center gap-3 bg-white px-4 pt-13 pb-3">
        <button type="button" className="cursor-pointer" onClick={() => router.push("/m")}>
          <ChevronLeft size={22} strokeWidth={1.9} />
        </button>
        <div>
          <div className="text-[16px] font-bold">送货单收货</div>
          <div className="text-sub text-[11.5px]">
            {note.date} · {BUYER.name}
          </div>
        </div>
        <div className="flex-1" />
        <div className="text-primary-hover text-[13px] font-bold tabular-nums">
          {processed.length}/{note.lines.length}
        </div>
      </div>
      <div className="shrink-0 bg-white px-4 pb-3">
        <div className="bg-line-soft h-1.5 overflow-hidden rounded-[3px]">
          <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3.5 pb-28">
        {/* 单头信息卡 */}
        <div className="flex flex-col gap-2 rounded-xl bg-white px-3.5 py-3">
          <div className="flex flex-wrap gap-1.5">
            {note.projectIds.map((p) => (
              <span key={p} className="bg-primary-soft rounded-md px-2 py-0.5 text-[11.5px] font-medium text-[#A34A00]">
                项目 {p.replace("p-", "")}
              </span>
            ))}
            {note.contractIds.map((cid) => {
              const c = contracts.find((x) => x.id === cid);
              return (
                <span key={cid} className="bg-page text-ink-2 rounded-md px-2 py-0.5 text-[11.5px] tabular-nums">
                  {c?.no}
                </span>
              );
            })}
          </div>
          <div className="text-sub text-xs">
            收货人 {note.receiverName} · {note.receiverAddress}
          </div>
        </div>

        {/* 第 1 步 · 已拍摄送货单 */}
        {note.headerPhoto && (
          <div className="bg-success-bg flex items-center gap-2.5 rounded-xl px-3.5 py-2.5">
            <span className="bg-success flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
              <Check size={11} strokeWidth={3.2} className="text-white" />
            </span>
            <div className="text-success-deep flex-1 text-[12.5px] font-medium">第 1 步 · 已拍摄纸质送货单</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/samples/delivery-note.jpg" alt="送货单" className="h-[38px] w-[38px] rounded-lg border border-[#BFE8D0] object-cover" />
            <button type="button" className="text-primary-hover shrink-0 cursor-pointer text-xs" onClick={() => pushToast("演示版：重拍即重新识别同一张送货单")}>
              重拍
            </button>
          </div>
        )}

        {/* 行卡 */}
        {visible.map((l) => (
          <MReceiveLineCard
            key={l.seq}
            line={l}
            contractNoTail={tailFor(l.contractId)}
            isCurrent={l.seq === currentSeq}
            onConfirm={() => confirmDeliveryLine(note.id, l.seq)}
            onException={() => setExcLine(l)}
            onAddPhoto={() => addLinePhoto(note.id, l.seq)}
          />
        ))}

        {/* 折叠提示条 */}
        {restLines.length > 0 && (
          <button
            type="button"
            onClick={() => setShowRest((v) => !v)}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3.5 py-3 text-left"
          >
            <div className="text-ink-2 text-[13px] font-medium">
              还有 {restLines.length} 项未确认（第 {restLines.map((l) => l.seq).join("·")} 项）
            </div>
            <div className="text-faint min-w-0 flex-1 truncate text-xs">{restLines.map((l) => l.name).join(" · ")}</div>
            <ChevronDown size={16} strokeWidth={1.8} className={`text-faint shrink-0 transition-transform ${showRest ? "rotate-180" : ""}`} />
          </button>
        )}
        {showRest &&
          restLines.map((l) => (
            <MReceiveLineCard
              key={`rest-${l.seq}`}
              line={l}
              contractNoTail={tailFor(l.contractId)}
              isCurrent={false}
              onConfirm={() => confirmDeliveryLine(note.id, l.seq)}
              onException={() => setExcLine(l)}
              onAddPhoto={() => addLinePhoto(note.id, l.seq)}
            />
          ))}
      </div>

      {/* 吸底汇总条 */}
      <div className="border-line-soft fixed bottom-0 left-1/2 z-40 flex w-full max-w-[390px] -translate-x-1/2 items-center gap-2.5 border-t bg-white px-4 pt-3 pb-7">
        <div className="flex shrink-0 flex-col gap-px">
          <div className="text-ink-2 text-xs">
            已确认 <span className="text-success-deep font-bold">{confirmed.length}</span> · 异常{" "}
            <span className="text-danger-deep font-bold">{excs.length}</span> · 待确认{" "}
            <span className="text-primary-hover font-bold">{unconfirmed.length}</span>
          </div>
          <div className="text-faint text-[11px]">弱网环境已自动暂存</div>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => pushToast("已暂存收货进度")}
          className="text-ink-2 flex h-[46px] cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] border-[#CFCCCA] px-4 text-sm font-medium"
        >
          暂存
        </button>
        <button
          type="button"
          disabled={!allDone}
          onClick={() => router.push(`/m/receiving/${note.id}/submit`)}
          className={`flex h-[46px] cursor-pointer items-center justify-center rounded-[10px] px-4.5 text-sm font-bold ${
            allDone ? "bg-primary text-white" : "bg-page border-line text-faint cursor-not-allowed border-[1.5px]"
          }`}
        >
          提交收货
        </button>
      </div>

      {excLine && (
        <MExceptionDrawer
          line={excLine}
          onClose={() => setExcLine(null)}
          onSubmit={(exception) => {
            markLineException(note.id, excLine.seq, exception);
            setExcLine(null);
            pushToast(`已标记异常：${excLine.name}`);
          }}
        />
      )}
    </div>
  );
}
