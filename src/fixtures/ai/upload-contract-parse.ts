// 上传合同 xlsx 解析结果（人工上传已签合同 → 勾选 cover 的采购项 → 更新采购单 coverage）
export const uploadContractParse = {
  no: "LNPE-20260820015-SJ",
  supplierId: "s-fengjie",
  supplierName: "常州锋杰机械有限公司",
  signedAt: "2026-08-20",
  deliveryDate: "2026-10-15",
  amountInclTax: 286000,
  termsSummary: "标准模板条款：交货逾期违约金 1‰/日 · 付款 10-50-30-10 · 13% 增值税专票 · 质保 12 个月",
  steps: ["正在读取合同文档…", "识别合同号、卖方与金额…", "提取交货期与付款条款…", "匹配项目采购清单待覆盖项…"],
};
