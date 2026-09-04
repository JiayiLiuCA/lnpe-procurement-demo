import type { Checklist, ChecklistRow, Sheet } from "@/lib/types";

// 行状态恒等式：9 全分配 + 59 全需采购 + 2 安排生产 + 1 部分分配 = 71（待核对 0，订货安排已完成）
// 派生结果：已分配 10 项 / 需采购 60 项 / 安排生产 2 项 / 已入合同 54 项 → 项目停在「子合同」步（覆盖 54/60）

export type RowSpec = {
  name: string;
  spec: string;
  material: string;
  qty: number | "若干";
  unit: string;
  section?: "标准件" | "自制件";
  brands?: string;
  techNote?: string;
  hasDrawing?: boolean;
  /** 'a' 全分配 · 'n' 全需采购 · ['p', allocated] 部分 · 'w' 待核对 · 'm' 安排生产（公司自制） */
  st: "a" | "n" | "w" | "m" | ["p", number];
  /** 'm' 时的计划完工日期 */
  produceBy?: string;
  contractId?: string;
};

export function buildRows(sheetId: string, specs: RowSpec[]): ChecklistRow[] {
  return specs.map((s, i) => {
    const qtyNum = typeof s.qty === "number" ? s.qty : 0;
    const alloc =
      s.st === "a"
        ? { allocated: qtyNum, need: 0, status: "allocated" as const }
        : s.st === "n"
          ? { allocated: 0, need: qtyNum, status: "need" as const }
          : s.st === "w"
            ? { allocated: 0, need: 0, status: "pending" as const }
            : s.st === "m"
              ? { allocated: 0, need: 0, status: "produce" as const, produceBy: s.produceBy }
              : { allocated: s.st[1], need: qtyNum - s.st[1], status: "partial" as const };
    return {
      id: `r-${sheetId}-${i + 1}`,
      seq: i + 1,
      section: s.section ?? "标准件",
      name: s.name,
      spec: s.spec,
      material: s.material,
      qty: s.qty,
      unit: s.unit,
      brands: s.brands,
      techNote: s.techNote ?? "",
      hasDrawing: s.hasDrawing,
      alloc,
      contractId: s.contractId,
    };
  });
}

const FENGJIE_VALVE_NOTE = `1. 电机采用变频电机，电机功率 1.5KW；配置单相 220V 独立散热风扇；变频电动机须在工频运行时满足 GB18613-2020、GB30254-2024 中一级能效要求，品牌：卧龙电气、西安西玛、江苏大中、安徽皖南或同等及以上品牌。绝缘等级 F 级，防护等级 IP55；
2. 配置行星减速机，出厂前需将减速机注满润滑油；
3. 轴端密封方式：轴封/填料密封；轴端密封性保证 ±50KPa 压力，无泄漏；
4. 轴承外置，品牌：NSK、SKF；
5. 物料温度 80–100℃，堆积密度 0.7 吨/m³；
6. 外表面喷砂，设备主体 SUS304 不锈钢材质，内腔喷涂 ETFE。`;

const sheet1: Sheet = {
  id: "s1",
  name: "一次喷雾到研磨",
  rows: buildRows("s1", [
    {
      name: "罗茨风机",
      spec: "FSR-150V",
      material: "铸铁",
      qty: 2,
      unit: "套",
      brands: "章鼓/陕鼓",
      techNote:
        "流量 18.7m³/min，功率 30KW，P=-44kPa；电机变频、一级能效（GB18613-2020）；进出口配套消音器与柔性接头；轴承温升 ≤40K，噪声 ≤85dB(A)；随机附出厂检验报告与性能曲线；机组底座整体找平，配减振垫。",
      st: "n",
      contractId: "c-zhanggu",
    },
    {
      name: "高压逆流罗茨风机",
      spec: "FSR-150V",
      material: "铸铁",
      qty: 2,
      unit: "套",
      brands: "章鼓/陕鼓",
      techNote: "流量 20m³/min，功率暂定，P=-60kPa；电机变频、一级能效；出口温度按逆流工况校核，配安全阀与止回阀。",
      st: "n",
    },
    {
      name: "星型卸料阀",
      spec: "DN250(12L/r)",
      material: "304+WC",
      qty: 3,
      unit: "套",
      brands: "常州锋杰",
      techNote: FENGJIE_VALVE_NOTE,
      st: "n",
      contractId: "c-fengjie",
    },
    {
      name: "星型卸料阀",
      spec: "DN200(6L/r)",
      material: "304",
      qty: 6,
      unit: "套",
      brands: "常州锋杰",
      techNote: "电机变频 1.1KW；行星减速机；轴封/填料密封 ±50KPa；轴承外置 NSK/SKF；主体 SUS304，内腔喷涂 ETFE。",
      st: ["p", 2],
      contractId: "c-fengjie",
    },
  ]),
};

