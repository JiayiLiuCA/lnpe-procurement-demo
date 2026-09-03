"use client";

// 单一全局 store：种子数据 + 全部动作 + toast。
// 派生 vs 写死的统一原则：凡能由种子数据推导的（倒计时、付款计划、
// 清单各 Tab 计数、送货单"x 类 y 件"、里程碑金额）一律派生；
// 仅工作台 4 张 KPI 卡取自 fixtures/kpis.ts 常量（全量口径，demo 只建模 9 份合同）。
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Activity,
  Checklist,
  Contract,
  DeliveryLine,
  DeliveryNote,
  Invoice,
  MilestoneKey,
  Project,
  Todo,
} from "@/lib/types";
import { TODAY, fmtDate } from "@/lib/date";
import { CONTRACT_STATUS_ORDER, deriveArrivalDeadlines } from "@/lib/rules";
import { projects as seedProjects } from "@/fixtures/projects";
import { checklist20260510 } from "@/fixtures/checklist-20260510";
import { extraChecklists } from "@/fixtures/checklists-extra";
import { contracts as seedContracts } from "@/fixtures/contracts";
import { deliveryNotes as seedNotes } from "@/fixtures/delivery-notes";
import { todos as seedTodos } from "@/fixtures/todos";
import { activities as seedActivities } from "@/fixtures/activities";
import { supplierById } from "@/fixtures/suppliers";
import { matchSupplier } from "@/fixtures/ai/contract-template";
import { uploadContractParse } from "@/fixtures/ai/upload-contract-parse";

export interface Toast {
  id: number;
  text: string;
}

interface AppState {
  projects: Project[];
  checklists: Checklist[];
  contracts: Contract[];
  deliveryNotes: DeliveryNote[];
  todos: Todo[];
  activities: Activity[];
  draftCounter: number;
  /** AI 采购成本预测的基准日期；null = 尚未预测（清单/库存页只显示「未预测」） */
  costForecastAt: string | null;
  toasts: Toast[];
  toastCounter: number;

  pushToast: (text: string) => void;
  removeToast: (id: number) => void;

  markAllocation: (checklistId: string, rowIds: string[], allocatedQty: number) => void;
  /** 安排生产（公司自制）：plan 为 null 时撤销，改回需采购；已入合同的行跳过 */
  markProduction: (checklistId: string, rowIds: string[], plan: { produceBy: string; note?: string } | null) => void;
  /** AI 流程 6：采购成本预测——预测本身由 lib/parts 按物料指数派生，这里只记基准日 */
  runCostForecast: () => void;
  /** 提醒中心：把待办标记为已办（工作台与侧栏角标随之减少） */
  markTodoDone: (id: string) => void;
  generateDraftContracts: (checklistId: string, rowIds: string[]) => string[];
  /** 人工上传已签合同 xlsx → 勾选 cover 的采购行 → 建合同并更新 coverage */
  uploadContractCover: (checklistId: string, rowIds: string[]) => string | null;
  closeProject: (projectId: string) => void;
  addOrderContractVersion: (projectId: string) => void;
  updateLinePrice: (contractId: string, lineId: string, price: number | null) => void;
  advanceContractStatus: (contractId: string) => void;
  applyFinalizeDiff: (contractId: string) => void;
  registerInvoice: (contractId: string, mKey: MilestoneKey, invoice: Invoice) => void;
  markMilestonePaid: (contractId: string, mKey: MilestoneKey) => void;
  upsertOrderParse: () => void;
  upsertChecklistParse: () => void;
  confirmDeliveryLine: (noteId: string, seq: number) => void;
  markLineException: (noteId: string, seq: number, exception: NonNullable<DeliveryLine["exception"]>) => void;
  addLinePhoto: (noteId: string, seq: number) => void;
  submitReceiving: (noteId: string) => void;
  resetDemo: () => void;
}

