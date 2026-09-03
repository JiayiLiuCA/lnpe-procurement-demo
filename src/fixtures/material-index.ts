// 物料价格指数：真实场景由后端定时调用行情 API（上海有色网 SMM / 我的钢铁网 Mysteel）抓取，
// demo 为 2026-08-18 抓取的静态快照；最后 3 个月为 AI 按近 13 个月走势外推的预测段。
// 走势设定：碳钢 / 高铬 / 非金属 温和上行；304 / 铸铁 / 铝 / 铜 在 2026 年 4–6 月见顶后回落，预测段继续下行，
// 因此在高位（2026 上半年）买入的零件预估为负，2025 年买入的仍为正。设备综合 = 碳钢 60% + 铜 25% + 铝 15% 加权。
// 零件成本 = 人工（设定为不随时间变化）+ 物料（随对应指数波动），见 lib/parts.ts forecastPart。

export type MaterialKey = "ss304" | "q235" | "cast" | "hicr" | "al" | "cu" | "poly" | "mixed";

export interface IndexPoint {
  month: string;
  price: number;
  forecast?: boolean;
}

export interface MaterialSeries {
  key: MaterialKey;
  label: string;
  short: string;
  unit: string;
  series: IndexPoint[];
}

export const MATERIAL_INDEX_META = {
  source: "上海有色网 SMM · 我的钢铁网 Mysteel",
  fetchedAt: "2026-08-18",
  /** 预测目标月：下一次采购按 3 个月后估 */
  horizon: "2026-11",
  note: "演示为静态快照，未实时调用行情 API；虚线段为 AI 外推的预测",
};

const MONTHS = [
  "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02",
  "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08",
  "2026-09", "2026-10", "2026-11",
];
const FORECAST_FROM = 13;

function series(prices: number[]): IndexPoint[] {
  return prices.map((price, i) => ({ month: MONTHS[i], price, forecast: i >= FORECAST_FROM ? true : undefined }));
}

export const materialIndex: Record<MaterialKey, MaterialSeries> = {
  ss304: {
    key: "ss304",
    label: "304 冷轧不锈钢板",
    short: "304 不锈钢",
    unit: "元/吨",
    series: series([13900, 14100, 14300, 14050, 13800, 14200, 14600, 15100, 15900, 16300, 16450, 16200, 16000, 15850, 15700, 15650]),
  },
  q235: {
    key: "q235",
    label: "Q235 热轧板卷",
    short: "碳钢",
    unit: "元/吨",
    series: series([3520, 3480, 3450, 3400, 3380, 3460, 3550, 3620, 3600, 3580, 3640, 3700, 3760, 3790, 3820, 3830]),
  },
  cast: {
    key: "cast",
    label: "铸造生铁",
    short: "铸铁",
    unit: "元/吨",
    series: series([3150, 3120, 3100, 3080, 3050, 3100, 3180, 3220, 3250, 3270, 3260, 3240, 3200, 3170, 3150, 3140]),
  },
  hicr: {
    key: "hicr",
    label: "高铬合金铸件",
    short: "高铬铸铁",
    unit: "元/吨",
    series: series([9800, 9850, 9900, 9880, 9850, 9950, 10100, 10300, 10450, 10400, 10550, 10700, 10900, 11000, 11100, 11150]),
  },
  al: {
    key: "al",
    label: "A00 铝锭",
    short: "铝",
    unit: "元/吨",
    series: series([19600, 19800, 20100, 20300, 20000, 20400, 20800, 21100, 21700, 22300, 22000, 21600, 21200, 20900, 20700, 20600]),
  },
  cu: {
    key: "cu",
    label: "1# 电解铜",
    short: "铜",
    unit: "元/吨",
    series: series([73000, 74500, 76000, 75200, 74800, 76500, 78200, 81500, 83800, 84600, 84200, 83000, 81800, 80600, 79900, 79500]),
  },
  poly: {
    key: "poly",
    label: "非金属综合（氟橡胶 / PTFE / 帆布 / 陶瓷）",
    short: "非金属",
    unit: "指数",
    series: series([100, 100.3, 100.9, 101.2, 101, 101.4, 102, 102.6, 102.9, 103.1, 103.6, 104, 104.5, 104.8, 105, 105.1]),
  },
  mixed: {
    key: "mixed",
    label: "设备综合指数（钢材 60% · 铜 25% · 铝 15%）",
    short: "设备综合",
    unit: "指数",
    series: series([100, 100, 100.2, 99.2, 98.5, 100.8, 103.2, 105.8, 106.7, 107.1, 107.7, 108, 108.3, 108.2, 108.3, 108.3]),
  },
};

export const MATERIAL_KEYS: MaterialKey[] = ["ss304", "q235", "cast", "hicr", "al", "cu", "poly", "mixed"];

/** 某月的指数值：早于序列起点取首值，晚于终点取末值 */
export function indexAt(s: MaterialSeries, month: string): number {
  const pts = s.series;
  if (month <= pts[0].month) return pts[0].price;
  for (const p of pts) if (p.month === month) return p.price;
  for (let i = pts.length - 1; i >= 0; i--) if (pts[i].month < month) return pts[i].price;
  return pts[pts.length - 1].price;
}
