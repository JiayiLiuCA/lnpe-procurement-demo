"use client";

// 供应商：合作供应商台账——合同、交付表现、收货异常、近 12 个月采购，全部由合同 / 送货单 / 采购记录派生
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Mail, MapPin, Phone, UserPlus } from "lucide-react";
import { Topbar, Crumb } from "@/components/shell/Topbar";
import { Btn } from "@/components/ui/Btn";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { CountdownChip } from "@/components/ui/CountdownChip";
import { useAppStore } from "@/store/useAppStore";
import { suppliers } from "@/fixtures/suppliers";
import { overdueContracts } from "@/lib/derive";
import { usePartsCatalog } from "@/lib/parts";
import { CONTRACT_STATUS_LABEL, contractTotal } from "@/lib/rules";
import { fmtNum } from "@/lib/money";
import { TODAY, fmtDate } from "@/lib/date";

const YEAR_AGO = `${Number(TODAY.slice(0, 4)) - 1}${TODAY.slice(4)}`;

type Rating = { grade: string; tone: PillTone; reason: string };

export default function SuppliersPage() {
  const contracts = useAppStore((s) => s.contracts);
  const deliveryNotes = useAppStore((s) => s.deliveryNotes);
  const projects = useAppStore((s) => s.projects);
  const pushToast = useAppStore((s) => s.pushToast);
  const { parts } = usePartsCatalog();
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    const purchases = parts.flatMap((p) => p.history.map((h) => ({ ...h, part: p })));
    return suppliers.map((s) => {
      const list = contracts.filter((c) => c.supplierId === s.id);
      const signed = list.filter((c) => c.signedAt);
      const signedTotal = signed.reduce((sum, c) => sum + (contractTotal(c) ?? 0), 0);
      const executing = list.filter((c) => c.status === "executing").length;
      const drafts = list.filter((c) => c.status === "ai_draft" || c.status === "reviewing" || c.status === "finalized").length;
      const overdue = overdueContracts(list, deliveryNotes);
      const ids = new Set(list.map((c) => c.id));
      const exceptions = deliveryNotes.flatMap((n) => n.lines.filter((l) => ids.has(l.contractId) && l.state === "exception"));
      const mine = purchases.filter((h) => h.supplier === s.short).sort((a, b) => b.date.localeCompare(a.date));
      const recent = mine.filter((h) => h.date >= YEAR_AGO);
      const categories = [...new Set([...list.flatMap((c) => c.lines.map((l) => l.name)), ...mine.map((h) => h.part.name)])];
      const rating: Rating =
        overdue.length > 0
          ? { grade: "C · 需关注", tone: "danger", reason: `交货逾期 ${overdue.length} 份` }
          : exceptions.length > 0
            ? { grade: "B · 一般", tone: "warning", reason: `收货异常 ${exceptions.length} 项` }
            : signed.length > 0
              ? { grade: "A · 优先", tone: "success", reason: "按期交付 · 无异常" }
              : { grade: "备选", tone: "neutral", reason: "尚无已签合同" };
      return { s, list, signed, signedTotal, executing, drafts, overdue, exceptions, mine, recent, categories, rating };
    });
  }, [contracts, deliveryNotes, parts]);

  const executingTotal = rows.reduce((sum, r) => sum + r.list.filter((c) => c.status === "executing").reduce((x, c) => x + (contractTotal(c) ?? 0), 0), 0);

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar
        crumbs={<Crumb>供应商</Crumb>}
        actions={
          <Btn variant="secondary" onClick={() => pushToast("演示版本：新增供应商仅作入口，供应商由合同解析时自动匹配建档")}>
            <UserPlus size={14} strokeWidth={1.8} />
            新增供应商
          </Btn>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex gap-4">
          <KpiCard label="合作供应商" value={rows.length} valueSuffix="家" sub={`A 级 ${rows.filter((r) => r.rating.tone === "success").length} 家 · 需关注 ${rows.filter((r) => r.rating.tone === "danger").length} 家`} />
          <KpiCard label="执行中合同" value={rows.reduce((s, r) => s + r.executing, 0)} valueSuffix="份" sub={`合同总额 ¥${fmtNum(executingTotal)}`} />
          <KpiCard
            label="交货逾期"
            value={rows.filter((r) => r.overdue.length > 0).length}
            valueSuffix="家"
            valueClassName={rows.some((r) => r.overdue.length > 0) ? "text-danger" : ""}
            sub={rows.filter((r) => r.overdue.length > 0).map((r) => r.s.short).join("、") || "无"}
          />
          <KpiCard
            label="近 12 个月采购"
            value={rows.reduce((s, r) => s + r.recent.length, 0)}
            valueSuffix="笔"
            sub={`涉及 ${rows.filter((r) => r.recent.length > 0).length} 家 · 另有经销商 / 代理 ${new Set(parts.flatMap((p) => p.history.map((h) => h.supplier))).size - rows.length} 家未建档`}
          />
        </div>

        <div className="border-line rounded-card flex flex-col overflow-clip border bg-white">
          <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-4 py-2 text-xs font-medium">
            <div className="w-[26px]" />
            <div className="flex-1">供应商</div>
            <div className="w-[150px]">联系人</div>
            <div className="w-[260px]">供货品类</div>
            <div className="w-[170px]">合同</div>
            <div className="w-[150px]">交付表现</div>
            <div className="w-[120px]">近 12 个月</div>
            <div className="w-[110px]">评级</div>
          </div>
          {rows.map((r) => {
            const open = expanded === r.s.id;
            return (
              <div key={r.s.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : r.s.id)}
                  className={`hover:bg-page/60 flex w-full cursor-pointer items-center px-4 py-3 text-left text-[13px] ${open ? "bg-page/40" : "border-page border-b"}`}
                >
                  <div className="text-faint w-[26px]">{open ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}</div>
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-medium">{r.s.name}</div>
                    <div className="text-sub truncate text-xs">
                      {r.s.short} · {r.s.address}
                    </div>
                  </div>
                  <div className="w-[150px]">
                    <div>{r.s.contactName}</div>
                    <div className="text-sub text-xs tabular-nums">{r.s.phone}</div>
                  </div>
                  <div className="text-ink-2 w-[260px] truncate pr-3 text-xs" title={r.categories.join("、")}>
                    {r.categories.slice(0, 4).join("、")}
                    {r.categories.length > 4 && ` 等 ${r.categories.length} 类`}
                  </div>
                  <div className="w-[170px]">
                    <div className="tabular-nums">
                      {r.list.length} 份 <span className="text-sub text-xs">· 已签 {r.signed.length}</span>
                      {r.drafts > 0 && <span className="text-ai-deep text-xs"> · 草稿 {r.drafts}</span>}
                    </div>
                    <div className="text-sub text-xs tabular-nums">已签 ¥{fmtNum(r.signedTotal)}</div>
                  </div>
                  <div className="w-[150px]">
                    {r.overdue.length > 0 ? (
                      <StatusPill tone="danger">交货逾期 {r.overdue.length} 份</StatusPill>
                    ) : r.exceptions.length > 0 ? (
                      <StatusPill tone="warning">收货异常 {r.exceptions.length} 项</StatusPill>
                    ) : r.signed.length > 0 ? (
                      <StatusPill tone="success">按期</StatusPill>
                    ) : (
                      <StatusPill tone="neutral">无交付</StatusPill>
                    )}
                  </div>
                  <div className="w-[120px]">
                    <div className="tabular-nums">{r.recent.length} 笔</div>
                    <div className="text-sub text-xs">{r.mine[0] ? `最近 ${fmtDate(r.mine[0].date)}` : "无采购记录"}</div>
                  </div>
                  <div className="w-[110px]">
                    <StatusPill tone={r.rating.tone}>{r.rating.grade}</StatusPill>
                  </div>
                </button>

                {open && (
                  <div className="border-page bg-page/60 flex gap-4 border-b px-4 py-4">
                    <div className="border-line-soft flex min-w-0 flex-1 flex-col gap-3 rounded-[10px] border bg-white px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="text-sm font-bold">合同</div>
                        <span className="text-sub text-xs">
                          {r.list.length} 份 · 评级依据：{r.rating.reason}
                        </span>
                      </div>
                      {r.list.length > 0 ? (
                        <div className="flex flex-col">
                          {r.list.map((c) => {
                            const p = projects.find((x) => x.id === c.projectId);
                            const total = contractTotal(c);
                            return (
                              <Link key={c.id} href={`/contracts/${c.id}`} className="border-page hover:bg-page/60 flex items-center gap-3 border-b py-2.5 text-[13px] last:border-b-0">
                                <span className="w-44 shrink-0 font-medium tabular-nums">{c.no}</span>
                                <span className="text-sub w-24 shrink-0 text-xs tabular-nums">{p?.code}</span>
                                <span className="min-w-0 flex-1 truncate">{c.summary}</span>
                                <StatusPill tone={c.status === "closed" ? "neutral" : c.status === "ai_draft" ? "ai" : c.status === "executing" ? "info" : c.status === "arrived" || c.status === "warranty" ? "success" : "warning"}>
                                  {CONTRACT_STATUS_LABEL[c.status]}
                                </StatusPill>
                                <span className="w-28 shrink-0 text-right font-medium tabular-nums">{total != null ? `¥${fmtNum(total)}` : "待补充"}</span>
                                <span className="w-32 shrink-0 text-right">{c.deliveryDate && c.status === "executing" ? <CountdownChip dueAt={c.deliveryDate} /> : <span className="text-sub text-xs">{c.deliveryDate ? `交货 ${fmtDate(c.deliveryDate)}` : "—"}</span>}</span>
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-faint text-[12.5px]">尚无 demo 建模的合同，仅有往期采购记录</div>
                      )}
                      {r.exceptions.length > 0 && (
                        <div className="bg-danger-bg text-danger-deep rounded-lg px-3.5 py-2.5 text-[12.5px]">
                          {r.exceptions.map((l) => `${l.name} ${l.exception?.type}（实收 ${l.exception?.actualQty}/${l.qty} ${l.unit}）`).join("；")}
                        </div>
                      )}
                    </div>
                    <div className="flex w-[380px] shrink-0 flex-col gap-3">
                      <div className="border-line-soft flex flex-col gap-2 rounded-[10px] border bg-white px-4 py-3.5 text-[13px]">
                        <div className="text-sm font-bold">联系方式</div>
                        <div className="flex items-center gap-2">
                          <Phone size={13} strokeWidth={1.8} className="text-sub" />
                          {r.s.contactName} · <span className="tabular-nums">{r.s.phone}</span>
                        </div>
                        {r.s.email && (
                          <div className="flex items-center gap-2">
                            <Mail size={13} strokeWidth={1.8} className="text-sub" />
                            {r.s.email}
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <MapPin size={13} strokeWidth={1.8} className="text-sub mt-0.5 shrink-0" />
                          {r.s.address}
                        </div>
                      </div>
                      <div className="border-line-soft flex flex-col gap-2 rounded-[10px] border bg-white px-4 py-3.5 text-[13px]">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold">采购记录</div>
                          <span className="text-sub text-xs">共 {r.mine.length} 笔 · 近 12 个月 {r.recent.length} 笔</span>
                        </div>
                        {r.mine.slice(0, 5).map((h) => (
                          <div key={`${h.contractNo}-${h.part.id}`} className="flex items-center gap-2 text-[12.5px]">
                            <span className="text-sub w-16 shrink-0 tabular-nums">{fmtDate(h.date)}</span>
                            <span className="min-w-0 flex-1 truncate">
                              {h.part.name} <span className="text-sub text-xs">{h.part.spec}</span>
                            </span>
                            <span className="shrink-0 tabular-nums">
                              {h.qty} {h.part.unit} · ¥{fmtNum(h.unitPrice)}
                            </span>
                          </div>
                        ))}
                        {r.mine.length === 0 && <div className="text-faint text-[12.5px]">无采购记录</div>}
                        {r.mine.length > 5 && (
                          <Link href="/inventory" className="text-primary-hover text-xs">
                            在库存管理查看全部单价走势
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
