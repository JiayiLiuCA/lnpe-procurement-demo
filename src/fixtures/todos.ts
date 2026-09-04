import type { Todo } from "@/lib/types";

// 工作台待办（清单审核 / AI 初稿 / 付款临期 / 交货逾期 / 收货异常 各一条）
export const todos: Todo[] = [
  {
    id: "t-cl-260706",
    kind: "review",
    pillText: "清单审核",
    title: "260706 磷酸铁锂二粉线 第一批采购清单",
    sub: "制表 肖济忠 · 08-14 提交 · 待核对 5 项",
    actionLabel: "去审核",
    href: "/projects/p-260706?step=2",
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
    title: "LNPE-20260605012-SJ 章鼓 · 发货款 50%",
    sub: "项目 20260510 · 09-02 到期（13 天后）· 付款后卖方发货",
    actionLabel: "去登记",
    href: "/contracts/c-zhanggu",
  },
  {
    id: "t-4",
    kind: "delivery_overdue",
    pillText: "交货逾期",
    title: "LNPE-20260601008-SJ 常州锋杰 · 星型卸料阀、气动蝶阀",
    sub: "交货期 08-15 · 已逾期 5 天 · 请与卖方经办确认发货安排",
    actionLabel: "查看合同",
    href: "/contracts/c-fengjie",
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
