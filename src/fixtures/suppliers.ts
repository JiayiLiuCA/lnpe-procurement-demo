import type { Supplier } from "@/lib/types";

// 买方常量
export const BUYER = {
  name: "绵阳流能粉体设备有限公司",
  contactName: "赵小燕",
  phone: "13689684645",
  email: "Purchasing@lnpe.com.cn",
};

// 收货员常量
export const RECEIVER = {
  name: "敬宏",
  phone: "13320903009",
  address: "四川省德阳市金山工业园区光明路与青红路交汇处",
};

export const suppliers: Supplier[] = [
  {
    id: "s-kaishan",
    name: "浙江开山离心机械有限公司",
    short: "开山",
    contactName: "唐毅",
    phone: "13677626727",
    email: "tangyi@kaitec.com.cn",
    address: "浙江省衢州市开山工业园区",
  },
  {
    id: "s-fengjie",
    name: "常州锋杰机械有限公司",
    short: "锋杰",
    contactName: "周立峰",
    phone: "13915088236",
    address: "江苏省常州市武进区雪堰镇工业园",
  },
  {
    id: "s-zhanggu",
    name: "山东章丘鼓风机股份有限公司",
    short: "章鼓",
    contactName: "李宪政",
    phone: "13805417726",
    address: "山东省济南市章丘区明水经济开发区",
  },
  {
    id: "s-zhenying",
    name: "新乡市振英机械设备有限公司",
    short: "振英",
    contactName: "王振英",
    phone: "13603735951",
    address: "河南省新乡市牧野区工业园区",
  },
  {
    id: "s-ruituo",
    name: "成都瑞拓除尘设备有限公司",
    short: "瑞拓",
    contactName: "刘瑞",
    phone: "13908177342",
    address: "四川省成都市青白江区工业集中区",
  },
  {
    id: "s-jiaxin",
    name: "德阳嘉信机械加工有限公司",
    short: "嘉信",
    contactName: "何嘉",
    phone: "13990263318",
    address: "四川省德阳市旌阳区工业集中发展区",
  },
  {
    id: "s-hongtai",
    name: "四川宏泰钣金制造有限公司",
    short: "宏泰",
    contactName: "杨宏",
    phone: "13778215509",
    address: "四川省德阳市广汉市工业集中区",
  },
];

export function supplierById(id: string): Supplier {
  const s = suppliers.find((x) => x.id === id);
  if (!s) throw new Error(`unknown supplier ${id}`);
  return s;
}
