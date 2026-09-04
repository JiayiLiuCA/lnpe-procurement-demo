"use client";

// 项目详情：货物轨 7 步（订单接收 → 采购清单 → 订货安排 → 子合同 → 交货跟进 → 现场收货 → 订单关闭）+ 付款开票轨
// 点击步骤切换内容，默认停在当前步（由 lib/steps 派生）；支持 ?step=n 直达，旧 ?phase=n 自动映射。
// 头卡底部一条「本步工作条」：本步任务 + 承接 / 产出 + 本步关键数字 + 主按钮，随选中步切换；步骤 2/3/4 复用同一张清单表，只换动作。
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  Check,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  List,
  Smartphone,
  Truck,
  UploadCloud,
} from "lucide-react";
import { Topbar, Crumb, CrumbLink } from "@/components/shell/Topbar";
import { Btn } from "@/components/ui/Btn";
import { StatusPill } from "@/components/ui/StatusPill";
import { StepStepper } from "@/components/ui/StepProgress";
import { Money } from "@/components/ui/Money";
import { EmptyState } from "@/components/ui/EmptyState";
import { XlsxPreviewDialog, type XlsxCell } from "@/components/ui/XlsxPreviewDialog";
import { AiBadge } from "@/components/ai/AiBadge";
import { ContractCard } from "@/components/pc/ContractCard";
import { ChecklistWorkspace } from "@/components/pc/ChecklistWorkspace";
import { StepIntro, type StepFact } from "@/components/pc/StepIntro";
import { PaymentLanePanel, MilestonePill } from "@/components/pc/PaymentLanePanel";
import { ChecklistParseDialog } from "@/components/ai/ChecklistParseDialog";
import { UploadContractDialog } from "@/components/ai/UploadContractDialog";
import { useAppStore } from "@/store/useAppStore";
import { checklistStats, overdueContracts, paymentPlan } from "@/lib/derive";
import { STEP_LABELS, contractStage, isSignedContract, paymentLane, projectDeliveryNotes, projectProgress, type StepNo } from "@/lib/steps";
import { daysUntil, fmtDate } from "@/lib/date";
import { fmtNum } from "@/lib/money";
import { contractTotal, paidAmount } from "@/lib/rules";
import { supplierById, BUYER } from "@/fixtures/suppliers";
import { projects as seedProjects } from "@/fixtures/projects";
import type { Contract, DeliveryNote, MilestoneKey, OrderContract } from "@/lib/types";

function orderXlsxRows(oc: OrderContract): XlsxCell[][] {
  const scope = oc.keyTerms?.find((k) => k.label === "交付范围")?.value ?? "成套设备";
  return [
    [{ t: "产 品 购 销 合 同", span: 7, bold: true, center: true }],
    [
      { t: `合同编号：${oc.no}`, span: 4 },
      { t: `签订日期：${oc.signedAt}`, span: 3 },
    ],
    [{ t: `买方（需方）：${oc.customer}`, span: 7 }],
    [{ t: `卖方（供方）：${BUYER.name}`, span: 7 }],
    [
      { t: "序号", head: true, center: true },
      { t: "品名", head: true },
      { t: "规格型号", head: true },
      { t: "数量", head: true, center: true },
      { t: "单位", head: true, center: true },
      { t: "单价（元）", head: true, right: true },
      { t: "金额（元）", head: true, right: true },
    ],
    [
      { t: "1", center: true },
      { t: scope },
      { t: "按双方技术协议" },
      { t: "1", center: true },
      { t: "套", center: true },
      { t: fmtNum(oc.amountInclTax), right: true },
      { t: fmtNum(oc.amountInclTax), right: true },
    ],
    [
      { t: "合计（含税 13%）", span: 5, bold: true },
      { t: "", right: true },
      { t: fmtNum(oc.amountInclTax), right: true, bold: true },
    ],
    [{ t: "付款方式：预付 30% · 设备到场验收合格后 60% · 质保金 10%（质保期满 30 日内付清）", span: 7 }],
    [{ t: `交货期：${oc.deliveryDeadline}；卖方负责运抵买方指定现场并指导安装调试`, span: 7 }],
    [{ t: "验收：72 小时连续负荷试车合格；质保期：验收合格之日起 12 个月", span: 7 }],
    [
      { t: "买方（盖章）：", span: 4 },
      { t: "卖方（盖章）：", span: 3 },
    ],
  ];
}

