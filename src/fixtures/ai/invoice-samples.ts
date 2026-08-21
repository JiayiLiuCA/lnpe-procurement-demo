// AI 流程 5：发票识别核验 —— 金额参数化为当前里程碑金额
import { TODAY } from "@/lib/date";

export interface InvoiceSample {
  id: "A" | "B";
  label: string;
  no: string;
  buyerTitle: string;
  taxNo: string;
  taxRate: string;
  issuedAt: string;
  titleOk: boolean;
}

export const BUYER_TITLE = "绵阳流能粉体设备有限公司";
export const BUYER_TAX_NO = "91510700MA62K4Q77X";

export const invoiceSamples: InvoiceSample[] = [
  {
    id: "A",
    label: "样例A 正确发票",
    no: "NO.06120871",
    buyerTitle: BUYER_TITLE,
    taxNo: BUYER_TAX_NO,
    taxRate: "13%",
    issuedAt: TODAY,
    titleOk: true,
  },
  {
    id: "B",
    label: "样例B 抬头错误",
    no: "NO.06120872",
    buyerTitle: "绵阳流能科技有限公司",
    taxNo: BUYER_TAX_NO,
    taxRate: "13%",
    issuedAt: TODAY,
    titleOk: false,
  },
];

export const invoiceSteps = ["正在识别发票版式…", "提取发票号、抬头与税号…", "核对税率与金额…", "执行三项核验…"];
