"use client";

// 合同详情：跟进 / 合同与版本 两 Tab，接 AI 流程 4（定稿回读）与 5（发票识别）。
// 「跟进」= 现在该做什么 + 货物 / 款项合一的纵向时间线（components/pc/ContractTimeline，lib/contractTimeline 派生），右栏 合同文件 / 收货记录 / 经办人。
// 「合同与版本」= 合同卡 + 版本记录 + AI 重要条目 + 产品明细 + 条款，形式与订单接收步的项目合同卡一致（components/pc/ContractDocSection）。
import { useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Check, Download, Phone, X } from "lucide-react";
import { Topbar, Crumb, CrumbLink } from "@/components/shell/Topbar";
import { Btn } from "@/components/ui/Btn";
import { StatusPill } from "@/components/ui/StatusPill";
import { TabBar } from "@/components/ui/TabBar";
import { Money } from "@/components/ui/Money";
import { Avatar } from "@/components/ui/Avatar";
import { ContractDocSection } from "@/components/pc/ContractDocSection";
import { ContractTimeline } from "@/components/pc/ContractTimeline";
import { ReceivingRecord } from "@/components/pc/ReceivingRecord";
import { AiSimDialog } from "@/components/ai/AiSimDialog";
import { ContractLane, contractSubPill } from "@/components/pc/ContractCard";
import { useAppStore } from "@/store/useAppStore";
import { overdueContracts } from "@/lib/derive";
import { contractStage } from "@/lib/steps";
import type { MilestoneKey } from "@/lib/types";
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
import { buildFinalizeDiff, finalizeSteps } from "@/fixtures/ai/finalize-diff";
import { invoiceSamples, invoiceSteps, BUYER_TITLE } from "@/fixtures/ai/invoice-samples";
import { TODAY } from "@/lib/date";

type TabKey = "follow" | "doc";

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
  const activeTab: TabKey = tab ?? (isDraftStage ? "doc" : "follow");
  const total = contractTotal(c);
  const paid = paidAmount(c);
  const pRatio = paidRatio(c);
  const invAmount = invoicedAmount(c);
  const invRatio = invoicedRatio(c);
  const invCount = c.milestones.filter((m) => m.invoice).length;
  const supplier = supplierById(c.supplierId);
  const partial = deliveryNotes.some((n) => n.contractId === c.id && n.status === "in_progress");
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
          {/* 头卡只放货物轨；款项轨在跟进 Tab 的「付款与发票」里已有一根，不重复 */}
          <div className="flex w-[300px] shrink-0 flex-col gap-2 pr-6">
            <ContractLane stage={stage} danger={overdue > 0} withLabels />
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
              { key: "doc", label: "合同与版本" },
            ]}
            active={activeTab}
            onChange={(k) => setTab(k as TabKey)}
          />
        </div>

        {activeTab === "follow" && (
          <div className="flex min-h-0 flex-1 gap-4">
            <div className="flex min-w-0 flex-[2] flex-col gap-3.5">
              <ContractTimeline contract={c} onRegisterInvoice={(mKey) => setInvoiceMKey(mKey)} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3.5">
              <div className="border-line rounded-card flex flex-col gap-2.5 border bg-white px-4.5 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold">合同文件</div>
                  <button type="button" onClick={() => setTab("doc")} className="text-primary-hover cursor-pointer text-xs font-medium">
                    合同与版本
                  </button>
                </div>
                <div className="text-ink-2 text-[12.5px]">
                  {c.versions.length} 个版本 · 以 {c.versions[c.versions.length - 1]?.id} 为准 · {c.versions[c.versions.length - 1]?.name}
                </div>
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

        {activeTab === "doc" && (
          <div className="flex flex-col gap-3.5">
            <ContractDocSection contract={c} project={project} onUploadVersion={() => setDiffOpen(true)} />
            {advanceLabel && (
              <div className="flex justify-end">
                <Btn
                  variant="primary"
                  onClick={() => {
                    advanceContractStatus(c.id);
                    pushToast(`合同已推进：${advanceLabel}`);
                  }}
                >
                  {advanceLabel}
                </Btn>
              </div>
            )}
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