const sectionCard = "border-line rounded-card border bg-white";

function NoteStatus({ n, processed, total }: { n: DeliveryNote; processed: number; total: number }) {
  if (n.status === "done") return <StatusPill tone="success">已完成</StatusPill>;
  if (n.status === "in_progress")
    return (
      <StatusPill tone="info">
        收货中 {processed}/{total}
      </StatusPill>
    );
  const d = daysUntil(n.date);
  return <StatusPill tone={d < 0 ? "danger" : "neutral"}>{d === 0 ? "今日到货 · 待收货" : d === 1 ? "明日到货" : d > 1 ? `${d} 天后到货` : `已到 ${-d} 天未收`}</StatusPill>;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const project = useAppStore((s) => s.projects.find((p) => p.id === id));
  const allChecklists = useAppStore((s) => s.checklists);
  const allContracts = useAppStore((s) => s.contracts);
  const deliveryNotes = useAppStore((s) => s.deliveryNotes);
  const closeProject = useAppStore((s) => s.closeProject);
  const resolveException = useAppStore((s) => s.resolveException);
  const pushToast = useAppStore((s) => s.pushToast);
  const [viewStep, setViewStep] = useState<StepNo | null>(() => {
    const n = Number(searchParams.get("step"));
    if (n >= 1 && n <= 7) return n as StepNo;
    // 旧链接兼容：四阶段 phase=1..4 → 步骤 1 / 2 / 5 / 7
    const legacy: Record<number, StepNo> = { 1: 1, 2: 2, 3: 5, 4: 7 };
    return legacy[Number(searchParams.get("phase"))] ?? null;
  });
  const [moneyKey, setMoneyKey] = useState<MilestoneKey | null>(null);
  const [batch, setBatch] = useState(0);
  const [uploadClOpen, setUploadClOpen] = useState(false);
  const [uploadCtOpen, setUploadCtOpen] = useState(false);
  const [xlsxOpen, setXlsxOpen] = useState(false);

  if (!project) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Topbar backHref="/projects" crumbs={<Crumb>项目管理</Crumb>} />
        <div className="text-sub p-10 text-center text-sm">未找到该项目</div>
      </div>
    );
  }

  const checklists = allChecklists.filter((c) => c.projectId === project.id);
  const contracts = allContracts.filter((c) => c.projectId === project.id);
  const cl = checklists[Math.min(batch, Math.max(checklists.length - 1, 0))];
  const agg = checklists.reduce(
    (a, c) => {
      const s = checklistStats(c);
      return {
        total: a.total + s.total,
        allocated: a.allocated + s.allocated,
        need: a.need + s.need,
        contracted: a.contracted + s.contracted,
        pending: a.pending + s.pending,
        produce: a.produce + s.produce,
      };
    },
    { total: 0, allocated: 0, need: 0, contracted: 0, pending: 0, produce: 0 },
  );
  const signedList = contracts.filter(isSignedContract);
  const signedTotal = signedList.reduce((s, c) => s + (contractTotal(c) ?? 0), 0);
  const paid = contracts.reduce((s, c) => s + paidAmount(c), 0);
  const progress = projectProgress(project, allChecklists, allContracts, deliveryNotes);
  const step: StepNo = viewStep ?? progress.current ?? 7;
  const stepDone = (n: StepNo) => progress.states[n - 1].mark === "done";
  // 防御性回退：localStorage 里的旧结构项目可能缺 orderContract/keyTerms，逐字段用种子数据补齐
  const seedOc = seedProjects.find((p) => p.id === project.id)?.orderContract;
  const baseOc = project.orderContract ?? seedOc;
  const oc: OrderContract = {
    fileName: baseOc?.fileName ?? `${project.code}订单合同.xlsx`,
    no: baseOc?.no ?? `LN-${project.code}`,
    customer: baseOc?.customer ?? "—",
    signedAt: baseOc?.signedAt ?? project.orderedAt,
    amountInclTax: baseOc?.amountInclTax ?? 0,
    deliveryDeadline: baseOc?.deliveryDeadline ?? project.deliveryDeadline,
    versions: baseOc?.versions ?? [],
    keyTerms: baseOc?.keyTerms ?? seedOc?.keyTerms ?? [],
  };

  // 合同在货物轨上的位置
  const stageOf = (c: Contract) => contractStage(c, deliveryNotes);
  const delivering = contracts.filter((c) => stageOf(c) === "delivering").sort((a, b) => (a.deliveryDate ?? "").localeCompare(b.deliveryDate ?? ""));
  const beyond = contracts.filter((c) => ["receiving", "settling", "closed"].includes(stageOf(c)));
  const overdue = overdueContracts(contracts, deliveryNotes);
  const lane = paymentLane(contracts);
  const m2 = lane.find((n) => n.key === "M2")!;
  const projectPlan = paymentPlan(contracts);

  // 送货单与本项目相关的行
  const pNotes = [...projectDeliveryNotes(project, allContracts, deliveryNotes)].sort((a, b) => b.date.localeCompare(a.date));
  const linesOf = (n: DeliveryNote) => n.lines.filter((l) => l.projectCode === project.code || contracts.some((c) => c.id === l.contractId));
  const excOpen = pNotes.reduce((s, n) => s + linesOf(n).filter((l) => l.state === "exception" && !l.exception?.resolvedAt).length, 0);
  const closedContracts = contracts.filter((c) => c.status === "closed").length;
  const partialArrived = (c: Contract) => deliveryNotes.some((n) => n.contractIds.includes(c.id) && n.status === "in_progress");

  const batchTabs =
    checklists.length > 1 ? (
      <div className="flex items-center gap-2">
        <span className="text-sub text-xs">批次</span>
        {checklists.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setBatch(i)}
            className={`cursor-pointer rounded-full px-3 py-1 text-[12.5px] font-medium ${i === batch ? "bg-ink text-white" : "border-line text-ink-2 border bg-white"}`}
          >
            第 {c.batchNo} 批 · {c.status}
          </button>
        ))}
      </div>
    ) : null;

  const noChecklist = (
    <div className={`${sectionCard} flex py-8`}>
      <EmptyState icon={<List size={30} strokeWidth={1.5} className="text-[#CFCCCA]" />} text="先在「采购清单」步上传并批准清单" />
    </div>
  );

  // 本步工作条：承接 / 本步 / 产出 + 本步关键数字 + 主按钮。数字按步筛选；订货安排 / 子合同两步的数字工作区条带里已有，不重复
  // 与 lib/steps 的第 6 步小字同口径：只算已开始收货（in_progress / done）的送货单行，处理过（确认或异常）算一项
  const startedNotes = pNotes.filter((n) => n.status !== "pending");
  const recvTotal = startedNotes.reduce((s, n) => s + linesOf(n).length, 0);
  const recvDone = startedNotes.reduce((s, n) => s + linesOf(n).filter((l) => l.state !== "unconfirmed").length, 0);
  const approvedCls = checklists.filter((c) => c.status === "已批准").length;
  const paidPct = signedTotal > 0 ? `${((paid / signedTotal) * 100).toFixed(1)}%` : "—";
  const payTerm = oc.keyTerms.find((k) => k.label === "付款节点")?.value;
  const deadlineDays = daysUntil(oc.deliveryDeadline);
  interface Intro {
    from: string;
    task: string;
    to: string;
    facts?: StepFact[];
    action?: ReactNode;
  }
  const intro = ((): Intro => {
    switch (step) {
      case 1:
        return {
          from: "客户订单合同 xlsx",
          task: "建档，核对 AI 抓取的重要条目与付款节点",
          to: "技术部据此编制采购清单",
          facts: [
            { label: "订单金额", value: <Money value={oc.amountInclTax} /> },
            {
              label: "交货截止",
              value: `${oc.deliveryDeadline}${project.closedAt ? "" : deadlineDays < 0 ? ` · 逾期 ${-deadlineDays} 天` : ` · 剩 ${deadlineDays} 天`}`,
              tone: !project.closedAt && deadlineDays < 0 ? "danger" : undefined,
            },
            ...(payTerm ? [{ label: "付款节点", value: payTerm }] : []),
          ],
        };
      case 2:
        return {
          from: "订单合同已入库",
          task: "上传技术部采购清单，AI 解析后人工校对、审核、批准；可分批",
          to: "批准后进入订货安排",
          facts:
            checklists.length === 0
              ? []
              : [
                  { label: "清单", value: `${checklists.length} 批` },
                  { label: "共", value: `${agg.total} 项` },
                  { label: "已批准", value: `${approvedCls}/${checklists.length} 批`, tone: approvedCls === checklists.length ? "success" : undefined },
                ],
          action: batchTabs,
        };
      case 3:
        return {
          from: stepDone(2) ? `清单已批准 · ${agg.total} 项` : "清单尚未批准",
          task: "逐行标记来源：库存分配 / 安排生产 / 需采购",
          to: `需采购项进入子合同（当前 ${agg.need} 项）`,
          action: (
            <>
              {batchTabs}
              <Link href="/inventory">
                <Btn variant="secondary">查看库存</Btn>
              </Link>
            </>
          ),
        };
      case 4:
        return {
          from: `需采购 ${agg.need} 项 · 待出合同 ${Math.max(agg.need - agg.contracted, 0)} 项`,
          task: "按供应商勾选需采购行，AI 生成初稿或上传已签合同；校对、定稿、签订",
          to: "签订后进入交货跟进，预付款节点同时启动",
          action: (
            <>
              {batchTabs}
              {cl && (
                <Btn variant="secondary" onClick={() => setUploadCtOpen(true)}>
                  <UploadCloud size={14} strokeWidth={1.8} />
                  上传合同 xlsx
                </Btn>
              )}
            </>
          ),
        };
      case 5:
        return {
          from: `已签子合同 ${signedList.length} 份`,
          task: "盯交货期，逾期红色提醒；卖方发货前付发货款",
          to: "货到现场后小程序创建收货任务，进入现场收货",
          facts: [
            { label: "在途", value: `${delivering.length} 份` },
            ...(overdue.length > 0 ? [{ label: "逾期", value: `${overdue.length} 份`, tone: "danger" as const }] : []),
            { label: "已签总额", value: <Money value={signedTotal} /> },
            { label: "已付", value: paidPct },
          ],
          action:
            m2.due > 0 ? (
              <Btn variant="secondary" onClick={() => setMoneyKey("M2")}>
                发货款到期 {m2.due} 份
              </Btn>
            ) : undefined,
        };
      case 6:
        return {
          from: `在途 ${delivering.length} 份 · 已到场 ${beyond.length} 份`,
          task: "现场收货员用小程序按送货单逐行打勾、拍照留存；异常在这里处理",
          to: "全部送货单完成且异常处理完，可关闭订单",
          facts: [
            { label: "送货单", value: `${pNotes.length} 张` },
            { label: "收货", value: `${recvDone}/${recvTotal} 项` },
            { label: "异常", value: `${excOpen} 项`, tone: excOpen > 0 ? "danger" : undefined },
          ],
          action: (
            <>
              <Link href="/receipts">
                <Btn variant="secondary">收货记录</Btn>
              </Link>
              <Link href="/m">
                <Btn variant="secondary">
                  <Smartphone size={14} strokeWidth={1.8} />
                  收货小程序
                </Btn>
              </Link>
            </>
          ),
        };
      case 7:
        return {
          from: project.closedAt ? "订单已关闭" : stepDone(6) ? "现场收货已完成" : `现场收货尚未完成 · 当前在「${STEP_LABELS[(progress.current ?? 7) - 1]}」`,
          task: "核对验收款、质保金，完结合同后关闭订单",
          to: "关闭后信息保留可查，质保金到期仍进提醒中心",
          facts: [
            { label: "子合同", value: `${contracts.length} 份 · 已完结 ${closedContracts}` },
            { label: "已签总额", value: <Money value={signedTotal} /> },
            { label: "已付", value: paidPct },
            { label: "到期未付", value: `${projectPlan.length} 笔`, tone: projectPlan.length > 0 ? "warning" : undefined },
          ],
        };
    }
  })();

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar
        backHref="/projects"
        crumbs={
          <>
            <CrumbLink href="/projects">项目管理</CrumbLink> /{" "}
            <Crumb>
              {project.code} {project.name}
            </Crumb>
          </>
        }
        actions={
          <Link href={`/projects/${project.id}/order`}>
            <Btn variant="secondary">
              <FileText size={14} strokeWidth={1.8} />
              订单合同
            </Btn>
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-3.5 p-6">
        {/* 头卡：标题 + 派生标签 + 可点击步骤条（含付款开票轨）+ 底部本步工作条 */}
        <div className="border-line rounded-card overflow-hidden border bg-white">
          <div className="flex flex-col gap-4 px-5.5 pt-4 pb-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="text-xl font-bold">
                  {project.code} <span className="font-medium">{project.name}</span>
                </div>
                {progress.tags.map((t) => (
                  <StatusPill key={t.text} tone={t.tone}>
                    {t.text}
                  </StatusPill>
                ))}
              </div>
              <div className="text-sub mt-1.5 text-[12.5px]">
                立项 {project.orderedAt} · 截止{" "}
                <span className={!project.closedAt && daysUntil(project.deliveryDeadline) < 0 ? "text-danger-deep font-medium" : ""}>
                  {project.deliveryDeadline}
                </span>{" "}
                · 负责人 {project.owner}
                {project.closedAt && ` · 已于 ${project.closedAt} 关闭`}
              </div>
            </div>
            <StepStepper project={project} viewStep={step} onSelect={setViewStep} moneyKey={moneyKey} onSelectMoney={setMoneyKey} />
          </div>
          <StepIntro from={intro.from} task={intro.task} to={intro.to} facts={intro.facts} action={intro.action} />
        </div>

        {/* 付款开票面板：点款项轨节点展开 */}
        {moneyKey && <PaymentLanePanel contracts={contracts} mKey={moneyKey} onClose={() => setMoneyKey(null)} />}

        {/* ---------- 1 订单接收 ---------- */}
        {step === 1 && (
          <>
            <div className={`${sectionCard} flex items-center gap-4.5 px-5 py-4`}>
              <div className="bg-primary-soft text-primary-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]">
                <FileSpreadsheet size={21} strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <div className="text-[15px] font-bold">订单合同（总合同）</div>
                  <StatusPill tone="success">已签章</StatusPill>
                  <div className="text-sub text-xs">
                    {oc.fileName} · 版本 {oc.versions.length} 个
                  </div>
                </div>
                <div className="text-ink-2 mt-1.5 text-[12.5px]">
                  合同号 <span className="font-medium tabular-nums">{oc.no}</span> · 客户 {oc.customer} · 签订 {oc.signedAt} · 含税总额{" "}
                  <Money value={oc.amountInclTax} className="font-bold" />
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <a href="/samples/contract-sample.xlsx" download={oc.fileName}>
                  <Btn variant="secondary">
                    <Download size={14} strokeWidth={1.8} />
                    下载 xlsx
                  </Btn>
                </a>
                <Link href={`/projects/${project.id}/order`}>
                  <Btn variant="secondary">条款全文与版本</Btn>
                </Link>
                <Btn variant="primary" onClick={() => setXlsxOpen(true)}>
                  <Eye size={14} strokeWidth={1.8} />
                  查看合同
                </Btn>
              </div>
            </div>

            <div className={`${sectionCard} px-5 py-4.5`}>
              <div className="flex items-center gap-2.5">
                <div className="text-sm font-bold">重要条目</div>
                <AiBadge text="AI 提取" />
                <span className="text-sub text-xs">自订单合同 xlsx 自动抓取，供快速核对（以签章原件为准）</span>
              </div>
              <div className="mt-3.5 grid grid-cols-4 gap-3">
                {oc.keyTerms.map((k) => (
                  <div key={k.label} className="bg-page rounded-[10px] px-3.5 py-3">
                    <div className="text-sub text-xs">{k.label}</div>
                    <div className="mt-1 text-[13px] leading-snug font-medium">{k.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ---------- 2 采购清单 ---------- */}
        {step === 2 && (
          <>
            {cl ? (
              <ChecklistWorkspace key={cl.id} checklist={cl} mode="review" />
            ) : (
              <div className={`${sectionCard} flex flex-col items-center py-10`}>
                <EmptyState
                  icon={<List size={30} strokeWidth={1.5} className="text-[#CFCCCA]" />}
                  text="等待技术部提供采购清单 · 收到 xlsx 后上传，AI 自动解析各子系统明细（人工校对后签核）"
                />
                <Btn variant="primary" onClick={() => setUploadClOpen(true)}>
                  <UploadCloud size={14} strokeWidth={1.8} />
                  上传采购清单 xlsx
                </Btn>
              </div>
            )}
          </>
        )}

        {/* ---------- 3 订货安排 ---------- */}
        {step === 3 && (
          <>
            {cl ? <ChecklistWorkspace key={cl.id} checklist={cl} mode="source" /> : noChecklist}
          </>
        )}

        {/* ---------- 4 子合同 ---------- */}
        {step === 4 && (
          <>
            {cl ? <ChecklistWorkspace key={cl.id} checklist={cl} mode="contract" /> : noChecklist}
            {contracts.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-bold">
                    子合同{" "}
                    <span className="text-sub text-[12.5px] font-normal">
                      {contracts.length} 份 · 已签 {signedList.length} 份 · 初稿 / 校对 / 定稿 {contracts.length - signedList.length} 份 · 校对、定稿、签订在各子合同页完成
                    </span>
                  </div>
                  <Link href="/contracts" className="text-primary-hover text-[12.5px]">
                    查看全部
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[...contracts]
                    .sort((a, b) => Number(isSignedContract(a)) - Number(isSignedContract(b)))
                    .map((c) => (
                      <ContractCard key={c.id} contract={c} partialArrived={partialArrived(c)} />
                    ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ---------- 5 交货跟进 ---------- */}
        {step === 5 && (
          <>
            {/* 交货逾期：只提醒，点击去合同页，不做催办动作 */}
            {overdue.length > 0 && (
              <div className="flex flex-col gap-2">
                {overdue.map((c) => (
                  <Link key={c.id} href={`/contracts/${c.id}`} className="bg-danger-bg flex items-center gap-2.5 rounded-lg px-4 py-2.5">
                    <AlertTriangle size={14} strokeWidth={1.8} className="text-danger-deep shrink-0" />
                    <span className="text-danger-deep min-w-0 flex-1 truncate text-[12.5px]">
                      {supplierById(c.supplierId).short} {c.no} 交货逾期 {-daysUntil(c.deliveryDate!)} 天 · 交货期 {fmtDate(c.deliveryDate!)} · 请与卖方经办{" "}
                      {c.sellerContactName} 确认发货安排
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {delivering.length > 0 ? (
              <>
                <div className="text-[15px] font-bold">
                  在途子合同 <span className="text-sub text-[12.5px] font-normal">{delivering.length} 份 · 按交货期排序</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {delivering.map((c) => (
                    <ContractCard key={c.id} contract={c} partialArrived={false} />
                  ))}
                </div>
              </>
            ) : (
              <div className={`${sectionCard} flex py-8`}>
                <EmptyState
                  icon={<Truck size={30} strokeWidth={1.5} className="text-[#CFCCCA]" />}
                  text={signedList.length === 0 ? "尚无已签子合同 · 先在「子合同」步签订" : "全部子合同货已到场 · 转到现场收货"}
                />
              </div>
            )}
            {beyond.length > 0 && (
              <div className={`${sectionCard} flex items-center gap-3 px-5 py-3 text-[13px]`}>
                <Check size={15} strokeWidth={2.4} className="text-success shrink-0" />
                <span className="text-ink-2">已到场 {beyond.length} 份：</span>
                <span className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1">
                  {beyond.map((c) => (
                    <Link key={c.id} href={`/contracts/${c.id}`} className="text-info-deep tabular-nums hover:underline">
                      {c.no}
                    </Link>
                  ))}
                </span>
                <Btn variant="secondary" size="sm" onClick={() => setViewStep(6)}>
                  去现场收货
                </Btn>
              </div>
            )}
          </>
        )}

        {/* ---------- 6 现场收货 ---------- */}
        {step === 6 && (
          <>
            {pNotes.length > 0 ? (
              <div className={sectionCard}>
                {pNotes.map((n, i) => {
                  const lines = linesOf(n);
                  const processed = lines.filter((l) => l.state !== "unconfirmed").length;
                  const pieces = lines.reduce((s, l) => s + l.qty, 0);
                  const excs = lines.filter((l) => l.state === "exception");
                  const pct = lines.length > 0 ? Math.round((processed / lines.length) * 100) : 0;
                  return (
                    <div key={n.id} className={`px-5 py-3.5 ${i < pNotes.length - 1 ? "border-page border-b" : ""}`}>
                      <div className="flex items-center gap-3 text-[13px]">
                        <Truck size={15} strokeWidth={1.8} className="text-sub shrink-0" />
                        <span className="font-medium">送货单 {fmtDate(n.date)}</span>
                        <span className="text-sub min-w-0 flex-1 truncate text-[12.5px]">
                          {n.fromName} · 本项目 {lines.length} 类 {pieces} 件 · 收货人 {n.receiverName}
                          {n.projectIds.length > 1 && " · 跨项目送货单"}
                        </span>
                        <NoteStatus n={n} processed={processed} total={lines.length} />
                      </div>
                      {n.status !== "pending" && (
                        <div className="bg-line-soft mt-2 flex h-1.5 overflow-hidden rounded">
                          <div className={pct >= 100 && excs.length === 0 ? "bg-success" : "bg-info"} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                      {excs.map((l) => {
                        const resolved = !!l.exception?.resolvedAt;
                        return (
                          <div
                            key={l.seq}
                            className={`mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] ${resolved ? "bg-page text-ink-2" : "bg-danger-bg text-danger-deep"}`}
                          >
                            <AlertTriangle size={14} strokeWidth={1.8} className="shrink-0" />
                            <span className="min-w-0 flex-1 truncate">
                              {l.name} {l.exception?.type}：实收 {l.exception?.actualQty ?? "?"}/{l.qty} {l.unit} · {l.exception?.note} · 现场照片 {l.photoCount} 张
                            </span>
                            {resolved ? (
                              <span className="text-success-deep shrink-0 font-medium">已处理 {fmtDate(l.exception?.resolvedAt)}</span>
                            ) : (
                              <Btn
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  resolveException(n.id, l.seq);
                                  pushToast(`${l.name} 异常已标记处理`);
                                }}
                              >
                                标记已处理
                              </Btn>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`${sectionCard} flex py-8`}>
                <EmptyState icon={<Truck size={30} strokeWidth={1.5} className="text-[#CFCCCA]" />} text="暂无收货任务 · 卖方发货后小程序自动创建" />
              </div>
            )}
          </>
        )}

        {/* ---------- 7 订单关闭 ---------- */}
        {step === 7 && (
          <>
            <div className={`${sectionCard} flex flex-col gap-3.5 px-5 py-4.5`}>
              <div className="flex items-center gap-2.5">
                <Archive size={17} strokeWidth={1.8} className="text-ink-2" />
                <div className="text-sm font-bold">订单关闭</div>
                {project.closedAt && <StatusPill tone="neutral">已于 {project.closedAt} 关闭</StatusPill>}
              </div>
              {signedList.length > 0 && (
                <div className="border-line-soft overflow-hidden rounded-[10px] border">
                  <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-4 py-2 text-xs font-medium">
                    <div className="w-[200px]">子合同</div>
                    <div className="w-[130px]">供应商</div>
                    <div className="w-[170px]">验收款 30%</div>
                    <div className="w-[170px]">质保金 10%</div>
                    <div className="flex-1">状态</div>
                  </div>
                  {signedList.map((c, i) => {
                    const m3 = c.milestones.find((m) => m.key === "M3");
                    const m4 = c.milestones.find((m) => m.key === "M4");
                    return (
                      <div key={c.id} className={`flex items-center px-4 py-2.5 text-[13px] ${i < signedList.length - 1 ? "border-page border-b" : ""}`}>
                        <Link href={`/contracts/${c.id}`} className="text-info-deep w-[200px] font-medium tabular-nums hover:underline">
                          {c.no}
                        </Link>
                        <div className="text-ink-2 w-[130px] truncate pr-2">{supplierById(c.supplierId).short}</div>
                        <div className="w-[170px]">{m3 ? <MilestonePill m={m3} /> : "—"}</div>
                        <div className="w-[170px]">{m4 ? <MilestonePill m={m4} /> : "—"}</div>
                        <div className="text-ink-2 flex-1 text-[12.5px]">
                          {c.status === "closed" ? "已完结" : c.status === "warranty" ? "质保期" : c.status === "arrived" ? `货到 ${fmtDate(c.goodsArrivedAt)}` : "未到货"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!project.closedAt && !stepDone(6) && (
                <div className="bg-warning-bg text-warning-deep flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-[12.5px]">
                  <AlertTriangle size={14} strokeWidth={1.8} className="shrink-0" />
                  现场收货尚未全部完成，仍可关闭订单，建议先处理完再关。
                </div>
              )}
              {project.closedAt ? (
                <div className="text-sub text-[12.5px]">项目已关闭，全部信息保留可查：点击上方任意步骤可查看历史内容。</div>
              ) : (
                <div className="flex items-center gap-3">
                  <Btn variant="primary" onClick={() => closeProject(project.id)}>
                    <Archive size={14} strokeWidth={1.8} />
                    关闭订单
                  </Btn>
                  <span className="text-sub text-xs">关闭后项目标记为已结束，全部信息仍可查看；质保金到期仍会进提醒中心</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ChecklistParseDialog open={uploadClOpen} onClose={() => setUploadClOpen(false)} />
      {cl && <UploadContractDialog open={uploadCtOpen} onClose={() => setUploadCtOpen(false)} checklist={cl} />}
      <XlsxPreviewDialog
        open={xlsxOpen}
        onClose={() => setXlsxOpen(false)}
        fileName={oc.fileName}
        sheetName="合同"
        rows={orderXlsxRows(oc)}
        downloadHref="/samples/contract-sample.xlsx"
        downloadName={oc.fileName}
      />
    </div>
  );
}
