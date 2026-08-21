"use client";

// 订单合同（总合同）页：查看条款、版本记录、更新版本、下载 xlsx
import { useParams } from "next/navigation";
import { Download, UploadCloud } from "lucide-react";
import { Topbar, Crumb, CrumbLink } from "@/components/shell/Topbar";
import { Btn } from "@/components/ui/Btn";
import { StatusPill } from "@/components/ui/StatusPill";
import { Money } from "@/components/ui/Money";
import { VersionList } from "@/components/pc/VersionList";
import { useAppStore } from "@/store/useAppStore";
import { ORDER_TERMS } from "@/fixtures/projects";
import { exclTax } from "@/lib/money";
import { BUYER } from "@/fixtures/suppliers";

export default function OrderContractPage() {
  const { id } = useParams<{ id: string }>();
  const project = useAppStore((s) => s.projects.find((p) => p.id === id));
  const addOrderContractVersion = useAppStore((s) => s.addOrderContractVersion);
  const pushToast = useAppStore((s) => s.pushToast);

  if (!project) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Topbar backHref="/projects" crumbs={<Crumb>项目管理</Crumb>} />
        <div className="text-sub p-10 text-center text-sm">未找到该项目</div>
      </div>
    );
  }

  const oc = project.orderContract;

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar
        backHref={`/projects/${project.id}`}
        crumbs={
          <>
            <CrumbLink href="/projects">项目管理</CrumbLink> / <CrumbLink href={`/projects/${project.id}`}>{project.code}</CrumbLink> /{" "}
            <Crumb>订单合同</Crumb>
          </>
        }
        actions={
          <>
            <a href="/samples/contract-sample.xlsx" download={oc.fileName}>
              <Btn variant="secondary">
                <Download size={14} strokeWidth={1.8} />
                下载 xlsx
              </Btn>
            </a>
            <Btn variant="primary" onClick={() => document.getElementById("order-upload")?.click()}>
              <UploadCloud size={14} strokeWidth={1.8} />
              更新合同（上传新版）
            </Btn>
            <input
              id="order-upload"
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  addOrderContractVersion(project.id);
                  pushToast(`订单合同已更新：v${oc.versions.length + 1}`);
                  e.target.value = "";
                }
              }}
            />
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-3.5 p-6">
        {/* 头卡 */}
        <div className="border-line rounded-card flex items-center gap-3.5 border bg-white px-5.5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="text-[19px] font-bold tabular-nums">{oc.no}</div>
              <StatusPill tone="success">已签章</StatusPill>
              {project.closedAt && <StatusPill tone="neutral">项目已结束</StatusPill>}
            </div>
            <div className="text-sub mt-1.5 text-[12.5px]">
              客户（买方）{oc.customer} · 供方 {BUYER.name} · 签订 {oc.signedAt} · 交货期 {oc.deliveryDeadline} · 文件 {oc.fileName}
            </div>
          </div>
          <div className="flex-1" />
          <div className="shrink-0 text-right">
            <div className="text-sub text-xs">含税总额（13%）</div>
            <div className="mt-0.5 text-[19px] font-bold">
              <Money value={oc.amountInclTax} />
            </div>
            <div className="text-faint text-[11.5px] tabular-nums">
              不含税 <Money value={exclTax(oc.amountInclTax)} />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          {/* 条款 */}
          <div className="flex min-w-0 flex-[2] flex-col gap-3.5">
            {ORDER_TERMS.map((t) => (
              <div key={t.title} className="border-line rounded-card border bg-white px-5.5 py-4.5">
                <div className="text-sm font-bold">{t.title}</div>
                <div className="text-ink-2 mt-2 text-[13px] leading-[1.9]">{t.body}</div>
              </div>
            ))}
            <div className="border-line rounded-card border bg-white px-5.5 py-4.5">
              <div className="text-sm font-bold">签章区</div>
              <div className="mt-3 flex gap-8">
                <div className="flex-1">
                  <div className="text-sub text-xs">买方（盖章）</div>
                  <div className="mt-1.5 text-[13.5px] font-bold">{oc.customer}</div>
                </div>
                <div className="flex-1">
                  <div className="text-sub text-xs">卖方（盖章）</div>
                  <div className="mt-1.5 text-[13.5px] font-bold">{BUYER.name}</div>
                  <div className="text-ink-2 mt-1 text-[12.5px]">
                    经办：{BUYER.contactName} · {BUYER.phone}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 版本记录 */}
          <div className="flex min-w-0 flex-1 flex-col gap-3.5 self-start">
            <div className="border-line rounded-card flex flex-col gap-2.5 border bg-white px-4.5 py-3.5">
              <div className="text-sm font-bold">版本记录</div>
              <VersionList versions={oc.versions} />
            </div>
            <div className="border-line rounded-card border bg-white px-4.5 py-3.5">
              <div className="text-sm font-bold">关联信息</div>
              <div className="text-ink-2 mt-2 flex flex-col gap-1.5 text-[12.5px]">
                <div>项目 {project.code} {project.name}</div>
                <div>项目负责人 {project.owner}</div>
                <div>下游采购合同以本合同交货与付款节点为约束</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
