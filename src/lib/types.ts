// 全部实体类型定义（demo 数据模型）

export interface Version {
  id: string;
  name: string;
  at: string;
  by: string;
  ai?: boolean;
  final?: boolean;
}

/** 项目的总合同（客户订单合同 xlsx）：可查看条款、更新版本、下载 */
export interface OrderContract {
  fileName: string;
  no: string;
  customer: string;
  signedAt: string;
  amountInclTax: number;
  deliveryDeadline: string;
  versions: Version[];
  /** AI 抓取的重要条目（订单接收步骤列举展示） */
  keyTerms: { label: string; value: string }[];
}

export interface Project {
  id: string;
  code: string;
  name: string;
  orderedAt: string;
  deliveryDeadline: string;
  owner: string;
  /**
   * 已关闭日期；有值即项目结束，全部信息仍可见。
   * 项目所处步骤、头部标签、进展文案一律由清单 / 合同 / 送货单派生（见 lib/steps.ts），不落库。
   */
  closedAt?: string;
  orderContract: OrderContract;
}

export interface Supplier {
  id: string;
  name: string;
  short: string;
  contactName: string;
  phone: string;
  email?: string;
  address?: string;
  bank?: string;
  account?: string;
}

/** allocated 库存已分配 · need 需采购 · partial 部分分配 · pending 待核对 · produce 安排生产（公司自制，不进采购合同） */
export type AllocStatus = "allocated" | "need" | "partial" | "pending" | "produce";

export interface ChecklistRow {
  id: string;
  seq: number;
  section: "标准件" | "自制件";
  name: string;
  spec: string;
  material: string;
  qty: number | "若干";
  unit: string;
  brands?: string;
  techNote: string;
  hasDrawing?: boolean;
  alloc: {
    allocated: number;
    need: number;
    status: AllocStatus;
    /** 安排生产：计划完工日期 / 备注（车间、图号） */
    produceBy?: string;
    produceNote?: string;
  };
  contractId?: string;
}

export interface Sheet {
  id: string;
  name: string;
  infoOnly?: boolean;
  infoText?: string;
  rows: ChecklistRow[];
}

export interface Checklist {
  id: string;
  projectId: string;
  batchNo: number;
  title: string;
  fileName: string;
  version: string;
  status: "制表中" | "待审核" | "已批准";
  signoff: { maker: string; makerAt: string; reviewAt?: string; approveAt?: string };
  globalNote: string;
  sheets: Sheet[];
}

/** 签订后直接进入执行（交货跟进），不再有单独的「已签订」档 */
export type ContractStatus =
  | "ai_draft"
  | "reviewing"
  | "finalized"
  | "executing"
  | "arrived"
  | "warranty"
  | "closed";

export interface ContractLine {
  id: string;
  name: string;
  spec: string;
  unit: string;
  qty: number;
  unitPrice: number | null;
  note: string;
}

export type MilestoneKey = "M1" | "M2" | "M3" | "M4";
export type MilestoneStatus = "paid" | "due" | "pending" | "not_started";

export interface Invoice {
  no: string;
  ratioLabel: string;
  amount: number;
  issuedAt?: string;
  receivedAt?: string;
}

export interface Milestone {
  key: MilestoneKey;
  ratio: 0.1 | 0.5 | 0.3;
  label: string;
  condition: string;
  status: MilestoneStatus;
  paidAt?: string;
  dueAt?: string;
  invoice?: Invoice;
}

export interface Contract {
  id: string;
  no: string;
  projectId: string;
  supplierId: string;
  summary: string;
  status: ContractStatus;
  signedAt?: string;
  deliveryDate?: string;
  goodsArrivedAt?: string;
  /** 草稿为 null，由行价求和派生 */
  amountInclTax: number | null;
  taxRate: 0.13;
  lines: ContractLine[];
  milestones: Milestone[];
  versions: Version[];
  attachments: string[];
  sellerContactName: string;
  sellerContactPhone: string;
}

export type DeliveryLineState = "unconfirmed" | "confirmed" | "exception";

export interface DeliveryLine {
  seq: number;
  name: string;
  spec: string;
  qty: number;
  unit: string;
  packaging: "布";
  projectCode: string;
  contractId: string;
  state: DeliveryLineState;
  confirmedAt?: string;
  photoCount: number;
  /** resolvedAt 有值 = 采购员已与卖方处理完毕（现场收货步骤不再算异常） */
  exception?: { type: "数量不符" | "破损"; actualQty?: number; note: string; resolvedAt?: string };
}

export interface DeliveryNote {
  id: string;
  date: string;
  fromName: string;
  projectIds: string[];
  contractIds: string[];
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  status: "pending" | "in_progress" | "done";
  headerPhoto: boolean;
  lines: DeliveryLine[];
}

export type TodoKind = "review" | "ai_draft" | "payment_due" | "delivery_overdue" | "receive_exception";

export interface Todo {
  id: string;
  kind: TodoKind;
  pillText: string;
  title: string;
  sub: string;
  actionLabel: string;
  href: string;
  done?: boolean;
}

export interface Activity {
  id: string;
  projectId: string;
  text: string;
  at: string;
  actor: string;
  tone: "danger" | "success" | "neutral";
}
