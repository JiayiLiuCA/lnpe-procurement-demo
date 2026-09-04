import type { DeliveryNote } from "@/lib/types";
import { RECEIVER } from "./suppliers";

export const deliveryNotes: DeliveryNote[] = [
  // 核心：06-09 送货单（宏泰），3 行 49 件（正常 2 项共 9 件 = 49 − 40）
  {
    id: "d-0609",
    date: "2026-06-09",
    fromName: "四川宏泰钣金制造有限公司",
    projectId: "p-251230",
    contractId: "c-hongtai",
    receiverName: RECEIVER.name,
    receiverPhone: RECEIVER.phone,
    receiverAddress: RECEIVER.address,
    status: "in_progress",
    headerPhoto: true,
    lines: [
      {
        seq: 1,
        name: "配套法兰（圆）",
        spec: "LNC-3601-03",
        qty: 40,
        unit: "片",
        packaging: "布",
        state: "exception",
        photoCount: 3,
        exception: { type: "数量不符", actualQty: 36, note: "缺 4 片，已联系司机核对，照片已留存" },
      },
      { seq: 2, name: "360分级机排料斗", spec: "LNC3606-14-01", qty: 3, unit: "件", packaging: "布", state: "unconfirmed", photoCount: 0 },
      { seq: 3, name: "560分级机排料斗", spec: "LNC-560-1-08-1-C", qty: 6, unit: "件", packaging: "布", state: "unconfirmed", photoCount: 0 },
    ],
  },
  // 锋杰 · 今日到货
  {
    id: "d-0820",
    date: "2026-08-20",
    fromName: "常州锋杰机械有限公司",
    projectId: "p-20260510",
    contractId: "c-fengjie",
    receiverName: RECEIVER.name,
    receiverPhone: RECEIVER.phone,
    receiverAddress: RECEIVER.address,
    status: "pending",
    headerPhoto: false,
    lines: [
      { seq: 1, name: "星型卸料阀", spec: "DN250(12L/r)", qty: 3, unit: "套", packaging: "布", state: "unconfirmed", photoCount: 0 },
      { seq: 2, name: "星型卸料阀", spec: "DN200(6L/r)", qty: 4, unit: "套", packaging: "布", state: "unconfirmed", photoCount: 0 },
      { seq: 3, name: "气动蝶阀", spec: "DN150", qty: 5, unit: "套", packaging: "布", state: "unconfirmed", photoCount: 0 },
    ],
  },
  // 251102 乐山协鑫一期（已结束项目）· 已完成收货
  {
    id: "d-0518",
    date: "2026-05-18",
    fromName: "四川宏泰钣金制造有限公司",
    projectId: "p-251102",
    contractId: "c-closed-1",
    receiverName: RECEIVER.name,
    receiverPhone: RECEIVER.phone,
    receiverAddress: RECEIVER.address,
    status: "done",
    headerPhoto: true,
    lines: [
      { seq: 1, name: "分级机机壳组焊件", spec: "LNC-360-01", qty: 4, unit: "套", packaging: "布", state: "confirmed", confirmedAt: "09:20", photoCount: 3 },
      { seq: 2, name: "平台钢结构及爬梯", spec: "LNPT-YQ", qty: 1, unit: "批", packaging: "布", state: "confirmed", confirmedAt: "10:05", photoCount: 2 },
    ],
  },
  // 章鼓 · 明日预计
  {
    id: "d-0821",
    date: "2026-08-21",
    fromName: "山东章丘鼓风机股份有限公司",
    projectId: "p-20260510",
    contractId: "c-zhanggu",
    receiverName: RECEIVER.name,
    receiverPhone: RECEIVER.phone,
    receiverAddress: RECEIVER.address,
    status: "pending",
    headerPhoto: false,
    lines: [
      { seq: 1, name: "罗茨风机", spec: "FSR-150V", qty: 3, unit: "套", packaging: "布", state: "unconfirmed", photoCount: 0 },
      { seq: 2, name: "罗茨风机", spec: "FSR-200V", qty: 3, unit: "套", packaging: "布", state: "unconfirmed", photoCount: 0 },
      { seq: 3, name: "配套消音器", spec: "FSR 配套", qty: 2, unit: "套", packaging: "布", state: "unconfirmed", photoCount: 0 },
    ],
  },
];
