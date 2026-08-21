# LNPE 采购管理系统 Demo · 一次性构建实施计划

> 本文档是给 Claude Code 的完整构建规格：**一次性（one-shot）从零构建整个 demo，不分阶段验收**，第 7 节仅为文件构建顺序。所有"AI"均为模拟演示（假加载动画 + 预置 fixture 结果），**不接任何真实 LLM——没有 API key、没有 @anthropic-ai/sdk、没有环境变量、没有网络调用**。目标：`npm install && npm run dev` 即可运行。

**工作目录（即 Next.js 项目根）**：`D:\dev\cyano projects\lnpe-procurement`
目录内已有 `design/`、`空压机.xlsx`、`20260510采购清单(5.30).xls`、`送货单.jpg` 等素材文件，**Next.js 工程直接建在此根目录**（手写配置文件，不用 `create-next-app`，避免其在非空目录下的交互式确认在 one-shot 中翻车）。已有素材保持原位不动。

---

## 1. 技术选型定论

| 项 | 选定方案 | 理由 |
|---|---|---|
| 框架 | **Next.js 15（App Router）+ React 19 + TypeScript**，package.json 写 `"next": "^15"` | 15.x 是经过大量实战的稳定线，App Router API（async params、`useParams()`）行为确定；不追 16 的不确定性 |
| 样式 | **Tailwind CSS v4**（`@tailwindcss/postcss`），CSS-first：`globals.css` 中 `@import "tailwindcss"` + `@theme` 定义全部 tokens | 零 config 文件；tokens 直接生成 `bg-primary`、`text-sub` 等工具类 |
| 数据层 | **TS fixture 模块作种子 + zustand v5 单一全局 store + `persist` 中间件（localStorage）**。`skipHydration: true`，在顶层 StoreHydrator 的 `useEffect` 中手动 `rehydrate()` | 这是"零配置启动 + 无 hydration 风险"的最优组合：SSR 与首次客户端渲染都用确定的种子数据，挂载后才回放 localStorage，天然无 mismatch；无数据库、无迁移、无 API 路由。**不采用** server 内存 store（dev 热重载会丢状态、且移动端/PC 双端同 store 更直观）、不采用纯 Context（跨页动作多，zustand 更省样板） |
| 图标 | **lucide-react** | 设计稿全部图标就是 lucide 线稿风格（1.8 stroke），逐个匹配即可 |
| 字体 | **不引入 next/font / 不加载外部字体**，直接系统栈 `"Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif` | 消除构建期网络依赖 |
| 日期/金额 | 自写 `lib/date.ts`、`lib/money.ts`（约 60 行），日期一律 `'YYYY-MM-DD'` 字符串 + UTC 天级运算 | 免 dayjs 依赖；避免时区/本地化 hydration 差异 |
| xlsx | **不生成、不解析**。"下载 xlsx"= 下载 `public/samples/` 下预置的真实样本文件（ASCII 文件名）；上传控件接受任意文件、内容一律不读 | demo 硬性约束 |
| 依赖清单（全部） | next, react, react-dom, zustand, lucide-react, typescript, @types/react, @types/react-dom, @types/node, tailwindcss, @tailwindcss/postcss | 共 11 个，`npm install && npm run dev` 即跑 |

**全局常量**：`TODAY = '2026-08-20'`（写死在 `lib/date.ts`），所有"逾期 82 天 / 剩 21 天 / 3 天后到期"均由 TODAY 推导，与设计稿数字逐一吻合（已验算：开山 05-30→82 天、锋杰 08-15→5 天、章鼓 09-10→21 天、开山二 09-30→41 天、M3 08-23→3 天、违约金 7,392,000×82×0.001=606,144）。

**派生 vs 写死的统一原则**（写进 store 注释）：凡能由种子数据推导的（倒计时、违约金、付款计划三行、清单各 Tab 计数、送货单"x 类 y 件"、里程碑金额）一律**派生**；仅工作台 4 张 KPI 卡取自 `fixtures/kpis.ts` 常量（如"执行中合同 12 份 · ¥24,683,000"是全量口径，demo 只建模 9 份合同，强行推导必然对不上设计稿）。若派生结果与设计稿个别文案有 ±1 的出入，以数据派生为准。

---

## 2. 项目目录结构（完整文件树）