const sheet2: Sheet = {
  id: "s2",
  name: "辊道窑装钵",
  rows: buildRows("s2", [
    {
      name: "气动插板阀",
      spec: "DN300",
      material: "304",
      qty: 6,
      unit: "套",
      brands: "常州锋杰",
      techNote: "配亚德客气缸与电磁阀；阀板 304 抛光，气密性 -50~+50KPa 无泄漏；带双侧限位信号反馈。",
      st: "n",
      contractId: "c-fengjie",
    },
    {
      name: "罗茨风机（窑头送风）",
      spec: "FSR-200V",
      material: "铸铁",
      qty: 2,
      unit: "套",
      brands: "章鼓/陕鼓",
      techNote: "流量 32m³/min，P=58.8kPa，功率 55KW；电机变频、一级能效；配进出口消音器。",
      st: "n",
      contractId: "c-zhanggu",
    },
    {
      name: "脉冲布袋除尘器",
      spec: "MC-48",
      material: "碳钢喷塑+涤纶滤袋",
      qty: 2,
      unit: "台",
      brands: "瑞拓/科林",
      techNote: "过滤面积 36m²，出口排放 ≤10mg/m³；脉冲阀 ASCO 或同等品牌；滤袋接口快拆结构。",
      st: "n",
      contractId: "c-draft-2",
    },
    {
      name: "称重模块",
      spec: "HM9B-C3-1t",
      material: "合金钢",
      qty: 12,
      unit: "件",
      brands: "梅特勒/柯力",
      techNote: "C3 级精度；配套不锈钢限位底座；含接线盒与屏蔽电缆 10m。",
      st: "n",
      contractId: "c-draft-1",
    },
    {
      name: "装钵定位气缸",
      spec: "SC63×100",
      material: "铝合金",
      qty: 8,
      unit: "件",
      brands: "亚德客/SMC",
      techNote: "带磁性开关；工作压力 0.4–0.6MPa。",
      st: "a",
    },
    {
      name: "匣钵顶升平台",
      spec: "LNJB-800",
      material: "Q235B+镀锌",
      qty: 2,
      unit: "件",
      section: "自制件",
      techNote: "详见图纸；顶升行程 300mm，载荷 500kg；导向柱镀硬铬。",
      hasDrawing: true,
      st: "n",
      contractId: "c-draft-1",
    },
  ]),
};

