import type { Activity } from "@/lib/types";

// 照抄 Project.dc 时间线（p-20260510）
export const activities: Activity[] = [
  { id: "a-1", projectId: "p-20260510", text: "锋杰合同交货逾期 5 天，已生成交货逾期提醒", at: "08-20 09:00", actor: "系统", tone: "danger" },
  { id: "a-2", projectId: "p-20260510", text: "二粉(2) 第一批清单提交审核", at: "08-19 16:42", actor: "肖济忠", tone: "neutral" },
  { id: "a-3", projectId: "p-20260510", text: "章鼓合同 预付款 ¥86,400 已付", at: "08-12 10:15", actor: "财务", tone: "success" },
  { id: "a-4", projectId: "p-20260510", text: "收到章鼓 10% 发票 NO.05233108", at: "08-10 14:03", actor: "赵小燕", tone: "success" },
  { id: "a-5", projectId: "p-20260510", text: "锋杰合同 发货款 ¥607,500 已付", at: "06-28 11:20", actor: "财务", tone: "success" },
  { id: "a-6", projectId: "p-20260510", text: "第一批采购清单批准通过", at: "05-30 17:36", actor: "", tone: "neutral" },
  { id: "a-7", projectId: "p-20260510", text: "第一批采购清单创建（xlsx 上传解析）", at: "05-23 09:12", actor: "肖济忠", tone: "neutral" },
  // 其余项目各给少量动态
  { id: "a-8", projectId: "p-260227", text: "开山合同交货逾期 80 天，已生成交货逾期提醒", at: "08-18 09:00", actor: "系统", tone: "danger" },
  { id: "a-9", projectId: "p-260227", text: "开山合同 发货款 ¥3,696,000 已付", at: "05-28 15:40", actor: "财务", tone: "success" },
  { id: "a-10", projectId: "p-260209", text: "06-09 送货单收货中 · 异常 1 项（配套法兰（圆）36/40）", at: "06-09 09:12", actor: "敬宏", tone: "danger" },
  { id: "a-11", projectId: "p-251230", text: "宏泰合同 验收款 ¥1,265,700 已付", at: "06-30 16:05", actor: "财务", tone: "success" },
  { id: "a-12", projectId: "p-251102", text: "项目关闭：全部合同完结、尾款结清", at: "07-31 15:20", actor: "赵小燕", tone: "neutral" },
  { id: "a-13", projectId: "p-251102", text: "宏泰合同 质保金 ¥286,000 已付，合同完结", at: "07-28 10:40", actor: "财务", tone: "success" },
  // 两个前期项目
  { id: "a-14", projectId: "p-260812", text: "技术部已排期：第一批采购清单预计 08-28 提交", at: "08-15 14:10", actor: "肖济忠", tone: "neutral" },
  { id: "a-15", projectId: "p-260812", text: "订单合同 v1 客户签章版入库，AI 抓取 8 项重要条目", at: "08-12 09:40", actor: "赵小燕", tone: "neutral" },
  { id: "a-16", projectId: "p-260706", text: "库存核对：主轴轴承、密封件包已分配，耐磨衬板部分分配 12/32", at: "08-18 10:05", actor: "敬宏", tone: "neutral" },
  { id: "a-17", projectId: "p-260706", text: "第一批采购清单提交审核 · 待核对 5 项", at: "08-14 16:30", actor: "肖济忠", tone: "neutral" },
  { id: "a-18", projectId: "p-260706", text: "订单合同 v2 技术协议附件补签", at: "07-21 11:00", actor: "敬宏", tone: "neutral" },
];
