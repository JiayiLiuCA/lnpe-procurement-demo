"use client";

// 步骤条三件套（货物轨 7 步 + 付款开票轨）：
//  - StepHeader / StepIcons：列表用。表头放一遍步名，每行只在名字下方对齐放状态图标，不重复文字。
//  - StepStepper：项目详情头部。7 等分网格铺满整行；下方款项轨 4 个节点各自对齐在触发它的步骤下面。
// 状态一律由 lib/steps.ts 派生。颜色语义：绿=已完成，青=当前/进行中，红=逾期或异常，灰=未开始。
import { Check } from "lucide-react";
import type { Project } from "@/lib/types";
import { STEP_GROUPS, STEP_LABELS, STEP_NOS, isSignedContract, paymentLane, projectProgress, type LaneNode, type ProjectProgress, type StepMark, type StepNo } from "@/lib/steps";
import { projectContracts } from "@/lib/derive";
import { contractTotal, paidAmount } from "@/lib/rules";
import type { MilestoneKey } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { Money } from "./Money";

/** 列表阶段列每一步的宽度（表头与行共用，保证图标对齐在名字正下方） */
export const STEP_CELL_W = 64;
export const STEP_COL_W = STEP_CELL_W * STEP_LABELS.length;

export function useProjectProgress(project: Project): ProjectProgress {
  const contracts = useAppStore((s) => s.contracts);
  const checklists = useAppStore((s) => s.checklists);
  const notes = useAppStore((s) => s.deliveryNotes);
  return projectProgress(project, checklists, contracts, notes);
}

/** 单个状态图标：勾 / 青圈 / 青半圆 / 红叹号 / 灰点 */
export function StepIcon({ mark, size = 16 }: { mark: StepMark; size?: number }) {
  const box = { width: size, height: size };
  switch (mark) {
    case "done":
      return (
        <span className="bg-success flex shrink-0 items-center justify-center rounded-full" style={box}>
          <Check size={Math.round(size * 0.62)} strokeWidth={3.4} className="text-white" />
        </span>
      );
    case "current":
      return <span className="border-info shrink-0 rounded-full border-[3px] bg-white" style={box} />;
    case "partial":
      return (
        <span
          className="border-info shrink-0 rounded-full border-2"
          style={{ ...box, background: "linear-gradient(90deg, var(--color-info) 50%, #fff 50%)" }}
        />
      );
    case "issue":
      return (
        <span className="bg-danger flex shrink-0 items-center justify-center rounded-full leading-none font-bold text-white" style={{ ...box, fontSize: Math.round(size * 0.7) }}>
          !
        </span>
      );
    default:
      return <span className="bg-line shrink-0 rounded-full" style={{ width: size / 2, height: size / 2 }} />;
  }
}

