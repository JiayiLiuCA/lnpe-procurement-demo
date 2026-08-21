// AI 流程 2：采购清单 xlsx 解析结果（upsert cl-20260510-1，版本号 +1）
export const checklistParse = {
  fileName: "20260510采购清单(5.30).xls",
  maker: "肖济忠",
  sheets: [
    { name: "一次喷雾到研磨", rows: 4 },
    { name: "辊道窑装钵", rows: 6 },
    { name: "二粉(1)", rows: 19 },
    { name: "二粉(2)", rows: 30 },
    { name: "混料包装(1)", rows: 11 },
    { name: "提升机", rows: 1 },
    { name: "电气资料及要求", rows: 0 },
  ],
  sampleRows: [
    { name: "罗茨风机", spec: "FSR-150V · 铸铁", qty: "2 套", sheet: "一次喷雾到研磨" },
    { name: "星型卸料阀", spec: "DN250(12L/r) · 304+WC", qty: "3 套", sheet: "一次喷雾到研磨" },
    { name: "脉冲布袋除尘器", spec: "LNMC-96", qty: "2 台", sheet: "二粉(1)" },
    { name: "（子母扣）陶瓷块", spec: "80*30*10 · 95陶瓷", qty: "1.3 t", sheet: "二粉(2)" },
    { name: "斗式提升机", spec: "NE30-18m", qty: "1 台", sheet: "提升机" },
  ],
  globalNote:
    "全局表面处理要求：外表面喷砂处理，内表面喷涂 ETFE 0.3mm；设备与物料接触部位禁用 Cu、Zn 材质，合金中 Zn、Cu 含量 <1%，物料接触点全部为 S30408 不锈钢件或非金属件…",
  steps: ["正在读取工作簿…", "识别 7 个子系统 sheet…", "提取 71 行明细…", "校验签核信息…"],
};