```
D:\dev\cyano projects\lnpe-procurement\
├─ package.json / tsconfig.json / next.config.ts / postcss.config.mjs / next-env.d.ts
├─ public/
│  ├─ lnpe-mark.png            ← 复制自 design/lnpe-mark.png
│  ├─ lnpe-logo.png            ← 复制自 design/lnpe-logo.png
│  └─ samples/
│     ├─ contract-sample.xlsx  ← 复制自 空压机.xlsx（改 ASCII 名）
│     ├─ checklist-sample.xls  ← 复制自 20260510采购清单(5.30).xls
│     └─ delivery-note.jpg     ← 复制自 送货单.jpg（移动端"已拍摄送货单"缩略图与识别弹窗预览用真图）
└─ src/
   ├─ app/
   │  ├─ layout.tsx            ← 根布局：<html lang="zh-CN">、字体栈、StoreHydrator + ToastHost
   │  ├─ globals.css           ← @import "tailwindcss" + @theme tokens（见附录 A）
   │  ├─ (pc)/
   │  │  ├─ layout.tsx         ← PC 壳：Sidebar + 内容区（bg-page）
   │  │  ├─ page.tsx           ← / 工作台
   │  │  ├─ projects/page.tsx  ├─ projects/[id]/page.tsx
   │  │  ├─ checklists/page.tsx├─ checklists/[id]/page.tsx
   │  │  ├─ contracts/page.tsx ├─ contracts/[id]/page.tsx
   │  │  ├─ inventory/page.tsx / finance/page.tsx / receipts/page.tsx
   │  │  │  / suppliers/page.tsx / notifications/page.tsx   ← 5 个占位页，共用 PlaceholderPage
   │  ├─ m/
   │  │  ├─ layout.tsx         ← 移动壳：max-w-[390px] 居中列、底部 TabBar、独立于 PC 壳
   │  │  ├─ page.tsx           ← 收货任务列表
   │  │  └─ receiving/[id]/page.tsx  ├─ receiving/[id]/submit/page.tsx
   ├─ lib/
   │  ├─ types.ts              ← 全部实体类型
   │  ├─ date.ts               ← TODAY、daysUntil/overdueDays、addMonths、fmtDate
   │  ├─ money.ts              ← fmtMoney（千分位+¥）、exclTax = Math.floor(incl/1.13)
   │  └─ rules.ts              ← 业务规则纯函数（见 §3.3）
   ├─ fixtures/
   │  ├─ suppliers.ts / projects.ts / checklist-20260510.ts
   │  ├─ contracts.ts / delivery-notes.ts / todos.ts / activities.ts / kpis.ts
   │  └─ ai/
   │     ├─ order-parse.ts     ← 开山合同解析结果
   │     ├─ checklist-parse.ts ← 清单多 sheet 解析结果
   │     ├─ contract-template.ts ← AI 合同模板条款文本
   │     ├─ finalize-diff.ts   ← diff 生成器（对任意合同参数化）
   │     ├─ invoice-samples.ts ← 发票样例 A(通过)/B(抬头错拦截)，金额参数化
   │     └─ delivery-scan.ts   ← 06-09 送货单 7 行识别结果
   ├─ store/
   │  ├─ useAppStore.ts        ← zustand + persist（name 'lnpe-demo-v1'）：全部实体 + 全部 actions + toast slice
   │  └─ StoreHydrator.tsx     ← 'use client'，useEffect 中 persist.rehydrate()
   └─ components/
      ├─ ui/  StatusPill.tsx · SevenStepProgress.tsx · MilestoneBar.tsx · CollapsibleText.tsx
      │       · KpiCard.tsx · TabBar.tsx · CountdownChip.tsx · Money.tsx · Avatar.tsx
      │       · EmptyState.tsx · Toast.tsx · Btn.tsx（primary/secondary/danger/ghost 四态）
      ├─ shell/ Sidebar.tsx · Topbar.tsx（面包屑+右侧动作插槽）· PlaceholderPage.tsx
      ├─ ai/   AiSimDialog.tsx（统一模拟 AI 弹窗，见 §4）· AiBadge.tsx
      ├─ pc/   TodoList.tsx · PaymentPlanPanel.tsx · ProjectWallRow.tsx · ContractCard.tsx
      │       · ChecklistTable.tsx · SelectionFooter.tsx · MilestoneTable.tsx
      │       · ContractLinesTable.tsx（含草稿态单价可编辑）· VersionList.tsx · ReceivingRecord.tsx
      └─ mobile/ MTaskCard.tsx · MReceiveLineCard.tsx · MPhotoRow.tsx · MSubmitSummary.tsx
```

---

## 3. 数据模型与 fixture 内容清单

### 3.1 类型（`lib/types.ts`，字段级定义）

- `Project { id; code; name; orderedAt; deliveryDeadline; owner; currentStep: 1..7; stepNote: string; keyStat: string; tags: string[] }`（七步：订单接收→采购清单→库存核对→合同生成→付款跟进→合同执行→收货）
- `Supplier { id; name; short; contactName; phone; email?; address?; bank?; account? }`
- `Checklist { id; projectId; batchNo; title; fileName; version; status:'制表中'|'待审核'|'已批准'; signoff:{ maker,makerAt; reviewAt?; approveAt? }; globalNote: string(长文本); sheets: Sheet[] }`
- `Sheet { id; name; infoOnly?: boolean; infoText?; rows: ChecklistRow[] }`（区段字段 `section:'标准件'|'自制件'` 放在行上）
- `ChecklistRow { id; seq; section; name; spec; material; qty: number|'若干'; unit; brands?: string; techNote: string; hasDrawing?: boolean; alloc:{ allocated:number; need:number; status:'allocated'|'need'|'partial'|'pending' }; contractId?: string }`
- `Contract { id; no; projectId; supplierId; summary; status:'ai_draft'|'reviewing'|'finalized'|'signed'|'executing'|'arrived'|'warranty'|'closed'; signedAt?; deliveryDate?; goodsArrivedAt?; amountInclTax:number|null(草稿为 null，由行价求和); taxRate:0.13; lines: ContractLine[]; milestones: Milestone[]; versions: Version[]; attachments: string[]; expediteLog?: { at; note }[]; sellerContactName/Phone }`
- `ContractLine { id; name; spec; unit; qty; unitPrice: number|null; note }`（金额永远 `qty×unitPrice` 派生，不落库）
- `Milestone { key:'M1'|'M2'|'M3'|'M4'; ratio:0.1|0.5|0.3|0.1; label; condition; status:'paid'|'due'|'pending'|'not_started'; paidAt?; dueAt?; invoice?: Invoice }`（金额派生 = 合同含税总额×ratio）
- `Invoice { no; ratioLabel; amount; issuedAt?; receivedAt? }`
- `DeliveryNote { id; date; fromName; projectIds[]; contractIds[]; receiverName/Phone/Address; status:'pending'|'in_progress'|'done'; headerPhoto: boolean; lines: DeliveryLine[] }`
- `DeliveryLine { seq; name; spec; qty; unit; packaging:'布'; projectCode; contractId; state:'unconfirmed'|'confirmed'|'exception'; confirmedAt?; photoCount:number; exception?:{ type:'数量不符'|'破损'; actualQty?:number; note } }`
- `Todo { id; kind:'review'|'ai_draft'|'payment_due'|'expedite'|'receive_exception'; pillText; title; sub; actionLabel; href; done?:boolean }`
- `Activity { id; projectId; text; at; actor; tone:'danger'|'success'|'neutral' }`

