"use client";

// 三态卡：已确认（绿）/ 当前（橙粗边+大按钮）/ 异常（红边+红条摘要）
import { AlertTriangle, Check } from "lucide-react";
import type { DeliveryLine } from "@/lib/types";
import { MPhotoRow } from "./MPhotoRow";

function LineMeta({ l, tail }: { l: DeliveryLine; tail: string }) {
  return (
    <div className="text-sub mt-0.5 text-xs tabular-nums">
      {l.spec} · {l.state === "exception" ? `应收 ${l.qty} ${l.unit}` : `${l.qty} ${l.unit}`} · {l.packaging}包装 · 合同 {tail}
    </div>
  );
}

export function MReceiveLineCard({
  line,
  contractNoTail,
  isCurrent,
  onConfirm,
  onException,
  onAddPhoto,
}: {
  line: DeliveryLine;
  contractNoTail: string;
  isCurrent: boolean;
  onConfirm: () => void;
  onException: () => void;
  onAddPhoto: () => void;
}) {
  const l = line;

  if (l.state === "confirmed") {
    return (
      <div className="flex flex-col gap-2.5 rounded-xl bg-white p-3.5">
        <div className="flex items-start gap-2.5">
          <div className="flex-1">
            <div className="text-[14.5px] font-bold">
              {l.seq}. {l.name}
            </div>
            <LineMeta l={l} tail={contractNoTail} />
          </div>
          <span className="bg-success-bg text-success-deep flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.75 text-xs font-bold">
            <Check size={11} strokeWidth={3} />
            已确认
          </span>
        </div>
        {(l.photoCount > 0 || l.confirmedAt) && (
          <MPhotoRow count={l.photoCount} trailing={l.confirmedAt ? <span className="text-faint text-[11.5px]">{l.confirmedAt} 确认</span> : undefined} />
        )}
      </div>
    );
  }

  if (l.state === "exception") {
    return (
      <div className="flex flex-col gap-2.5 rounded-xl border-[1.5px] border-[#F0C9C4] bg-white p-3.5">
        <div className="flex items-start gap-2.5">
          <div className="flex-1">
            <div className="text-[14.5px] font-bold">
              {l.seq}. {l.name}
            </div>
            <LineMeta l={l} tail={contractNoTail} />
          </div>
          <span className="bg-danger-bg text-danger-deep flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.75 text-xs font-bold">
            <AlertTriangle size={11} strokeWidth={2.4} />
            {l.exception?.type ?? "异常"}
          </span>
        </div>
        <div className="bg-danger-bg text-danger-deep rounded-lg px-3 py-2.25 text-[12.5px]">
          {l.exception?.type === "数量不符" ? (
            <>
              实收 <span className="font-bold">{l.exception?.actualQty}/{l.qty}</span> {l.unit} · 备注：{l.exception?.note}
            </>
          ) : (
            <>备注：{l.exception?.note}</>
          )}
        </div>
        <MPhotoRow
          count={l.photoCount}
          onAdd={onAddPhoto}
          trailing={
            <button type="button" className="text-primary-hover cursor-pointer text-xs" onClick={onException}>
              修改
            </button>
          }
        />
      </div>
    );
  }

  if (isCurrent) {
    return (
      <div className="border-primary flex flex-col gap-3 rounded-xl border-2 bg-white p-3.5">
        <div className="flex items-start gap-2.5">
          <div className="flex-1">
            <div className="text-[15px] font-bold">
              {l.seq}. {l.name}
            </div>
            <LineMeta l={l} tail={contractNoTail} />
          </div>
          <span className="bg-primary-soft shrink-0 rounded-full px-2.5 py-0.75 text-xs font-medium text-[#A34A00]">待确认</span>
        </div>
        <MPhotoRow count={l.photoCount} size={64} onAdd={onAddPhoto} />
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            className="bg-primary flex h-12 flex-[2] cursor-pointer items-center justify-center gap-1.75 rounded-[10px] text-[15px] font-bold text-white"
          >
            <Check size={17} strokeWidth={2.6} />
            确认收货
          </button>
          <button
            type="button"
            onClick={onException}
            className="text-ink-2 flex h-12 flex-1 cursor-pointer items-center justify-center rounded-[10px] border-[1.5px] border-[#CFCCCA] text-sm font-medium"
          >
            标记异常
          </button>
        </div>
      </div>
    );
  }

  // 未确认的非当前行（折叠提示展开时显示）
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white p-3.5">
      <div className="flex-1">
        <div className="text-[13.5px] font-bold">
          {l.seq}. {l.name}
        </div>
        <LineMeta l={l} tail={contractNoTail} />
      </div>
      <span className="bg-primary-soft shrink-0 rounded-full px-2.5 py-0.75 text-xs font-medium text-[#A34A00]">待确认</span>
    </div>
  );
}
