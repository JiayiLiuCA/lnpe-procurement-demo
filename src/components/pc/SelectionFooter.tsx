"use client";

// 清单吸底操作栏，按步骤只露出该步的动作：
//  source（订货安排）：标记库存分配 / 安排生产（公司自制）/ 标记需采购
//  contract（子合同）：上传合同（勾选覆盖）/ AI 生成采购合同
//  full（独立路由）：全部
import { useState } from "react";
import { Factory, Sparkles, UploadCloud } from "lucide-react";
import type { ChecklistRow } from "@/lib/types";
import { Btn } from "@/components/ui/Btn";
import { TODAY } from "@/lib/date";
import { fmtNum } from "@/lib/money";

export interface ProductionPlan {
  produceBy: string;
  note: string;
}

/** 'YYYY-MM-DD' + n 天（仅作输入框默认值） */
function plusDays(d: string, n: number): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10);
}

const INPUT_CLASS = "border-line rounded-ctl text-ink border px-2 py-1 text-[13px] outline-none focus:border-[#CFCCCA]";

export function SelectionFooter({
  mode = "full",
  selectedRows,
  onMarkAllocation,
  onMarkNeed,
  onArrangeProduction,
  onGenerate,
  onUploadContract,
  estimate,
}: {
  mode?: "review" | "source" | "contract" | "full";
  selectedRows: ChecklistRow[];
  onMarkAllocation: (qty: number) => void;
  /** 标记为需采购（分配数归零），订货安排步专用 */
  onMarkNeed?: () => void;
  /** null = 撤销生产安排（改回需采购） */
  onArrangeProduction: (plan: ProductionPlan | null) => void;
  onGenerate: () => void;
  onUploadContract?: () => void;
  /** 所选需采购行的 AI 预估采购额（预估单价 × 需采购数） */
  estimate?: number;
}) {
  const [allocOpen, setAllocOpen] = useState(false);
  const [allocQty, setAllocQty] = useState("1");
  const [prodOpen, setProdOpen] = useState(false);
  const [produceBy, setProduceBy] = useState(() => plusDays(TODAY, 14));
  const [prodNote, setProdNote] = useState("");

  const n = selectedRows.length;
  // 自制件不出合同：需采购统计与合同类动作只看非「安排生产」行
  const buyRows = selectedRows.filter((r) => r.alloc.status !== "produce");
  const prodRows = selectedRows.filter((r) => r.alloc.status === "produce");
  const contractedSel = selectedRows.filter((r) => r.contractId).length;
  const needSum = buyRows.reduce((s, r) => s + (typeof r.qty === "number" ? r.alloc.need || r.qty : 0), 0);
  const brands = [...new Set(buyRows.map((r) => r.brands).filter(Boolean))].join("、");
  const showSource = mode === "source" || mode === "full";
  const showContract = mode === "contract" || mode === "full";

  return (
    <div className="border-line-soft mt-auto flex items-center gap-3.5 border-t bg-white px-4 py-3">
      <div className="text-[13px]">
        已选 <span className="text-ink font-bold">{n}</span> 项{needSum > 0 && <> · 需采购 {needSum} 台套</>}
        {prodRows.length > 0 && <> · 自制 {prodRows.length} 项</>}
        {!!estimate && (
          <>
            {" "}
            · AI 预估 <span className="font-bold tabular-nums">¥{fmtNum(estimate)}</span>
          </>
        )}
      </div>
      <div className="text-sub text-[12.5px]">
        {showContract ? `${brands ? `候选品牌：${brands} · ` : ""}跨子系统同供应商项将自动合并为一份合同` : "已分配的行不可再选；安排生产的行可撤销改回需采购"}
      </div>
      <div className="flex-1" />

      {/* 标记库存分配 */}
      {showSource && (
      <div className="relative">
        <Btn
          variant="secondary"
          disabled={n === 0}
          onClick={() => {
            setAllocOpen((v) => !v);
            setProdOpen(false);
          }}
        >
          标记库存分配
        </Btn>
        {allocOpen && (
          <div className="border-line absolute right-0 bottom-full z-20 mb-2 flex w-[230px] flex-col gap-2.5 rounded-[10px] border bg-white p-3.5 shadow-xl">
            <div className="text-[13px] font-bold">标记库存分配</div>
            <label className="text-sub flex items-center gap-2 text-xs">
              分配数量
              <input type="number" min={0} value={allocQty} onChange={(e) => setAllocQty(e.target.value)} className={`${INPUT_CLASS} w-20 tabular-nums`} />
            </label>
            <div className="text-faint text-[11px]">分配数 ≥ 需求数记为「已分配」，否则记为「部分分配」</div>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" size="sm" onClick={() => setAllocOpen(false)}>
                取消
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                onClick={() => {
                  onMarkAllocation(Math.max(0, Number(allocQty) || 0));
                  setAllocOpen(false);
                }}
              >
                确认
              </Btn>
            </div>
          </div>
        )}
      </div>

      )}

      {/* 安排生产（公司自制） */}
      {showSource && (
      <div className="relative">
        <Btn
          variant="secondary"
          disabled={n === 0}
          onClick={() => {
            setProdOpen((v) => !v);
            setAllocOpen(false);
          }}
        >
          <Factory size={14} strokeWidth={1.8} />
          安排生产
        </Btn>
        {prodOpen && (
          <div className="border-line absolute right-0 bottom-full z-20 mb-2 flex w-[300px] flex-col gap-2.5 rounded-[10px] border bg-white p-3.5 shadow-xl">
            <div className="text-[13px] font-bold">安排生产（公司自制）</div>
            <label className="text-sub flex items-center gap-2 text-xs">
              <span className="w-14 shrink-0">计划完工</span>
              <input type="date" value={produceBy} onChange={(e) => setProduceBy(e.target.value)} className={`${INPUT_CLASS} flex-1 tabular-nums`} />
            </label>
            <label className="text-sub flex items-center gap-2 text-xs">
              <span className="w-14 shrink-0">备注</span>
              <input
                type="text"
                value={prodNote}
                onChange={(e) => setProdNote(e.target.value)}
                placeholder="车间 / 图号，可不填"
                className={`${INPUT_CLASS} min-w-0 flex-1`}
              />
            </label>
            <div className="text-faint text-[11px]">
              标记后不计入需采购、不进入采购合同；已入合同的行会跳过{contractedSel > 0 && `（本次 ${contractedSel} 行）`}
            </div>
            <div className="flex justify-end gap-2">
              {prodRows.length > 0 && (
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onArrangeProduction(null);
                    setProdOpen(false);
                  }}
                >
                  撤销安排
                </Btn>
              )}
              <Btn variant="secondary" size="sm" onClick={() => setProdOpen(false)}>
                取消
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                disabled={!produceBy || buyRows.length === contractedSel}
                onClick={() => {
                  onArrangeProduction({ produceBy, note: prodNote.trim() });
                  setProdOpen(false);
                  setProdNote("");
                }}
              >
                确认安排
              </Btn>
            </div>
          </div>
        )}
      </div>
      )}

      {/* 标记需采购：分配数归零，进入子合同步出合同 */}
      {showSource && onMarkNeed && (
        <Btn variant="secondary" disabled={n === 0} onClick={onMarkNeed}>
          标记需采购
        </Btn>
      )}

      {showContract && onUploadContract && (
        <Btn variant="secondary" disabled={buyRows.length === 0} onClick={onUploadContract}>
          <UploadCloud size={14} strokeWidth={1.8} />
          上传合同（勾选覆盖）
        </Btn>
      )}
      {showContract && (
        <Btn variant="primary" disabled={buyRows.length === 0} onClick={onGenerate}>
          <Sparkles size={14} strokeWidth={1.8} />
          AI 生成采购合同
        </Btn>
      )}
    </div>
  );
}
