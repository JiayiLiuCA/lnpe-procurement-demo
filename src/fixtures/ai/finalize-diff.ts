// AI 流程 4：定稿回读 diff 生成器 —— 对当前合同自身参数化求 diff，避免写死开山字段
import type { Contract } from "@/lib/types";
import { fmtDate } from "@/lib/date";
import { fmtNum } from "@/lib/money";

export interface FinalizeDiff {
  summary: string[];
  items: {
    field: string;
    before: string;
    after: string;
    warning?: string;
  }[];
}

export function buildFinalizeDiff(c: Contract): FinalizeDiff {
  const first = c.lines[0];
  const oldPrice = first?.unitPrice ?? 100000;
  const newPrice = oldPrice - 2000;
  const qty = first?.qty ?? 1;
  const oldDelivery = c.deliveryDate ?? "2026-09-30";
  // +16 天：跨月粗算用 addMonths 不合适，直接天级平移
  const [y, m, d] = oldDelivery.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + 16));
  const newDelivery = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
  const newPhone = "13908215566";

  return {
    summary: [
      `回读定稿共发现 3 处与在线版本的差异。`,
      `「${first?.name ?? "首行产品"}」单价由 ${fmtNum(oldPrice)} 调整为 ${fmtNum(newPrice)}，但行金额未随之同步，需人工复核。`,
      `交货期顺延 16 天（${fmtDate(oldDelivery, "full")} → ${newDelivery}），卖方经办电话有变更。`,
    ],
    items: [
      {
        field: `产品行 1「${first?.name ?? "—"}」单价`,
        before: fmtNum(oldPrice),
        after: fmtNum(newPrice),
        warning: `单价已修改但总价未同步（应为 ${qty} × ${fmtNum(newPrice)} = ${fmtNum(qty * newPrice)}）`,
      },
      { field: "交货期", before: fmtDate(oldDelivery, "full"), after: newDelivery },
      { field: "卖方经办电话", before: c.sellerContactPhone, after: newPhone },
    ],
  };
}

export const finalizeSteps = ["正在读取上传的定稿文件…", "逐字段比对在线版本…", "标记金额与日期差异…", "生成变更摘要…"];
