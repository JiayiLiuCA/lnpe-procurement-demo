"use client";

import { useState, type ReactNode } from "react";

/**
 * 单行 ellipsis + "展开" → 展开为内嵌白卡（圆角 10、行高 1.9、可带来源脚注），"收起"。
 * 用于技术条款、全局表面处理要求、合同行备注。
 */
export function CollapsibleText({
  text,
  lead,
  footer,
  className = "",
}: {
  text: string;
  lead?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!text) return <span className="text-faint">—</span>;

  if (!open) {
    return (
      <div className={`text-ink-2 min-w-0 ${className}`}>
        <div className="overflow-hidden text-ellipsis whitespace-nowrap">
          {lead}
          {lead ? " — " : null}
          {text.replace(/\n/g, " ")}{" "}
          <button type="button" className="text-primary-hover hover:text-primary cursor-pointer" onClick={() => setOpen(true)}>
            展开
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="text-ink-2">
        {lead}
        {lead ? " — 全部技术要求 " : " "}
        <button type="button" className="text-primary-hover hover:text-primary cursor-pointer" onClick={() => setOpen(false)}>
          收起
        </button>
      </div>
      <div className="border-line-soft text-ink-2 mt-2 rounded-[10px] border bg-white px-4.5 py-3.5 text-[12.5px] leading-[1.9] whitespace-pre-line">
        {text}
        {footer && <div className="text-sub mt-2 flex items-center gap-3.5 text-xs">{footer}</div>}
      </div>
    </div>
  );
}
