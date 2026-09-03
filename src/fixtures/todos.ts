import type { Todo } from "@/lib/types";

// 照抄工作台设计稿的 5 条待办
export const todos: Todo[] = [
  {
    id: "t-1",
    kind: "review",
    pillText: "清单审核",
    title: "20260510 二粉(2) 第一批采购清单",
    sub: "制表 肖济忠 · 08-19 提交",
    actionLabel: "去审核",
    href: "/projects/p-20260510?phase=2",
  },
  {
    id: "t-cl-260706",
    kind: "review",
    pillText: "清单审核",
    title: "260706 磷酸铁锂二粉线 第一批采购清单",
    sub: "制表 肖济忠 · 08-14 提交 · 待核对 5 项",
    actionLabel: "去审核",
    href: "/projects/p-260706?phase=2",
  },
  {
    id: "t-2",
    kind: "ai_draft",
    pillText: "AI 初稿",
    title: "常州锋杰 · 星型卸料阀等 6 项，合同初稿已生成",
    sub: "项目 20260510 · 待校对定稿",
    actionLabel: "去校对",
    href: "/contracts/c-draft-1",
  },
  {
    id: "t-3",
    kind: "payment_due",
    pillText: "付款临期",
    title: "LNPE-XY20260307-05 验收款 30% ¥153,000",
    sub: "项目 260209 · 3 天后到期（08-23）",
    actionLabel: "去登记",
    href: "/contracts/c-jiaxin",
  },
  {
    id: "t-4",
    kind: "delivery_overdue",
    pillText: "交货逾期",
    title: "LNPE-20260312030-SJ 浙江开山 · 离心式空压机 12 套",
    sub: "交货期 05-30 · 已逾期 82 天 · 请与卖方经办确认发货安排",
    actionLabel: "查看合同",
    href: "/contracts/c-kaishan-1",
  },
  {
    id: "t-5",
    kind: "receive_exception",
    pillText: "收货异常",
    title: "06-09 送货单 · 配套法兰（圆）数量不符（实收 36/40）",
    sub: "收货人 敬宏 · 现场已留照片 3 张",
    actionLabel: "去处理",
    href: "/contracts/c-hongtai",
  },
];
