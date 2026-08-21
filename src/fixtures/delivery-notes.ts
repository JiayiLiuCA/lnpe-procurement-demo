import type { DeliveryNote } from "@/lib/types";
import { RECEIVER } from "./suppliers";

export const deliveryNotes: DeliveryNote[] = [
  // 核心：06-09 送货单，7 行 63 件（正常 6 项共 23 件 = 63 − 40）
  {
    id: "d-0609",
    date: "2026-06-09",
    fromName: "德阳嘉信机械加工有限公司 / 四川宏泰钣金制造有限公司",
    projectIds: ["p-260209", "p-251230"],
    contractIds: ["c-jiaxin", "c-hongtai"],
    receiverName: RECEIVER.name,
    receiverPhone: RECEIVER.phone,
    receiverAddress: RECEIVER.address,
    status: "in_progress",
    headerPhoto: true,
    lines: [
      { seq: 1, name: "360分级机收料仓", spec: "LNC-3601-07-04", qty: 1, unit: "件", packaging: "布", projectCode: "260209", contractId: "c-jiaxin", state: "confirmed", confirmedAt: "08:32", photoCount: 2 },
      { seq: 2, name: "配套法兰", spec: "LNC-3601-05", qty: 4, unit: "件", packaging: "布", projectCode: "260209", contractId: "c-jiaxin", state: "confirmed", confirmedAt: "08:41", photoCount: 1 },
      { seq: 3, name: "360分级机筒体", spec: "LNC-3601-06-01", qty: 4, unit: "件", packaging: "布", projectCode: "260209", contractId: "c-jiaxin", state: "unconfirmed", photoCount: 1 },
      { seq: 4, name: "260分级机收料仓", spec: "LNC2601-14-01", qty: 5, unit: "件", packaging: "布", projectCode: "260209", contractId: "c-jiaxin", state: "unconfirmed", photoCount: 0 },
      {
        seq: 5,
        name: "配套法兰（圆）",
        spec: "LNC-3601-03",
        qty: 40,
        unit: "片",
        packaging: "布",
        projectCode: "251230",
        contractId: "c-hongtai",
        state: "exception",
        photoCount: 3,
        exception: { type: "数量不符", actualQty: 36, note: "缺 4 片，已联系司机核对，照片已留存" },
      },
      { seq: 6, name: "360分级机排料斗", spec: "LNC3606-14-01", qty: 3, unit: "件", packaging: "布", projectCode: "251230", contractId: "c-hongtai", state: "unconfirmed", photoCount: 0 },
      { seq: 7, name: "560分级机排料斗", spec: "LNC-560-1-08-1-C", qty: 6, unit: "件", packaging: "布", projectCode: "251230", contractId: "c-hongtai", state: "unconfirmed", photoCount: 0 },
    ],
  },
  // 锋杰 · 今日到货
  {
    id: "d-0820",
    date: "2026-08-20",
    fromName: "常州锋杰机械有限公司",
    projectIds: ["p-20260510"],
    contractIds: ["c-fengjie"],
    receiverName: RECEIVER.name,
    receiverPhone: RECEIVER.phone,
    receiverAddress: RECEIVER.address,
    status: "pending",
    headerPhoto: false,
    lines: [
      { seq: 1, name: "星型卸料阀", spec: "DN250(12L/r)", qty: 3, unit: "套", packaging: "布", projectCode: "20260510", contractId: "c-fengjie", state: "unconfirmed", photoCount: 0 },
      { seq: 2, name: "星型卸料阀", spec: "DN200(6L/r)", qty: 4, unit: "套", packaging: "布", projectCode: "20260510", contractId: "c-fengjie", state: "unconfirmed", photoCount: 0 },
      { seq: 3, name: "气动蝶阀", spec: "DN150", qty: 5, unit: "套", packaging: "布", projectCode: "20260510", contractId: "c-fengjie", state: "unconfirmed", photoCount: 0 },
    ],
  },
  // 251102 乐山协鑫一期（已结束项目）· 已完成收货
  {
    id: "d-0518",
    date: "2026-05-18",
    fromName: "四川宏泰钣金制造有限公司",
    projectIds: ["p-251102"],
    contractIds: ["c-closed-1"],
    receiverName: RECEIVER.name,
    receiverPhone: RECEIVER.phone,
    receiverAddress: RECEIVER.address,
    status: "done",
    headerPhoto: true,
    lines: [
      { seq: 1, name: "分级机机壳组焊件", spec: "LNC-360-01", qty: 4, unit: "套", packaging: "布", projectCode: "251102", contractId: "c-closed-1", state: "confirmed", confirmedAt: "09:20", photoCount: 3 },
      { seq: 2, name: "平台钢结构及爬梯", spec: "LNPT-YQ", qty: 1, unit: "批", packaging: "布", projectCode: "251102", contractId: "c-closed-1", state: "confirmed", confirmedAt: "10:05", photoCount: 2 },
    ],
  },
  // 章鼓 · 明日预计
  {
    id: "d-0821",
    date: "2026-08-21",
    fromName: "山东章丘鼓风机股份有限公司",
    projectIds: ["p-20260510"],
    contractIds: ["c-zhanggu"],
    receiverName: RECEIVER.name,
    receiverPhone: RECEIVER.phone,
    receiverAddress: RECEIVER.address,
    status: "pending",
    headerPhoto: false,
    lines: [
      { seq: 1, name: "罗茨风机", spec: "FSR-150V", qty: 3, unit: "套", packaging: "布", projectCode: "20260510", contractId: "c-zhanggu", state: "unconfirmed", photoCount: 0 },
      { seq: 2, name: "罗茨风机", spec: "FSR-200V", qty: 3, unit: "套", packaging: "布", projectCode: "20260510", contractId: "c-zhanggu", state: "unconfirmed", photoCount: 0 },
      { seq: 3, name: "配套消音器", spec: "FSR 配套", qty: 2, unit: "套", packaging: "布", projectCode: "20260510", contractId: "c-zhanggu", state: "unconfirmed", photoCount: 0 },
    ],
  },
];
