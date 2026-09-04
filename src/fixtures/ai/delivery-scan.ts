// AI 流程 6：送货单拍照识别（06-09 宏泰送货单，3 行）。一张送货单只对应一个项目下的一份子合同。
export const deliveryScan = {
  date: "2026-06-09",
  projectCode: "251230",
  contractNo: "LNPE-XY2C260206-07/08",
  supplier: "四川宏泰钣金制造有限公司",
  receiver: "敬宏",
  lines: [
    { name: "配套法兰（圆）", spec: "LNC-3601-03", qty: "40 片", packaging: "布" },
    { name: "360分级机排料斗", spec: "LNC3606-14-01", qty: "3 件", packaging: "布" },
    { name: "560分级机排料斗", spec: "LNC-560-1-08-1-C", qty: "6 件", packaging: "布" },
  ],
  steps: ["正在识别送货单图像…", "提取单头信息（日期 / 项目 / 合同 / 收货人）…", "识别 3 行货物明细…", "匹配在途合同…"],
};
