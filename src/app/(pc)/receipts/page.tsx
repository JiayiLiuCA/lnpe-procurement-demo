"use client";

// 收货记录：全部送货单（待收货 / 收货中 / 已完成），行内展开可看逐项确认、照片与异常；收货动作在小程序端完成
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, ChevronRight, Image as ImageIcon, Smartphone } from "lucide-react";
import { Topbar, Crumb } from "@/components/shell/Topbar";
import { Btn } from "@/components/ui/Btn";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAppStore } from "@/store/useAppStore";
import type { DeliveryNote } from "@/lib/types";
import { daysUntil, fmtDate } from "@/lib/date";

type Filter = "all" | "pending" | "in_progress" | "done" | "exception";

function noteStats(n: DeliveryNote) {
  const pieces = n.lines.reduce((s, l) => s + l.qty, 0);
  const processed = n.lines.filter((l) => l.state !== "unconfirmed").length;
  const exceptions = n.lines.filter((l) => l.state === "exception").length;
  const photos = n.lines.reduce((s, l) => s + l.photoCount, 0) + (n.headerPhoto ? 1 : 0);
  return { pieces, processed, exceptions, photos };
}

function StatusCell({ n }: { n: DeliveryNote }) {
  if (n.status === "done") return <StatusPill tone="success">已完成</StatusPill>;
  if (n.status === "in_progress") return <StatusPill tone="info">收货中</StatusPill>;
  const d = daysUntil(n.date);
  return <StatusPill tone={d < 0 ? "danger" : "warning"}>{d === 0 ? "今日到货" : d === 1 ? "明日到货" : d > 1 ? `${d} 天后到货` : `已到 ${-d} 天未收`}</StatusPill>;
}

