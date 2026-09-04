"use client";

// 订单接收步：项目合同卡（头信息 + 动作 + 版本记录）+ 重要条目。
// 每一版上传后都由 AI 抓取重要条目并记在版本上（行里显示「AI 已抓取 n 项 · 日期」）；
// 版本行只放状态与变更数，点行后重要条目切到那一版并高亮它相对上一版的变更。没有合同时是上传入口；
// 上传（签章版首版或补充协议）走统一的 AI 解析弹窗，看过抓取结果再确认入库。
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Download, Eye, FileSpreadsheet, UploadCloud } from "lucide-react";
import type { Contract, KeyTerm, OrderContract, OrderVersion, Project } from "@/lib/types";
import { fmtDate } from "@/lib/date";
import { fmtNum } from "@/lib/money";
import { diffTerms, processedVersions, simulateOrderParse, termValue, type ParsedOrder, type TermDiff } from "@/lib/orderTerms";
import { Btn } from "@/components/ui/Btn";
import { StatusPill } from "@/components/ui/StatusPill";
import { Money } from "@/components/ui/Money";
import { EmptyState } from "@/components/ui/EmptyState";
import { XlsxPreviewDialog, type XlsxCell } from "@/components/ui/XlsxPreviewDialog";
import { AiBadge } from "@/components/ai/AiBadge";
import { AiSimDialog } from "@/components/ai/AiSimDialog";
import { BUYER } from "@/fixtures/suppliers";
import { useAppStore } from "@/store/useAppStore";

const card = "border-line rounded-card border bg-white";

/** 项目合同原件的模拟 xlsx；交货期与交付范围取所看版本抓取到的条目 */
function orderXlsxRows(oc: OrderContract, terms: KeyTerm[]): XlsxCell[][] {
  const scope = termValue(terms, "交付范围") ?? "成套设备";
  const deadline = termValue(terms, "交货期") ?? oc.deliveryDeadline;
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
    [{ t: `交货期：${deadline}；卖方负责运抵买方指定现场并指导安装调试`, span: 7 }],
    [{ t: "验收：72 小时连续负荷试车合格；质保期：验收合格之日起 12 个月", span: 7 }],
    [
      { t: "买方（盖章）：", span: 4 },
      { t: "卖方（盖章）：", span: 3 },
    ],
  ];
}

/** 补充协议 / 附件版本的模拟 xlsx：只列相对上一版的变更 */
function supplementXlsxRows(oc: OrderContract, v: OrderVersion, diff: TermDiff[]): XlsxCell[][] {
  return [
    [{ t: "补 充 协 议", span: 4, bold: true, center: true }],
    [
      { t: `原合同编号：${oc.no}`, span: 2 },
      { t: `签订日期：${v.at}`, span: 2 },
    ],
    [{ t: `买方（需方）：${oc.customer}`, span: 4 }],
    [{ t: `卖方（供方）：${BUYER.name}`, span: 4 }],
    [{ t: "经双方协商一致，对原合同作如下变更：", span: 4, bold: true }],
    [
      { t: "序号", head: true, center: true },
      { t: "条款", head: true },
      { t: "原约定", head: true },
      { t: "变更为", head: true },
    ],
    ...diff.map((c, i) => [{ t: String(i + 1), center: true }, { t: c.label }, { t: c.from }, { t: c.to }]),
    [{ t: "本补充协议为原合同不可分割的组成部分，未变更条款仍按原合同执行。", span: 4 }],
    [
      { t: "买方（盖章）：", span: 2 },
      { t: "卖方（盖章）：", span: 2 },
    ],
  ];
}