### 3.2 种子记录（照搬设计稿，逐条列出）

**供应商（7）**：浙江开山离心机械有限公司（唐毅 13677626727 / tangyi@kaitec.com.cn）；常州锋杰机械有限公司；山东章丘鼓风机股份有限公司；新乡市振英机械设备有限公司；成都瑞拓除尘设备有限公司（AI 草稿 2 用）；德阳嘉信机械加工有限公司（260209 外协）；四川宏泰钣金制造有限公司（251230 外协）。买方常量：绵阳流能粉体设备有限公司 · 经办 赵小燕 13689684645 Purchasing@lnpe.com.cn。收货员 敬宏 13320903009 · 四川省德阳市金山工业园区光明路与青红路交汇处。

**项目（4）**：

| id | code | 名称 | step | stepNote | keyStat | 负责人 |
|---|---|---|---|---|---|---|
| p-20260510 | 20260510 | 德阳锂电正极材料一期 | 4（当前） | 合同生成 54/62（由清单行派生） | 需采购 62 · 已入合同 54 | 赵小燕 |
| p-260227 | 260227 | 鄂尔多斯空压机系统 | 6（红色当前，催发货） | 催发货 · 逾期 82 天（派生） | 已付 60% · ¥4,435,200 | 赵小燕 |
| p-260209 | 260209 | 德阳金山分级机改造 | 7（当前） | 收货中 3/7 项（派生自 d-0609） | 7 类 63 件 · 异常 1 项 | 敬宏 |
| p-251230 | 251230 | 乐山协鑫二期 | 7（当前） | 收货中 30/36 件（静态） | 质保金 09-15 到期 1 笔 | 敬宏 |

p-20260510 附加信息：下单 2026-05-23、要求交货 2026-08-15、执行中 + 交货逾期 5 天标签；统计卡：清单 1 批 71 项 / 已分配 9 / 需采购 62 / 合同 6 份已签 3 / 已签总额 ¥3,669,000 / 累计已付 ¥974,400 (26.6%)——后四项由合同数据派生（1,215,000+864,000+1,590,000=3,669,000；729,000+86,400+159,000=974,400，已验算吻合）。

**采购清单（1 份，cl-20260510-1）**：标题"20260510 采购清单 · 第一批"，文件名 20260510采购清单(5.30).xls，版本 5.30（v2），已批准；签核 制表 肖济忠 05-23 → 审核 05-28 → 批准 05-30；globalNote = 设计稿黄条全文（"外表面喷砂处理，内表面喷涂 ETFE 0.3mm；设备与物料接触部位禁用 Cu、Zn……S30408……"，写足 200+ 字）。
7 个 sheet 及行数（Tab 徽标即行数）：一次喷雾到研磨 4 · 辊道窑装钵 6 · 二粉(1) 19 · 二粉(2) 30 · 混料包装(1) 11 · 提升机 1 · 电气资料及要求（infoOnly，无行，仅长文本说明）。**共 71 行全部写入 fixture**（保证所有 Tab 可点、计数全对）。状态分布必须精确满足总量恒等式 `8 全分配 + 61 全需采购 + 1 部分分配 + 1 待核对 = 71`，使派生结果 = 已分配 9 项 / 需采购 62 项 / 已入合同 54 项：

| sheet | 行数 | 全分配 | 全需采购 | 部分 | 待核对 | 已入合同 |
|---|---|---|---|---|---|---|
| 一次喷雾到研磨 | 4 | 0 | 3 | 1 | 0 | 3 |
| 辊道窑装钵 | 6 | 1 | 5 | 0 | 0 | 5 |
| 二粉(1) | 19 | 2 | 17 | 0 | 0 | 15 |
| 二粉(2) | 30 | 3 | 26 | 0 | 1 | 22 |
| 混料包装(1) | 11 | 2 | 9 | 0 | 0 | 8 |
| 提升机 | 1 | 0 | 1 | 0 | 0 | 1 |

一次喷雾到研磨 4 行**逐字取自设计稿**：①罗茨风机 FSR-150V 铸铁 2 套 品牌章鼓/陕鼓（长技术条款）→需采购 2 · 已入合同 c-zhanggu；②高压逆流罗茨风机 FSR-150V 2 套 →需采购 2 · **未生成**（这是 AI 生成合同演示的目标行）；③星型卸料阀 DN250(12L/r) 304+WC 3 套 品牌常州锋杰（6 条技术要求全文，设计稿展开态原文）→c-fengjie；④星型卸料阀 DN200(6L/r) 304 6 套 →已分配 2 + 需采购 4（部分）→c-fengjie。
其余 67 行由构建者按粉体行业写实填充（缓存料仓 LNLC-1300-2.5m³ 304+ETFE 2 件"详见图纸" hasDrawing、（子母扣）陶瓷块 80\*30\*10 1.3 t"95陶瓷含5%余量"设为二粉(2) 的待核对行、数量"若干"至少 1 行、气动蝶阀/脉冲除尘器/超声波振动筛/斗式提升机/称重模块等），备注长短搭配、含品牌候选。

**合同（9 份，fixtures/contracts.ts）**：

