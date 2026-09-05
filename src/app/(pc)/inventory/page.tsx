"use client";

// 库存管理：全部用过的零件（无库存显示 0 件）、历史采购价与走势、AI 预估下次采购价
// AI 流程 6：物料指数（行情 API 快照）× 人工恒定 → 预估单价，同时回写各项目采购清单
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Download, Factory, Search, Sparkles } from "lucide-react";
import { Topbar, Crumb } from "@/components/shell/Topbar";
import { Btn } from "@/components/ui/Btn";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { Sparkline } from "@/components/ui/Sparkline";
import { AiBadge } from "@/components/ai/AiBadge";
import { CostForecastDialog } from "@/components/ai/CostForecastDialog";
import { useAppStore } from "@/store/useAppStore";
import { pctSigned, usePartsCatalog, type CostForecast, type Part } from "@/lib/parts";
import { MATERIAL_INDEX_META, MATERIAL_KEYS, indexAt, materialIndex, type MaterialSeries } from "@/fixtures/material-index";
import { fmtNum } from "@/lib/money";
import { TODAY, fmtDate } from "@/lib/date";

type Filter = "all" | "stocked" | "zero" | "history" | "forecast";

const LAST_ACTUAL = materialIndex.ss304.series.filter((p) => !p.forecast).slice(-1)[0].month;
const FORECAST_FROM = materialIndex.ss304.series.findIndex((p) => p.forecast);
const YEAR_AGO = `${Number(TODAY.slice(0, 4)) - 1}${TODAY.slice(4)}`;

function changeTone(x: number): "danger" | "success" | "neutral" {
  return x > 0.005 ? "danger" : x < -0.005 ? "success" : "neutral";
}
function changeText(x: number): string {
  const t = changeTone(x);
  return t === "danger" ? "text-danger-deep" : t === "success" ? "text-success-deep" : "text-sub";
}

/** 物料指数瓷砖：最新实际价 + 近 12 月 / 未来 3 月变动 + 迷你走势（虚线为预测） */
function MaterialTile({ s }: { s: MaterialSeries }) {
  const latest = indexAt(s, LAST_ACTUAL);
  const yoy = latest / s.series[0].price - 1;
  const ahead = indexAt(s, MATERIAL_INDEX_META.horizon) / latest - 1;
  return (
    <div className="border-line-soft flex min-w-0 flex-1 flex-col gap-1.5 rounded-[10px] border bg-white px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12.5px] font-bold" title={s.label}>
          {s.short}
        </span>
        <span className="text-faint shrink-0 text-[11px]">{s.unit}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[16px] font-bold tabular-nums">{fmtNum(latest)}</div>
          <div className="text-faint text-[11px]">
            近 12 月 <span className={`font-medium ${changeText(yoy)}`}>{pctSigned(yoy)}</span>
          </div>
        </div>
        <Sparkline values={s.series.map((p) => p.price)} forecastFrom={FORECAST_FROM} width={84} height={30} />
      </div>
      <div className="text-[11.5px]">
        <span className="text-sub">→ {MATERIAL_INDEX_META.horizon.slice(5)} 月预测</span>{" "}
        <span className={`font-medium tabular-nums ${changeText(ahead)}`}>{pctSigned(ahead)}</span>
      </div>
    </div>
  );
}

function ForecastCell({ part, f, forecastAt }: { part: Part; f: CostForecast | null; forecastAt: string | null }) {
  if (part.history.length === 0) return <span className="text-faint text-xs">需询价</span>;
  if (!forecastAt || !f) return <span className="text-faint text-xs">未预测</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[13.5px] font-bold tabular-nums">¥{fmtNum(f.predicted)}</span>
      <StatusPill tone={changeTone(f.change)}>{pctSigned(f.change)}</StatusPill>
    </div>
  );
}

