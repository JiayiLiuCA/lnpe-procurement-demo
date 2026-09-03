// 零件目录与采购成本预测：一律由采购清单行 + 已签合同行 + 库存/往期采购种子派生，不另造数。
// 成本模型：单价 = 人工（按类别占比，设定为不随时间变化）+ 物料（随对应物料指数波动）。
import { useMemo } from "react";
import type { Checklist, Contract } from "./types";
import { MATERIAL_INDEX_META, indexAt, materialIndex, type MaterialKey, type MaterialSeries } from "@/fixtures/material-index";
import { pastPurchases, stockSeed } from "@/fixtures/inventory";
import { supplierById } from "@/fixtures/suppliers";
import { useAppStore } from "@/store/useAppStore";

export interface PricePoint {
  date: string;
  unitPrice: number;
  qty: number;
  contractNo: string;
  supplier: string;
  /** demo 里建模了的合同可跳转 */
  contractId?: string;
}

export interface Part {
  id: string;
  key: string;
  name: string;
  spec: string;
  material: string;
  unit: string;
  section: "标准件" | "自制件";
  materialKey: MaterialKey;
  /** 人工成本占比（按类别设定，不随时间变化） */
  laborRatio: number;
  stockQty: number;
  location?: string;
  /** 用过该零件的项目号 */
  projects: string[];
  /** 是否有项目已把它安排为公司自制 */
  produced: boolean;
  /** 采购记录，按日期升序 */
  history: PricePoint[];
}

export interface CostForecast {
  lastPrice: number;
  lastDate: string;
  labor: number;
  materialLast: number;
  materialNext: number;
  /** 物料指数从上次采购月到目标月的变动 */
  materialChange: number;
  predicted: number;
  /** 预估价相对上次采购价的变动 */
  change: number;
  targetMonth: string;
  confidence: "高" | "中" | "低";
  material: MaterialSeries;
}

export function partKey(name: string, spec: string): string {
  return `${name}|${spec}`;
}

function slug(key: string): string {
  return key.replace(/[^\w一-龥]+/g, "-").toLowerCase();
}

/** 材质文字 → 物料指数：整机/无材质的按「设备综合」 */
export function materialKeyOf(material: string): MaterialKey {
  const m = material || "";
  if (m.includes("高铬")) return "hicr";
  if (m.includes("铸铁")) return "cast";
  if (/304|316|SUS|不锈钢/.test(m)) return "ss304";
  if (/Q235|Q355|Q245|碳钢|镀锌|合金钢|轴承钢/.test(m)) return "q235";
  if (m.includes("铝")) return "al";
  if (m.includes("铜")) return "cu";
  if (/橡胶|PTFE|帆布|陶瓷|塑料|涤纶|滤袋/.test(m)) return "poly";
  return "mixed";
}

function laborRatioOf(section: Part["section"], key: MaterialKey): number {
  if (section === "自制件") return 0.45; // 钣金/机加工：人工占比高
  if (key === "mixed") return 0.3; // 整机设备
  return 0.35;
}

/** 已签（含执行中/到货/质保/完结）的合同才算真实采购价 */
const SIGNED = new Set<Contract["status"]>(["signed", "executing", "arrived", "warranty", "closed"]);

