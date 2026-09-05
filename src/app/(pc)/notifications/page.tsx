"use client";

// 提醒中心：全部待办（按类型筛选、可标记已办）+ 提醒规则 + 最近动态
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck } from "lucide-react";
import { Topbar, Crumb } from "@/components/shell/Topbar";
import { Btn } from "@/components/ui/Btn";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { useAppStore } from "@/store/useAppStore";
import type { TodoKind } from "@/lib/types";
import { TODAY, fmtDate } from "@/lib/date";

type Tab = "all" | TodoKind | "done";

const KIND_META: Record<TodoKind, { label: string; tone: PillTone; urgent?: boolean }> = {
  approve: { label: "清单批准", tone: "warning" },
  ai_draft: { label: "AI 初稿", tone: "ai" },
  payment_due: { label: "付款临期", tone: "warning", urgent: true },
  delivery_overdue: { label: "交货逾期", tone: "danger", urgent: true },
  receive_exception: { label: "收货异常", tone: "danger", urgent: true },
};
const KINDS: TodoKind[] = ["approve", "ai_draft", "payment_due", "delivery_overdue", "receive_exception"];

// 提醒规则：只提醒不催办；开关仅演示（本地状态）
const RULES: { key: string; title: string; desc: string; kind: TodoKind }[] = [
  { key: "approve", title: "采购清单待批准", desc: "技术部清单上传入库后即时提醒负责人；批准后自动消除", kind: "approve" },
  { key: "ai_draft", title: "AI 合同初稿生成", desc: "初稿生成后提醒校对定稿；定稿后自动消除", kind: "ai_draft" },
  { key: "payment", title: "合同付款到期", desc: "到期前 7 天、到期当天各提醒一次；登记付款后自动消除", kind: "payment_due" },
  { key: "overdue", title: "交货逾期", desc: "过交货期当天提醒，之后每周一次；货到现场自动消除", kind: "delivery_overdue" },
  { key: "exception", title: "收货异常", desc: "小程序提交异常后即时提醒，并同步卖方经办", kind: "receive_exception" },
];

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${on ? "bg-ink" : "bg-line-soft"}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const todos = useAppStore((s) => s.todos);
  const activities = useAppStore((s) => s.activities);
  const projects = useAppStore((s) => s.projects);
  const markTodoDone = useAppStore((s) => s.markTodoDone);
  const pushToast = useAppStore((s) => s.pushToast);
  const [tab, setTab] = useState<Tab>("all");
  const [rules, setRules] = useState<Record<string, boolean>>(() => Object.fromEntries(RULES.map((r) => [r.key, true])));

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const urgent = open.filter((t) => KIND_META[t.kind].urgent);
  const counts: Record<Tab, number> = {
    all: open.length,
    approve: open.filter((t) => t.kind === "approve").length,
    ai_draft: open.filter((t) => t.kind === "ai_draft").length,
    payment_due: open.filter((t) => t.kind === "payment_due").length,
    delivery_overdue: open.filter((t) => t.kind === "delivery_overdue").length,
    receive_exception: open.filter((t) => t.kind === "receive_exception").length,
    done: done.length,
  };
  const shown = tab === "all" ? open : tab === "done" ? done : open.filter((t) => t.kind === tab);
  const todayActs = activities.filter((a) => a.at.startsWith(fmtDate(TODAY))).length;
  const recent = [...activities].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  const codeOf = (pid: string) => projects.find((p) => p.id === pid)?.code ?? pid.replace(/^p-/, "");

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar
        crumbs={<Crumb>提醒中心</Crumb>}
        actions={
          <Btn
            variant="secondary"
            disabled={open.length === 0}
            onClick={() => {
              open.forEach((t) => markTodoDone(t.id));
              pushToast(`已将 ${open.length} 条待办标记为已办`);
            }}
          >
            <CheckCheck size={14} strokeWidth={1.8} />
            全部标为已办
          </Btn>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex gap-4">
          <KpiCard label="待办" value={open.length} valueSuffix="条" sub={`清单批准 ${counts.approve} · AI 初稿 ${counts.ai_draft} · 付款临期 ${counts.payment_due}`} />
          <KpiCard
            label="需今日处理"
            value={urgent.length}
            valueSuffix="条"
            valueClassName={urgent.length > 0 ? "text-danger" : ""}
            sub={`交货逾期 ${counts.delivery_overdue} · 收货异常 ${counts.receive_exception} · 付款临期 ${counts.payment_due}`}
          />
          <KpiCard label="今日动态" value={todayActs} valueSuffix="条" sub={`系统 / 同事在 ${fmtDate(TODAY)} 产生的记录`} />
          <KpiCard label="已办" value={done.length} valueSuffix="条" sub="已办待办保留 30 天可回看" />
        </div>

        <div className="flex gap-4">
          {/* 待办列表 */}
          <div className="border-line rounded-card flex min-w-0 flex-[1.6] flex-col overflow-clip border bg-white">
            <div className="border-line-soft flex items-center gap-2 border-b px-4 py-3">
              {(
                [
                  ["all", "全部"],
                  ...KINDS.map((k) => [k, KIND_META[k].label] as [Tab, string]),
                  ["done", "已办"],
                ] as [Tab, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`cursor-pointer rounded-full px-3 py-1.25 text-[12.5px] font-medium ${
                    tab === k ? "chip-selected" : "border-line text-ink-2 border bg-white"
                  }`}
                >
                  {label} {counts[k]}
                </button>
              ))}
            </div>
            {shown.map((t, i) => (
              <div key={t.id} className={`flex items-center gap-3 px-4 py-3 ${i < shown.length - 1 ? "border-page border-b" : ""} ${t.done ? "opacity-60" : ""}`}>
                <StatusPill tone={t.done ? "neutral" : KIND_META[t.kind].tone}>{t.pillText}</StatusPill>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-[13.5px] font-medium ${t.done ? "line-through" : ""}`}>{t.title}</div>
                  <div className="text-sub text-xs">{t.sub}</div>
                </div>
                {t.done ? (
                  <span className="text-sub flex items-center gap-1 text-xs">
                    <Check size={13} strokeWidth={2} />
                    已办
                  </span>
                ) : (
                  <>
                    <Btn variant="secondary" size="sm" className="shrink-0" onClick={() => router.push(t.href)}>
                      {t.actionLabel}
                    </Btn>
                    <Btn variant="ghost" size="sm" className="shrink-0" onClick={() => markTodoDone(t.id)}>
                      标记已办
                    </Btn>
                  </>
                )}
              </div>
            ))}
            {shown.length === 0 && <div className="text-faint py-10 text-center text-[13px]">{tab === "done" ? "还没有已办事项" : "没有待办，都处理完了"}</div>}
          </div>

          {/* 规则 + 动态 */}
          <div className="flex w-[420px] shrink-0 flex-col gap-4">
            <div className="border-line rounded-card flex flex-col border bg-white">
              <div className="border-line-soft flex items-center justify-between border-b px-4 py-3">
                <div className="text-[15px] font-bold">提醒规则</div>
                <span className="text-sub text-xs">只提醒不催办 · 处理后自动消除</span>
              </div>
              {RULES.map((r, i) => (
                <div key={r.key} className={`flex items-start gap-3 px-4 py-3 ${i < RULES.length - 1 ? "border-page border-b" : ""}`}>
                  <StatusPill tone={KIND_META[r.kind].tone} className="mt-0.5 shrink-0">
                    {KIND_META[r.kind].label}
                  </StatusPill>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium">{r.title}</div>
                    <div className="text-sub mt-0.5 text-xs leading-snug">{r.desc}</div>
                  </div>
                  <Switch on={rules[r.key]} onToggle={() => setRules((prev) => ({ ...prev, [r.key]: !prev[r.key] }))} />
                </div>
              ))}
            </div>

            <div className="border-line rounded-card flex flex-col border bg-white">
              <div className="border-line-soft flex items-center justify-between border-b px-4 py-3">
                <div className="text-[15px] font-bold">最近动态</div>
                <span className="text-sub text-xs">{activities.length} 条</span>
              </div>
              <div className="flex flex-col px-4 py-2">
                {recent.map((a) => (
                  <div key={a.id} className="border-page flex items-start gap-2.5 border-b py-2.5 text-[12.5px] last:border-b-0">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.tone === "danger" ? "bg-danger" : a.tone === "success" ? "bg-success" : "bg-line"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="leading-snug">{a.text}</div>
                      <div className="text-sub mt-0.5 text-[11px] tabular-nums">
                        {codeOf(a.projectId)} · {a.at}
                        {a.actor && ` · ${a.actor}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
