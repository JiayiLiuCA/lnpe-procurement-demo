"use client";

// AI 流程 6：采购成本预测（库存管理页触发；结果写回库存台账与各项目采购清单的预估单价）
import { AiSimDialog } from "./AiSimDialog";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAppStore } from "@/store/useAppStore";
import { costForecastSteps } from "@/fixtures/ai/cost-forecast";
import { MATERIAL_INDEX_META, MATERIAL_KEYS, indexAt, materialIndex } from "@/fixtures/material-index";
import { forecastPart, pctSigned, type Part } from "@/lib/parts";
import { fmtNum } from "@/lib/money";
import { TODAY, fmtDate } from "@/lib/date";

function Result({ parts }: { parts: Part[] }) {
  const rows = parts
    .map((p) => ({ part: p, f: forecastPart(p) }))
    .filter((x): x is { part: Part; f: NonNullable<ReturnType<typeof forecastPart>> } => x.f !== null);
  const noHistory = parts.length - rows.length;
  const avg = rows.length ? rows.reduce((s, r) => s + r.f.change, 0) / rows.length : 0;
  const up = [...rows].filter((r) => r.f.change > 0).sort((a, b) => b.f.change - a.f.change).slice(0, 5);
  const down = [...rows].filter((r) => r.f.change < 0).sort((a, b) => a.f.change - b.f.change).slice(0, 5);
  const downCount = rows.filter((r) => r.f.change < 0).length;
  const lastActual = materialIndex.ss304.series.filter((p) => !p.forecast).slice(-1)[0].month;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-line-soft grid grid-cols-3 gap-x-6 gap-y-2 rounded-[10px] border bg-[#FBFAF9] px-4 py-3.5 text-[13px]">
        <div>
          <span className="text-sub">物料数据：</span>
          {MATERIAL_INDEX_META.source}
        </div>
        <div>
          <span className="text-sub">抓取时间：</span>
          {MATERIAL_INDEX_META.fetchedAt}
        </div>
        <div>
          <span className="text-sub">预测目标月：</span>
          {MATERIAL_INDEX_META.horizon}
        </div>
        <div>
          <span className="text-sub">可预测零件：</span>
          <span className="font-bold tabular-nums">{rows.length}</span> 种
        </div>
        <div>
          <span className="text-sub">无采购记录：</span>
          <span className="font-bold tabular-nums">{noHistory}</span> 种（需询价）
        </div>
        <div>
          <span className="text-sub">平均变动：</span>
          <span className={`font-bold tabular-nums ${avg > 0 ? "text-danger-deep" : "text-success-deep"}`}>{pctSigned(avg)}</span>
          <span className="text-sub text-xs">（预计降价 {downCount} 种）</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {MATERIAL_KEYS.map((k) => {
          const s = materialIndex[k];
          const chg = indexAt(s, MATERIAL_INDEX_META.horizon) / indexAt(s, lastActual) - 1;
          return (
            <span key={k} className="border-line-soft rounded-lg border bg-white px-2.5 py-1.5 text-[12.5px]">
              {s.short} <span className={`ml-1 font-medium tabular-nums ${chg > 0 ? "text-danger-deep" : "text-success-deep"}`}>{pctSigned(chg)}</span>
            </span>
          );
        })}
      </div>

      {[
        { title: "涨幅最大的 5 种", list: up, cls: "text-danger-deep" },
        { title: "降幅最大的 5 种", list: down, cls: "text-success-deep" },
      ].map(({ title, list, cls }) => (
        <div key={title} className="border-line-soft overflow-hidden rounded-[10px] border">
          <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-3.5 py-2 text-xs font-medium">
            <div className="flex-1">{title}</div>
            <div className="w-24 text-right">上次采购</div>
            <div className="w-24 text-right">预估</div>
            <div className="w-16 text-right">变动</div>
          </div>
          {list.map(({ part, f }) => (
            <div key={part.id} className="border-page flex items-center border-b px-3.5 py-2 text-[13px] last:border-b-0">
              <div className="flex-1">
                <span className="font-medium">{part.name}</span>
                <span className="text-sub ml-2 text-xs">
                  {part.spec} · {fmtDate(f.lastDate)} 买入 · {f.material.short} {pctSigned(f.materialChange)}
                </span>
              </div>
              <div className="w-24 text-right tabular-nums">¥{fmtNum(f.lastPrice)}</div>
              <div className="w-24 text-right font-bold tabular-nums">¥{fmtNum(f.predicted)}</div>
              <div className={`w-16 text-right font-medium tabular-nums ${cls}`}>{pctSigned(f.change)}</div>
            </div>
          ))}
          {list.length === 0 && <div className="text-faint px-3.5 py-3 text-center text-xs">无</div>}
        </div>
      ))}

      <div className="flex items-center gap-2 text-[12.5px]">
        <StatusPill tone="ai">模型</StatusPill>
        <span className="text-ink-2">单价 = 人工（按类别 30–45%，恒定）+ 物料（按上次采购月 → {MATERIAL_INDEX_META.horizon} 的指数变动外推）</span>
      </div>
    </div>
  );
}

export function CostForecastDialog({ open, onClose, parts }: { open: boolean; onClose: () => void; parts: Part[] }) {
  const runCostForecast = useAppStore((s) => s.runCostForecast);
  const pushToast = useAppStore((s) => s.pushToast);
  const n = parts.filter((p) => p.history.length > 0).length;

  return (
    <AiSimDialog
      open={open}
      onClose={onClose}
      title="AI 预测采购成本"
      steps={costForecastSteps}
      autoStart
      renderResult={() => <Result parts={parts} />}
      confirmLabel={`写入预估单价（基准 ${TODAY}）`}
      onConfirm={() => {
        runCostForecast();
        pushToast(`已更新 ${n} 种零件的预估采购价 · 基准 ${TODAY}`);
        onClose();
      }}
    />
  );
}
