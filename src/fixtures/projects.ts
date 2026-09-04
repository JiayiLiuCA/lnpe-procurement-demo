import type { Project, TermChange } from "@/lib/types";

/** 把某版的变更套到重要条目上（keyTerms 永远是「当前值」，原值留在 versions[].changes 里） */
function applyChanges(terms: { label: string; value: string }[], changes: TermChange[]) {
  return terms.map((t) => {
    const c = changes.find((x) => x.label === t.label);
    return c ? { ...t, value: c.to } : t;
  });
}

// 260706 v2 技术协议附件：补了在线粒度检测仪，验收加了粒度与产能指标
const CHANGES_260706_V2: TermChange[] = [
  { label: "交付范围", from: "磷酸铁锂二次粉碎分级线成套设备（含脉冲除尘与螺旋输送）", to: "磷酸铁锂二次粉碎分级线成套设备（含脉冲除尘、螺旋输送、在线粒度检测仪）" },
  { label: "验收方式", from: "72 小时连续负荷试车", to: "72 小时连续负荷试车 · 成品 D50 1.0–1.5μm、产能 ≥ 1.2 t/h" },
];
// 251230 v2 补充协议：交货期顺延一个月
const CHANGES_251230_V2: TermChange[] = [{ label: "交货期", from: "2026-05-30", to: "2026-06-30" }];

/** 各项目共用的 AI 抓取条款模板（交付范围与日期按项目差异化） */
function keyTerms(amount: string, delivery: string, scope: string) {
  return [
    { label: "合同金额", value: `${amount}（含税 13%）` },
    { label: "交货期", value: delivery },
    { label: "交付范围", value: scope },
    { label: "付款节点", value: "预付 30% · 验收后 60% · 质保金 10%" },
    { label: "运输与安装", value: "卖方运抵现场 · 指导安装调试" },
    { label: "验收方式", value: "72 小时连续负荷试车" },
    { label: "质保期", value: "验收合格起 12 个月" },
    { label: "结算与开票", value: "电汇 · 每笔收款前开等额 13% 专票" },
  ];
}

export const projects: Project[] = [
  // 步骤 2 采购清单：项目合同刚入库，技术部尚未出采购清单（步骤、标签、进展全部由 lib/steps.ts 派生）
  {
    id: "p-260812",
    code: "260812",
    name: "宜宾锂宝三元正极粉碎分级线",
    orderedAt: "2026-08-12",
    deliveryDeadline: "2026-12-20",
    owner: "赵小燕",
    orderContract: {
      fileName: "260812项目合同.xlsx",
      no: "LB-LN-260812-01",
      customer: "宜宾锂宝新材料有限公司",
      signedAt: "2026-08-12",
      amountInclTax: 12300000,
      deliveryDeadline: "2026-12-20",
      versions: [{ id: "v1", name: "v1 客户签章版", at: "2026-08-12", by: "赵小燕 上传", final: true }],
      keyTerms: keyTerms("¥12,300,000", "2026-12-20", "三元正极材料气流粉碎分级线成套设备（2 线，含除尘与气力输送）"),
    },
  },
  // 步骤 2 采购清单：第一批清单已提交待审核，待核对 5 项，第二批（电气与自制件）技术部尚未出
  {
    id: "p-260706",
    code: "260706",
    name: "青海泰丰磷酸铁锂二粉线",
    orderedAt: "2026-07-06",
    deliveryDeadline: "2026-11-15",
    owner: "敬宏",
    orderContract: {
      fileName: "260706项目合同.xlsx",
      no: "TF-LN-260706-02",
      customer: "青海泰丰先行锂能科技有限公司",
      signedAt: "2026-07-06",
      amountInclTax: 8650000,
      deliveryDeadline: "2026-11-15",
      versions: [
        { id: "v1", name: "v1 客户签章版", at: "2026-07-06", by: "敬宏 上传", final: true },
        { id: "v2", name: "v2 技术协议附件补签", at: "2026-07-21", by: "敬宏 上传", changes: CHANGES_260706_V2 },
      ],
      keyTerms: applyChanges(keyTerms("¥8,650,000", "2026-11-15", "磷酸铁锂二次粉碎分级线成套设备（含脉冲除尘与螺旋输送）"), CHANGES_260706_V2),
    },
  },
  {
    id: "p-20260510",
    code: "20260510",
    name: "德阳锂电正极材料一期",
    orderedAt: "2026-05-23",
    deliveryDeadline: "2026-08-15",
    owner: "赵小燕",
    orderContract: {
      fileName: "20260510项目合同.xlsx",
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
    orderContract: {
      fileName: "260227项目合同.xlsx",
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
    orderContract: {
      fileName: "260209项目合同.xlsx",
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
    orderContract: {
      fileName: "251230项目合同.xlsx",
      no: "XX-LN-251230-06",
      customer: "乐山协鑫新能源科技有限公司",
      signedAt: "2025-12-30",
      amountInclTax: 6800000,
      deliveryDeadline: "2026-06-30",
      versions: [
        { id: "v1", name: "v1 客户签章版", at: "2025-12-30", by: "赵小燕 上传", final: true },
        { id: "v2", name: "v2 补充协议（交货期顺延）", at: "2026-03-18", by: "赵小燕 上传", changes: CHANGES_251230_V2 },
      ],
      keyTerms: keyTerms("¥6,800,000", "2026-06-30", "二期粉体分级系统成套设备"),
    },
  },
  // 已结束项目（closedAt 有值即 7 步全勾）：全部信息依旧可见
  {
    id: "p-251102",
    code: "251102",
    name: "乐山协鑫一期",
    orderedAt: "2025-11-02",
    deliveryDeadline: "2026-06-30",
    owner: "赵小燕",
    closedAt: "2026-07-31",
    orderContract: {
      fileName: "251102项目合同.xlsx",
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
