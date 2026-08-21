// AI 流程 1：订单合同解析结果（开山 · 幂等 upsert 到项目 260227 与 c-kaishan-1）
export const orderParse = {
  contractNo: "LNPE-20260312030-SJ",
  buyer: "绵阳流能粉体设备有限公司",
  seller: "浙江开山离心机械有限公司",
  signedAt: "2026-03-12",
  deliveryDate: "2026-05-30",
  projectCode: "260227",
  projectName: "鄂尔多斯空压机系统",
  amountInclTax: 7392000,
  amountExclTax: 6541592,
  lines: [
    { name: "离心式空压机", spec: "H1000-5.5L（T1500-2S）", qty: 12, unit: "套", unitPrice: 530000 },
    { name: "离心空压机外壳", spec: "T1500-2S 配套", qty: 12, unit: "套", unitPrice: 80000 },
    { name: "消音器", spec: "T1500-2S 配套", qty: 12, unit: "套", unitPrice: 6000 },
  ],
  paymentTerms: "付款条款 → 自动生成 M1–M4 里程碑：预付 10% · 发货 50% · 验收 30% · 质保 10%",
  steps: ["正在读取合同文档…", "识别合同头部字段…", "提取 3 行产品明细…", "解析付款条款，生成里程碑…"],
};
