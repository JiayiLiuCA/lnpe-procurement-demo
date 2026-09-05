// 子合同的 AI 重要条目与模拟 xlsx（与项目合同的 orderTerms / OrderContractStep 同一套形式）。
// 每一版子合同（AI 初稿 / 人工修订 / 定稿回读 / 签章版）都由 AI 抓取 8 项重要条目记在 versions[].keyTerms；
// 没记的版本（运行时新生成的草稿）按合同当前字段现算。
import type { Contract, KeyTerm, Version } from "./types";
import type { XlsxCell } from "@/components/ui/XlsxPreviewDialog";
import { addDays } from "./date";
import { fmtNum } from "./money";
import { contractTotal } from "./rules";
import { BUYER, supplierById } from "@/fixtures/suppliers";

/** 按合同当前字段生成的重要条目（金额 / 交货期 / 付款 / 质保 / 经办…） */
export function contractKeyTerms(c: Contract, patch: Record<string, string> = {}): KeyTerm[] {
  const total = contractTotal(c);
  const priced = c.lines.filter((l) => l.unitPrice != null).length;
  const sup = supplierById(c.supplierId);
  const terms: KeyTerm[] = [
    { label: "合同金额", value: total != null ? `¥${fmtNum(total)}（含税 13%）` : `待补充（${priced}/${c.lines.length} 行已填单价）` },
    { label: "交货期", value: c.deliveryDate ?? "按项目要求另定" },
    { label: "产品明细", value: `${c.summary} · ${c.lines.length} 行` },
    { label: "付款节点", value: "预付 10% · 发货前 50% · 验收 30% · 质保金 10%" },
    { label: "开票要求", value: "每笔付款前开等额 13% 增值税专票" },
    { label: "质保期", value: "验收合格起 12 个月，不超过货到 24 个月" },
    { label: "包装与运输", value: "木箱 + 防潮膜 · 运费与途中风险由卖方承担" },
    { label: "卖方经办", value: `${sup.short} ${c.sellerContactName} ${c.sellerContactPhone}` },
  ];
  return terms.map((t) => (patch[t.label] != null ? { ...t, value: patch[t.label] } : t));
}

/** 某一版的条目：记了用记的，没记的按当前合同现算 */
export function versionTerms(c: Contract, v: Version): KeyTerm[] {
  return v.keyTerms ?? contractKeyTerms(c);
}

/** 种子用：AI 初稿单价未填、早期版本交货期回拨 16 天、三版以上首版经办电话待补充，制造出版本间的变更 */
export function seedVersionTerms(c: Contract, index: number, count: number): KeyTerm[] {
  const patch: Record<string, string> = {};
  const isLast = index === count - 1;
  if (!isLast && c.deliveryDate) patch["交货期"] = addDays(c.deliveryDate, -16);
  if (!isLast && index === 0 && c.versions[0]?.ai) patch["合同金额"] = `待补充（0/${c.lines.length} 行已填单价）`;
  if (count >= 3 && index === 0) {
    const sup = supplierById(c.supplierId);
    patch["卖方经办"] = `${sup.short} ${c.sellerContactName} 待补充`;
  }
  return contractKeyTerms(c, patch);
}

/** 子合同原件的模拟 xlsx：表头 + 产品明细 + 合计 + 关键条款 + 盖章；交货期取所看版本的条目 */
export function contractXlsxRows(c: Contract, terms: KeyTerm[]): XlsxCell[][] {
  const sup = supplierById(c.supplierId);
  const total = contractTotal(c);
  const delivery = terms.find((t) => t.label === "交货期")?.value ?? c.deliveryDate ?? "—";
  const contact = terms.find((t) => t.label === "卖方经办")?.value ?? "";
  return [
    [{ t: "采 购 合 同", span: 7, bold: true, center: true }],
    [
      { t: `合同编号：${c.no}`, span: 4 },
      { t: `签订日期：${c.signedAt ?? "　　　　"}`, span: 3 },
    ],
    [{ t: `买方（需方）：${BUYER.name}`, span: 7 }],
    [{ t: `卖方（供方）：${sup.name}`, span: 7 }],
    [
      { t: "序号", head: true, center: true },
      { t: "品名", head: true },
      { t: "规格型号", head: true },
      { t: "数量", head: true, center: true },
      { t: "单位", head: true, center: true },
      { t: "单价（元）", head: true, right: true },
      { t: "金额（元）", head: true, right: true },
    ],
    ...c.lines.map((l, i) => [
      { t: String(i + 1), center: true },
      { t: l.name },
      { t: l.spec },
      { t: String(l.qty), center: true },
      { t: l.unit, center: true },
      { t: l.unitPrice != null ? fmtNum(l.unitPrice) : "待补充", right: true },
      { t: l.unitPrice != null ? fmtNum(l.qty * l.unitPrice) : "—", right: true },
    ]),
    [
      { t: "合计（含税 13%）", span: 5, bold: true },
      { t: "", right: true },
      { t: total != null ? fmtNum(total) : "待补充", right: true, bold: true },
    ],
    [{ t: "付款方式：预付款 10% 合同签订后支付 · 发货款 50% 发货前支付 · 验收款 30% 凭验收合格单 · 质保金 10% 凭质保验收单 30 天内付清；每笔付款前开具等额 13% 增值税专用发票", span: 7 }],
    [{ t: `交货期：${delivery}；卖方负责运抵买方指定现场，运费及途中风险由卖方承担`, span: 7 }],
    [{ t: "质保期：验收合格之日起 12 个月且不超过货到现场后 24 个月，以先到为准", span: 7 }],
    [
      { t: `买方（盖章）：${BUYER.name}  经办 ${BUYER.contactName} ${BUYER.phone}`, span: 4 },
      { t: `卖方（盖章）：${sup.name}  经办 ${contact}`, span: 3 },
    ],
  ];
}

/** 定稿回读演示改动的三处：首行单价 -2000、交货期 +16 天、卖方经办电话（与 fixtures/ai/finalize-diff 同口径） */
export const FINALIZE_NEW_PHONE = "13908215566";
export function applyFinalizeChanges(c: Contract): Contract {
  const first = c.lines[0];
  const lines = first
    ? c.lines.map((l, i) => (i === 0 ? { ...l, unitPrice: (l.unitPrice ?? 100000) - 2000 } : l))
    : c.lines;
  return {
    ...c,
    lines,
    deliveryDate: c.deliveryDate ? addDays(c.deliveryDate, 16) : c.deliveryDate,
    sellerContactPhone: FINALIZE_NEW_PHONE,
  };
}
