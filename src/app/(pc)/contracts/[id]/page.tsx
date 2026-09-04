"use client";

// 合同详情：跟进 / 合同信息 / 校对与版本 三 Tab，接 AI 流程 4（定稿回读）与 5（发票识别）
import { useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Check, Download, Phone, UploadCloud, X } from "lucide-react";
import { Topbar, Crumb, CrumbLink } from "@/components/shell/Topbar";
import { Btn } from "@/components/ui/Btn";
import { StatusPill } from "@/components/ui/StatusPill";
import { TabBar } from "@/components/ui/TabBar";
import { Money } from "@/components/ui/Money";
import { Avatar } from "@/components/ui/Avatar";
import { MilestoneBar } from "@/components/ui/MilestoneBar";
import { CountdownChip } from "@/components/ui/CountdownChip";
import { MilestoneTable } from "@/components/pc/MilestoneTable";
import { ContractLinesTable } from "@/components/pc/ContractLinesTable";
import { VersionList } from "@/components/pc/VersionList";
import { ReceivingRecord } from "@/components/pc/ReceivingRecord";
import { AiSimDialog } from "@/components/ai/AiSimDialog";
import { ContractLane, contractSubPill } from "@/components/pc/ContractCard";
import { useAppStore } from "@/store/useAppStore";
import { overdueContracts } from "@/lib/derive";
import { CONTRACT_STAGE_LABEL, contractStage } from "@/lib/steps";
import type { Contract, MilestoneKey } from "@/lib/types";
import type { ContractStage } from "@/lib/steps";
import { daysUntil } from "@/lib/date";
import { exclTax } from "@/lib/money";
import {
  CONTRACT_STATUS_LABEL,
  contractTotal,
  invoicedAmount,
  invoicedRatio,
  milestoneAmount,
  nextAction,
  paidAmount,
  paidRatio,
} from "@/lib/rules";
import { supplierById, BUYER } from "@/fixtures/suppliers";
import { templateClauses } from "@/fixtures/ai/contract-template";
import { buildFinalizeDiff, finalizeSteps } from "@/fixtures/ai/finalize-diff";
import { invoiceSamples, invoiceSteps, BUYER_TITLE } from "@/fixtures/ai/invoice-samples";
import { TODAY } from "@/lib/date";

type TabKey = "follow" | "info" | "review";

