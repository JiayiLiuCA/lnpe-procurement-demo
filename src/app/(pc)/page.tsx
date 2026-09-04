"use client";

// 工作台
import Link from "next/link";
import { kpis } from "@/fixtures/kpis";
import { fmtMoney } from "@/lib/money";
import { KpiCard } from "@/components/ui/KpiCard";
import { Topbar, Crumb } from "@/components/shell/Topbar";
import { TodoList } from "@/components/pc/TodoList";
import { PaymentPlanPanel } from "@/components/pc/PaymentPlanPanel";
import { ProjectWallRow } from "@/components/pc/ProjectWallRow";
import { StepHeader, STEP_COL_W } from "@/components/ui/StepProgress";
import { useAppStore } from "@/store/useAppStore";

export default function DashboardPage() {
  const allTodos = useAppStore((s) => s.todos);
  const projects = useAppStore((s) => s.projects);
  const todos = allTodos.filter((t) => !t.done);

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar
        crumbs={
          <span className="flex items-center gap-4">
            <Crumb>工作台</Crumb>
            <span className="text-sub text-[12.5px]">2026-08-20 星期四</span>
          </span>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex gap-4">
          <KpiCard label="执行中合同" value={kpis.executing.count} valueSuffix="份" sub={`合同总额 ${fmtMoney(kpis.executing.total)}`} />
          <KpiCard
            label="近 30 天应付"
            value={fmtMoney(kpis.payable30d.amount)}
            sub={
              <>
                {kpis.payable30d.count} 笔 · 其中 <span className="text-danger-deep font-medium">临期 {kpis.payable30d.dueSoon} 笔</span>
              </>
            }
          />
          <KpiCard
            label="交货逾期"
            value={kpis.deliveryOverdue.count}
            valueSuffix="份合同"
            valueClassName="text-danger"
            sub={
              <>
                最长已逾期 <span className="text-danger-deep font-medium">{kpis.deliveryOverdue.maxOverdueDays} 天</span>
              </>
            }
          />
          <KpiCard
            label="待收货送货单"
            value={kpis.toReceive.notes}
            valueSuffix={`张 · ${kpis.toReceive.pieces} 件`}
            sub={`今日预计到货 ${kpis.toReceive.todayNotes} 张`}
          />
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="border-line rounded-card flex flex-[1.55] flex-col overflow-hidden border bg-white">
            <div className="border-line-soft flex items-center justify-between border-b px-4.5 py-3.5">
              <div className="text-[15px] font-bold">
                我的待办 <span className="text-danger">{todos.length}</span>
              </div>
              <Link href="/notifications" className="text-primary-hover text-[12.5px]">
                全部待办
              </Link>
            </div>
            <TodoList todos={todos} />
          </div>
          <PaymentPlanPanel />
        </div>

        <div className="border-line rounded-card flex shrink-0 flex-col overflow-hidden border bg-white">
          <div className="border-line-soft flex items-center justify-between border-b px-4.5 py-3.5">
            <div className="text-[15px] font-bold">项目进度</div>
            <Link href="/projects" className="text-primary-hover text-[12.5px]">
              全部项目
            </Link>
          </div>
          <div className="text-sub border-line-soft flex items-end border-b bg-[#FBFAF9] px-4.5 py-2 text-xs font-medium">
            <div className="w-[90px]">项目号</div>
            <div className="w-[210px]">项目名称</div>
            <div className="shrink-0" style={{ width: STEP_COL_W }}>
              <StepHeader />
            </div>
            <div className="flex-1 px-3">进展</div>
            <div className="w-[70px]">负责人</div>
          </div>
          {projects.map((p, i) => (
            <ProjectWallRow key={p.id} project={p} isLast={i === projects.length - 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