| id | 合同号 | 项目 | 供方 | 含税总额 | 状态 | 交货期 | 里程碑要点 |
|---|---|---|---|---|---|---|---|
| c-kaishan-1 | LNPE-20260312030-SJ | 260227 | 开山 | 7,392,000（不含税 6,541,592） | 执行中·逾期82天 | 05-30 | M1 已付 03-13 + 发票 NO.04482913(739,200, 03-15 收)；M2 已付 05-28 + NO.04517206(3,696,000, 05-31 收)；M3 待触发（无 dueAt）；M4 未开始。版本 v1 AI 初稿 03-10 / v2 人工修订 03-10 / v3 定稿盖章 03-11；附件 技术协议.pdf、两张发票 pdf；催办记录 08-18 短信 唐毅 |
| c-fengjie | LNPE-20260601008-SJ | 20260510 | 锋杰 | 1,215,000 | 执行中·逾期5天 | 08-15 | M1 已付 06-06(121,500)；M2 已付 06-28(607,500)；M3/M4 未启 |
| c-zhanggu | LNPE-20260605012-SJ | 20260510 | 章鼓 | 864,000 | 执行中(生产中) | 09-10 | M1 已付 08-12(86,400)+发票 NO.05233108 08-10 收；M2 due 09-02(432,000)；M3/M4 未启 |
| c-kaishan-2 | LNPE-20260612007-SJ | 20260510 | 开山 | 1,590,000 | 执行中(生产中) | 09-30 | M1 已付(159,000)，其余未启 |
| c-zhenying | LNPE-20260610003-SJ | 20260510 | 振英 | 596,000 | 已定稿·待签订 | — | 全未启 |
| c-draft-1 | D-001 | 20260510 | 锋杰 | null(单价空) | AI草稿 08-19 | — | 对应待办②"星型卸料阀等 6 项" |
| c-draft-2 | D-002 | 20260510 | 瑞拓 | null | AI草稿 | — | 布袋除尘器等 3 项 |
| c-jiaxin | LNPE-XY20260307-05 | 260209 | 嘉信 | 510,000 | 执行中(部分到货) | 06-05 | M1/M2 已付；**M3 due 2026-08-23(153,000) 临期 3 天**（发票识别演示目标行）；M4 未开始（无 dueAt，收货提交后启动倒计时） |
| c-hongtai | LNPE-XY2C260206-07/08 | 251230 | 宏泰 | 4,219,000 | 执行中(部分到货) | — | M1–M3 已付；M4 due 09-15(421,900) |

产品行给足具体数（已验算合计与台套数）：c-kaishan-1 三行照抄设计稿（530,000×12 / 80,000×12 / 6,000×12，备注长文本"260227项目用；流量≥205m³/min，P=0.55MPa，功率1000kW，10KV…"）；c-fengjie 6 行 66 台套：星型卸料阀 DN250×3@28,000、DN200×4@21,500、DN300×6@32,000、气动插板阀 DN300×20@9,800、气动蝶阀 DN150×24@6,750、双层重锤翻板阀 DN300×9@55,000（合计恰 1,215,000）；c-zhanggu 3 行 8 套：FSR-150V×3@86,000、FSR-200V×3@166,000、配套消音器×2@54,000（=864,000）；c-kaishan-2 离心式空压机×3@530,000；c-zhenying 超声波振动筛 ZYC-1500×4@98,000 + 直线振动给料机×4@51,000（=596,000）；两份草稿行 unitPrice 全 null。

**送货单（3 张，fixtures/delivery-notes.ts）**：
- **d-0609**（核心）：2026-06-09，项目 260209/251230，合同 c-jiaxin + c-hongtai，收货人敬宏，状态 **in_progress**、headerPhoto=true（缩略图用 `/samples/delivery-note.jpg`）。7 行（规格照送货单原件）：①360分级机收料仓 LNC-3601-07-04 ×1件 →c-jiaxin **已确认 08:32**（2 张照片）；②配套法兰 LNC-3601-05 ×4件 →c-jiaxin **已确认 08:41**；③360分级机筒体 LNC-3601-06-01 ×4件 →c-jiaxin 待确认（当前高亮行）；④260分级机收料仓 LNC2601-14-01 ×5件 →c-jiaxin 待确认；⑤配套法兰（圆）LNC-3601-03 应收 40 片 →c-hongtai **异常：数量不符 实收 36/40，备注"缺 4 片，已联系司机核对，照片已留存"，3 张照片**；⑥360分级机排料斗 LNC3606-14-01 ×3件 →c-hongtai 待确认；⑦560分级机排料斗 LNC-560-1-08-1-C ×6件 →c-hongtai 待确认。合计 63 件 ✓（提交页"正常 6 项共 23 件"= 63−40 ✓）。
- **d-0820**：锋杰 · 今日到货 · pending：DN250×3 / DN200×4 / 气动蝶阀 DN150×5（3 类 12 件 ✓）。
- **d-0821**：章鼓 · 明日预计 · pending：FSR-150V×3 / FSR-200V×3 / 消音器×2（8 件）。

**待办（5 条，照抄工作台设计稿）**：①清单审核 二粉(2)→/checklists/cl-20260510-1；②AI 初稿 锋杰→/contracts/D-001；③付款临期 -05 M3 ¥153,000 08-23→/contracts/c-jiaxin；④催发货 开山→/contracts/c-kaishan-1；⑤收货异常 06-09 配套法兰（圆）36/40→/contracts/c-hongtai。

**项目动态（7 条）**：照抄 Project.dc 时间线（08-20 催发货提醒[红] / 08-19 二粉(2)提交审核 / 08-12 章鼓预付 ¥86,400 / 08-10 发票 NO.05233108 / 06-28 锋杰发货款 ¥607,500 / 05-30 清单批准 / 05-23 清单创建）。

**KPI 常量（kpis.ts）**：执行中合同 12 份 · ¥24,683,000；近30天应付 ¥1,006,900 · 3 笔 · 临期 1；催发货 2 份 · 最长 82 天；待收货 2 张 · 20 件 · 今日 1 张。（付款计划面板的 3 行不是常量，由合同派生：08-23/153,000、09-02/432,000、09-15/421,900，和 = 1,006,900 与 KPI 自洽。）