/** 交货跟进卡：交货逾期时只做提醒（红头 + 交货期 + 逾期天数），不提供催办动作，也不记录沟通 */
function ExecStatusCard({ c, overdue, stage }: { c: Contract; overdue: number; stage: ContractStage }) {
  if (overdue > 0) {
    return (
      <div className="rounded-card overflow-hidden border border-[#F0C9C4] bg-white">
        <div className="bg-danger-bg flex items-center gap-2 px-4.5 py-3">
          <AlertTriangle size={16} strokeWidth={1.8} className="text-danger-deep" />
          <div className="text-danger-deep text-sm font-bold">交货跟进 · 交货逾期</div>
        </div>
        <div className="flex flex-col gap-2.5 px-4.5 py-3.5">
          <div className="flex justify-between text-[13px]">
            <span className="text-sub">合同交货期</span>
            <span className="font-medium">{c.deliveryDate}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-sub">已逾期</span>
            <span className="text-danger-deep font-bold">{overdue} 天</span>
          </div>
          <div className="text-sub border-line-soft border-t pt-2.5 text-[11.5px]">请与卖方经办 {c.sellerContactName} 确认发货安排</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-line rounded-card flex flex-col gap-2.5 border bg-white px-4.5 py-3.5">
      <div className="text-sm font-bold">交货跟进</div>
      <div className="flex justify-between text-[13px]">
        <span className="text-sub">当前状态</span>
        <span className="font-medium">{CONTRACT_STATUS_LABEL[c.status]}</span>
      </div>
      <div className="flex justify-between text-[13px]">
        <span className="text-sub">所处步骤</span>
        <span className="font-medium">{CONTRACT_STAGE_LABEL[stage]}</span>
      </div>
      {c.deliveryDate && (
        <div className="flex justify-between text-[13px]">
          <span className="text-sub">合同交货期</span>
          <CountdownChip dueAt={c.deliveryDate} />
        </div>
      )}
      {c.goodsArrivedAt && (
        <div className="flex justify-between text-[13px]">
          <span className="text-sub">货到现场</span>
          <span className="text-success-deep font-medium">{c.goodsArrivedAt}</span>
        </div>
      )}
    </div>
  );
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const contract = useAppStore((s) => s.contracts.find((c) => c.id === id));
  const project = useAppStore((s) => s.projects.find((p) => p.id === contract?.projectId));
  const deliveryNotes = useAppStore((s) => s.deliveryNotes);
  const advanceContractStatus = useAppStore((s) => s.advanceContractStatus);
  const applyFinalizeDiff = useAppStore((s) => s.applyFinalizeDiff);
  const registerInvoice = useAppStore((s) => s.registerInvoice);
  const pushToast = useAppStore((s) => s.pushToast);

  const [tab, setTab] = useState<TabKey | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [invoiceMKey, setInvoiceMKey] = useState<MilestoneKey | null>(null);

  if (!contract) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Topbar backHref="/contracts" crumbs={<Crumb>合同管理</Crumb>} />
        <div className="text-sub p-10 text-center text-sm">未找到该合同</div>
      </div>
    );
  }

  const c = contract;
  const isDraftStage = c.status === "ai_draft" || c.status === "reviewing" || c.status === "finalized";
  const activeTab: TabKey = tab ?? (isDraftStage ? "review" : "follow");
  const total = contractTotal(c);
  const paid = paidAmount(c);
  const pRatio = paidRatio(c);
  const invAmount = invoicedAmount(c);
  const invRatio = invoicedRatio(c);
  const invCount = c.milestones.filter((m) => m.invoice).length;
  const supplier = supplierById(c.supplierId);
  const partial = deliveryNotes.some((n) => n.contractIds.includes(c.id) && n.status === "in_progress");
  const sub = contractSubPill(c, partial);
  const overdue = overdueContracts([c], deliveryNotes).length > 0 ? -daysUntil(c.deliveryDate!) : 0;
  const stage = contractStage(c, deliveryNotes);
  const advanceLabel = nextAction(c.status);
  const invMilestone = invoiceMKey ? c.milestones.find((m) => m.key === invoiceMKey) : null;
  const invMilestoneAmount = invMilestone && total != null ? milestoneAmount(total, invMilestone.ratio) : 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar
        backHref="/contracts"
        crumbs={
          <>
            <CrumbLink href="/contracts">合同管理</CrumbLink> /{" "}
            {project && <CrumbLink href={`/projects/${project.id}`}>{project.code}</CrumbLink>}
            {project && " / "}
            <Crumb>{c.no}</Crumb>
          </>
        }
        actions={
          <>
            <a href="/samples/contract-sample.xlsx" download={`${c.no}.xlsx`}>
              <Btn variant="secondary">
                <Download size={14} strokeWidth={1.8} />
                下载 xlsx
              </Btn>
            </a>
            {advanceLabel && (
              <Btn
                variant="primary"
                onClick={() => {
                  advanceContractStatus(c.id);
                  pushToast(`合同已推进：${advanceLabel}`);
                }}
              >
                {advanceLabel}
              </Btn>
            )}
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-3.5 p-6">
        {/* 头卡 */}
        <div className="border-line rounded-card flex shrink-0 items-center gap-3.5 border bg-white px-5.5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="text-[19px] font-bold tabular-nums">{c.no}</div>
              <StatusPill tone="info">{CONTRACT_STATUS_LABEL[c.status]}</StatusPill>
              {overdue > 0 && <StatusPill tone="danger">交货逾期 {overdue} 天</StatusPill>}
              {c.status !== "executing" && sub.text !== CONTRACT_STATUS_LABEL[c.status] && <StatusPill tone={sub.tone}>{sub.text}</StatusPill>}
            </div>
            <div className="text-sub mt-1.5 text-[12.5px]">
              卖方 {supplier.name} · 项目 {project?.code} {project?.name}
              {c.signedAt && ` · 签订 ${c.signedAt}`}
              {c.deliveryDate && (
                <>
                  {" "}
                  · 交货期 <span className={overdue > 0 ? "text-danger-deep font-medium" : ""}>{c.deliveryDate}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex w-[300px] shrink-0 flex-col gap-2 pr-6">
            <ContractLane stage={stage} danger={overdue > 0} withLabels />
            <MilestoneBar milestones={c.milestones} height={8} withLabels />
          </div>
          <div className="flex shrink-0 gap-7 text-right">
            <div>
              <div className="text-sub text-xs">含税总额（13%）</div>
              <div className="mt-0.5 text-[19px] font-bold">
                {total != null ? <Money value={total} /> : <span className="text-faint text-sm">待补充</span>}
              </div>
              {total != null && (
                <div className="text-faint text-[11.5px] tabular-nums">
                  不含税 <Money value={exclTax(total)} />
                </div>
              )}
            </div>
            <div>
              <div className="text-sub text-xs">已付 {Math.round(pRatio * 100)}%</div>
              <div className="text-success-deep mt-0.5 text-[19px] font-bold">
                <Money value={paid} />
              </div>
              {total != null && (
                <div className="text-faint text-[11.5px] tabular-nums">
                  待付 <Money value={total - paid} />
                </div>
              )}
            </div>
            <div>
              <div className="text-sub text-xs">已开票 {Math.round(invRatio * 100)}%</div>
              <div className="mt-0.5 text-[19px] font-bold">
                <Money value={invAmount} />
              </div>
              <div className="text-faint text-[11.5px]">发票 {invCount} 张</div>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <TabBar
            tabs={[
              { key: "follow", label: "跟进" },
              { key: "info", label: "合同信息" },
              { key: "review", label: "校对与版本" },
            ]}
            active={activeTab}
            onChange={(k) => setTab(k as TabKey)}
          />
        </div>

        {activeTab === "follow" && (
          <div className="flex min-h-0 flex-1 gap-4">
            <div className="flex min-w-0 flex-[2] flex-col gap-3.5">
              <div className="border-line rounded-card flex flex-col gap-3.5 border bg-white px-5.5 py-4.5">
                <div className="flex items-center">
                  <div className="text-[15px] font-bold">付款与发票</div>
                  <div className="text-sub ml-auto text-xs">
                    累计付款 <span className="text-success-deep font-bold">{Math.round(pRatio * 100)}%</span> · 累计开票{" "}
                    <span className="text-ink font-bold">{Math.round(invRatio * 100)}%</span> · 尾款期限以「货到现场日」起算
                  </div>
                </div>
                <MilestoneBar milestones={c.milestones} height={12} withLabels />
                <MilestoneTable contract={c} onRegisterInvoice={(mKey) => setInvoiceMKey(mKey)} />
              </div>

              <div className="border-line rounded-card flex min-h-0 flex-1 flex-col overflow-hidden border bg-white">
                <div className="border-line-soft flex items-center justify-between border-b px-5.5 py-3.5">
                  <div className="text-[15px] font-bold">
                    产品明细{" "}
                    <span className="text-sub text-[12.5px] font-normal">
                      {c.lines.length} 项{project ? ` · 关联清单「${project.code} 第一批」` : ""}
                    </span>
                  </div>
                  <span className="text-primary-hover text-[12.5px]">查看技术附件</span>
                </div>
                <ContractLinesTable contract={c} />
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3.5">
              <ExecStatusCard c={c} overdue={overdue} stage={stage} />

              <div className="border-line rounded-card flex flex-col gap-2.5 border bg-white px-4.5 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold">文档与版本</div>
                  <div className="flex gap-1.5">
                    <a href="/samples/contract-sample.xlsx" download={`${c.no}.xlsx`}>
                      <Btn variant="secondary" size="sm">
                        <Download size={12} strokeWidth={1.8} />
                        xlsx
                      </Btn>
                    </a>
                    <Btn variant="secondary" size="sm" onClick={() => setDiffOpen(true)}>
                      <UploadCloud size={12} strokeWidth={1.8} />
                      上传新版
                    </Btn>
                  </div>
                </div>
                <VersionList versions={c.versions} />
                {c.attachments.length > 0 && (
                  <div className="border-line-soft flex flex-col gap-1.5 border-t pt-2.5">
                    {c.attachments.map((a) => (
                      <div key={a} className="text-ink-2 text-[12.5px]">
                        📄 {a}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-line rounded-card flex flex-1 flex-col gap-2 border bg-white px-4.5 py-3.5">
                <div className="text-sm font-bold">收货记录</div>
                <ReceivingRecord contract={c} />
              </div>

              <div className="border-line rounded-card flex flex-col gap-2.5 border bg-white px-4.5 py-3.5">
                <div className="text-sm font-bold">经办人</div>
                <div className="flex items-center gap-2.5">
                  <Avatar name={BUYER.contactName} size={30} tone="soft" />
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">买方 · {BUYER.contactName}</div>
                    <div className="text-sub text-[11.5px]">
                      {BUYER.phone} · {BUYER.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.sellerContactName} size={30} tone="gray" />
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">卖方 · {c.sellerContactName}</div>
                    <div className="text-sub text-[11.5px]">{c.sellerContactPhone}</div>
                  </div>
                  <button
                    type="button"
                    className="text-primary-hover flex cursor-pointer items-center gap-1 text-xs font-medium"
                    onClick={() => pushToast(`已拨打 ${c.sellerContactName} ${c.sellerContactPhone}（演示）`)}
                  >
                    <Phone size={13} strokeWidth={1.8} />
                    拨打
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "info" && (
          <div className="flex flex-col gap-3.5">
            {templateClauses.map((cl) => (
              <div key={cl.title} className="border-line rounded-card border bg-white px-5.5 py-4.5">
                <div className="text-sm font-bold">{cl.title}</div>
                <div className="text-ink-2 mt-2 text-[13px] leading-[1.9]">{cl.body}</div>
                {cl.title.startsWith("第 8 条") && (
                  <div className="border-line-soft mt-3 overflow-hidden rounded-[10px] border">
                    {c.milestones.map((m, i) => (
                      <div
                        key={m.key}
                        className={`flex items-center px-4 py-2.5 text-[13px] ${i < 3 ? "border-page border-b" : ""}`}
                      >
                        <div className="w-40 font-medium">
                          {m.key} {m.label} {Math.round(m.ratio * 100)}%
                        </div>
                        <div className="text-ink-2 flex-1 text-[12.5px]">{m.condition}</div>
                        <div className="w-32 text-right font-bold tabular-nums">
                          {total != null ? <Money value={milestoneAmount(total, m.ratio)} /> : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="border-line rounded-card border bg-white px-5.5 py-4.5">
              <div className="text-sm font-bold">签章区</div>
              <div className="mt-3 flex gap-8">
                <div className="flex-1">
                  <div className="text-sub text-xs">买方（盖章）</div>
                  <div className="mt-1.5 text-[13.5px] font-bold">{BUYER.name}</div>
                  <div className="text-ink-2 mt-1 text-[12.5px]">
                    经办：{BUYER.contactName} · {BUYER.phone}
                    <br />
                    {BUYER.email}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sub text-xs">卖方（盖章）</div>
                  <div className="mt-1.5 text-[13.5px] font-bold">{supplier.name}</div>
                  <div className="text-ink-2 mt-1 text-[12.5px]">
                    经办：{c.sellerContactName} · {c.sellerContactPhone}
                    <br />
                    {supplier.address ?? ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "review" && (
          <div className="flex min-h-0 flex-1 gap-4">
            <div className="flex min-w-0 flex-[2] flex-col gap-3.5">
              <div className="border-line rounded-card flex flex-col overflow-hidden border bg-white">
                <div className="border-line-soft flex items-center justify-between border-b px-5.5 py-3.5">
                  <div className="text-[15px] font-bold">
                    产品明细（{isDraftStage ? "草稿可编辑" : "只读"}）{" "}
                    <span className="text-sub text-[12.5px] font-normal">单价输入后行金额与合计实时计算</span>
                  </div>
                </div>
                <ContractLinesTable contract={c} editable={c.status === "ai_draft" || c.status === "reviewing"} />
              </div>
              <div className="border-line rounded-card border bg-white px-5.5 py-4.5">
                <div className="text-sm font-bold">模板条款预览</div>
                <div className="mt-2.5 flex flex-col gap-2.5">
                  {templateClauses.map((cl) => (
                    <div key={cl.title} className="text-[12.5px]">
                      <span className="font-medium">{cl.title}</span>
                      <span className="text-ink-2"> — {cl.body.slice(0, 60)}…</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3.5">
              <div className="border-line rounded-card flex flex-col gap-2.5 border bg-white px-4.5 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold">版本列表</div>
                  <Btn variant="secondary" size="sm" onClick={() => setDiffOpen(true)}>
                    <UploadCloud size={12} strokeWidth={1.8} />
                    上传定稿回读
                  </Btn>
                </div>
                <VersionList versions={c.versions} />
              </div>
              {advanceLabel && (
                <Btn
                  variant="primary"
                  onClick={() => {
                    advanceContractStatus(c.id);
                    pushToast(`合同已推进：${advanceLabel}`);
                  }}
                >
                  {advanceLabel}
                </Btn>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI 流程 4：定稿回读 diff */}
      <AiSimDialog
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        title="上传定稿回读 · 差异比对"
        steps={finalizeSteps}
        uploadHint="上传双方定稿的 xlsx / pdf，演示中不读取文件内容"
        renderResult={() => {
          const diff = buildFinalizeDiff(c);
          return (
            <div className="flex flex-col gap-3.5">
              <div className="bg-page rounded-[10px] px-4 py-3">
                <div className="text-[13px] font-bold">变更摘要</div>
                <div className="text-ink-2 mt-1.5 flex flex-col gap-1 text-[12.5px] leading-relaxed">
                  {diff.summary.map((s) => (
                    <div key={s}>{s}</div>
                  ))}
                </div>
              </div>
              <div className="border-line-soft overflow-hidden rounded-[10px] border">
                <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-3.5 py-2 text-xs font-medium">
                  <div className="flex-1">字段</div>
                  <div className="w-36">在线版本</div>
                  <div className="w-36">定稿回读</div>
                </div>
                {diff.items.map((it) => (
                  <div key={it.field} className="border-page flex flex-col border-b last:border-b-0">
                    <div className="flex items-center px-3.5 py-2.5 text-[13px]">
                      <div className="flex-1 font-medium">{it.field}</div>
                      <div className="text-sub w-36 tabular-nums line-through">{it.before}</div>
                      <div className="w-36 font-bold tabular-nums">{it.after}</div>
                    </div>
                    {it.warning && (
                      <div className="bg-danger-bg text-danger-deep mx-3.5 mb-2.5 flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px]">
                        <AlertTriangle size={13} strokeWidth={1.8} className="shrink-0" />
                        {it.warning}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }}
        confirmLabel="确认并追加版本"
        onConfirm={() => {
          applyFinalizeDiff(c.id);
          pushToast(`已追加 v${c.versions.length + 1} 人工修订（上传回读）`);
          setDiffOpen(false);
        }}
      />

      {/* AI 流程 5：发票识别核验 */}
      <AiSimDialog
        open={invoiceMKey != null}
        onClose={() => setInvoiceMKey(null)}
        title={`发票识别核验 · ${invoiceMKey ?? ""} ${invMilestone?.label ?? ""}`}
        steps={invoiceSteps}
        samples={invoiceSamples.map((s) => ({ id: s.id, label: s.label }))}
        uploadHint="上传发票影像，演示中不读取文件内容"
        renderResult={(sid) => {
          const sample = invoiceSamples.find((s) => s.id === sid) ?? invoiceSamples[0];
          const checks = [
            { label: `抬头 = ${BUYER_TITLE}`, ok: sample.titleOk },
            { label: "税率 13%", ok: true },
            { label: `金额与里程碑等额（${invMilestone ? Math.round(invMilestone.ratio * 100) : 0}%）`, ok: true },
          ];
          return (
            <div className="flex flex-col gap-3.5">
              {!sample.titleOk && (
                <div className="bg-danger-bg text-danger-deep flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-medium">
                  <AlertTriangle size={15} strokeWidth={1.8} />
                  已拦截：发票抬头与购方名称不符
                </div>
              )}
              <div className="border-line-soft grid grid-cols-2 gap-x-6 gap-y-2 rounded-[10px] border bg-[#FBFAF9] px-4 py-3.5 text-[13px]">
                <div>
                  <span className="text-sub">发票号：</span>
                  <span className="font-bold tabular-nums">{sample.no}</span>
                </div>
                <div>
                  <span className="text-sub">开票日期：</span>
                  {sample.issuedAt}
                </div>
                <div className={sample.titleOk ? "" : "text-danger-deep font-medium"}>
                  <span className="text-sub">抬头：</span>
                  {sample.buyerTitle}
                </div>
                <div>
                  <span className="text-sub">税率：</span>
                  {sample.taxRate}
                </div>
                <div>
                  <span className="text-sub">税号：</span>
                  <span className="tabular-nums">{sample.taxNo}</span>
                </div>
                <div>
                  <span className="text-sub">金额：</span>
                  <Money value={invMilestoneAmount} className="font-bold" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {checks.map((ck) => (
                  <div key={ck.label} className="flex items-center gap-2 text-[13px]">
                    {ck.ok ? (
                      <span className="bg-success flex h-4 w-4 items-center justify-center rounded-full">
                        <Check size={9} strokeWidth={3.4} className="text-white" />
                      </span>
                    ) : (
                      <span className="bg-danger flex h-4 w-4 items-center justify-center rounded-full">
                        <X size={9} strokeWidth={3.4} className="text-white" />
                      </span>
                    )}
                    <span className={ck.ok ? "text-ink-2" : "text-danger-deep font-medium"}>{ck.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }}
        confirmLabel="确认登记发票"
        disabled={(sid) => invoiceSamples.find((s) => s.id === sid)?.titleOk === false}
        onConfirm={(sid) => {
          if (!invoiceMKey || !invMilestone) return;
          const sample = invoiceSamples.find((s) => s.id === sid) ?? invoiceSamples[0];
          registerInvoice(c.id, invoiceMKey, {
            no: sample.no,
            ratioLabel: `${Math.round(invMilestone.ratio * 100)}%`,
            amount: invMilestoneAmount,
            issuedAt: TODAY,
            receivedAt: TODAY,
          });
          pushToast(`发票 ${sample.no} 已登记至 ${invoiceMKey} ${invMilestone.label}`);
          setInvoiceMKey(null);
        }}
      />
    </div>
  );
}