export function buildParts(checklists: Checklist[], contracts: Contract[]): Part[] {
  const map = new Map<string, Part>();
  const projectCodeOf = new Map<string, string>();
  const ensure = (name: string, spec: string, material: string, unit: string, section: Part["section"]): Part => {
    const key = partKey(name, spec);
    let p = map.get(key);
    if (!p) {
      const mk = materialKeyOf(material);
      p = { id: slug(key), key, name, spec, material, unit, section, materialKey: mk, laborRatio: laborRatioOf(section, mk), stockQty: 0, projects: [], produced: false, history: [] };
      map.set(key, p);
    }
    return p;
  };

  // 1. 清单行：目录主体
  for (const cl of checklists) {
    for (const sh of cl.sheets) {
      for (const r of sh.rows) {
        const p = ensure(r.name, r.spec, r.material, r.unit, r.section);
        if (!projectCodeOf.has(cl.projectId)) projectCodeOf.set(cl.projectId, cl.projectId.replace(/^p-/, ""));
        const code = projectCodeOf.get(cl.projectId)!;
        if (!p.projects.includes(code)) p.projects.push(code);
        if (r.alloc.status === "produce") p.produced = true;
      }
    }
  }
  // 2. 库存种子（可能带清单里没有的常备件）
  for (const s of stockSeed) {
    const p = ensure(s.name, s.spec, s.material ?? "—", s.unit ?? "件", "标准件");
    p.stockQty = s.qty;
    p.location = s.location;
  }
  // 3. 往期采购
  for (const h of pastPurchases) {
    const p = ensure(h.name, h.spec, "—", "件", "标准件");
    p.history.push({ date: h.date, unitPrice: h.unitPrice, qty: h.qty, contractNo: h.contractNo, supplier: h.supplier });
  }
  // 4. demo 建模的已签合同行：名称+规格精确匹配，退而按唯一规格匹配（合同行名称偶有简写）
  const bySpec = new Map<string, Part[]>();
  for (const p of map.values()) bySpec.set(p.spec, [...(bySpec.get(p.spec) ?? []), p]);
  for (const c of contracts) {
    if (!SIGNED.has(c.status) || !c.signedAt) continue;
    for (const l of c.lines) {
      if (l.unitPrice == null) continue;
      let p = map.get(partKey(l.name, l.spec));
      if (!p) {
        const cands = bySpec.get(l.spec);
        if (cands && cands.length === 1) p = cands[0];
      }
      if (!p) p = ensure(l.name, l.spec, "—", l.unit, "标准件");
      if (p.history.some((h) => h.contractNo === c.no)) continue;
      p.history.push({ date: c.signedAt, unitPrice: l.unitPrice, qty: l.qty, contractNo: c.no, supplier: supplierById(c.supplierId).short, contractId: c.id });
    }
  }
  const parts = [...map.values()];
  for (const p of parts) p.history.sort((a, b) => a.date.localeCompare(b.date));
  // 有采购记录的在前，其次有库存的，再按名称
  return parts.sort((a, b) => {
    const ha = a.history.length > 0 ? 0 : 1;
    const hb = b.history.length > 0 ? 0 : 1;
    if (ha !== hb) return ha - hb;
    if ((a.stockQty > 0) !== (b.stockQty > 0)) return a.stockQty > 0 ? -1 : 1;
    return a.name.localeCompare(b.name, "zh-Hans-CN");
  });
}

/** 预估下次采购价：人工不变，物料按指数从上次采购月外推到目标月 */
export function forecastPart(part: Part): CostForecast | null {
  if (part.history.length === 0) return null;
  const last = part.history[part.history.length - 1];
  const series = materialIndex[part.materialKey];
  const idxLast = indexAt(series, last.date.slice(0, 7));
  const idxTarget = indexAt(series, MATERIAL_INDEX_META.horizon);
  const labor = Math.round(last.unitPrice * part.laborRatio);
  const materialLast = last.unitPrice - labor;
  const materialChange = idxTarget / idxLast - 1;
  const materialNext = Math.round(materialLast * (1 + materialChange));
  const raw = labor + materialNext;
  const step = raw >= 100000 ? 1000 : raw >= 10000 ? 100 : raw >= 1000 ? 10 : 1;
  const predicted = Math.round(raw / step) * step;
  const n = part.history.length;
  return {
    lastPrice: last.unitPrice,
    lastDate: last.date,
    labor,
    materialLast,
    materialNext,
    materialChange,
    predicted,
    change: predicted / last.unitPrice - 1,
    targetMonth: MATERIAL_INDEX_META.horizon,
    confidence: n >= 3 ? "高" : n === 2 ? "中" : "低",
    material: series,
  };
}

/** 带符号百分比：+3.2% / −1.0% / 0.0% */
export function pctSigned(x: number, digits = 1): string {
  const v = (x * 100).toFixed(digits);
  if (Number(v) > 0) return `+${v}%`;
  if (Number(v) < 0) return `−${Math.abs(Number(v)).toFixed(digits)}%`;
  return `${(0).toFixed(digits)}%`;
}

/** 组件用：目录 + 预测（未跑过 AI 预测时 forecastOf 一律为 null） */
export function usePartsCatalog() {
  const checklists = useAppStore((s) => s.checklists);
  const contracts = useAppStore((s) => s.contracts);
  const forecastAt = useAppStore((s) => s.costForecastAt);
  return useMemo(() => {
    const parts = buildParts(checklists, contracts);
    const byKey = new Map(parts.map((p) => [p.key, p]));
    const cache = new Map<string, CostForecast | null>();
    const forecastOf = (p: Part): CostForecast | null => {
      if (!forecastAt) return null;
      if (!cache.has(p.key)) cache.set(p.key, forecastPart(p));
      return cache.get(p.key) ?? null;
    };
    const estimateFor = (name: string, spec: string): { part: Part; forecast: CostForecast | null } | null => {
      const p = byKey.get(partKey(name, spec));
      return p ? { part: p, forecast: forecastOf(p) } : null;
    };
    return { parts, byKey, forecastAt, forecastOf, estimateFor };
  }, [checklists, contracts, forecastAt]);
}