### 3.3 业务规则纯函数（`lib/rules.ts`）

`milestoneAmount(total, ratio)`（总额均可被整除，直接乘）；`exclTax = Math.floor(incl/1.13)`（floor 才得 6,541,592）；`overdueDays / daysUntil`（基于 TODAY）；`penalty(total, days) = Math.round(total*0.001*days)`；`dueTone(dueAt)`：逾期→danger、≤7 天→warning、否则 neutral；`deriveArrivalDeadlines(arrivedAt)` → M3 `dueAt ??= +12月`、M4 `dueAt ??= +24月`（**只在为空时填充**，c-jiaxin 的 08-23 不被覆盖）；合同状态机顺序数组 `['ai_draft','reviewing','finalized','signed','executing','arrived','warranty','closed']` + 中文标签映射（AI草稿/待校对/已定稿/已签订/执行中/已到货/质保期/已完结）+ `nextAction(status)` 给详情页主按钮用。

### 3.4 store actions（useAppStore）

`markAllocation(rowIds, allocatedQty)`、`generateDraftContracts(rowIds)`（按品牌→供应商映射分组，每供应商一份，行价 null，id 自增 D-003…，回写行 contractId）、`updateLinePrice`、`advanceContractStatus`、`applyFinalizeDiff(contractId)`（追加版本 v(n+1) 人工修订·上传回读）、`registerInvoice(contractId, mKey, invoice)`、`markMilestonePaid`、`expedite(contractId)`（追加催办记录+项目动态+toast）、`upsertOrderParse()`、`upsertChecklistParse()`（幂等 upsert，见 §4）、`confirmDeliveryLine / markLineException / addLinePhoto`、`submitReceiving(noteId)`（见 §6 移动端）、`resetDemo()`（清 localStorage 后 location.reload，入口放侧边栏底部小字"重置演示数据"——现场演示刚需）、toast slice（`pushToast`）。

---

## 4. 模拟 AI 统一交互模式（AiSimDialog）

一个通用弹窗组件走完全部 6 个流程，三段式状态机 `upload → processing → result`：

1. **upload**：虚线拖放区（`<input type="file">` 接受任意文件，不读内容）+ 可选**样例芯片**（如发票流程的"样例A 正确发票 / 样例B 抬头错误"、送货单流程展示 `/samples/delivery-note.jpg` 缩略图）。选任意真实文件时默认走第一个样例结果。
2. **processing**：AI 紫（#7A5BD0/#F0EBFA）进度条 + 分步清单逐条打勾（每步 400–700ms 的 setTimeout 链，总时长 1.8–2.6s，组件卸载时清理定时器），步骤文案由各流程配置（如"正在读取工作簿… → 识别 7 个子系统 sheet… → 提取 71 行明细… → 校验签核信息…"）。角落固定小字徽章"**模拟演示 · 未调用真实模型**"。
3. **result**：结构化预览（各流程自带 render）+ 底部"重新上传 / 确认入库（主橙）"。确认 → 调用对应 store action → toast → 关闭并按需 `router.push`。

Props：`{ title, steps[], samples?, renderResult(sampleId), confirmLabel, onConfirm(sampleId), disabled?(sampleId) }`。

**6 个流程的配置与确认语义**（关键决策，执行者勿再抉择）：

| # | 入口 | 预览内容（fixtures/ai/*） | 确认动作 |
|---|---|---|---|
| 1 订单合同解析 | /projects "新建项目（上传订单合同）" | 头部字段卡（合同号 LNPE-20260312030-SJ、买卖方、签订 2026-03-12、交货 05-30）+ 3 产品行表 + 双金额（含税 7,392,000 / 不含税 6,541,592）+ "付款条款 → 自动生成 M1–M4 10/50/30/10"里程碑预览条 | **幂等 upsert**：项目 260227 与 c-kaishan-1 已在种子中 → 覆盖写入并跳 /projects/260227，toast"解析入库成功：项目 260227 · 合同 1 份"。可重复演示不产生脏数据 |
| 2 清单解析 | /projects/[id] 与 /checklists/[id] 的"上传新版本" | sheet 列表（7 个子系统 + 各行数）+ 抽样 5 行明细 + 全局表面处理要求折叠块 + 签核（制表 肖济忠） | upsert cl-20260510-1，版本号 +1 显示"5.30（v3）"，跳清单页 |
| 3 AI 合同初稿 | 清单页勾选需采购行 → 底栏"AI 生成采购合同" | 按供应商分组卡片（品牌→供应商映射：章鼓/陕鼓→山东章丘鼓风机、常州锋杰→锋杰…）：每组显示行清单、数量、模板条款摘要（交货/违约金 1‰/日/付款 10-50-30-10）、**单价列显示"待补充"** | 真实逻辑生成草稿合同（AI 只是演出），状态 AI草稿，跳第一份新草稿 /contracts/D-00x 的校对 Tab；单价输入后行金额与合计实时计算 |
| 4 定稿回读 diff | 合同详情"校对与版本"Tab → "上传定稿回读" | **参数化 diff 生成器**（对当前合同自身求 diff，避免写死开山字段用在别的合同上）：首行单价 −2,000 且行金额未同步 → 红色警告"单价已修改但总价未同步（应为 qty×新单价）"；交货期 +16 天；卖方经办电话变更；顶部"变更摘要"3 句话 | 追加版本 v(n+1)"人工修订（上传回读）"，版本列表滚动出现，toast |
| 5 发票识别核验 | 合同详情里程碑行"登记发票"（重点演示 c-jiaxin M3） | 提取字段卡（发票号 NO.0612087x、抬头、税号、金额=**当前里程碑金额（参数化）**、税率 13%、开票日期 TODAY）+ 核验清单：抬头=绵阳流能粉体设备有限公司 ✓ / 税率 13% ✓ / 与里程碑等额 ✓。**样例B**：抬头"绵阳流能科技有限公司"→ 抬头核验 ✗ 红色，确认按钮禁用，横幅"已拦截：发票抬头与购方名称不符" | 样例A 确认 → invoice 挂到里程碑 + toast；"标记已付"为里程碑行上独立小按钮 |
| 6 送货单拍照识别 | /m 底部主按钮"拍送货单开始收货"（同时各待收货卡的"开始收货"走同流程） | 识别出的单头（06-09、项目 260209/251230 芯片、合同 2 份、收货人敬宏）+ **7 行表**（名称/规格/数量/包装/项目/合同） | "生成收货任务"→ **d-0609 已存在则直接打开并保留进度**（toast"已匹配到进行中的收货任务"），跳 /m/receiving/d-0609。此决策同时满足"识别生成 7 行"的演示动线与设计稿"进行中 3/7"的初始态，两者不冲突 |

