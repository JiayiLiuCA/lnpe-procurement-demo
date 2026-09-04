// 项目合同的 AI 抓取（演示用纯函数）：标准 8 项重要条目、版本间比对、模拟一次上传后的解析结果。
// 每一版项目合同（签章版、补充协议、技术附件）上传后都由 AI 抓取重要条目并记在该版本上；
// 项目当前的金额 / 交货期以最新一版已抓取的条目为准。
import type { KeyTerm, OrderContract, OrderVersion, Project } from "./types";
import { TODAY, addDays, addMonths } from "./date";
import { fmtNum } from "./money";

/** 各项目共用的重要条目模板（金额、交货期、交付范围按合同差异化） */
export function standardTerms(amount: string, delivery: string, scope: string): KeyTerm[] {
  return [
    { label: "合同金额", value: `${amount}（含税 13%）` },
    { label: "交货期", value: delivery },
    { label: "交付范围", value: scope },
    { label: "付款节点", value: "预付 30% · 验收后 60% · 质保金 10%" },
    { label: "运输与安装", value: "卖方运抵现场 · 指导安装调试" },
    { label: "验收方式", value: "72 小时连续负荷试车" },
    { label: "质保期", value: "验收合格起 12 个月" },
    { label: "结算与开票", value: "电汇 · 每笔收款前开等额 13% 专票" },
  ];
}

/** 在上一版条目上套变更，得到新版条目 */
export function withTerms(terms: KeyTerm[], patch: Record<string, string>): KeyTerm[] {
  return terms.map((t) => (patch[t.label] != null ? { ...t, value: patch[t.label] } : t));
}

export function termValue(terms: KeyTerm[], label: string): string | undefined {
  return terms.find((t) => t.label === label)?.value;
}

export interface TermDiff {
  label: string;
  from: string;
  to: string;
}

/** 新版相对上一版的条目变更（没有上一版 = 首版，无变更） */
export function diffTerms(prev: KeyTerm[] | undefined, cur: KeyTerm[]): TermDiff[] {
  if (!prev) return [];
  return cur.flatMap((t) => {
    const p = prev.find((x) => x.label === t.label);
    return p && p.value !== t.value ? [{ label: t.label, from: p.value, to: t.value }] : [];
  });
}

/** 已被 AI 抓取过的版本（按上传顺序） */
export function processedVersions(oc: OrderContract | undefined): OrderVersion[] {
  return (oc?.versions ?? []).filter((v) => !!v.aiAt);
}

export function latestProcessed(oc: OrderContract | undefined): OrderVersion | undefined {
  const list = processedVersions(oc);
  return list[list.length - 1];
}

/** 一次上传的模拟解析结果：头部字段 + 新版本（含抓取到的条目）+ 相对当前版的变更 */
export interface ParsedOrder {
  header: Pick<OrderContract, "no" | "customer" | "signedAt" | "amountInclTax" | "deliveryDeadline">;
  fileName: string;
  version: OrderVersion;
  diff: TermDiff[];
}

/**
 * 模拟 AI 解析：还没有合同时当作客户签章版首版；已有合同时当作一份交货期顺延 30 天的补充协议。
 * 纯函数——弹窗预览和 store 入库各算一次，结果一致。
 */
export function simulateOrderParse(project: Project): ParsedOrder {
  const oc = project.orderContract;
  const latest = latestProcessed(oc);
  if (!oc || !latest) {
    const deadline = addMonths(TODAY, 4);
    const amount = 5600000;
    const keyTerms = standardTerms(`¥${fmtNum(amount)}`, deadline, `${project.name}成套设备`);
    return {
      header: { no: `LN-${project.code}-01`, customer: "四川天启新材料科技有限公司", signedAt: TODAY, amountInclTax: amount, deliveryDeadline: deadline },
      fileName: `${project.code}项目合同.xlsx`,
      version: { id: "v1", name: "v1 客户签章版", at: TODAY, by: "赵小燕 上传", final: true, aiAt: TODAY, keyTerms },
      diff: [],
    };
  }
  const n = oc.versions.length + 1;
  const to = addDays(oc.deliveryDeadline, 30);
  const keyTerms = withTerms(latest.keyTerms, { 交货期: to });
  return {
    header: { no: oc.no, customer: oc.customer, signedAt: oc.signedAt, amountInclTax: oc.amountInclTax, deliveryDeadline: to },
    fileName: oc.fileName,
    version: { id: `v${n}`, name: `v${n} 补充协议（交货期顺延）`, at: TODAY, by: "赵小燕 上传", aiAt: TODAY, keyTerms },
    diff: diffTerms(latest.keyTerms, keyTerms),
  };
}
