"use client";

// 模拟 Excel 文件预览：表格网格 + 列字母 + 行号 + 底部 sheet 页签（纯展示 mock）
import { Download, FileSpreadsheet, X } from "lucide-react";
import { Btn } from "./Btn";

export interface XlsxCell {
  t: string;
  span?: number;
  bold?: boolean;
  right?: boolean;
  center?: boolean;
  head?: boolean;
}

const COLS = ["A", "B", "C", "D", "E", "F", "G"];

export function XlsxPreviewDialog({
  open,
  onClose,
  fileName,
  sheetName = "合同",
  rows,
  downloadHref,
  downloadName,
}: {
  open: boolean;
  onClose: () => void;
  fileName: string;
  sheetName?: string;
  rows: XlsxCell[][];
  downloadHref: string;
  downloadName: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(44,42,42,.45)] p-4" onClick={onClose}>
      <div
        className="rounded-card flex max-h-[88dvh] w-full max-w-[860px] flex-col overflow-hidden bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="border-line-soft flex items-center gap-2.5 border-b px-5 py-3.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E7F3EC]">
            <FileSpreadsheet size={16} strokeWidth={1.8} className="text-[#1B8A4C]" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-bold">{fileName}</div>
            <div className="text-faint text-[11px]">Excel 预览 · 演示模拟，非真实文件渲染</div>
          </div>
          <div className="flex-1" />
          <a href={downloadHref} download={downloadName}>
            <Btn variant="primary" size="sm">
              <Download size={13} strokeWidth={1.8} />
              下载 xlsx
            </Btn>
          </a>
          <button type="button" onClick={onClose} className="text-faint hover:text-ink ml-1 cursor-pointer">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* 表格区 */}
        <div className="flex-1 overflow-auto bg-[#FBFAF9] p-0">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className="border-line sticky top-0 w-9 border bg-[#F1F0EE] px-1 py-1 text-center text-[11px] font-medium text-[#8A8785]" />
                {COLS.map((c) => (
                  <th key={c} className="border-line sticky top-0 border bg-[#F1F0EE] px-2 py-1 text-center text-[11px] font-medium text-[#8A8785]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => {
                const used = r.reduce((s, c) => s + (c.span ?? 1), 0);
                return (
                  <tr key={ri} className="bg-white">
                    <td className="border-line border bg-[#F1F0EE] px-1 py-1.5 text-center text-[11px] text-[#8A8785]">{ri + 1}</td>
                    {r.map((c, ci) => (
                      <td
                        key={ci}
                        colSpan={c.span ?? 1}
                        className={`border-line border px-2.5 py-1.5 align-middle ${c.head ? "bg-[#F6F5F4] font-medium" : ""} ${
                          c.bold ? "font-bold" : ""
                        } ${c.right ? "text-right tabular-nums" : c.center ? "text-center" : ""}`}
                      >
                        {c.t}
                      </td>
                    ))}
                    {used < COLS.length && <td colSpan={COLS.length - used} className="border-line border" />}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 底部 sheet 页签 */}
        <div className="border-line-soft flex items-center gap-1 border-t bg-[#F1F0EE] px-3 py-1.5">
          <span className="border-line rounded-t-none rounded-b-none border-x border-b-2 border-b-[#1B8A4C] bg-white px-3 py-1 text-[11.5px] font-medium">
            {sheetName}
          </span>
          <span className="text-faint px-2 py-1 text-[11.5px]">Sheet2</span>
          <span className="text-faint px-2 py-1 text-[11.5px]">Sheet3</span>
          <div className="flex-1" />
          <span className="text-faint text-[11px]">100%</span>
        </div>
      </div>
    </div>
  );
}