/** 列表表头：一行 7 个步名；groups=true 时上方带「采购准备 / 合同跟进」分组小字 */
export function StepHeader({ groups = true }: { groups?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5" style={{ width: STEP_COL_W }}>
      {groups && (
        <div className="flex">
          {STEP_GROUPS.map((g) => (
            <div key={g.label} className="text-faint flex items-center gap-1.5 pr-3 text-[10.5px] font-normal" style={{ width: (g.to - g.from + 1) * STEP_CELL_W }}>
              <span className="whitespace-nowrap">{g.label}</span>
              <span className="bg-line-soft h-px flex-1" />
            </div>
          ))}
        </div>
      )}
      <div className="flex">
        {STEP_LABELS.map((label) => (
          <div key={label} className="text-center whitespace-nowrap" style={{ width: STEP_CELL_W }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 列表行：7 个对齐的状态图标，悬停显示该步的进度小字 */
export function StepIcons({ project }: { project: Project }) {
  const { states } = useProjectProgress(project);
  return (
    <div className="flex items-center" style={{ width: STEP_COL_W }}>
      {states.map((s) => (
        <div key={s.no} className="flex justify-center" style={{ width: STEP_CELL_W }} title={s.note ? `${s.label} · ${s.note}` : s.label}>
          <StepIcon mark={s.mark} />
        </div>
      ))}
    </div>
  );
}

/** 列表「进展」列：当前步的一句话进度 */
export function StepSummary({ project, className = "" }: { project: Project; className?: string }) {
  const { summary } = useProjectProgress(project);
  return <span className={className}>{summary}</span>;
}

/* ------------------------------------------------------------------ 项目详情头部 */

const GRID = { display: "grid", gridTemplateColumns: `repeat(${STEP_NOS.length}, minmax(0, 1fr))` } as const;

function laneTone(n: LaneNode): { dot: string; text: string } {
  if (n.total === 0) return { dot: "bg-line-soft text-faint", text: "text-faint" };
  if (n.overdue > 0) return { dot: "bg-danger text-white", text: "text-danger-deep" };
  if (n.paid >= n.total) return { dot: "bg-success text-white", text: "text-success-deep" };
  if (n.due > 0) return { dot: "bg-warning text-white", text: "text-warning-deep" };
  return { dot: "bg-line-soft text-ink-2", text: "text-ink-2" };
}

/**
 * 项目详情头部的可点击步骤条 + 付款开票轨。两行共用同一个 7 等分网格，铺满整行，节点天然对齐。
 * 进度图标展示项目实际进度；点击任意步骤切换下方内容，被选中的步名加底色；
 * 款项轨节点显示项目级份数，点击展开付款开票面板（再点收起）；轨表头放项目级已签总额与已付比例，各步共用一份。
 */
export function StepStepper({
  project,
  viewStep,
  onSelect,
  moneyKey,
  onSelectMoney,
}: {
  project: Project;
  viewStep: StepNo;
  onSelect: (step: StepNo) => void;
  moneyKey: MilestoneKey | null;
  onSelectMoney: (key: MilestoneKey | null) => void;
}) {
  const contracts = useAppStore((s) => s.contracts);
  const { states, current } = useProjectProgress(project);
  const list = projectContracts(contracts, project.id);
  const lane = paymentLane(list);
  const signedTotal = list.filter(isSignedContract).reduce((s, c) => s + (contractTotal(c) ?? 0), 0);
  const paid = list.reduce((s, c) => s + paidAmount(c), 0);
  const paidPct = signedTotal > 0 ? `${((paid / signedTotal) * 100).toFixed(1)}%` : "—";

  return (
    <div className="flex w-full flex-col gap-3">
      {/* 货物轨 */}
      <div style={GRID}>
        {states.map((s, i) => {
          const selected = s.no === viewStep;
          // 当前步（不论空心圈还是半圆）步名加粗；后面先走到的步只青色不加粗
          const labelTone =
            s.mark === "issue"
              ? "text-danger-deep font-bold"
              : s.no === current
                ? "text-info-deep font-bold"
                : s.mark === "done"
                  ? "text-ink-2"
                  : s.mark === "partial"
                    ? "text-info-deep"
                    : "text-faint";
          return (
            <button key={s.no} type="button" onClick={() => onSelect(s.no)} className="relative flex min-w-0 cursor-pointer flex-col items-center gap-1.5 px-1">
              {i < states.length - 1 && (
                <span className={`absolute top-[8px] left-1/2 h-[2px] w-full ${s.mark === "done" ? "bg-success" : "bg-line"}`} />
              )}
              <span className="relative z-10 flex h-[18px] items-center">
                <StepIcon mark={s.mark} size={18} />
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${selected ? "bg-line-soft font-bold" : ""} ${labelTone}`}>{s.label}</span>
              <span className={`min-h-[14px] text-center text-[11px] leading-[14px] ${s.mark === "issue" ? "text-danger-deep" : "text-sub"}`}>
                {s.mark !== "done" && s.mark !== "idle" ? s.note : ""}
              </span>
            </button>
          );
        })}
      </div>

      {/* 付款开票轨：没有已签子合同时只留一行提示；有了以后前 3 格放说明，后 4 格的节点对齐在触发它的步骤下方 */}
      {lane.every((n) => n.total === 0) ? (
        <div className="text-faint flex items-center gap-3 text-[11.5px]">
          <span className="bg-line-soft h-px flex-1" />
          <span className="whitespace-nowrap">
            <span className="text-sub font-medium">付款开票</span> · 签订子合同后启动 · 按合同付款条款 10 / 50 / 30 / 10 分四笔，分别对齐子合同 / 交货跟进 / 现场收货 / 订单关闭
          </span>
          <span className="bg-line-soft h-px flex-1" />
        </div>
      ) : (
        <div style={GRID} className="items-start">
          <div
            className="text-sub col-span-3 flex items-center gap-2 pr-6 text-[11.5px]"
            style={{ height: 44 }}
            title="按合同付款条款 10 / 50 / 30 / 10 分四笔；已签总额只计已签订的子合同"
          >
            <span className="bg-line-soft h-px flex-1" />
            <span className="whitespace-nowrap font-medium">付款开票</span>
            <span className="text-ink-2 whitespace-nowrap tabular-nums">
              已签 <Money value={signedTotal} className="text-ink font-medium" /> · 已付 <span className="text-ink font-medium">{paidPct}</span>
            </span>
          </div>
          {lane.map((n) => {
            const tone = laneTone(n);
            const active = moneyKey === n.key;
            return (
              <button
                key={n.key}
                type="button"
                onClick={() => onSelectMoney(active ? null : n.key)}
                title={n.total === 0 ? "尚无已签子合同" : `${n.label}：已付 ${n.paid}/${n.total} 份${n.due > 0 ? ` · 到期未付 ${n.due} 份` : ""}${n.invoiced > 0 ? ` · 已开票 ${n.invoiced} 份` : ""}`}
                className={`mx-1 flex min-w-0 cursor-pointer items-center justify-center gap-2.5 rounded-lg px-2 ${active ? "bg-line-soft" : "hover:bg-page"}`}
                style={{ height: 44 }}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${tone.dot}`}>¥</span>
                <span className="flex min-w-0 flex-col items-start leading-tight">
                  <span className="text-[12px] font-medium whitespace-nowrap">
                    {n.label} {Math.round(n.ratio * 100)}%
                  </span>
                  <span className={`text-[11px] whitespace-nowrap tabular-nums ${tone.text}`}>
                    {n.total === 0 ? "尚无已签合同" : `${n.paid}/${n.total} 已付${n.overdue > 0 ? ` · 逾期 ${n.overdue}` : n.due > 0 ? ` · 到期 ${n.due}` : ""}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
