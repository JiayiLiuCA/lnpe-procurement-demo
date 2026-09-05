// 采购清单原件的模拟 xlsx：按技术部样表的列（序号 / 名称 / 规格型号 / 材质 / 数量 / 单位 / 备注）逐 sheet 生成，
// 供「查看清单 / 查看原件」的 Excel 预览弹窗使用；纯说明 sheet 按原文逐行铺开。
import type { Checklist, ChecklistVersion, Sheet } from "./types";
import type { XlsxCell } from "@/components/ui/XlsxPreviewDialog";

export interface XlsxSheet {
  name: string;
  rows: XlsxCell[][];
}

function batchLabel(cl: Checklist): string {
  return cl.batchNo === 1 ? "第一批" : `追加第${cl.batchNo}批`;
}

function sheetRows(cl: Checklist, sh: Sheet, v: ChecklistVersion): XlsxCell[][] {
  const head: XlsxCell[][] = [
    [{ t: `${cl.title.split(" · ")[0]}（${batchLabel(cl)} · ${sh.name}）`, span: 7, bold: true, center: true }],
    [
      { t: `项目号：${cl.projectId.replace(/^p-/, "")}`, span: 3 },
      { t: `制表日期：${v.at}`, span: 2 },
      { t: `版本：${v.id}`, span: 2 },
    ],
  ];
  if (sh.infoOnly) {
    return [
      ...head,
      ...(sh.infoText ?? "")
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => [{ t: l, span: 7 }]),
    ];
  }
  const cols: XlsxCell[] = [
    { t: "序号", head: true, center: true },
    { t: "名称", head: true },
    { t: "规格型号", head: true },
    { t: "材质", head: true },
    { t: "数量", head: true, center: true },
    { t: "单位", head: true, center: true },
    { t: "备注（品牌及技术要求）", head: true },
  ];
  const body = sh.rows.map((r) => [
    { t: String(r.seq), center: true },
    { t: r.name },
    { t: r.spec },
    { t: r.material },
    { t: typeof r.qty === "number" ? String(r.qty) : "若干", center: true },
    { t: r.unit, center: true },
    { t: `${r.brands ? `品牌：${r.brands}；` : ""}${r.techNote}${r.hasDrawing ? "（详见图纸）" : ""}` },
  ]);
  return [
    ...head,
    cols,
    ...body,
    [{ t: `全局要求：${cl.globalNote}`, span: 7 }],
    [
      { t: `制表：${cl.signoff.maker}  ${v.at}`, span: 3 },
      { t: "审核：技术部", span: 2 },
      { t: v.approveAt ? `批准：${v.approvedBy ?? ""}  ${v.approveAt}` : "批准：", span: 2 },
    ],
  ];
}

/** 某一版清单的全部 sheet（演示不保存历史版行数据，旧版看到的是当前明细 + 该版的表头信息） */
export function checklistXlsxSheets(cl: Checklist, v?: ChecklistVersion): XlsxSheet[] {
  const version = v ?? cl.versions[cl.versions.length - 1];
  return cl.sheets.map((sh) => ({ name: sh.name, rows: sheetRows(cl, sh, version) }));
}