/** 展开行：采购记录 + 走势 + AI 成本拆解 */
function PartDetail({ part, f, forecastAt }: { part: Part; f: CostForecast | null; forecastAt: string | null }) {
  const prices = part.history.map((h) => h.unitPrice);
  const values = f ? [...prices, f.predicted] : prices;
  const trend = prices.length >= 2 ? prices[prices.length - 1] / prices[0] - 1 : 0;
  const mat = materialIndex[part.materialKey];
  const laborPct = Math.round(part.laborRatio * 100);
  return (
    <div className="border-page bg-page/60 flex gap-4 border-b px-4 py-4">
      {/* 采购记录 */}
      <div className="border-line-soft flex min-w-0 flex-1 flex-col gap-3 rounded-[10px] border bg-white px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="text-sm font-bold">采购记录</div>
          <span className="text-sub text-xs">{part.history.length} 次</span>
          {part.produced && (
            <StatusPill tone="info">
              <Factory size={11} strokeWidth={2} />
              已有项目安排自制
            </StatusPill>
          )}
        </div>
        {part.history.length > 0 ? (
          <div className="flex gap-5">
            <div className="flex min-w-0 flex-1 flex-col">
              {[...part.history].reverse().map((h) => (
                <div key={`${h.contractNo}-${h.date}`} className="border-page flex items-center gap-3 border-b py-2 text-[13px] last:border-b-0">
                  <span className="text-ink-2 w-20 shrink-0 tabular-nums">{h.date}</span>
                  {h.contractId ? (
                    <Link href={`/contracts/${h.contractId}`} className="text-info-deep min-w-0 flex-1 truncate text-xs font-medium tabular-nums">
                      {h.contractNo}
                    </Link>
                  ) : (
                    <span className="text-sub min-w-0 flex-1 truncate text-xs tabular-nums">{h.contractNo}</span>
                  )}
                  <span className="text-sub w-20 shrink-0 text-xs">{h.supplier}</span>
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums">
                    {h.qty} {part.unit}
                  </span>
                  <span className="w-24 shrink-0 text-right font-medium tabular-nums">¥{fmtNum(h.unitPrice)}</span>
                </div>
              ))}
            </div>
            <div className="flex w-[300px] shrink-0 flex-col items-stretch gap-1.5">
              <div className="text-sub flex items-center justify-between text-[11px]">
                <span>
                  单价走势
                  {prices.length >= 2 && (
                    <>
                      {" "}
                      · 首→末 <span className={`font-medium tabular-nums ${changeText(trend)}`}>{pctSigned(trend)}</span>
                    </>
                  )}
                </span>
                {f && (
                  <span className="text-ai-deep flex items-center gap-1">
                    <Sparkles size={10} strokeWidth={2} />
                    虚线 = 预估 {f.targetMonth}
                  </span>
                )}
              </div>
              <Sparkline values={values} forecastFrom={f ? prices.length : undefined} width={300} height={80} className="bg-page rounded-lg" />
              <div className="text-faint flex justify-between text-[11px] tabular-nums">
                <span>{part.history[0].date}</span>
                <span>{f ? `${f.targetMonth} 预估` : part.history[part.history.length - 1].date}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-faint text-[12.5px]">尚无采购记录 · 首次采购前请询价，入库后即纳入走势与预测</div>
        )}
      </div>

      {/* AI 成本拆解 */}
      <div className="border-line-soft flex w-[400px] shrink-0 flex-col gap-3 rounded-[10px] border bg-white px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="text-sm font-bold">成本拆解与预测</div>
          <AiBadge text="AI 预测" />
          {f && <StatusPill tone="neutral">置信度 {f.confidence}</StatusPill>}
        </div>
        {f ? (
          <>
            <div className="flex flex-col gap-1.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-sub">上次采购价（{fmtDate(f.lastDate)}）</span>
                <span className="tabular-nums">¥{fmtNum(f.lastPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sub">人工 {laborPct}% · 恒定</span>
                <span className="tabular-nums">¥{fmtNum(f.labor)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sub">
                  物料 · {mat.short} {f.lastDate.slice(0, 7)} → {f.targetMonth}{" "}
                  <span className={`font-medium ${changeText(f.materialChange)}`}>{pctSigned(f.materialChange)}</span>
                </span>
                <span className="tabular-nums">
                  ¥{fmtNum(f.materialLast)} → ¥{fmtNum(f.materialNext)}
                </span>
              </div>
              <div className="border-line-soft mt-1 flex items-center justify-between border-t pt-2">
                <span className="font-bold">预估下次采购价</span>
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-bold tabular-nums">¥{fmtNum(f.predicted)}</span>
                  <StatusPill tone={changeTone(f.change)}>较上次 {pctSigned(f.change)}</StatusPill>
                </span>
              </div>
            </div>
            <div className="bg-page flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium">{mat.label}</div>
                <div className="text-faint text-[11px]">
                  {MATERIAL_INDEX_META.source} · {MATERIAL_INDEX_META.fetchedAt} 抓取 · {mat.unit}
                </div>
              </div>
              <Sparkline values={mat.series.map((p) => p.price)} forecastFrom={FORECAST_FROM} width={96} height={30} />
            </div>
            <div className="text-sub text-[11.5px] leading-relaxed">
              {part.section === "自制件" ? "钣金/机加工件人工占比高，物料波动对单价影响相对小；" : mat.key === "mixed" ? "整机设备按钢材、铜、铝加权的综合指数估算；" : ""}
              人工按 {laborPct}% 恒定，预估仅反映物料行情变化，未含供应商议价与批量差异。
            </div>
          </>
        ) : part.history.length === 0 ? (
          <div className="text-faint text-[12.5px]">无采购记录，无法按人工 + 物料拆分；建议询价后录入首笔采购价。</div>
        ) : (
          <div className="text-faint text-[12.5px]">尚未运行 AI 预测 · 点右上角「AI 预测采购成本」。</div>
        )}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const pushToast = useAppStore((s) => s.pushToast);
  const { parts, forecastAt, forecastOf } = usePartsCatalog();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const rows = useMemo(() => parts.map((p) => ({ part: p, f: forecastOf(p) })), [parts, forecastOf]);
  const stocked = rows.filter((r) => r.part.stockQty > 0).length;
  const withHistory = rows.filter((r) => r.part.history.length > 0);
  const forecasted = rows.filter((r) => r.f);
  const stockValue = rows.reduce((s, r) => {
    const last = r.part.history[r.part.history.length - 1];
    return s + (last ? last.unitPrice * r.part.stockQty : 0);
  }, 0);
  const recent = withHistory.flatMap((r) => r.part.history.filter((h) => h.date >= YEAR_AGO));
  const recentParts = new Set(withHistory.filter((r) => r.part.history.some((h) => h.date >= YEAR_AGO)).map((r) => r.part.id)).size;
  const avgChange = forecasted.length ? forecasted.reduce((s, r) => s + r.f!.change, 0) / forecasted.length : 0;

  const counts: Record<Filter, number> = {
    all: rows.length,
    stocked,
    zero: rows.length - stocked,
    history: withHistory.length,
    forecast: forecasted.length,
  };
  const shown = rows.filter(({ part, f }) => {
    if (filter === "stocked" && part.stockQty <= 0) return false;
    if (filter === "zero" && part.stockQty > 0) return false;
    if (filter === "history" && part.history.length === 0) return false;
    if (filter === "forecast" && !f) return false;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      return `${part.name} ${part.spec} ${part.material}`.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar
        crumbs={<Crumb>库存管理</Crumb>}
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="secondary" onClick={() => pushToast("演示版本：导出台账仅作入口，未生成文件")}>
              <Download size={14} strokeWidth={1.8} />
              导出台账 xlsx
            </Btn>
            <Btn variant="primary" onClick={() => setAiOpen(true)}>
              <Sparkles size={14} strokeWidth={1.8} />
              {forecastAt ? "重新预测采购成本" : "AI 预测采购成本"}
            </Btn>
          </div>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex gap-4">
          <KpiCard label="零件种类" value={rows.length} valueSuffix="种" sub={`有库存 ${stocked} 种 · 零库存 ${rows.length - stocked} 种（用过即登记）`} />
          <KpiCard label="库存金额估算" value={`¥${fmtNum(stockValue)}`} sub="按各零件最近采购价折算" />
          <KpiCard label="近 12 个月采购" value={recent.length} valueSuffix="笔" sub={`涉及 ${recentParts} 种零件 · 有采购记录 ${withHistory.length} 种`} />
          <KpiCard
            label="AI 预估下次采购价"
            value={forecastAt ? forecasted.length : "未预测"}
            valueSuffix={forecastAt ? "种" : undefined}
            valueClassName={forecastAt ? "" : "text-faint"}
            sub={
              forecastAt ? (
                <>
                  基准 {forecastAt} · 平均 <span className={`font-medium ${changeText(avgChange)}`}>{pctSigned(avgChange)}</span> · 物料指数 {MATERIAL_INDEX_META.fetchedAt} 抓取
                </>
              ) : (
                "点右上角运行 AI 预测"
              )
            }
          />
        </div>

        {/* 物料价格走势 */}
        <div className="border-line rounded-card flex flex-col gap-3 border bg-white px-4.5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="text-[15px] font-bold">物料价格走势</div>
            <span className="text-sub text-xs">
              {MATERIAL_INDEX_META.source} · API 抓取 {MATERIAL_INDEX_META.fetchedAt} · {MATERIAL_INDEX_META.note}
            </span>
          </div>
          <div className="flex gap-3">
            {MATERIAL_KEYS.map((k) => (
              <MaterialTile key={k} s={materialIndex[k]} />
            ))}
          </div>
        </div>

        {/* 筛选 + 搜索 */}
        <div className="flex items-center gap-2">
          {(
            [
              ["all", "全部"],
              ["stocked", "有库存"],
              ["zero", "零库存"],
              ["history", "有采购记录"],
              ["forecast", "有 AI 预估"],
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
          <label className="border-line rounded-ctl flex items-center gap-2 border bg-white px-3 py-1.5">
            <Search size={14} strokeWidth={1.8} className="text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索名称 / 规格 / 材质"
              className="text-ink placeholder:text-faint w-[220px] bg-transparent text-[13px] outline-none"
            />
          </label>
        </div>

        {/* 台账 */}
        <div className="border-line rounded-card flex flex-col overflow-clip border bg-white">
          <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-4 py-2 text-xs font-medium">
            <div className="w-[26px]" />
            <div className="flex-1">零件 / 规格 · 材质</div>
            <div className="w-[120px]">库存</div>
            <div className="w-[160px]">最近采购价</div>
            <div className="w-[150px]">价格走势 · 首→末</div>
            <div className="flex w-[190px] items-center gap-1">
              <Sparkles size={11} strokeWidth={2} className="text-ai-deep" />
              AI 预估下次采购价
            </div>
            <div className="w-[130px]">物料指数</div>
            <div className="w-[120px]">用于项目</div>
          </div>
          {shown.map(({ part, f }) => {
            const last = part.history[part.history.length - 1];
            const first = part.history[0];
            const trend = part.history.length >= 2 ? last.unitPrice / first.unitPrice - 1 : 0;
            const mat = materialIndex[part.materialKey];
            const matAhead = indexAt(mat, MATERIAL_INDEX_META.horizon) / indexAt(mat, LAST_ACTUAL) - 1;
            const open = expanded === part.id;
            return (
              <div key={part.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : part.id)}
                  className={`hover:bg-page/60 flex w-full cursor-pointer items-center px-4 py-3 text-left text-[13px] ${open ? "bg-page/40" : "border-page border-b"}`}
                >
                  <div className="text-faint w-[26px]">{open ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}</div>
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{part.name}</span>
                      {part.section === "自制件" && <StatusPill tone="neutral">自制件类</StatusPill>}
                      {part.produced && (
                        <StatusPill tone="info">
                          <Factory size={11} strokeWidth={2} />
                          自制
                        </StatusPill>
                      )}
                    </div>
                    <div className="text-sub truncate text-xs">
                      {part.spec}
                      {part.material && part.material !== "—" ? ` · ${part.material}` : ""}
                    </div>
                  </div>
                  <div className="w-[120px]">
                    <div className={`font-bold tabular-nums ${part.stockQty > 0 ? "" : "text-faint"}`}>
                      {part.stockQty} <span className="text-sub text-xs font-normal">{part.unit}</span>
                    </div>
                    <div className="text-faint text-[11px]">{part.stockQty > 0 ? part.location : "无库存"}</div>
                  </div>
                  <div className="w-[160px]">
                    {last ? (
                      <>
                        <div className="font-medium tabular-nums">¥{fmtNum(last.unitPrice)}</div>
                        <div className="text-sub text-[11px]">
                          {last.date} · {last.supplier}
                        </div>
                      </>
                    ) : (
                      <span className="text-faint text-xs">无采购记录</span>
                    )}
                  </div>
                  <div className="w-[150px]">
                    {part.history.length > 0 ? (
                      // 小图：实线为实际采购价，虚线接 AI 预估；百分比只算实际采购的首→末
                      <div className="flex items-center gap-2" title={part.history.length >= 2 ? `最近一次较首次采购 ${pctSigned(trend)}；虚线为 AI 预估` : undefined}>
                        <Sparkline values={f ? [...part.history.map((h) => h.unitPrice), f.predicted] : part.history.map((h) => h.unitPrice)} forecastFrom={f ? part.history.length : undefined} width={72} height={26} />
                        <div className="text-[11px]">
                          <div className="text-sub">{part.history.length} 次</div>
                          {part.history.length >= 2 && <div className={`font-medium tabular-nums ${changeText(trend)}`}>{pctSigned(trend)}</div>}
                        </div>
                      </div>
                    ) : (
                      <span className="text-faint text-xs">—</span>
                    )}
                  </div>
                  <div className="w-[190px]">
                    <ForecastCell part={part} f={f} forecastAt={forecastAt} />
                  </div>
                  <div className="w-[130px]">
                    <div className="text-xs font-medium">{mat.short}</div>
                    <div className="text-[11px]">
                      <span className="text-sub">→ {MATERIAL_INDEX_META.horizon.slice(5)} 月</span>{" "}
                      <span className={`font-medium tabular-nums ${changeText(matAhead)}`}>{pctSigned(matAhead)}</span>
                    </div>
                  </div>
                  <div className="text-ink-2 w-[120px] text-xs tabular-nums">{part.projects.length > 0 ? part.projects.join(" · ") : <span className="text-faint">仅库存</span>}</div>
                </button>
                {open && <PartDetail part={part} f={f} forecastAt={forecastAt} />}
              </div>
            );
          })}
          {shown.length === 0 && <div className="text-faint py-10 text-center text-[13px]">无符合条件的零件</div>}
        </div>
      </div>

      <CostForecastDialog open={aiOpen} onClose={() => setAiOpen(false)} parts={parts} />
    </div>
  );
}