/** AI 解析弹窗里的结果预览：头部字段 + 抓取到的重要条目（有上一版时高亮变更） */
function ParsePreview({ parsed, hasPrev }: { parsed: ParsedOrder; hasPrev: boolean }) {
  const changed = new Set(parsed.diff.map((d) => d.label));
  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-line-soft grid grid-cols-2 gap-x-6 gap-y-2 rounded-[10px] border bg-[#FBFAF9] px-4 py-3.5 text-[13px]">
        <div>
          <span className="text-sub">合同号 </span>
          <span className="font-bold tabular-nums">{parsed.header.no}</span>
        </div>
        <div>
          <span className="text-sub">签订 </span>
          {parsed.header.signedAt}
        </div>
        <div className="col-span-2">
          <span className="text-sub">客户 </span>
          {parsed.header.customer}
        </div>
        <div>
          <span className="text-sub">含税总额 </span>
          <Money value={parsed.header.amountInclTax} className="font-bold" />
        </div>
        <div>
          <span className="text-sub">交货期 </span>
          <span className={changed.has("交货期") ? "text-info-deep font-bold" : ""}>{parsed.header.deliveryDeadline}</span>
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2 text-[13px] font-bold">
          {parsed.version.name}
          <AiBadge text={`AI 抓取 ${parsed.version.keyTerms.length} 项`} />
          {hasPrev && <span className="text-sub text-xs font-normal">相对当前版本变更 {parsed.diff.length} 项</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {parsed.version.keyTerms.map((k) => {
            const d = parsed.diff.find((x) => x.label === k.label);
            return (
              <div key={k.label} className={`rounded-[10px] px-3 py-2.5 ${d ? "bg-info-bg" : "bg-page"}`}>
                <div className="text-sub text-[11px]">
                  {k.label}
                  {d && <span className="text-info-deep ml-1.5 font-medium">变更</span>}
                </div>
                <div className="mt-0.5 text-[12.5px] leading-snug font-medium">{k.value}</div>
                {d && <div className="text-faint mt-0.5 text-[11px] line-through">原 {d.from}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function OrderContractStep({
  project,
  signedContracts,
  onGoStep,
}: {
  project: Project;
  signedContracts: Contract[];
  onGoStep: (n: 4 | 5) => void;
}) {
  const addOrderContractVersion = useAppStore((s) => s.addOrderContractVersion);
  const [selId, setSelId] = useState<string | null>(null);
  const [xlsxVersion, setXlsxVersion] = useState<OrderVersion | null>(null);
  const [parseOpen, setParseOpen] = useState(false);

  const oc = project.orderContract;
  const processed = processedVersions(oc);
  const latest = processed[processed.length - 1];
  const sel = processed.find((v) => v.id === selId) ?? latest;
  const prevOf = (v: OrderVersion): OrderVersion | undefined => processed[processed.indexOf(v) - 1];
  const diffOfVersion = (v: OrderVersion) => (v.aiAt ? diffTerms(prevOf(v)?.keyTerms, v.keyTerms) : []);
  const selDiff = sel ? diffOfVersion(sel) : [];
  const selChange = new Map(selDiff.map((d) => [d.label, d]));
  const latestDiff = latest ? diffOfVersion(latest) : [];
  const deadlineChange = latestDiff.find((d) => d.label === "交货期");
  const late = oc ? signedContracts.filter((c) => c.deliveryDate && c.deliveryDate > oc.deliveryDeadline) : [];
  // 弹窗预览按当前状态模拟一次解析（纯函数；确认入库时 store 再算一次，结果一致）
  const parsed = simulateOrderParse(project);

  const parseDialog = (
    <AiSimDialog
      open={parseOpen}
      onClose={() => setParseOpen(false)}
      title={latest ? "项目合同新版解析" : "项目合同解析"}
      steps={
        latest
          ? ["正在读取合同文档…", "识别合同号、客户、金额、交货期…", "抓取重要条目…", "与当前版本比对变更…"]
          : ["正在读取合同文档…", "识别合同号、客户、金额、交货期…", "抓取重要条目…", "建立版本记录…"]
      }
      uploadHint="支持 xlsx / pdf / 图片，演示中不读取文件内容"
      renderResult={() => <ParsePreview parsed={parsed} hasPrev={!!latest} />}
      confirmLabel="确认入库"
      onConfirm={() => {
        addOrderContractVersion(project.id);
        setParseOpen(false);
        setSelId(null);
      }}
    />
  );

  if (!oc || !latest) {
    return (
      <>
        <div className={`${card} flex flex-col items-center py-10`}>
          <EmptyState
            icon={<FileSpreadsheet size={30} strokeWidth={1.5} className="text-[#CFCCCA]" />}
            text={oc ? "项目合同已上传，AI 尚未抓取重要条目" : "项目已建档 · 上传客户签章的项目合同，AI 自动抓取合同号、金额、交货期与重要条目"}
          />
          <Btn variant="primary" onClick={() => setParseOpen(true)}>
            <UploadCloud size={14} strokeWidth={1.8} />
            上传项目合同 xlsx
          </Btn>
        </div>
        {parseDialog}
      </>
    );
  }

  const signedVersion = processed.find((v) => v.final) ?? processed[0];
  const rows = [...oc.versions].reverse();

  return (
    <>
      {/* 项目合同卡：头信息 + 动作 + 版本记录 */}
      <div className={card}>
        <div className="flex items-center gap-4.5 px-5 py-4">
          <div className="bg-primary-soft text-primary-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]">
            <FileSpreadsheet size={21} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="text-[15px] font-bold">项目合同</div>
              <StatusPill tone="success">已签章</StatusPill>
              <div className="text-sub text-xs">
                {oc.fileName} · {oc.versions.length} 个版本 · 以 {latest.id} 为准
              </div>
            </div>
            <div className="text-ink-2 mt-1.5 text-[12.5px]">
              合同号 <span className="font-medium tabular-nums">{oc.no}</span> · 客户 {oc.customer} · 签订 {oc.signedAt} · 含税总额{" "}
              <Money value={oc.amountInclTax} className="font-bold" /> · 交货期 <span className="font-medium tabular-nums">{oc.deliveryDeadline}</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <a href="/samples/contract-sample.xlsx" download={oc.fileName}>
              <Btn variant="secondary">
                <Download size={14} strokeWidth={1.8} />
                下载 xlsx
              </Btn>
            </a>
            <Btn variant="secondary" onClick={() => setParseOpen(true)}>
              <UploadCloud size={14} strokeWidth={1.8} />
              上传新版
            </Btn>
            <Btn variant="primary" onClick={() => setXlsxVersion(signedVersion ?? null)}>
              <Eye size={14} strokeWidth={1.8} />
              查看合同
            </Btn>
          </div>
        </div>

        <div className="border-line-soft border-t px-5 pt-2.5 pb-2">
          <div className="text-sub flex items-center gap-2 text-xs font-medium">
            版本记录
            <span className="text-faint font-normal">每一版上传后 AI 自动抓取重要条目 · 点行查看该版条目</span>
          </div>
          <div className="mt-1 flex flex-col">
            {rows.map((v) => {
              const diff = diffOfVersion(v);
              const selected = sel?.id === v.id;
              return (
                <div
                  key={v.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => v.aiAt && setSelId(v.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && v.aiAt) setSelId(v.id);
                  }}
                  className={`-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 text-[13px] ${v.aiAt ? "cursor-pointer" : ""} ${selected ? "bg-line-soft" : v.aiAt ? "hover:bg-page" : ""}`}
                >
                  {v.final ? (
                    <span className="bg-success flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full">
                      <Check size={10} strokeWidth={3.2} className="text-white" />
                    </span>
                  ) : (
                    <span className="bg-line-soft h-[18px] w-[18px] shrink-0 rounded-full" />
                  )}
                  <span className={`w-[230px] shrink-0 truncate ${v.final || selected ? "font-medium" : ""}`}>{v.name}</span>
                  <span className="text-sub w-[150px] shrink-0 text-[12px]">
                    {fmtDate(v.at)} · {v.by}
                  </span>
                  <span className="w-[170px] shrink-0">
                    {v.aiAt ? (
                      <StatusPill tone="ai">
                        AI 已抓取 {v.keyTerms.length} 项 · {fmtDate(v.aiAt)}
                      </StatusPill>
                    ) : (
                      <StatusPill tone="neutral">AI 未抓取</StatusPill>
                    )}
                  </span>
                  <span className="text-sub min-w-0 flex-1 truncate text-[12.5px]">
                    {v.final ? "签章原件" : !v.aiAt ? "—" : diff.length > 0 ? `相对 ${prevOf(v)?.id ?? "上一版"} 变更 ${diff.length} 项` : "无条款变更"}
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

      {/* 重要条目：所选版本抓取到的条目；相对上一版改过的高亮并留原值；交货期变了给子合同影响提示 */}
      {sel && (
        <div className={`${card} px-5 py-4.5`}>
          <div className="flex items-center gap-2.5">
            <div className="text-sm font-bold">重要条目</div>
            <AiBadge text="AI 提取" />
            <span className="text-sub text-xs">
              {sel.name} · 抓取于 {fmtDate(sel.aiAt)}
              {prevOf(sel) ? ` · 相对 ${prevOf(sel)!.id} 变更 ${selDiff.length} 项` : ` · 共 ${sel.keyTerms.length} 项`} · 以签章原件为准
            </span>
            {sel.id !== latest.id && (
              <button type="button" onClick={() => setSelId(null)} className="text-primary-hover ml-auto cursor-pointer text-xs font-medium">
                回到最新版 {latest.id}
              </button>
            )}
          </div>
          <div className="mt-3.5 grid grid-cols-4 gap-3">
            {sel.keyTerms.map((k) => {
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
          {sel.id === latest.id && deadlineChange && (
            <div
              className={`mt-3 flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-[12.5px] ${
                late.length > 0 ? "bg-danger-bg text-danger-deep" : signedContracts.length > 0 ? "bg-success-bg text-success-deep" : "bg-page text-ink-2"
              }`}
            >
              {late.length > 0 ? <AlertTriangle size={14} strokeWidth={1.8} className="shrink-0" /> : <Check size={14} strokeWidth={2.4} className="shrink-0" />}
              <span className="min-w-0 flex-1 truncate">
                {late.length > 0 ? (
                  <>
                    交货期调整为 {deadlineChange.to} 后，{late.length} 份已签子合同交货期晚于新截止：
                    {late.map((c) => (
                      <Link key={c.id} href={`/contracts/${c.id}`} className="ml-1 font-medium tabular-nums hover:underline">
                        {c.no}
                      </Link>
                    ))}{" "}
                    · 需与卖方确认
                  </>
                ) : signedContracts.length > 0 ? (
                  <>
                    交货期调整为 {deadlineChange.to} · 已签 {signedContracts.length} 份子合同交货期均不晚于新截止，无需调整
                  </>
                ) : (
                  <>交货期调整为 {deadlineChange.to} · 尚无已签子合同，后续子合同交货期以此为准</>
                )}
              </span>
              <Btn variant="secondary" size="sm" onClick={() => onGoStep(signedContracts.length > 0 ? 5 : 4)}>
                {signedContracts.length > 0 ? "去交货跟进" : "去子合同"}
              </Btn>
            </div>
          )}
        </div>
      )}

      <XlsxPreviewDialog
        open={!!xlsxVersion}
        onClose={() => setXlsxVersion(null)}
        fileName={xlsxVersion && !xlsxVersion.final && prevOf(xlsxVersion) ? `${project.code}项目合同-${xlsxVersion.id}补充协议.xlsx` : oc.fileName}
        sheetName={xlsxVersion && !xlsxVersion.final && prevOf(xlsxVersion) ? "补充协议" : "合同"}
        rows={
          xlsxVersion
            ? !xlsxVersion.final && prevOf(xlsxVersion)
              ? supplementXlsxRows(oc, xlsxVersion, diffOfVersion(xlsxVersion))
              : orderXlsxRows(oc, xlsxVersion.aiAt ? xlsxVersion.keyTerms : latest.keyTerms)
            : []
        }
        downloadHref="/samples/contract-sample.xlsx"
        downloadName={oc.fileName}
      />
      {parseDialog}
    </>
  );
}