const sheet3: Sheet = {
  id: "s3",
  name: "二粉(1)",
  rows: buildRows("s3", [
    { name: "星型卸料阀", spec: "DN150(4L/r)", material: "304", qty: 6, unit: "套", brands: "常州锋杰", techNote: "电机变频 0.75KW；行星减速机；轴封密封；主体 SUS304，内腔喷涂 ETFE。", st: "n", contractId: "c-fengjie" },
    { name: "星型卸料阀", spec: "DN300(20L/r)", material: "304+WC", qty: 6, unit: "套", brands: "常州锋杰", techNote: FENGJIE_VALVE_NOTE, st: "n", contractId: "c-fengjie" },
    { name: "气动蝶阀", spec: "DN150", material: "304", qty: 24, unit: "套", brands: "常州锋杰/上海良工", techNote: "对夹式；阀板 304，阀座 PTFE；配双作用气动执行器与限位回讯器。", st: "n", contractId: "c-fengjie" },
    { name: "气动插板阀", spec: "DN300", material: "304", qty: 14, unit: "套", brands: "常州锋杰", techNote: "气密性 ±50KPa 无泄漏；带双侧限位信号反馈。", st: "n", contractId: "c-fengjie" },
    { name: "双层重锤翻板阀", spec: "DN300", material: "304", qty: 9, unit: "套", brands: "常州锋杰", techNote: "上下两层交替启闭锁气；重锤配平可调；法兰按 HG/T 20592。", st: "n", contractId: "c-fengjie" },
    { name: "脉冲布袋除尘器", spec: "LNMC-96", material: "碳钢+涤纶覆膜滤袋", qty: 2, unit: "台", brands: "瑞拓/科林", techNote: "过滤面积 72m²，排放 ≤10mg/m³；离线清灰；灰斗加热与料位计预留口。", st: "n", contractId: "c-draft-2" },
    { name: "仓顶除尘器", spec: "WAM24", material: "304", qty: 4, unit: "台", brands: "瑞拓", techNote: "过滤面积 24m²；顶部快开门检修；脉冲喷吹。", st: "n", contractId: "c-draft-2" },
    { name: "超声波振动筛", spec: "ZYC-1500", material: "304", qty: 4, unit: "台", brands: "新乡振英", techNote: "筛网 80–200 目可换；超声波电源独立控制箱；与物料接触部位 304 抛光，禁铜锌。", st: "n", contractId: "c-zhenying" },
    { name: "直线振动给料机", spec: "GZV-8", material: "304", qty: 4, unit: "台", brands: "新乡振英", techNote: "振幅可调；槽体 304；出料口配软连接。", st: "n", contractId: "c-zhenying" },
    { name: "罗茨风机（输送）", spec: "FSR-150V", material: "铸铁", qty: 3, unit: "套", brands: "章鼓", techNote: "流量 18.7m³/min，P=58.8kPa；电机变频、一级能效。", st: "n", contractId: "c-zhanggu" },
    { name: "罗茨风机配套消音器", spec: "FSR 配套", material: "碳钢", qty: 2, unit: "套", brands: "章鼓", techNote: "进出口各一；插入损失 ≥25dB(A)。", st: "n", contractId: "c-zhanggu" },
    { name: "离心式空压机", spec: "H1000-5.5L", material: "—", qty: 3, unit: "台", brands: "开山", techNote: "流量≥205m³/min，P=0.55MPa，功率 1000kW，10KV 高压电机；无油认证；含干燥净化后处理。", st: "n", contractId: "c-kaishan-2" },
    { name: "管道电动葫芦", spec: "CD1-2t", material: "—", qty: 2, unit: "台", techNote: "起升高度 12m；配电动小车。", st: "a" },
    { name: "手动蝶阀", spec: "DN100", material: "304", qty: "若干", unit: "件", techNote: "检修隔断用，数量按现场管路核定。", st: "n" },
    { name: "除铁器（永磁棒）", spec: "NdFeB-12000GS", material: "304", qty: 8, unit: "支", techNote: "磁感应强度 ≥12000GS；表面 304 抛光；抽拉式快拆。", st: "n", contractId: "c-draft-1" },
    { name: "料位计（阻旋式）", spec: "UZK-01", material: "304", qty: 12, unit: "支", brands: "UWT/科隆", techNote: "接液部位 304；防护 IP65。", st: "n", contractId: "c-draft-1" },
    { name: "压缩空气储气罐", spec: "C-2/8", material: "Q245R", qty: 1, unit: "台", techNote: "2m³/0.8MPa，带安全阀与自动排污；压力容器证书随货。", st: "a" },
    {
      name: "缓存料仓",
      spec: "LNLC-1300-2.5m³",
      material: "304+ETFE",
      qty: 2,
      unit: "件",
      section: "自制件",
      techNote: "详见图纸；外表面喷砂，内表面喷涂 ETFE 0.3mm；锥角 60°，配仓壁振动器安装座。",
      hasDrawing: true,
      st: "m",
      produceBy: "2026-09-05",
    },
    {
      name: "旋风分离器",
      spec: "LNXF-600",
      material: "304",
      qty: 2,
      unit: "件",
      section: "自制件",
      techNote: "详见图纸；内壁抛光 Ra≤0.8；分离效率 ≥95%（d50=10μm）。",
      hasDrawing: true,
      st: "n",
      contractId: "c-draft-2",
    },
  ]),
};

