// AI 合同模板条款文本（合同信息 Tab 与 AI 生成初稿共用）

// 品牌关键字 → 供应商映射（AI 流程 3 按此分组生成草稿）
export const BRAND_SUPPLIER_MAP: { keyword: string; supplierId: string }[] = [
  { keyword: "章鼓", supplierId: "s-zhanggu" },
  { keyword: "陕鼓", supplierId: "s-zhanggu" },
  { keyword: "常州锋杰", supplierId: "s-fengjie" },
  { keyword: "锋杰", supplierId: "s-fengjie" },
  { keyword: "开山", supplierId: "s-kaishan" },
  { keyword: "振英", supplierId: "s-zhenying" },
  { keyword: "瑞拓", supplierId: "s-ruituo" },
];

/** 品牌文案 → 供应商 id；无匹配时自制件走嘉信（外协）、标准件走锋杰 */
export function matchSupplier(brands: string | undefined, section: string): string {
  if (brands) {
    for (const m of BRAND_SUPPLIER_MAP) {
      if (brands.includes(m.keyword)) return m.supplierId;
    }
  }
  return section === "自制件" ? "s-jiaxin" : "s-fengjie";
}

export const templateClauses = [
  {
    title: "第 4 条 · 交货与违约金",
    body: "卖方应于合同约定交货期内将全部货物运抵买方指定地点。逾期交货的，每逾期一日按合同含税总额的 1‰ 向买方支付违约金；逾期超过 30 日的，买方有权解除合同并要求卖方承担由此造成的全部损失。",
  },
  {
    title: "第 5 条 · 包装与运输",
    body: "货物包装须满足长途运输及多次装卸要求，精密部件采用木箱+防潮膜包装，法兰密封面加保护盖。运输费用及途中风险由卖方承担，货到买方现场签收后风险转移。",
  },
  {
    title: "第 6 条 · 质量与质保期",
    body: "货物质量须符合合同技术协议及国家现行标准。质保期为验收合格之日起 12 个月且不超过货到现场后 24 个月，以先到为准；质保期内因制造质量引起的故障，卖方接到通知后 48 小时内响应、5 日内到场处理。",
  },
  {
    title: "第 8 条 · 付款与开票",
    body: "双方确认按以下里程碑付款：①预付款 10%，合同签订后支付；②发货款 50%，卖方发货前支付；③验收款 30%，凭《交付验收合格单》支付，期限为验收合格或货到现场 +12 个月，以先到为准；④质保金 10%，凭《质保验收单》30 天内付清，期限为质保验收或货到现场 +24 个月，以先到为准。卖方须在每笔款项支付前开具等额 13% 增值税专用发票，质保金到期前累计开足 100%。",
  },
];

export const draftSteps = ["正在汇总所选清单行…", "按品牌匹配供应商并分组…", "套用标准合同模板生成条款…", "生成产品明细与里程碑…"];
