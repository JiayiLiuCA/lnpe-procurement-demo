"use client";

// 项目详情：四大阶段线性呈现（订单接收 → 采购清单 → 合同执行 → 订单关闭）
// 点击 phase 切换内容，默认停在当前阶段；支持 ?phase=n 直达
import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  List,
  Sparkles,
  Truck,
  UploadCloud,
} from "lucide-react";
import { Topbar, Crumb, CrumbLink } from "@/components/shell/Topbar";
import { Btn } from "@/components/ui/Btn";
import { StatusPill } from "@/components/ui/StatusPill";
import { PhaseStepper } from "@/components/ui/PhaseProgress";
import { Money } from "@/components/ui/Money";
import { CountdownChip } from "@/components/ui/CountdownChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { XlsxPreviewDialog, type XlsxCell } from "@/components/ui/XlsxPreviewDialog";
import { AiBadge } from "@/components/ai/AiBadge";
import { ContractCard } from "@/components/pc/ContractCard";
import { ChecklistWorkspace } from "@/components/pc/ChecklistWorkspace";
import { ChecklistParseDialog } from "@/components/ai/ChecklistParseDialog";
import { UploadContractDialog } from "@/components/ai/UploadContractDialog";
import { useAppStore } from "@/store/useAppStore";
import { checklistStats, overdueContracts, paymentPlan } from "@/lib/derive";
import { daysUntil, fmtDate } from "@/lib/date";
import { fmtNum } from "@/lib/money";
import { dueTone } from "@/lib/rules";
import { supplierById, BUYER } from "@/fixtures/suppliers";
import { projects as seedProjects } from "@/fixtures/projects";
import type { OrderContract } from "@/lib/types";

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

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const project = useAppStore((s) => s.projects.find((p) => p.id === id));
  const allChecklists = useAppStore((s) => s.checklists);
  const allContracts = useAppStore((s) => s.contracts);
  const deliveryNotes = useAppStore((s) => s.deliveryNotes);
  const closeProject = useAppStore((s) => s.closeProject);
  const [viewPhase, setViewPhase] = useState<number | null>(() => {
    const p = Number(searchParams.get("phase"));
    return p >= 1 && p <= 4 ? p : null;
  });
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
  const cl = checklists[0];
  const clStats = cl ? checklistStats(cl) : null;
  const signed = contracts.filter((c) => c.signedAt);
  const signedTotal = signed.reduce((s, c) => s + (c.amountInclTax ?? 0), 0);
  const paid = contracts.reduce(
    (s, c) => s + c.milestones.filter((m) => m.status === "paid").reduce((x, m) => x + Math.round((c.amountInclTax ?? 0) * m.ratio), 0),
    0,
  );
  const phase = viewPhase ?? project.phase;
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
  const projectPlan = paymentPlan(contracts);
  const projectNotes = deliveryNotes.filter((n) => n.contractIds.some((cid) => contracts.some((c) => c.id === cid)));
  const receivedLines = projectNotes.reduce((s, n) => s + n.lines.filter((l) => l.state === "confirmed").length, 0);
  const excLines = projectNotes.reduce((s, n) => s + n.lines.filter((l) => l.state === "exception").length, 0);
  const closedContracts = contracts.filter((c) => c.status === "closed").length;

  const sectionCard = "border-line rounded-card border bg-white";

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
        {/* 头卡：标题 + 可点击阶段条 */}
        <div className="border-line rounded-card flex items-center gap-6 border bg-white px-5.5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold">
                {project.code} <span className="font-medium">{project.name}</span>
              </div>
              {project.tags.map((t) => (
                <StatusPill key={t} tone={t.includes("逾期") ? "danger" : t === "已结束" ? "neutral" : "info"}>
                  {t}
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
          <div className="min-w-[420px] max-w-[560px] flex-1">
            <PhaseStepper project={project} viewPhase={phase} onSelect={setViewPhase} />
          </div>
        </div>

        {/* 核心统计（6 张） */}
        <div className="flex gap-3">
          <div className="border-line flex-1 rounded-[10px] border bg-white px-4 py-3">
            <div className="text-sub text-xs">总需采购</div>
            <div className="mt-0.5 text-[18px] font-bold tabular-nums">
              {clStats?.need ?? 0} <span className="text-sub text-xs font-normal">项</span>
            </div>
          </div>
          <div className="border-line flex-1 rounded-[10px] border bg-white px-4 py-3">
            <div className="text-sub text-xs">库存已分配</div>
            <div className="text-success-deep mt-0.5 text-[18px] font-bold tabular-nums">
              {clStats?.allocated ?? 0}{" "}
              <span className="text-sub text-xs font-normal">项{clStats && clStats.produce > 0 && ` · 安排生产 ${clStats.produce}`}</span>
            </div>
          </div>
          <div className="border-line flex-[1.7] rounded-[10px] border bg-white px-4 py-3">
            <div className="text-sub text-xs">采购合同</div>
            <div className="mt-0.5 text-[18px] font-bold tabular-nums">
              {contracts.length}{" "}
              <span className="text-sub text-xs font-normal">
                份已拟定 · 已签 {signed.length} 份 · 覆盖 {clStats?.contracted ?? 0} 项
              </span>
            </div>
          </div>
          <div className="border-line flex-[1.15] rounded-[10px] border bg-white px-4 py-3">
            <div className="text-sub text-xs">已签合同总额</div>
            <div className="mt-0.5 text-[18px] font-bold">
              <Money value={signedTotal} />
            </div>
          </div>
          <div className="border-line flex-[1.15] rounded-[10px] border bg-white px-4 py-3">
            <div className="text-sub text-xs">累计已付款</div>
            <div className="mt-0.5 text-[18px] font-bold">
              <Money value={paid} />{" "}
              {signedTotal > 0 && <span className="text-sub text-xs font-normal">{((paid / signedTotal) * 100).toFixed(1)}%</span>}
            </div>
          </div>
          <div className="border-line flex-1 rounded-[10px] border bg-white px-4 py-3">
            <div className="text-sub text-xs">已收货</div>
            <div className="mt-0.5 text-[18px] font-bold tabular-nums">
              {receivedLines}{" "}
              <span className="text-sub text-xs font-normal">
                项{excLines > 0 && <span className="text-danger-deep"> · 异常 {excLines}</span>}
              </span>
            </div>
          </div>
        </div>

        {/* 阶段内容（全宽） */}
        {phase === 1 && (
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

        {phase === 2 &&
          (cl ? (
            <ChecklistWorkspace checklist={cl} />
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
          ))}

        {phase === 3 && (
          <>
            {/* 覆盖进度 + 动作 */}
            <div className={`${sectionCard} flex items-center gap-4 px-5 py-3.5`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 text-[13px]">
                  <span className="font-bold">合同覆盖</span>
                  {clStats ? (
                    <span className="text-ink-2">
                      需采购 <span className="text-ink font-bold">{clStats.need}</span> · 已入合同{" "}
                      <span className="text-info-deep font-bold">{clStats.contracted}</span> · 待覆盖{" "}
                      <span className="text-warning-deep font-bold">{clStats.need - clStats.contracted}</span>
                    </span>
                  ) : (
                    <span className="text-sub">尚无采购清单</span>
                  )}
                </div>
                <div className="bg-line-soft mt-2 flex h-2 overflow-hidden rounded">
                  {clStats && (
                    <div className={clStats.contracted >= clStats.need ? "bg-success" : "bg-info"} style={{ width: `${Math.round((clStats.contracted / Math.max(clStats.need, 1)) * 100)}%` }} />
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Btn variant="secondary" onClick={() => setViewPhase(2)}>
                  <Sparkles size={14} strokeWidth={1.8} />
                  去采购清单生成合同
                </Btn>
                {cl && (
                  <Btn variant="secondary" onClick={() => setUploadCtOpen(true)}>
                    <UploadCloud size={14} strokeWidth={1.8} />
                    上传合同 xlsx
                  </Btn>
                )}
              </div>
            </div>

            {/* 关联合同 */}
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-bold">
                关联合同{" "}
                <span className="text-sub text-[12.5px] font-normal">
                  已拟定 {contracts.length} 份 · 已签 {signed.length} 份 · 出合同 / 付款 / 发货 / 收货细节见各子合同页
                </span>
              </div>
              <Link href="/contracts" className="text-primary-hover text-[12.5px]">
                查看全部
              </Link>
            </div>
            {contracts.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {contracts.map((c) => (
                  <ContractCard
                    key={c.id}
                    contract={c}
                    partialArrived={deliveryNotes.some((n) => n.contractIds.includes(c.id) && n.status === "in_progress")}
                  />
                ))}
              </div>
            ) : (
              <div className={`${sectionCard} flex py-8`}>
                <EmptyState icon={<FileText size={30} strokeWidth={1.5} className="text-[#CFCCCA]" />} text="暂无合同 · 到采购清单阶段生成或上传" />
              </div>
            )}

            {/* 付款计划 + 收货任务 双栏 */}
            <div className="flex gap-3.5">
              <div className={`${sectionCard} flex-1 px-4.5 py-4`}>
                <div className="text-sm font-bold">付款计划（本项目）</div>
                {projectPlan.length > 0 ? (
                  <div className="mt-2 flex flex-col">
                    {projectPlan.map((r) => (
                      <Link
                        key={`${r.contract.id}-${r.milestone.key}`}
                        href={`/contracts/${r.contract.id}`}
                        className="border-page hover:bg-page/60 flex items-center gap-3 border-b py-2.5 last:border-b-0"
                      >
                        <span
                          className={`w-12 text-[14px] font-bold tabular-nums ${
                            dueTone(r.dueAt) === "danger" ? "text-danger-deep" : dueTone(r.dueAt) === "warning" ? "text-warning-deep" : "text-ink-2"
                          }`}
                        >
                          {fmtDate(r.dueAt)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px]">
                          {r.contract.no} · {r.milestone.label} {Math.round(r.milestone.ratio * 100)}%
                        </span>
                        <Money value={r.amount} className="text-[13.5px] font-bold" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-faint mt-2 text-[12.5px]">近期无到期付款</div>
                )}
                {/* 交货逾期提醒：只提示，点击去合同页，不做催办动作 */}
                {overdueContracts(contracts, deliveryNotes).map((c) => (
                    <Link key={c.id} href={`/contracts/${c.id}`} className="bg-danger-bg mt-3 flex items-center gap-2.5 rounded-lg px-3 py-2.5">
                      <AlertTriangle size={14} strokeWidth={1.8} className="text-danger-deep shrink-0" />
                      <span className="text-danger-deep min-w-0 flex-1 truncate text-[12.5px]">
                        {supplierById(c.supplierId).short} {c.no} 交货逾期 {-daysUntil(c.deliveryDate!)} 天
                      </span>
                    </Link>
                ))}
              </div>
              <div className={`${sectionCard} flex-1 px-4.5 py-4`}>
                <div className="text-sm font-bold">收货任务</div>
                {projectNotes.length > 0 ? (
                  <div className="mt-2 flex flex-col">
                    {projectNotes.map((n) => {
                      const processed = n.lines.filter((l) => l.state !== "unconfirmed").length;
                      const exc = n.lines.filter((l) => l.state === "exception").length;
                      return (
                        <div key={n.id} className="border-page flex items-center gap-3 border-b py-2.5 text-[13px] last:border-b-0">
                          <Truck size={15} strokeWidth={1.8} className="text-sub shrink-0" />
                          <span className="min-w-0 flex-1 truncate">
                            送货单 {fmtDate(n.date)} · {n.lines.length} 类 {n.lines.reduce((s, l) => s + l.qty, 0)} 件
                          </span>
                          {exc > 0 && <StatusPill tone="danger">异常 {exc} 项</StatusPill>}
                          {n.status === "done" ? (
                            <StatusPill tone="success">已完成</StatusPill>
                          ) : n.status === "in_progress" ? (
                            <StatusPill tone="info">
                              收货中 {processed}/{n.lines.length}
                            </StatusPill>
                          ) : (
                            <StatusPill tone="neutral">待收货</StatusPill>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-faint mt-2 text-[12.5px]">暂无收货任务 · 卖方发货后小程序自动创建</div>
                )}
              </div>
            </div>
          </>
        )}

        {phase === 4 && (
          <div className={`${sectionCard} flex max-w-[860px] flex-col gap-3.5 px-5 py-4.5`}>
            <div className="flex items-center gap-2.5">
              <Archive size={17} strokeWidth={1.8} className="text-ink-2" />
              <div className="text-sm font-bold">订单关闭</div>
              {project.closedAt && <StatusPill tone="neutral">已于 {project.closedAt} 关闭</StatusPill>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-page rounded-[10px] px-4 py-3">
                <div className="text-sub text-xs">采购合同</div>
                <div className="mt-0.5 text-[17px] font-bold tabular-nums">
                  {contracts.length} <span className="text-sub text-xs font-normal">份 · 已完结 {closedContracts}</span>
                </div>
              </div>
              <div className="bg-page rounded-[10px] px-4 py-3">
                <div className="text-sub text-xs">未清付款</div>
                <div className="mt-0.5 text-[17px] font-bold tabular-nums">
                  {projectPlan.length} <span className="text-sub text-xs font-normal">笔到期未付</span>
                </div>
              </div>
              <div className="bg-page rounded-[10px] px-4 py-3">
                <div className="text-sub text-xs">累计已付</div>
                <div className="mt-0.5 text-[17px] font-bold">
                  <Money value={paid} />
                </div>
              </div>
            </div>
            {project.closedAt ? (
              <div className="text-sub text-[12.5px]">项目已关闭，全部信息保留可查：点击上方任意阶段可查看历史内容。</div>
            ) : (
              <div className="flex items-center gap-3">
                <Btn variant="primary" onClick={() => closeProject(project.id)}>
                  <Archive size={14} strokeWidth={1.8} />
                  关闭项目
                </Btn>
                <span className="text-sub text-xs">关闭后项目标记为已结束，全部信息仍可查看</span>
              </div>
            )}
          </div>
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