const sheet4: Sheet = {
  id: "s4",
  name: "二粉(2)",
  rows: buildRows("s4", [
    { name: "星型卸料阀", spec: "DN250(12L/r)", material: "304+WC", qty: 4, unit: "套", brands: "常州锋杰", techNote: FENGJIE_VALVE_NOTE, st: "n", contractId: "c-fengjie" },
    { name: "星型卸料阀", spec: "DN200(6L/r)", material: "304", qty: 8, unit: "套", brands: "常州锋杰", techNote: "电机变频 1.1KW；行星减速机；轴封密封 ±50KPa；主体 SUS304。", st: "n", contractId: "c-fengjie" },
    { name: "气动蝶阀", spec: "DN200", material: "304", qty: 16, unit: "套", brands: "常州锋杰/上海良工", techNote: "对夹式；阀座 PTFE；配限位回讯器。", st: "n", contractId: "c-fengjie" },
    { name: "气动插板阀", spec: "DN250", material: "304", qty: 6, unit: "套", brands: "常州锋杰", techNote: "气密性 ±50KPa；双侧限位信号。", st: "n", contractId: "c-fengjie" },
    { name: "高压逆流罗茨风机", spec: "FSR-200V", material: "铸铁", qty: 2, unit: "套", brands: "章鼓/陕鼓", techNote: "流量 32m³/min，P=-60kPa；电机变频、一级能效；逆流工况校核出口温度。", st: "n", contractId: "c-zhanggu" },
    { name: "脉冲布袋除尘器", spec: "LNMC-128", material: "碳钢+PTFE覆膜滤袋", qty: 2, unit: "台", brands: "瑞拓/科林", techNote: "过滤面积 96m²，排放 ≤5mg/m³；PTFE 覆膜滤袋；离线清灰分室结构。", st: "n", contractId: "c-draft-2" },
    { name: "超声波振动筛", spec: "ZYC-1200", material: "304", qty: 4, unit: "台", brands: "新乡振英", techNote: "筛网 120–325 目；接触部位 304 抛光，禁铜锌。", st: "n", contractId: "c-zhenying" },
    { name: "电磁脉冲阀", spec: "DMF-Z-25", material: "铝合金", qty: 48, unit: "只", brands: "ASCO/上海袋配", techNote: "膜片寿命 ≥100 万次；DC24V。", st: "n", contractId: "c-draft-2" },
    { name: "空气斜槽输送机", spec: "XZ-250", material: "碳钢+帆布", qty: 6, unit: "条", techNote: "透气层帆布四层；斜度 6°；法兰连接。", st: "n", contractId: "c-draft-1" },
    { name: "气动换向阀（二位五通）", spec: "4V310-10", material: "铝合金", qty: 24, unit: "只", brands: "亚德客", techNote: "DC24V 线圈；配消声器。", st: "a" },
    { name: "料位计（射频导纳）", spec: "SC-01", material: "304", qty: 8, unit: "支", brands: "科隆/UWT", techNote: "接液 304；量程按仓高定制。", st: "n", contractId: "c-draft-1" },
    { name: "金属检测机", spec: "JT-500", material: "304", qty: 2, unit: "台", techNote: "检测精度 Fe φ0.3mm；带自动剔除翻板。", st: "n" },
    { name: "除铁器（电磁）", spec: "RCDB-8", material: "碳钢", qty: 2, unit: "台", techNote: "悬挂式自卸；励磁功率 3KW。", st: "n" },
    { name: "手动插板阀", spec: "DN200", material: "304", qty: 12, unit: "件", techNote: "检修隔断用。", st: "a" },
    { name: "压力变送器", spec: "PT-503", material: "304", qty: 16, unit: "支", brands: "西门子/横河", techNote: "4–20mA，量程 0–100kPa；隔膜接液 316L。", st: "a" },
    { name: "呼吸阀", spec: "DN100", material: "304", qty: 6, unit: "只", techNote: "仓顶泄压补气两用；开启压力 ±2kPa。", st: "n", contractId: "c-fengjie" },
    { name: "卫生级快装卡箍", spec: "DN50", material: "304", qty: 60, unit: "套", techNote: "含硅胶密封圈。", st: "n", contractId: "c-draft-1" },
    { name: "伸缩布袋溜管", spec: "LNBS-273", material: "帆布+304", qty: 8, unit: "条", techNote: "行程 1.2m；防静电帆布；配料位联锁开关。", st: "n", contractId: "c-draft-1" },
    {
      name: "二粉缓存料仓",
      spec: "LNLC-1600-4m³",
      material: "304+ETFE",
      qty: 2,
      unit: "件",
      section: "自制件",
      techNote: "详见图纸；外表面喷砂，内表面喷涂 ETFE 0.3mm；配仓壁振动器与破拱气嘴。",
      hasDrawing: true,
      st: "n",
    },
    { name: "旋风分离器", spec: "LNXF-800", material: "304", qty: 4, unit: "件", section: "自制件", techNote: "详见图纸；内壁抛光 Ra≤0.8。", hasDrawing: true, st: "n", contractId: "c-draft-2" },
    { name: "分级机耐磨衬板", spec: "LNC-360", material: "高铬铸铁", qty: 24, unit: "件", section: "自制件", techNote: "硬度 HRC≥58；配沉头螺栓安装孔。", st: "n", contractId: "c-draft-1" },
    {
      name: "（子母扣）陶瓷块",
      spec: "80*30*10",
      material: "95陶瓷",
      qty: 1.3,
      unit: "t",
      section: "自制件",
      techNote: "95陶瓷含5%余量；子母扣拼接，配耐磨胶粘贴；到货后按图复核数量。",
      st: "a",
    },
    { name: "溜管及弯头组件", spec: "φ219×3", material: "304 内衬陶瓷", qty: 18, unit: "件", section: "自制件", techNote: "详见图纸；弯头 R≥1.5D，内衬 92 陶瓷贴片。", hasDrawing: true, st: "n", contractId: "c-draft-1" },
    { name: "检修平台及爬梯", spec: "LNPT-2", material: "Q235B 热镀锌", qty: 2, unit: "套", section: "自制件", techNote: "详见图纸；载荷 2kN/m²；栏杆高 1.05m。", hasDrawing: true, st: "m", produceBy: "2026-09-20" },
    { name: "风管法兰", spec: "DN300", material: "304", qty: 40, unit: "片", section: "自制件", techNote: "按 NB/T 47023 制作；密封面车削。", st: "n", contractId: "c-fengjie" },
    { name: "布袋除尘器支架", spec: "LNZJ-128", material: "Q235B 喷塑", qty: 2, unit: "套", section: "自制件", techNote: "地脚螺栓预埋件随货。", st: "n", contractId: "c-draft-2" },
    { name: "吨袋投料站", spec: "LNTL-1000", material: "304", qty: 2, unit: "套", section: "自制件", techNote: "详见图纸；配电动葫芦吊架、破拱按摩装置、除尘接口。", hasDrawing: true, st: "n", contractId: "c-draft-1" },
    { name: "气力输送发送罐", spec: "LNFS-1.5m³", material: "304", qty: 2, unit: "台", section: "自制件", techNote: "详见图纸；设计压力 0.6MPa，压力容器资质制造。", hasDrawing: true, st: "n", contractId: "c-draft-1" },
    { name: "缓冲仓支腿及底座", spec: "LNZT-1300", material: "Q235B", qty: 4, unit: "套", section: "自制件", techNote: "与缓存料仓配套；防腐底漆两道面漆两道。", st: "n", contractId: "c-draft-1" },
    { name: "平台栏杆及踢脚板", spec: "LNLG-42", material: "Q235B 热镀锌", qty: 30, unit: "米", section: "自制件", techNote: "立柱间距 ≤1m；踢脚板高 100mm。", st: "n", contractId: "c-draft-2" },
  ]),
};

