// AI 流程 6：送货单拍照识别（06-09 单，7 行）
export const deliveryScan = {
  date: "2026-06-09",
  projectCodes: ["260209", "251230"],
  contractCount: 2,
  receiver: "敬宏",
  lines: [
    { name: "360分级机收料仓", spec: "LNC-3601-07-04", qty: "1 件", packaging: "布", projectCode: "260209", contractNoTail: "…0307-05" },
    { name: "配套法兰", spec: "LNC-3601-05", qty: "4 件", packaging: "布", projectCode: "260209", contractNoTail: "…0307-05" },
    { name: "360分级机筒体", spec: "LNC-3601-06-01", qty: "4 件", packaging: "布", projectCode: "260209", contractNoTail: "…0307-05" },
    { name: "260分级机收料仓", spec: "LNC2601-14-01", qty: "5 件", packaging: "布", projectCode: "260209", contractNoTail: "…0307-05" },
    { name: "配套法兰（圆）", spec: "LNC-3601-03", qty: "40 片", packaging: "布", projectCode: "251230", contractNoTail: "…260206-07" },
    { name: "360分级机排料斗", spec: "LNC3606-14-01", qty: "3 件", packaging: "布", projectCode: "251230", contractNoTail: "…260206-07" },
    { name: "560分级机排料斗", spec: "LNC-560-1-08-1-C", qty: "6 件", packaging: "布", projectCode: "251230", contractNoTail: "…260206-08" },
  ],
  steps: ["正在识别送货单图像…", "提取单头信息（日期 / 项目 / 收货人）…", "识别 7 行货物明细…", "匹配在途合同与项目…"],
};
