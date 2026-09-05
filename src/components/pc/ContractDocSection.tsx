"use client";

// 子合同「合同与版本」区：合同卡（头信息 + 下载 / 上传新版 / 查看合同 + 版本记录）+ AI 重要条目 + 产品明细 + 合同条款，
// 形式与订单接收步的项目合同卡一致：每一版都有 AI 抓取的重要条目，点版本行切换条目并高亮相对上一版的变更，「查看原件」看该版 xlsx。
import { useState } from "react";
import { Check, Download, Eye, FileText, UploadCloud } from "lucide-react";
import type { Contract, Project, Version } from "@/lib/types";
import { fmtDate } from "@/lib/date";
import { diffTerms } from "@/lib/orderTerms";
import { contractXlsxRows, versionTerms } from "@/lib/contractTerms";
import { CONTRACT_STATUS_LABEL, contractTotal, milestoneAmount } from "@/lib/rules";
import { Btn } from "@/components/ui/Btn";
import { StatusPill } from "@/components/ui/StatusPill";
import { Money } from "@/components/ui/Money";
import { XlsxPreviewDialog } from "@/components/ui/XlsxPreviewDialog";
import { AiBadge } from "@/components/ai/AiBadge";
import { ContractLinesTable } from "./ContractLinesTable";
import { supplierById, BUYER } from "@/fixtures/suppliers";
import { templateClauses } from "@/fixtures/ai/contract-template";

const card = "border-line rounded-card border bg-white";