const sheet5: Sheet = {
  id: "s5",
  name: "混料包装(1)",
  rows: buildRows("s5", [
    { name: "双螺旋锥形混合机", spec: "LNSH-6000", material: "304", qty: 2, unit: "台", techNote: "有效容积 6m³；接触部位 304 抛光 Ra≤0.8；混合均匀度 CV≤5%；禁铜锌。", st: "n" },
    { name: "星型卸料阀", spec: "DN200(6L/r)", material: "304", qty: 4, unit: "套", brands: "常州锋杰", techNote: "电机变频 1.1KW；主体 SUS304，内腔喷涂 ETFE。", st: "n", contractId: "c-fengjie" },
    { name: "气动蝶阀", spec: "DN150", material: "304", qty: 8, unit: "套", brands: "常州锋杰/上海良工", techNote: "对夹式；配限位回讯器。", st: "n", contractId: "c-fengjie" },
    { name: "吨袋包装秤", spec: "LCS-1000", material: "304", qty: 2, unit: "台", brands: "科磊/三维", techNote: "称量 1000kg±0.2%；夹袋气动；配除尘吸口。", st: "n", contractId: "c-draft-1" },
    { name: "缝包机", spec: "GK35-2C", material: "—", qty: 4, unit: "台", brands: "纽朗", techNote: "悬挂式；配输送托架。", st: "a" },
    { name: "脉冲除尘器（包装位）", spec: "MC-24", material: "碳钢喷塑", qty: 2, unit: "台", brands: "瑞拓", techNote: "过滤面积 18m²；就地控制箱。", st: "n", contractId: "c-draft-2" },
    { name: "皮带输送机", spec: "B500×10m", material: "碳钢+PVC带", qty: 2, unit: "条", techNote: "带速 0.8m/s；配跑偏与急停开关。", st: "n", contractId: "c-draft-1" },
    { name: "电子皮带秤", spec: "ICS-14", material: "—", qty: 2, unit: "台", techNote: "精度 ±0.5%；累计与瞬时流量输出 4–20mA。", st: "n", contractId: "c-draft-1" },
    { name: "托盘缠绕机", spec: "T1650F", material: "—", qty: 2, unit: "台", techNote: "转盘式；预拉伸膜架。", st: "a" },
    { name: "直线振动给料机", spec: "GZV-5", material: "304", qty: 2, unit: "台", brands: "新乡振英", techNote: "槽体 304；振幅可调。", st: "n", contractId: "c-zhenying" },
    { name: "金属检测复检线", spec: "JZ-300", material: "304", qty: 1, unit: "套", techNote: "含输送带、检测机与剔除装置；检测精度 Fe φ0.3mm。", st: "n", contractId: "c-draft-1" },
  ]),
};

