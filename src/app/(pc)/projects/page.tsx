"use client";

// 项目列表 + AI 流程 1：新建项目（上传订单合同）+ 导入已有项目入口（仅演示）
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderInput, UploadCloud } from "lucide-react";
import { Topbar, Crumb } from "@/components/shell/Topbar";
import { Btn } from "@/components/ui/Btn";
import { StepHeader, StepIcons, StepSummary, STEP_COL_W } from "@/components/ui/StepProgress";
import { Money } from "@/components/ui/Money";
import { MilestoneBar } from "@/components/ui/MilestoneBar";
import { AiSimDialog } from "@/components/ai/AiSimDialog";
import { ImportProjectDialog } from "@/components/pc/ImportProjectDialog";
import { useAppStore } from "@/store/useAppStore";
import { orderParse } from "@/fixtures/ai/order-parse";
import { fmtNum } from "@/lib/money";

type Filter = "all" | "open" | "closed";

function OrderParseResult() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="border-line-soft grid grid-cols-2 gap-x-6 gap-y-2 rounded-[10px] border bg-[#FBFAF9] px-4 py-3.5 text-[13px]">
        <div>
          <span className="text-sub">合同号：</span>
          <span className="font-bold tabular-nums">{orderParse.contractNo}</span>
        </div>
        <div>
          <span className="text-sub">签订日期：</span>
          {orderParse.signedAt}
        </div>
        <div>
          <span className="text-sub">买方：</span>
          {orderParse.buyer}
        </div>
        <div>
          <span className="text-sub">交货期：</span>
          {orderParse.deliveryDate}
        </div>
        <div>
          <span className="text-sub">卖方：</span>
          {orderParse.seller}
        </div>
        <div>
          <span className="text-sub">识别项目：</span>
          {orderParse.projectCode} {orderParse.projectName}
        </div>
      </div>
      <div className="border-line-soft overflow-hidden rounded-[10px] border">
        <div className="text-sub border-line-soft flex border-b bg-[#FBFAF9] px-3.5 py-2 text-xs font-medium">
          <div className="flex-1">品名 / 规格</div>
          <div className="w-16">数量</div>
          <div className="w-24 text-right">单价</div>
          <div className="w-28 text-right">金额</div>
        </div>
        {orderParse.lines.map((l) => (
          <div key={l.name} className="border-page flex items-center border-b px-3.5 py-2 text-[13px] last:border-b-0">
            <div className="flex-1">
              <div className="font-medium">{l.name}</div>
              <div className="text-sub text-xs">{l.spec}</div>
            </div>
            <div className="w-16 tabular-nums">
              {l.qty} {l.unit}
            </div>
            <div className="w-24 text-right tabular-nums">{fmtNum(l.unitPrice)}</div>
            <div className="w-28 text-right font-bold tabular-nums">{fmtNum(l.qty * l.unitPrice)}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-6 text-[13px]">
        <div>
          含税总额（13%）<Money value={orderParse.amountInclTax} className="font-bold" />
        </div>
        <div className="text-sub">
          不含税 <Money value={orderParse.amountExclTax} />
        </div>
      </div>
      <div className="bg-info-bg flex flex-col gap-2 rounded-[10px] px-4 py-3">
        <div className="text-info-deep text-[12.5px] font-medium">{orderParse.paymentTerms}</div>
        <MilestoneBar
          milestones={[
            { key: "M1", ratio: 0.1, label: "预付款", condition: "", status: "not_started" },
            { key: "M2", ratio: 0.5, label: "发货款", condition: "", status: "not_started" },
            { key: "M3", ratio: 0.3, label: "验收款", condition: "", status: "not_started" },
            { key: "M4", ratio: 0.1, label: "质保金", condition: "", status: "not_started" },
          ]}
          height={8}
          withLabels
        />
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const upsertOrderParse = useAppStore((s) => s.upsertOrderParse);
  const pushToast = useAppStore((s) => s.pushToast);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const openProjects = projects.filter((p) => !p.closedAt);
  const closedProjects = projects.filter((p) => p.closedAt);
  const shown = filter === "open" ? openProjects : filter === "closed" ? closedProjects : projects;

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar
        crumbs={<Crumb>项目管理</Crumb>}
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="secondary" onClick={() => setImportOpen(true)}>
              <FolderInput size={14} strokeWidth={1.8} />
              导入已有项目
            </Btn>
            <Btn variant="primary" onClick={() => setDialogOpen(true)}>
              <UploadCloud size={14} strokeWidth={1.8} />
              新建项目（上传订单合同）
            </Btn>
          </div>
        }
      />
      <div className="flex flex-1 flex-col gap-3.5 p-6">
        <div className="flex items-center gap-2">
          {(
            [
              ["all", `全部 ${projects.length}`],
              ["open", `进行中 ${openProjects.length}`],
              ["closed", `已结束 ${closedProjects.length}`],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`cursor-pointer rounded-full px-3 py-1.25 text-[12.5px] font-medium ${
                filter === k ? "bg-ink text-white" : "border-line text-ink-2 border bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="border-line rounded-card flex flex-col overflow-hidden border bg-white">
          <div className="text-sub border-line-soft flex items-end border-b bg-[#FBFAF9] px-4.5 py-2 text-xs font-medium">
            <div className="w-[80px]">项目号</div>
            <div className="w-[210px]">项目名称</div>
            <div className="w-[90px]">立项时间</div>
            <div className="shrink-0" style={{ width: STEP_COL_W }}>
              <StepHeader />
            </div>
            <div className="flex-1 px-3">进展</div>
            <div className="w-[64px]">负责人</div>
          </div>
          {shown.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => router.push(`/projects/${p.id}`)}
              className={`hover:bg-page/60 flex cursor-pointer items-center px-4.5 py-3 text-left text-[13px] ${
                i < shown.length - 1 ? "border-page border-b" : ""
              } ${p.closedAt ? "opacity-75" : ""}`}
            >
              <div className="w-[80px] font-bold tabular-nums">{p.code}</div>
              <div className="w-[210px] pr-2">{p.name}</div>
              <div className="text-ink-2 w-[90px] tabular-nums">{p.orderedAt.slice(2)}</div>
              <div className="shrink-0" style={{ width: STEP_COL_W }}>
                <StepIcons project={p} />
              </div>
              <StepSummary project={p} className="text-ink-2 min-w-0 flex-1 truncate px-3 text-[12.5px]" />
              <div className="text-ink-2 w-[64px]">{p.owner}</div>
            </button>
          ))}
          {shown.length === 0 && <div className="text-faint py-8 text-center text-[13px]">无符合条件的项目</div>}
        </div>
      </div>

      <ImportProjectDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <AiSimDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="订单合同解析"
        steps={orderParse.steps}
        uploadHint="支持 xlsx / pdf / 图片，演示中不读取文件内容"
        renderResult={() => <OrderParseResult />}
        confirmLabel="确认入库"
        onConfirm={() => {
          upsertOrderParse();
          pushToast("解析入库成功：项目 260227 · 合同 1 份");
          setDialogOpen(false);
          router.push("/projects/p-260227");
        }}
      />
    </div>
  );
}