export default function ReceiptsPage() {
  const notes = useAppStore((s) => s.deliveryNotes);
  const projects = useAppStore((s) => s.projects);
  const contracts = useAppStore((s) => s.contracts);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = [...notes].sort((a, b) => b.date.localeCompare(a.date));
  const pending = notes.filter((n) => n.status === "pending");
  const inProgress = notes.filter((n) => n.status === "in_progress");
  const done = notes.filter((n) => n.status === "done");
  const excLines = notes.flatMap((n) => n.lines.filter((l) => l.state === "exception"));
  const counts: Record<Filter, number> = {
    all: notes.length,
    pending: pending.length,
    in_progress: inProgress.length,
    done: done.length,
    exception: notes.filter((n) => n.lines.some((l) => l.state === "exception")).length,
  };
  const shown = sorted.filter((n) => (filter === "all" ? true : filter === "exception" ? n.lines.some((l) => l.state === "exception") : n.status === filter));
  const codeOf = (pid: string) => projects.find((p) => p.id === pid)?.code ?? pid.replace(/^p-/, "");
  const contractNo = (cid: string) => contracts.find((c) => c.id === cid)?.no ?? cid;

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar
        crumbs={<Crumb>收货记录</Crumb>}
        actions={
          <Link href="/m">
            <Btn variant="secondary">
              <Smartphone size={14} strokeWidth={1.8} />
              打开小程序收货端
            </Btn>
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex gap-4">
          <KpiCard
            label="待收货"
            value={pending.length}
            valueSuffix="张"
            sub={`${pending.reduce((s, n) => s + noteStats(n).pieces, 0)} 件 · 今日到货 ${pending.filter((n) => daysUntil(n.date) === 0).length} 张`}
          />
          <KpiCard
            label="收货中"
            value={inProgress.length}
            valueSuffix="张"
            sub={`已确认 ${inProgress.reduce((s, n) => s + noteStats(n).processed, 0)}/${inProgress.reduce((s, n) => s + n.lines.length, 0)} 项 · 收货人 ${inProgress[0]?.receiverName ?? "—"}`}
          />
          <KpiCard label="已完成" value={done.length} valueSuffix="张" sub={`最近 ${done[0] ? fmtDate(done[0].date) : "—"} · 提交后合同自动转「已到货」`} />
          <KpiCard
            label="收货异常"
            value={excLines.length}
            valueSuffix="项"
            valueClassName={excLines.length > 0 ? "text-danger" : ""}
            sub={excLines.length > 0 ? `${excLines[0].name} ${excLines[0].exception?.type} · 待与卖方核对` : "无待处理异常"}
          />
        </div>

        <div className="flex items-center gap-2">
          {(
            [
              ["all", "全部"],
              ["pending", "待收货"],
              ["in_progress", "收货中"],
              ["done", "已完成"],
              ["exception", "有异常"],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`cursor-pointer rounded-full px-3 py-1.25 text-[12.5px] font-medium ${
                filter === k ? "chip-selected" : "border-line text-ink-2 border bg-white"
              }`}
            >
              {label} {counts[k]}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-sub text-xs">送货单由卖方发货后自动创建，收货员在小程序逐项确认并拍照，提交后同步到合同</span>
        </div>

        <div className="border-line rounded-card flex flex-col overflow-clip border bg-white">
          <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-4 py-2 text-xs font-medium">
            <div className="w-[26px]" />
            <div className="w-[110px]">送货日期</div>
            <div className="flex-1">发货方</div>
            <div className="w-[200px]">项目 / 合同</div>
            <div className="w-[110px]">品类 · 件数</div>
            <div className="w-[170px]">确认进度</div>
            <div className="w-[110px]">状态</div>
            <div className="w-[90px]">收货人</div>
            <div className="w-[100px]" />
          </div>
          {shown.map((n) => {
            const st = noteStats(n);
            const open = expanded === n.id;
            const pct = Math.round((st.processed / Math.max(n.lines.length, 1)) * 100);
            return (
              <div key={n.id}>
                <div className={`hover:bg-page/60 flex items-center px-4 py-3 text-[13px] ${open ? "bg-page/40" : "border-page border-b"}`}>
                  <button type="button" onClick={() => setExpanded(open ? null : n.id)} className="text-faint w-[26px] cursor-pointer">
                    {open ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
                  </button>
                  <button type="button" onClick={() => setExpanded(open ? null : n.id)} className="flex min-w-0 flex-1 cursor-pointer items-center text-left">
                    <div className="w-[110px] font-bold tabular-nums">{n.date}</div>
                    <div className="min-w-0 flex-1 truncate pr-3">{n.fromName}</div>
                    <div className="w-[200px]">
                      <div className="tabular-nums">{codeOf(n.projectId)}</div>
                      <div className="text-sub truncate text-[11px] tabular-nums">…{contractNo(n.contractId).slice(-12)}</div>
                    </div>
                    <div className="w-[110px] tabular-nums">
                      {n.lines.length} 类 <span className="text-sub">{st.pieces} 件</span>
                    </div>
                    <div className="w-[170px] pr-4">
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="text-ink-2 tabular-nums">
                          {st.processed}/{n.lines.length} 项
                        </span>
                        {st.exceptions > 0 && <span className="text-danger-deep font-medium">异常 {st.exceptions}</span>}
                      </div>
                      <div className="bg-line-soft mt-1 flex h-1.5 overflow-hidden rounded">
                        <div className={n.status === "done" ? "bg-success" : "bg-info"} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="w-[110px]">
                      <StatusCell n={n} />
                    </div>
                    <div className="text-ink-2 w-[90px]">{n.receiverName}</div>
                  </button>
                  <div className="flex w-[100px] justify-end">
                    {n.status !== "done" ? (
                      <Link href={`/m/receiving/${n.id}`}>
                        <Btn variant="secondary" size="sm">
                          去收货
                        </Btn>
                      </Link>
                    ) : (
                      <span className="text-faint text-xs">已归档</span>
                    )}
                  </div>
                </div>

                {open && (
                  <div className="border-page bg-page/60 flex gap-4 border-b px-4 py-4">
                    <div className="border-line-soft flex min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border bg-white">
                      <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-3.5 py-2 text-xs font-medium">
                        <div className="w-10">序号</div>
                        <div className="flex-1">名称 / 规格</div>
                        <div className="w-20">数量</div>
                        <div className="w-32">确认</div>
                        <div className="w-16 text-right">照片</div>
                      </div>
                      {n.lines.map((l) => (
                        <div key={l.seq} className="border-page flex items-center border-b px-3.5 py-2.5 text-[13px] last:border-b-0">
                          <div className="text-sub w-10">{l.seq}</div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{l.name}</div>
                            <div className="text-sub text-xs">{l.spec}</div>
                          </div>
                          <div className="w-20 tabular-nums">
                            {l.qty} {l.unit}
                          </div>
                          <div className="w-32">
                            {l.state === "confirmed" ? (
                              <StatusPill tone="success">已确认{l.confirmedAt ? ` ${l.confirmedAt}` : ""}</StatusPill>
                            ) : l.state === "exception" ? (
                              <StatusPill tone="danger">{l.exception?.type ?? "异常"}</StatusPill>
                            ) : (
                              <StatusPill tone="neutral">待确认</StatusPill>
                            )}
                          </div>
                          <div className="text-sub flex w-16 items-center justify-end gap-1 text-xs tabular-nums">
                            <ImageIcon size={13} strokeWidth={1.6} />
                            {l.photoCount}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex w-[360px] shrink-0 flex-col gap-3">
                      <div className="border-line-soft flex flex-col gap-2 rounded-[10px] border bg-white px-4 py-3.5 text-[13px]">
                        <div className="text-sm font-bold">送货单信息</div>
                        <div className="flex justify-between">
                          <span className="text-sub">收货人</span>
                          <span>
                            {n.receiverName} · {n.receiverPhone}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-sub shrink-0">收货地址</span>
                          <span className="text-right">{n.receiverAddress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sub">单据照片</span>
                          <span>{n.headerPhoto ? "已拍送货单抬头" : "未拍"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sub">现场照片</span>
                          <span>{st.photos} 张</span>
                        </div>
                      </div>
                      {n.lines
                        .filter((l) => l.state === "exception")
                        .map((l) => (
                          <div key={`exc-${l.seq}`} className="bg-danger-bg text-danger-deep flex items-start gap-2 rounded-[10px] px-3.5 py-3 text-[12.5px]">
                            <AlertTriangle size={14} strokeWidth={1.8} className="mt-0.5 shrink-0" />
                            <div>
                              <div className="font-medium">
                                {l.name} {l.exception?.type}：实收 {l.exception?.actualQty}/{l.qty} {l.unit}
                              </div>
                              <div className="mt-0.5">{l.exception?.note}</div>
                              <div className="mt-1 text-[11.5px] opacity-80">处理：在合同页登记补发或按实收数结算，卖方经办已收到异常提醒</div>
                            </div>
                          </div>
                        ))}
                      {n.status === "done" && (
                        <div className="text-sub bg-white border-line-soft rounded-[10px] border px-4 py-3 text-[12.5px]">
                          已提交 · 关联合同已转「已到货」，验收款 / 质保金期限按到货日 {fmtDate(n.date)} 起算
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {shown.length === 0 && <div className="text-faint py-10 text-center text-[13px]">无符合条件的送货单</div>}
        </div>
      </div>
    </div>
  );
}