const sheet6: Sheet = {
  id: "s6",
  name: "提升机",
  rows: buildRows("s6", [
    {
      name: "斗式提升机",
      spec: "NE30-18m",
      material: "碳钢+304料斗",
      qty: 1,
      unit: "台",
      brands: "新乡振英",
      techNote: "输送量 30t/h，提升高度 18m；板链式；料斗 304；头轮配逆止器；机壳配检修门与观察窗；尾部张紧装置。",
      st: "n",
      contractId: "c-zhenying",
    },
  ]),
};

const sheet7: Sheet = {
  id: "s7",
  name: "电气资料及要求",
  infoOnly: true,
  infoText: `1. 全线电气元件品牌要求：低压断路器、接触器采用施耐德/ABB；变频器采用汇川/西门子；PLC 采用西门子 S7-1200 系列及以上；触摸屏采用西门子/威纶通；急停按钮、指示灯采用施耐德。
2. 所有电机须满足 GB18613-2020 一级能效；30KW 及以上电机配软启动或变频启动；高压电机（10KV）随货提供出厂试验报告。
3. 现场仪表统一 4–20mA 信号，防护等级不低于 IP65；粉尘环境仪表接液部位 304 及以上。
4. 供货方须提供：电气原理图、端子接线图（CAD 与 PDF）、元件清单（含品牌型号）、PLC 源程序与触摸屏工程文件、调试记录。
5. 电缆桥架热镀锌；动力电缆 YJV，控制电缆 KVVRP 屏蔽；穿越粉尘区域的电缆槽盒须封堵。
6. 控制柜留 20% 备用回路；柜内照明与温控风扇标配；柜体防护 IP54。
7. 全部电气资料随设备交付，纸质一式三份、电子版一份；缺资料视为未完成交付。`,
  rows: [],
};

export const checklist20260510: Checklist = {
  id: "cl-20260510-1",
  projectId: "p-20260510",
  batchNo: 1,
  title: "20260510 采购清单 · 第一批",
  fileName: "20260510采购清单(5.30).xls",
  version: "5.30（v2）",
  status: "已批准",
  signoff: { maker: "肖济忠", makerAt: "2026-05-23", reviewAt: "2026-05-28", approveAt: "2026-05-30" },
  globalNote:
    "全局表面处理要求：外表面喷砂处理，内表面喷涂 ETFE 0.3mm；设备与物料接触部位禁用 Cu、Zn 材质，合金中 Zn、Cu 含量 <1%，物料接触点全部为 S30408 不锈钢件或非金属件；不锈钢件与物料接触面抛光 Ra≤0.8，焊缝连续满焊并酸洗钝化处理；碳钢结构件外表面喷砂除锈达 Sa2.5 级后喷塑或喷涂环氧底漆两道、聚氨酯面漆两道；所有紧固件采用 304 不锈钢；橡胶、塑料等非金属接料件须为食品级或提供无铜锌迁移证明；设备铭牌采用 304 蚀刻铭牌。以上要求适用于本清单全部子系统，与单项技术要求冲突时从严执行。",
  sheets: [sheet1, sheet2, sheet3, sheet4, sheet5, sheet6, sheet7],
};
