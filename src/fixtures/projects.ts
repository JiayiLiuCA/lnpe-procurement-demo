import type { Project } from "@/lib/types";

// 订单合同（总合同）的标准条款，订单合同详情页展示用
export const ORDER_TERMS = [
  {
    title: "第 3 条 · 交货与安装调试",
    body: "卖方（绵阳流能粉体设备有限公司）应于合同约定交货期内将全部设备运抵买方指定现场，并负责指导安装与调试。逾期交货的，每逾期一日按合同含税总额的 1‰ 向买方支付违约金。",
  },
  {
    title: "第 5 条 · 验收",
    body: "设备安装调试完成后进行 72 小时连续负荷试车，各项性能指标达到技术协议要求即为验收合格，双方签署《交付验收合格单》。买方无正当理由拖延验收超过 30 日的，视同验收合格。",
  },
  {
    title: "第 7 条 · 付款方式",
    body: "买方按以下节点向卖方付款：①合同签订后 10 个工作日内支付预付款 30%；②设备到场验收合格后支付 60%；③质保金 10%，质保期满无质量问题后 30 日内付清。卖方每笔收款前开具等额 13% 增值税专用发票。",
  },
  {
    title: "第 8 条 · 质保",
    body: "质保期为验收合格之日起 12 个月。质保期内因设计、制造质量引起的故障，卖方在接到通知后 48 小时内响应、5 日内到场处理；易损件按图纸清单免费随机备货一套。",
  },
];

/** 各项目共用的 AI 抓取条款模板（交付范围与日期按项目差异化） */
function keyTerms(amount: string, delivery: string, scope: string) {
  return [
    { label: "合同金额", value: `${amount}（含税 13%）` },
    { label: "交货期", value: delivery },
    { label: "交付范围", value: scope },
    { label: "付款节点", value: "预付 30% · 验收后 60% · 质保金 10%" },
    { label: "逾期违约金", value: "合同总额 1‰ / 日" },
    { label: "验收方式", value: "72 小时连续负荷试车" },
    { label: "质保期", value: "验收合格起 12 个月" },
    { label: "结算与开票", value: "电汇 · 每笔收款前开等额 13% 专票" },
  ];
}

export const projects: Project[] = [
  {
    id: "p-20260510",
    code: "20260510",
    name: "德阳锂电正极材料一期",
    orderedAt: "2026-05-23",
    deliveryDeadline: "2026-08-15",
    owner: "赵小燕",
    phase: 3,
    stepNote: "合同覆盖 54/62",
    keyStat: "需采购 62 · 已入合同 54",
    tags: ["执行中", "交货逾期 5 天"],
    orderContract: {
      fileName: "20260510订单合同.xlsx",
      no: "XLX-LN-20260510-01",
      customer: "四川新锂想能源科技有限责任公司",
      signedAt: "2026-05-23",
      amountInclTax: 18600000,
      deliveryDeadline: "2026-08-15",
      versions: [{ id: "v1", name: "v1 客户签章版", at: "2026-05-23", by: "赵小燕 上传", final: true }],
      keyTerms: keyTerms("¥18,600,000", "2026-08-15", "锂电正极材料一期粉体处理线成套设备"),
    },
  },
  {
    id: "p-260227",
    code: "260227",
    name: "鄂尔多斯空压机系统",
    orderedAt: "2026-03-02",
    deliveryDeadline: "2026-05-30",
    owner: "赵小燕",
    phase: 3,
    stepNote: "催发货 · 逾期 82 天",
    keyStat: "已付 60% · ¥4,435,200",
    tags: ["执行中", "催发货"],
    orderContract: {
      fileName: "260227订单合同.xlsx",
      no: "HN-LN-260227-SJ",
      customer: "鄂尔多斯市汇能煤化工有限公司",
      signedAt: "2026-03-02",
      amountInclTax: 9800000,
      deliveryDeadline: "2026-05-30",
      versions: [{ id: "v1", name: "v1 客户签章版", at: "2026-03-02", by: "赵小燕 上传", final: true }],
      keyTerms: keyTerms("¥9,800,000", "2026-05-30", "空压机系统成套设备（12 套）"),
    },
  },
  {
    id: "p-260209",
    code: "260209",
    name: "德阳金山分级机改造",
    orderedAt: "2026-03-07",
    deliveryDeadline: "2026-06-05",
    owner: "敬宏",
    phase: 3,
    stepNote: "收货中 3/7 项",
    keyStat: "7 类 63 件 · 异常 1 项",
    tags: ["执行中"],
    orderContract: {
      fileName: "260209订单合同.xlsx",
      no: "JS-LN-260209-02",
      customer: "德阳金山新材料有限公司",
      signedAt: "2026-03-07",
      amountInclTax: 1250000,
      deliveryDeadline: "2026-06-05",
      versions: [{ id: "v1", name: "v1 客户签章版", at: "2026-03-07", by: "赵小燕 上传", final: true }],
      keyTerms: keyTerms("¥1,250,000", "2026-06-05", "360/560 分级机系统改造与配套件"),
    },
  },
  {
    id: "p-251230",
    code: "251230",
    name: "乐山协鑫二期",
    orderedAt: "2025-12-30",
    deliveryDeadline: "2026-06-30",
    owner: "敬宏",
    phase: 3,
    stepNote: "收货中 30/36 件",
    keyStat: "质保金 09-15 到期 1 笔",
    tags: ["执行中"],
    orderContract: {
      fileName: "251230订单合同.xlsx",
      no: "XX-LN-251230-06",
      customer: "乐山协鑫新能源科技有限公司",
      signedAt: "2025-12-30",
      amountInclTax: 6800000,
      deliveryDeadline: "2026-06-30",
      versions: [
        { id: "v1", name: "v1 客户签章版", at: "2025-12-30", by: "赵小燕 上传", final: true },
        { id: "v2", name: "v2 补充协议（交货期顺延）", at: "2026-03-18", by: "赵小燕 上传" },
      ],
      keyTerms: keyTerms("¥6,800,000", "2026-06-30", "二期粉体分级系统成套设备"),
    },
  },
  // 已结束项目：全部信息依旧可见
  {
    id: "p-251102",
    code: "251102",
    name: "乐山协鑫一期",
    orderedAt: "2025-11-02",
    deliveryDeadline: "2026-06-30",
    owner: "赵小燕",
    phase: 4,
    closedAt: "2026-07-31",
    stepNote: "已关闭",
    keyStat: "合同 1 份 · 已结清",
    tags: ["已结束"],
    orderContract: {
      fileName: "251102订单合同.xlsx",
      no: "XX-LN-251102-03",
      customer: "乐山协鑫新能源科技有限公司",
      signedAt: "2025-11-02",
      amountInclTax: 4200000,
      deliveryDeadline: "2026-06-30",
      versions: [{ id: "v1", name: "v1 客户签章版", at: "2025-11-02", by: "赵小燕 上传", final: true }],
      keyTerms: keyTerms("¥4,200,000", "2026-06-30", "一期粉体分级系统成套设备"),
    },
  },
];