---

## 5. 共享组件清单（关键规格）

- **StatusPill**：`tone: success|warning|danger|info|ai|neutral|primarySoft` → 浅底深字圆角 999 徽章，颜色对照附录 A（success 底 #E5F5EC 字 #166B3C 等）。所有状态文案经统一映射表。
- **SevenStepProgress**：`current`, `size:'sm'(13px 圆点，项目墙)|'lg'(18px+底部标签，项目详情)`, `currentTone:'primary'|'danger'`（260227 第 6 步红圈）, `note`（右侧/下方文字如"合同生成 54/62"）。完成=橙实心+白勾 SVG，当前=白底粗橙(或红)描边，未来=#E4E2E0。
- **MilestoneBar**：10/50/30/10 四段（gap 3px 圆角 3px），已付段橙、未付灰，下行标签"预付 ✓ / 发货 ✓ / 验收 / 质保"；`height 8|10|12` 三档。
- **MilestoneTable**（合同详情）：每行 = 状态圆点（付讫绿勾/当前橙圈/灰）+ 名称与触发条件 + 金额 + 状态 pill（已付日期/待触发/x 天后到期/逾期）+ 发票信息或期限说明 + 行动作（登记发票/标记已付/上传验收单-仅 toast）。M3/M4 行在 `goodsArrivedAt` 存在或 dueAt 有值时渲染 CountdownChip。
- **CollapsibleText**：单行 ellipsis + "展开"链接 → 展开为设计稿式的内嵌白卡（圆角 10、行高 1.9、含"来源 sheet：xx · 第 n 行"脚注插槽），"收起"。用于技术条款、全局表面处理要求、合同行备注。
- **CountdownChip**：输入 dueAt → "剩 x 天"（≤7 黄）/"逾期 x 天"（红）/日期（灰）。
- **Money**：千分位 + 可选 ¥ 前缀 + `tabular-nums` 类；金额永不手写字符串。
- **ContractCard**（项目详情网格卡）：合同号 + 状态 pill + 金额右上 + 供应商摘要 + MilestoneBar + 底行（已付 x% / 交货倒计时）；草稿/待签用虚线边框。
- **TodoList / PaymentPlanPanel / ProjectWallRow / KpiCard / TabBar / Toast(右上滑入自动消失) / EmptyState / Avatar(姓氏圆牌) / Btn / AiBadge / Sidebar / Topbar / PlaceholderPage**。
- 移动端：**MTaskCard**（含进行中态的进度条+橙描边）、**MReceiveLineCard**（三态：已确认绿/当前橙粗边+大按钮"确认收货/标记异常"/异常红边+红条摘要）、**MPhotoRow**（灰色占位缩略瓦片，"拍照"虚线块=file input，成功后仅 `photoCount+1` 显示占位瓦片——设计稿本身就是灰瓦片，零风险）、**MSubmitSummary**、异常标记底部抽屉（类型单选 数量不符/破损 + 实收数量 + 备注）。

---

## 6. 页面构建规格要点

**PC 壳**：左侧 220px #2C2A2A 侧栏（mark 图 + "流能采购/LNPE PROCUREMENT"、9 个导航项、提醒中心红色徽标 5=未完成待办数、底部赵小燕头像 + "重置演示数据"小链接）；激活态 `rgba(229,105,0,.16)` 底 + #F49B47 字。内容区顶栏 56px 白底（面包屑/页标题 + 页面级动作按钮插槽 + 头像）。

