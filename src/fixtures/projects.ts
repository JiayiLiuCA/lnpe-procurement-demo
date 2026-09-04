import type { Project } from "@/lib/types";
import { standardTerms, withTerms } from "@/lib/orderTerms";

// 每一版项目合同都带 AI 抓取的重要条目；多版本项目的新版在上一版条目上套变更
// 260706 v2 技术协议附件：补了在线粒度检测仪，验收加了粒度与产能指标
const TERMS_260706_V1 = standardTerms("¥8,650,000", "2026-11-15", "磷酸铁锂二次粉碎分级线成套设备（含脉冲除尘与螺旋输送）");
const TERMS_260706_V2 = withTerms(TERMS_260706_V1, {
  交付范围: "磷酸铁锂二次粉碎分级线成套设备（含脉冲除尘、螺旋输送、在线粒度检测仪）",
  验收方式: "72 小时连续负荷试车 · 成品 D50 1.0–1.5μm、产能 ≥ 1.2 t/h",
});
// 251230 v2 补充协议：交货期顺延一个月
const TERMS_251230_V1 = standardTerms("¥6,800,000", "2026-05-30", "二期粉体分级系统成套设备");
const TERMS_251230_V2 = withTerms(TERMS_251230_V1, { 交货期: "2026-06-30" });

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
      versions: [{ id: "v1", name: "v1 客户签章版", at: "2026-08-12", by: "赵小燕 上传", final: true, aiAt: "2026-08-12", keyTerms: standardTerms("¥12,300,000", "2026-12-20", "三元正极材料气流粉碎分级线成套设备（2 线，含除尘与气力输送）") }],
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
        { id: "v1", name: "v1 客户签章版", at: "2026-07-06", by: "敬宏 上传", final: true, aiAt: "2026-07-06", keyTerms: TERMS_260706_V1 },
        { id: "v2", name: "v2 技术协议附件补签", at: "2026-07-21", by: "敬宏 上传", aiAt: "2026-07-21", keyTerms: TERMS_260706_V2 },
      ],
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
      versions: [{ id: "v1", name: "v1 客户签章版", at: "2026-05-23", by: "赵小燕 上传", final: true, aiAt: "2026-05-23", keyTerms: standardTerms("¥18,600,000", "2026-08-15", "锂电正极材料一期粉体处理线成套设备") }],
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
        { id: "v1", name: "v1 客户签章版", at: "2025-12-30", by: "赵小燕 上传", final: true, aiAt: "2025-12-30", keyTerms: TERMS_251230_V1 },
        { id: "v2", name: "v2 补充协议（交货期顺延）", at: "2026-03-18", by: "赵小燕 上传", aiAt: "2026-03-18", keyTerms: TERMS_251230_V2 },
      ],
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
      versions: [{ id: "v1", name: "v1 客户签章版", at: "2025-11-02", by: "赵小燕 上传", final: true, aiAt: "2025-11-02", keyTerms: standardTerms("¥4,200,000", "2026-06-30", "一期粉体分级系统成套设备") }],
    },
  },
];