export function ContractDocSection({ contract: c, project, onUploadVersion }: { contract: Contract; project?: Project; onUploadVersion: () => void }) {
  const [selId, setSelId] = useState<string | null>(null);
  const [xlsxVersion, setXlsxVersion] = useState<Version | null>(null);
  const [clausesOpen, setClausesOpen] = useState(false);

  const supplier = supplierById(c.supplierId);
  const total = contractTotal(c);
  const versions = c.versions;
  const latest = versions[versions.length - 1];
  const sel = versions.find((v) => v.id === selId) ?? latest;
  const prevOf = (v: Version): Version | undefined => versions[versions.indexOf(v) - 1];
  const termsOf = (v: Version) => versionTerms(c, v);
  const diffOfVersion = (v: Version) => {
    const p = prevOf(v);
    return diffTerms(p ? termsOf(p) : undefined, termsOf(v));
  };
  const selTerms = sel ? termsOf(sel) : [];
  const selDiff = sel ? diffOfVersion(sel) : [];
  const selChange = new Map(selDiff.map((d) => [d.label, d]));
  const isDraftStage = c.status === "ai_draft" || c.status === "reviewing" || c.status === "finalized";
  const finalVersion = [...versions].reverse().find((v) => v.final);
  const fileName = `${c.no}.xlsx`;
  const rows = [...versions].reverse();

  return (
    <>
      {/* 合同卡：头信息 + 动作 + 版本记录 */}
      <div className={card}>
        <div className="flex items-center gap-4.5 px-5 py-4">
          <div className="bg-primary-soft text-primary-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]">
            <FileText size={21} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="text-[15px] font-bold">采购合同</div>
              <StatusPill tone={finalVersion ? "success" : "info"}>{finalVersion ? "已签章" : CONTRACT_STATUS_LABEL[c.status]}</StatusPill>
              <div className="text-sub text-xs">
                {fileName} · {versions.length} 个版本 · 以 {latest?.id} 为准
              </div>
            </div>
            <div className="text-ink-2 mt-1.5 text-[12.5px]">
              合同号 <span className="font-medium tabular-nums">{c.no}</span> · 卖方 {supplier.name}
              {c.signedAt && ` · 签订 ${c.signedAt}`} · 含税总额{" "}
              {total != null ? <Money value={total} className="font-bold" /> : <span className="text-faint">待补充</span>} · 交货期{" "}
              <span className="font-medium tabular-nums">{c.deliveryDate ?? "另定"}</span>
              {project && ` · 项目 ${project.code}`}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <a href="/samples/contract-sample.xlsx" download={fileName}>
              <Btn variant="secondary">
                <Download size={14} strokeWidth={1.8} />
                下载 xlsx
              </Btn>
            </a>
            <Btn variant="secondary" onClick={onUploadVersion} title="上传双方定稿或签章版，AI 回读比对差异后追加版本">
              <UploadCloud size={14} strokeWidth={1.8} />
              上传新版
            </Btn>
            <Btn variant="primary" onClick={() => setXlsxVersion(finalVersion ?? latest ?? null)}>
              <Eye size={14} strokeWidth={1.8} />
              查看合同
            </Btn>
          </div>
        </div>

        <div className="border-line-soft border-t px-5 pt-2.5 pb-2">
          <div className="text-sub flex items-center gap-2 text-xs font-medium">
            版本记录
            <span className="text-faint font-normal">每一版 AI 自动抓取重要条目 · 点行查看该版条目 · 上传回读的差异在弹窗里先看后确认</span>
          </div>
          <div className="mt-1 flex flex-col">
            {rows.map((v) => {
              const diff = diffOfVersion(v);
              const selected = sel?.id === v.id;
              const terms = termsOf(v);
              return (
                <div
                  key={v.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelId(v.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSelId(v.id);
                  }}
                  className={`-mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-[13px] ${selected ? "bg-line-soft" : "hover:bg-page"}`}
                >
                  {v.final ? (
                    <span className="bg-success flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full">
                      <Check size={10} strokeWidth={3.2} className="text-white" />
                    </span>
                  ) : v.ai ? (
                    <span className="bg-ai-bg text-ai-deep flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                      AI
                    </span>
                  ) : (
                    <span className="bg-line-soft h-[18px] w-[18px] shrink-0 rounded-full" />
                  )}
                  <span className={`w-[230px] shrink-0 truncate ${v.final || selected ? "font-medium" : ""}`}>{v.name}</span>
                  <span className="text-sub w-[150px] shrink-0 text-[12px]">
                    {fmtDate(v.at)} · {v.by}
                  </span>
                  <span className="w-[170px] shrink-0">
                    <StatusPill tone="ai">
                      AI 已抓取 {terms.length} 项 · {fmtDate(v.aiAt ?? v.at)}
                    </StatusPill>
                  </span>
                  <span className="text-sub min-w-0 flex-1 truncate text-[12.5px]">
                    {v.final ? "双方签章版" : !prevOf(v) ? (v.ai ? "按标准模板生成" : "首版") : diff.length > 0 ? `相对 ${prevOf(v)?.id} 变更 ${diff.length} 项` : "无条款变更"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setXlsxVersion(v);
                    }}
                    className="text-primary-hover shrink-0 cursor-pointer text-xs font-medium"
                  >
                    查看原件
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 重要条目：所选版本抓取到的条目；相对上一版改过的高亮并留原值 */}
      {sel && (
        <div className={`${card} px-5 py-4.5`}>
          <div className="flex items-center gap-2.5">
            <div className="text-sm font-bold">重要条目</div>
            <AiBadge text="AI 提取" />
            <span className="text-sub text-xs">
              {sel.name} · 抓取于 {fmtDate(sel.aiAt ?? sel.at)}
              {prevOf(sel) ? ` · 相对 ${prevOf(sel)!.id} 变更 ${selDiff.length} 项` : ` · 共 ${selTerms.length} 项`} · 以签章原件为准
            </span>
            {latest && sel.id !== latest.id && (
              <button type="button" onClick={() => setSelId(null)} className="text-primary-hover ml-auto cursor-pointer text-xs font-medium">
                回到最新版 {latest.id}
              </button>
            )}
          </div>
          <div className="mt-3.5 grid grid-cols-4 gap-3">
            {selTerms.map((k) => {
              const ch = selChange.get(k.label);
              return (
                <div key={k.label} className={`rounded-[10px] px-3.5 py-3 ${ch ? "bg-info-bg" : "bg-page"}`}>
                  <div className="flex items-center gap-2">
                    <div className="text-sub text-xs">{k.label}</div>
                    {ch && <StatusPill tone="info">{sel.id} 更新</StatusPill>}
                  </div>
                  <div className="mt-1 text-[13px] leading-snug font-medium">{k.value}</div>
                  {ch && <div className="text-faint mt-1 text-[11.5px] line-through">原 {ch.from}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 产品明细：草稿阶段可填单价，签订后只读 */}
      <div className={`${card} flex flex-col overflow-hidden`}>
        <div className="border-line-soft flex items-center justify-between border-b px-5.5 py-3.5">
          <div className="text-[15px] font-bold">
            产品明细{" "}
            <span className="text-sub text-[12.5px] font-normal">
              {c.lines.length} 项 · {isDraftStage ? "草稿可编辑，单价输入后行金额与合计实时计算" : "已签订，只读"}
              {project ? ` · 关联清单「${project.code}」` : ""}
            </span>
          </div>
          <span className="text-primary-hover text-[12.5px]">查看技术附件</span>
        </div>
        <ContractLinesTable contract={c} editable={c.status === "ai_draft" || c.status === "reviewing"} />
      </div>

      {/* 合同条款（标准模板）+ 签章区：默认收起，只留标题行 */}
      <div className={`${card} px-5.5 py-4`}>
        <button type="button" onClick={() => setClausesOpen((v) => !v)} className="flex w-full cursor-pointer items-center gap-2.5 text-left">
          <div className="text-sm font-bold">合同条款</div>
          <span className="text-sub text-xs">标准模板 {templateClauses.length} 条 · 第 8 条付款与开票按本合同金额列出四笔款项</span>
          <span className="text-primary-hover ml-auto text-xs font-medium">{clausesOpen ? "收起" : "展开"}</span>
        </button>
        {clausesOpen && (
          <div className="mt-3 flex flex-col gap-3.5">
            {templateClauses.map((cl) => (
              <div key={cl.title} className="border-line-soft border-t pt-3">
                <div className="text-[13px] font-bold">{cl.title}</div>
                <div className="text-ink-2 mt-1.5 text-[13px] leading-[1.9]">{cl.body}</div>
                {cl.title.startsWith("第 8 条") && (
                  <div className="border-line-soft mt-3 overflow-hidden rounded-[10px] border">
                    {c.milestones.map((m, i) => (
                      <div key={m.key} className={`flex items-center px-4 py-2.5 text-[13px] ${i < 3 ? "border-page border-b" : ""}`}>
                        <div className="w-40 font-medium">
                          {m.key} {m.label} {Math.round(m.ratio * 100)}%
                        </div>
                        <div className="text-ink-2 flex-1 text-[12.5px]">{m.condition}</div>
                        <div className="w-32 text-right font-bold tabular-nums">{total != null ? <Money value={milestoneAmount(total, m.ratio)} /> : "—"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="border-line-soft border-t pt-3">
              <div className="text-[13px] font-bold">签章区</div>
              <div className="mt-2.5 flex gap-8">
                <div className="flex-1">
                  <div className="text-sub text-xs">买方（盖章）</div>
                  <div className="mt-1 text-[13.5px] font-bold">{BUYER.name}</div>
                  <div className="text-ink-2 mt-1 text-[12.5px]">
                    经办：{BUYER.contactName} · {BUYER.phone} · {BUYER.email}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sub text-xs">卖方（盖章）</div>
                  <div className="mt-1 text-[13.5px] font-bold">{supplier.name}</div>
                  <div className="text-ink-2 mt-1 text-[12.5px]">
                    经办：{c.sellerContactName} · {c.sellerContactPhone}
                    {supplier.address ? ` · ${supplier.address}` : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <XlsxPreviewDialog
        open={!!xlsxVersion}
        onClose={() => setXlsxVersion(null)}
        fileName={xlsxVersion ? `${c.no}-${xlsxVersion.id}.xlsx` : fileName}
        sheetName="合同"
        rows={xlsxVersion ? contractXlsxRows(c, termsOf(xlsxVersion)) : []}
        downloadHref="/samples/contract-sample.xlsx"
        downloadName={fileName}
      />
    </>
  );
}