- **/ 工作台**：4 KPI 卡（kpis.ts）→ 双栏：我的待办（5 条，pill+标题+副文+动作按钮，按钮 `router.push(todo.href)`；催发货为红色主按钮）+ 近 30 天付款计划（派生 3 行 + 底部红色警示条：开山逾期违约金 ¥606,144 派生）→ 项目进度墙（4 行 ProjectWallRow：项目号/名称/SevenStepProgress sm/关键数字/负责人）。日期栏写死"2026-08-20 星期四"。
- **/projects**：简单表格（项目号/名称/阶段 mini 进度/负责人/关键数字→行点击进详情）+ 右上"新建项目（上传订单合同）"→ AI 流程 1。
- **/projects/[id]**：头卡（项目名 + 状态标签 + SevenStepProgress lg）→ 6 统计小卡 → 左 2.15 栏：清单批次卡（进度双色条 已分配绿 13% + 需采购橙 76%、按钮"查看清单/继续生成合同"）+ 关联合同 2×N 网格（ContractCard，含 2 份 AI 草稿卡带 AiBadge）+ "上传采购清单"入口（AI 流程 2）；右 1 栏：项目动态时间线。非 20260510 项目复用同布局按各自数据渲染（260227 只有 1 份合同、无清单卡时 EmptyState）。
- **/checklists**：单表列出批次（20260510 第一批），行点进详情。
- **/checklists/[id]**：头卡（标题+已批准 pill+元信息+三节点签核条 制表/审核/批准 绿勾）→ 黄色全局要求条（CollapsibleText）→ sheet TabBar（名称+行数徽标；"电气资料及要求"渲染 infoText 长文本卡）→ 分段标题行（"系统外购标准件" + 计数 pills 派生 / "系统自制件耗材"）→ 行表格（复选框/序号/名称规格材质/数量/品牌及技术要求 CollapsibleText/库存核对 pill(可双 pill 部分态)/合同列(合同号尾段+供应商+状态，点击跳转)）→ 吸底 SelectionFooter：已选 n 项统计 + "标记库存分配"（弹小对话框填分配数量→partial/allocated）+ 橙色"AI 生成采购合同"（流程 3，未选行时禁用）。
- **/contracts**：状态筛选芯片（全部/AI草稿/待校对/已定稿/已签订/执行中/已到货/质保期/已完结）+ 项目筛选下拉；表格列：合同号/项目/供应商/摘要/金额/已付%/状态 pill/交货期 CountdownChip。9 份种子合同全列。
- **/contracts/[id]**：头卡（合同号+状态 pills+卖方·项目·签订·交货元信息+右侧三金额组：含税/不含税、已付、已开票）；顶栏动作"下载 xlsx"（下载 /samples/contract-sample.xlsx）+ 状态推进主按钮（nextAction）。三 Tab：
  ① **跟进**（signed 及之后默认）：左 2 栏 = 付款与发票卡（累计付款/开票双百分比 + MilestoneBar 12px + MilestoneTable）+ 产品明细卡（行表+合计行橙色金额+税率脚注）；右 1 栏 = 执行状态卡（逾期时红头卡：交货期/逾期天数/违约金派生 + 催发货红按钮(expedite action)+记录沟通 + "上次催办 08-18"）或正常态灰卡（交货倒计时）、文档与版本卡（版本列表 VersionList + xlsx/上传新版按钮→流程 4）、收货记录卡（无到货 EmptyState"卖方发货后将自动创建小程序收货任务"；**提交收货后**渲染：送货单日期、逐行确认状态 pill 列表、照片占位墙、异常红条）、经办人卡（买卖双方+拨打）。
  ② **合同信息**：模板条款静态区块（交货与违约金 1‰/日、质保期、第 8 条付款开票即 10/50/30/10 表、签章区双方信息由供应商档案带出）。
  ③ **校对与版本**（ai_draft/reviewing 默认）：可编辑行表（单价 input，行金额与合计实时计算 tabular-nums）+ 模板条款预览 + 版本列表 + "上传定稿回读"（流程 4）+ "提交校对/定稿/标记已签订"推进按钮。
- **5 个占位页**：PlaceholderPage（图标 + "演示版未包含该模块" + 返回工作台）。

**移动端（/m 壳：`mx-auto max-w-[390px] min-h-dvh bg-page` 独立布局，含底部 收货/消息/我的 TabBar，后两个 tab 仅 toast）**：

- **/m**：头部（mark + "收货任务" + 敬字头像）→ 三段分段器（待收货 2/进行中 1/已完成 n，派生计数，点击过滤）→ 任务卡列表（d-0820 今日到货带橙色"开始收货"大按钮、d-0821 明日预计、d-0609 进行中橙描边 + 异常 1 项 pill + 43% 进度条 + "继续收货"）→ **吸底主按钮"拍摄送货单 开始收货"**（相机 icon）→ AI 流程 6。
- **/m/receiving/[id]**：顶部（返回 + 标题 + 3/7 计数 + 进度条，均派生）→ 单头信息卡（项目/合同芯片、收货人地址）→ 绿色"第 1 步 · 已拍摄纸质送货单"条（缩略图=delivery-note.jpg，"重拍"重新打开流程 6）→ 7 张 MReceiveLineCard（首个未确认行自动为"当前"放大态；确认收货→state=confirmed+时间戳；标记异常→底部抽屉）→ 折叠提示条"还有 x 项未确认" → 吸底汇总条（已确认/异常/待确认计数 + "弱网环境已自动暂存"小字 + 暂存(toast) + **提交收货**按钮：全部 7 行处理完才由灰变橙，点击进 submit 页）。
- **/m/receiving/[id]/submit**：汇总卡（正常 n / 异常 n / 照片 n 三格 + 明细两行：绿勾"…等 6 项共 23 件清点无误"、红叹号"配套法兰（圆）数量不符 36/40 + 将通知赵小燕"）→ 现场照片占位墙 → 确认人签字卡（敬宏 + 静态签名 SVG）→ 底部橙色大按钮"提交收货结果"→ `submitReceiving`：note→done；c-jiaxin 与 c-hongtai `status='arrived'`、`goodsArrivedAt=TODAY`、M3/M4 `dueAt ??= +12/+24月`（c-jiaxin M4 得 2028-08-20 倒计时启动、M3 保持 08-23）；p-260209 stepNote→"已收货 · 异常 1 项"；新增项目动态与收货异常待办（若无）；toast"已提交，已同步 PC 端合同跟进"→ 回 /m（任务出现在已完成 tab）。PC 端合同详情"收货记录"卡此后显示回传内容。

---

## 7. 建议的文件构建顺序（仅顺序，不是阶段验收）