/** 事件处理器内取 HH:MM（不在渲染路径使用） */
function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: seedProjects,
      checklists: [checklist20260510, ...extraChecklists],
      contracts: seedContracts,
      deliveryNotes: seedNotes,
      todos: seedTodos,
      activities: seedActivities,
      draftCounter: 3,
      costForecastAt: "2026-08-18",
      toasts: [],
      toastCounter: 1,

      pushToast: (text) =>
        set((s) => ({
          toasts: [...s.toasts, { id: s.toastCounter, text }],
          toastCounter: s.toastCounter + 1,
        })),
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      markAllocation: (checklistId, rowIds, allocatedQty) =>
        set((s) => ({
          checklists: s.checklists.map((cl) => {
            if (cl.id !== checklistId) return cl;
            return {
              ...cl,
              sheets: cl.sheets.map((sh) => ({
                ...sh,
                rows: sh.rows.map((r) => {
                  if (!rowIds.includes(r.id) || typeof r.qty !== "number") return r;
                  const a = Math.min(r.qty, Math.max(0, allocatedQty));
                  const need = r.qty - a;
                  return {
                    ...r,
                    alloc: {
                      allocated: a,
                      need,
                      status: need === 0 ? ("allocated" as const) : a === 0 ? ("need" as const) : ("partial" as const),
                    },
                  };
                }),
              })),
            };
          }),
        })),

      markProduction: (checklistId, rowIds, plan) =>
        set((s) => ({
          checklists: s.checklists.map((cl) => {
            if (cl.id !== checklistId) return cl;
            return {
              ...cl,
              sheets: cl.sheets.map((sh) => ({
                ...sh,
                rows: sh.rows.map((r) => {
                  if (!rowIds.includes(r.id) || r.contractId) return r;
                  if (plan === null) {
                    if (r.alloc.status !== "produce") return r;
                    const qtyNum = typeof r.qty === "number" ? r.qty : 0;
                    return { ...r, alloc: { allocated: 0, need: qtyNum, status: "need" as const } };
                  }
                  return {
                    ...r,
                    alloc: { allocated: 0, need: 0, status: "produce" as const, produceBy: plan.produceBy, produceNote: plan.note || undefined },
                  };
                }),
              })),
            };
          }),
        })),

      generateDraftContracts: (checklistId, rowIds) => {
        const s = get();
        const cl = s.checklists.find((c) => c.id === checklistId);
        if (!cl) return [];
        const rows = cl.sheets.flatMap((sh) => sh.rows).filter((r) => rowIds.includes(r.id) && r.alloc.status !== "produce");
        const groups = new Map<string, typeof rows>();
        for (const r of rows) {
          const sid = matchSupplier(r.brands, r.section);
          const g = groups.get(sid) ?? [];
          g.push(r);
          groups.set(sid, g);
        }
        let counter = s.draftCounter;
        const newContracts: Contract[] = [];
        const rowToContract = new Map<string, string>();
        for (const [supplierId, groupRows] of groups) {
          const no = `D-${String(counter).padStart(3, "0")}`;
          const id = `c-draft-${counter}`;
          counter += 1;
          const sup = supplierById(supplierId);
          for (const r of groupRows) rowToContract.set(r.id, id);
          newContracts.push({
            id,
            no,
            projectId: cl.projectId,
            supplierId,
            summary: `${groupRows[0].name}等 ${groupRows.length} 项`,
            status: "ai_draft",
            amountInclTax: null,
            taxRate: 0.13,
            lines: groupRows.map((r, i) => ({
              id: `l-${id}-${i + 1}`,
              name: r.name,
              spec: r.spec,
              unit: r.unit,
              qty: typeof r.qty === "number" ? r.alloc.need || r.qty : 1,
              unitPrice: null,
              note: r.techNote.split("\n")[0] ?? "",
            })),
            milestones: [
              { key: "M1", ratio: 0.1, label: "预付款", condition: "合同签订后支付", status: "not_started" },
              { key: "M2", ratio: 0.5, label: "发货款", condition: "卖方发货前支付", status: "not_started" },
              { key: "M3", ratio: 0.3, label: "验收款", condition: "凭《交付验收合格单》", status: "not_started" },
              { key: "M4", ratio: 0.1, label: "质保金", condition: "凭《质保验收单》30 天内付清", status: "not_started" },
            ],
            versions: [{ id: "v1", name: "v1 AI 初稿", at: TODAY, by: "按标准模板生成", ai: true }],
            attachments: [],
            sellerContactName: sup.contactName,
            sellerContactPhone: sup.phone,
          });
        }
        set((st) => ({
          draftCounter: counter,
          contracts: [...st.contracts, ...newContracts],
          checklists: st.checklists.map((c) =>
            c.id !== checklistId
              ? c
              : {
                  ...c,
                  sheets: c.sheets.map((sh) => ({
                    ...sh,
                    rows: sh.rows.map((r) => (rowToContract.has(r.id) ? { ...r, contractId: rowToContract.get(r.id) } : r)),
                  })),
                },
          ),
          projects: st.projects.map((p) => (p.id === cl.projectId && p.phase < 3 ? { ...p, phase: 3 as const } : p)),
        }));
        return newContracts.map((c) => c.id);
      },

      uploadContractCover: (checklistId, rowIds) => {
        const s = get();
        const cl = s.checklists.find((c) => c.id === checklistId);
        if (!cl || rowIds.length === 0) return null;
        const rows = cl.sheets.flatMap((sh) => sh.rows).filter((r) => rowIds.includes(r.id) && r.alloc.status !== "produce");
        if (rows.length === 0) return null;
        const counter = s.draftCounter;
        const id = `c-up-${counter}`;
        const no = `LNPE-20260820${String(counter).padStart(3, "0")}-SJ`;
        const sup = supplierById(uploadContractParse.supplierId);
        const newContract: Contract = {
          id,
          no,
          projectId: cl.projectId,
          supplierId: uploadContractParse.supplierId,
          summary: `${rows[0].name}等 ${rows.length} 项（上传合同）`,
          status: "signed",
          signedAt: uploadContractParse.signedAt,
          deliveryDate: uploadContractParse.deliveryDate,
          amountInclTax: uploadContractParse.amountInclTax,
          taxRate: 0.13,
          lines: rows.map((r, i) => ({
            id: `l-${id}-${i + 1}`,
            name: r.name,
            spec: r.spec,
            unit: r.unit,
            qty: typeof r.qty === "number" ? r.alloc.need || r.qty : 1,
            unitPrice: null,
            note: "行价以上传合同签章版为准",
          })),
          milestones: [
            { key: "M1", ratio: 0.1, label: "预付款", condition: "合同签订后支付", status: "due", dueAt: "2026-08-27" },
            { key: "M2", ratio: 0.5, label: "发货款", condition: "卖方发货前支付", status: "not_started" },
            { key: "M3", ratio: 0.3, label: "验收款", condition: "凭《交付验收合格单》", status: "not_started" },
            { key: "M4", ratio: 0.1, label: "质保金", condition: "凭《质保验收单》30 天内付清", status: "not_started" },
          ],
          versions: [{ id: "v1", name: "v1 上传签章版", at: TODAY, by: "赵小燕 上传", final: true }],
          attachments: [],
          sellerContactName: sup.contactName,
          sellerContactPhone: sup.phone,
        };
        set((st) => ({
          draftCounter: counter + 1,
          contracts: [...st.contracts, newContract],
          checklists: st.checklists.map((c) =>
            c.id !== checklistId
              ? c
              : {
                  ...c,
                  sheets: c.sheets.map((sh) => ({
                    ...sh,
                    rows: sh.rows.map((r) => (rowIds.includes(r.id) ? { ...r, contractId: id } : r)),
                  })),
                },
          ),
          projects: st.projects.map((p) => (p.id === cl.projectId && p.phase < 3 ? { ...p, phase: 3 as const } : p)),
        }));
        return id;
      },

      closeProject: (projectId) => {
        const p = get().projects.find((x) => x.id === projectId);
        if (!p || p.closedAt) return;
        set((s) => ({
          projects: s.projects.map((x) =>
            x.id !== projectId
              ? x
              : { ...x, phase: 4 as const, closedAt: TODAY, tags: ["已结束"] },
          ),
          activities: [
            {
              id: `a-close-${projectId}`,
              projectId,
              text: "项目关闭：订单完结，全部信息保留可查",
              at: `${fmtDate(TODAY)} · 刚刚`,
              actor: "赵小燕",
              tone: "neutral" as const,
            },
            ...s.activities,
          ],
        }));
        get().pushToast(`项目 ${p.code} 已关闭，信息仍可查看`);
      },

      addOrderContractVersion: (projectId) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p;
            const n = p.orderContract.versions.length + 1;
            return {
              ...p,
              orderContract: {
                ...p.orderContract,
                versions: [...p.orderContract.versions, { id: `v${n}`, name: `v${n} 更新版`, at: TODAY, by: "赵小燕 上传" }],
              },
            };
          }),
        })),

      updateLinePrice: (contractId, lineId, price) =>
        set((s) => ({
          contracts: s.contracts.map((c) =>
            c.id !== contractId
              ? c
              : { ...c, lines: c.lines.map((l) => (l.id === lineId ? { ...l, unitPrice: price } : l)) },
          ),
        })),

      advanceContractStatus: (contractId) =>
        set((s) => ({
          contracts: s.contracts.map((c) => {
            if (c.id !== contractId) return c;
            const i = CONTRACT_STATUS_ORDER.indexOf(c.status);
            if (i < 0 || i >= CONTRACT_STATUS_ORDER.length - 1) return c;
            const next = CONTRACT_STATUS_ORDER[i + 1];
            return { ...c, status: next, signedAt: next === "signed" ? TODAY : c.signedAt };
          }),
        })),

      applyFinalizeDiff: (contractId) =>
        set((s) => ({
          contracts: s.contracts.map((c) => {
            if (c.id !== contractId) return c;
            const n = c.versions.length + 1;
            return {
              ...c,
              versions: [...c.versions, { id: `v${n}`, name: `v${n} 人工修订（上传回读）`, at: TODAY, by: "赵小燕 上传" }],
            };
          }),
        })),

      registerInvoice: (contractId, mKey, invoice) =>
        set((s) => ({
          contracts: s.contracts.map((c) =>
            c.id !== contractId
              ? c
              : { ...c, milestones: c.milestones.map((m) => (m.key === mKey ? { ...m, invoice } : m)) },
          ),
        })),

      markMilestonePaid: (contractId, mKey) =>
        set((s) => ({
          contracts: s.contracts.map((c) =>
            c.id !== contractId
              ? c
              : {
                  ...c,
                  milestones: c.milestones.map((m) =>
                    m.key === mKey ? { ...m, status: "paid" as const, paidAt: TODAY } : m,
                  ),
                },
          ),
        })),

      // AI 流程 1：幂等 upsert 项目 260227 与 c-kaishan-1（覆盖写回种子值，可重复演示）
      upsertOrderParse: () =>
        set((s) => {
          const seedP = seedProjects.find((p) => p.id === "p-260227")!;
          const seedC = seedContracts.find((c) => c.id === "c-kaishan-1")!;
          const hasP = s.projects.some((p) => p.id === "p-260227");
          const hasC = s.contracts.some((c) => c.id === "c-kaishan-1");
          return {
            projects: hasP ? s.projects.map((p) => (p.id === "p-260227" ? seedP : p)) : [...s.projects, seedP],
            contracts: hasC ? s.contracts.map((c) => (c.id === "c-kaishan-1" ? seedC : c)) : [...s.contracts, seedC],
          };
        }),

      // AI 流程 2：幂等 upsert cl-20260510-1，版本号 +1；项目至少推进到「采购清单」阶段
      upsertChecklistParse: () =>
        set((s) => ({
          checklists: s.checklists.map((cl) => {
            if (cl.id !== "cl-20260510-1") return cl;
            const m = cl.version.match(/v(\d+)/);
            const n = m ? Number(m[1]) + 1 : 2;
            return { ...cl, version: `5.30（v${n}）` };
          }),
          projects: s.projects.map((p) =>
            p.id === "p-20260510" && p.phase < 2 ? { ...p, phase: 2 as const } : p,
          ),
        })),

      confirmDeliveryLine: (noteId, seq) =>
        set((s) => ({
          deliveryNotes: s.deliveryNotes.map((n) =>
            n.id !== noteId
              ? n
              : {
                  ...n,
                  status: n.status === "pending" ? ("in_progress" as const) : n.status,
                  lines: n.lines.map((l) =>
                    l.seq === seq ? { ...l, state: "confirmed" as const, confirmedAt: nowHM(), exception: undefined } : l,
                  ),
                },
          ),
        })),

      markLineException: (noteId, seq, exception) =>
        set((s) => ({
          deliveryNotes: s.deliveryNotes.map((n) =>
            n.id !== noteId
              ? n
              : {
                  ...n,
                  status: n.status === "pending" ? ("in_progress" as const) : n.status,
                  lines: n.lines.map((l) => (l.seq === seq ? { ...l, state: "exception" as const, exception } : l)),
                },
          ),
        })),

      addLinePhoto: (noteId, seq) =>
        set((s) => ({
          deliveryNotes: s.deliveryNotes.map((n) =>
            n.id !== noteId
              ? n
              : { ...n, lines: n.lines.map((l) => (l.seq === seq ? { ...l, photoCount: l.photoCount + 1 } : l)) },
          ),
        })),

      // 提交收货：note→done；关联合同 arrived + 到货日 + M3/M4 期限填充；动态与待办；toast
      submitReceiving: (noteId) => {
        const s = get();
        const note = s.deliveryNotes.find((n) => n.id === noteId);
        if (!note) return;
        const excLines = note.lines.filter((l) => l.state === "exception");
        set((st) => {
          const newActivities: Activity[] = note.projectIds.map((pid, i) => ({
            id: `a-r-${noteId}-${st.activities.length + i + 1}`,
            projectId: pid,
            text: `送货单 ${fmtDate(note.date)} 收货完成${excLines.length ? ` · 异常 ${excLines.length} 项` : ""}`,
            at: `${fmtDate(TODAY)} · 刚刚`,
            actor: note.receiverName,
            tone: excLines.length ? ("danger" as const) : ("success" as const),
          }));
          const hasExcTodo = st.todos.some((t) => t.kind === "receive_exception");
          const newTodos: Todo[] =
            excLines.length && !hasExcTodo
              ? [
                  {
                    id: `t-r-${noteId}`,
                    kind: "receive_exception" as const,
                    pillText: "收货异常",
                    title: `${fmtDate(note.date)} 送货单 · ${excLines[0].name}${excLines[0].exception?.type ?? "异常"}（实收 ${excLines[0].exception?.actualQty ?? "?"}/${excLines[0].qty}）`,
                    sub: `收货人 ${note.receiverName} · 现场已留照片 ${excLines[0].photoCount} 张`,
                    actionLabel: "去处理",
                    href: `/contracts/${excLines[0].contractId}`,
                  },
                ]
              : [];
          return {
            deliveryNotes: st.deliveryNotes.map((n) => (n.id !== noteId ? n : { ...n, status: "done" as const })),
            contracts: st.contracts.map((c) =>
              note.contractIds.includes(c.id)
                ? {
                    ...c,
                    status: "arrived" as const,
                    goodsArrivedAt: TODAY,
                    milestones: deriveArrivalDeadlines(c.milestones, TODAY),
                  }
                : c,
            ),
            activities: [...newActivities, ...st.activities],
            todos: [...st.todos, ...newTodos],
          };
        });
        get().pushToast("已提交，已同步 PC 端合同跟进");
      },

      runCostForecast: () => set({ costForecastAt: TODAY }),

      markTodoDone: (id) => set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, done: true } : t)) })),

      resetDemo: () => {
        try {
          window.localStorage.removeItem("lnpe-demo-v1");
          window.localStorage.removeItem("lnpe-demo-v2");
        } catch {
          // ignore
        }
        window.location.reload();
      },
    }),
    {
      name: "lnpe-demo-v2",
      // 数据结构/种子内容变更时递增：版本不匹配的旧 localStorage 会被直接丢弃（回到种子数据），
      // 避免旧结构（如缺 keyTerms 的 orderContract）rehydrate 后覆盖新种子导致运行时崩溃
      version: 9,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) =>
        ({
          projects: s.projects,
          checklists: s.checklists,
          contracts: s.contracts,
          deliveryNotes: s.deliveryNotes,
          todos: s.todos,
          activities: s.activities,
          draftCounter: s.draftCounter,
          costForecastAt: s.costForecastAt,
        }) as AppState,
    },
  ),
);