1. 根配置 5 件：`package.json`（含 `dev/build/start` 脚本）→ `tsconfig.json` → `next.config.ts` → `postcss.config.mjs` → `src/app/globals.css`（@theme tokens 全量，见附录 A）
2. 资产复制（PowerShell Copy-Item）：design 两个 png → public/；三个业务文件 → public/samples/（ASCII 改名）
3. `lib/types.ts` → `lib/date.ts` → `lib/money.ts` → `lib/rules.ts`
4. fixtures：suppliers → projects → checklist-20260510（71 行，最大单文件）→ contracts → delivery-notes → todos → activities → kpis → ai/ 六个
5. `store/useAppStore.ts` → `store/StoreHydrator.tsx` → `src/app/layout.tsx`
6. components/ui 全量 → components/shell（Sidebar/Topbar/PlaceholderPage）→ components/ai/AiSimDialog → components/pc → components/mobile
7. `(pc)/layout.tsx` → 工作台 → projects 列表/详情 → checklists 列表/详情（含流程 2、3 接线）→ contracts 列表/详情（含流程 4、5 接线）→ projects 页流程 1 接线 → 5 个占位页
8. `m/layout.tsx` → /m（流程 6 接线）→ receiving → submit
9. 收尾：`npm install` → `npm run build` 自检类型与路由 → `npm run dev` 冒烟 8 条路由

---

## 8. One-shot 风险点与规避

1. **Tailwind v4 写法**：无 `tailwind.config.js`；postcss.config.mjs 只含 `{ plugins: { "@tailwindcss/postcss": {} } }`；tokens 一律 `@theme { --color-*: ...; --radius-card: 12px; --font-sans: ... }`；不要用 v3 的 `@tailwind base` 三连或 `theme.extend`。任意值语法 `max-w-[390px]` 可用。
2. **Next 15 API**：客户端页面取动态参数用 `useParams()`（不要在 client 组件解 Promise params）；所有交互页顶部 `'use client'`；不用 Server Actions、不建 API 路由、不用 middleware。
3. **Hydration**：TODAY 写死字符串，渲染路径禁止 `new Date()`/`Date.now()`/`Math.random()`；id 生成用 store 内自增计数；persist 用 `skipHydration:true` + StoreHydrator 的 effect 里 `rehydrate()`（首屏=种子数据，挂载后回放，无 mismatch）；localStorage 只出现在 persist 与 resetDemo。
4. **图片**：一律原生 `<img>`（不用 next/image，避免尺寸/优化器问题）；不加载任何外部字体与 CDN 资源。
5. **中文文件名**：public 下全部 ASCII 改名（Windows dev server + URL 编码双重坑）。
6. **定时器泄漏**：AiSimDialog 的 setTimeout 链统一存 ref、useEffect cleanup 清除；关闭弹窗即中止动画。
7. **金额恒等**：所有展示金额由 `qty×unitPrice` 与 `total×ratio` 派生并用本计划已验算的种子数（不要另造数），保证 KPI/付款计划/合同页/项目卡互相咬合。
8. **不做的事**：不生成 xlsx、不做 canvas 签名板（静态 SVG）、不做真实拍照预览（灰瓦片+计数）、不做路由级鉴权、不写测试、不初始化 git。
9. **构建自检**：完成后必须跑一次 `npm run build`（比 dev 更严格地暴露类型与 `'use client'` 边界错误），再 dev 冒烟 8 条路由。

---

## 附录 A · 设计 tokens（`src/app/globals.css` 的 @theme 全量）

```css
@import "tailwindcss";

@theme {
  --color-primary: #E56900;        /* 品牌橙（logo 实测），主操作 */
  --color-primary-hover: #C75B00;
  --color-primary-soft: #FDF1E5;
  --color-ink: #2C2A2A;            /* 正文 / 侧边栏底 */
  --color-ink-2: #595757;          /* 品牌炭灰 */
  --color-sub: #8A8785;            /* 辅助文字 */
  --color-faint: #ABA8A6;
  --color-page: #F6F5F4;           /* 页面底 */
  --color-card: #FFFFFF;
  --color-line: #E4E2E0;           /* 边框 */
  --color-line-soft: #EFEEEC;
  --color-sidebar-active: #F49B47; /* 侧栏激活字色 */
  --color-success: #1B8A4C;  --color-success-bg: #E5F5EC;  --color-success-deep: #166B3C;
  --color-warning: #B07C0C;  --color-warning-bg: #FBF3DC;  --color-warning-deep: #8F650A;
  --color-danger:  #D23F31;  --color-danger-bg:  #FBEAE8;  --color-danger-deep:  #B03328;
  --color-info:    #0E7C86;  --color-info-bg:    #E1F4F5;  --color-info-deep:    #0B6570;
  --color-ai:      #7A5BD0;  --color-ai-bg:      #F0EBFA;  --color-ai-deep:      #6447B8;
  --font-sans: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  --radius-card: 12px;
  --radius-ctl: 8px;
}
```

pill 用色规则：浅底（`*-bg`）+ 深字（`*-deep`）；正文按钮/进度等用基准色。金额一律千分位 + `tabular-nums`；日期 `2026-05-30` 格式；界面全部简体中文。

## 附录 B · 参考材料

- `design/*.dc.html`（8 块画板）—— 像素级 UI 权威参考：Tokens / Main(工作台) / Project(项目详情) / Checklist(清单详情) / Contract(合同详情) / MobileTasks / MobileReceiving / MobileSubmit
- `claude-design-prompt.md` —— 业务规则与真实单据字段说明
- `design/Contract.dc.html` —— 信息最重页面的版式与全部里程碑/版本/催发货数据
- `design/Main.dc.html` —— 工作台 KPI/待办/付款计划/项目墙的种子数字来源
- `design/Checklist.dc.html` —— 清单行结构、库存核对状态与 AI 生成合同入口规格
- `design/MobileReceiving.dc.html` —— 移动端收货 7 行数据与三态卡片交互规格
