"use client";

// 统一模拟 AI 弹窗：三段式状态机 upload → processing → result。
// 假加载动画 + 预置 fixture 结果，不接任何真实 LLM。
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Sparkles, UploadCloud, X } from "lucide-react";
import { Btn } from "@/components/ui/Btn";

export interface AiSample {
  id: string;
  label: string;
  thumb?: string;
}

export interface AiSimDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  steps: string[];
  samples?: AiSample[];
  uploadHint?: string;
  /** true 时跳过上传阶段，打开即进入处理动画（AI 生成合同初稿用） */
  autoStart?: boolean;
  renderResult: (sampleId: string) => ReactNode;
  confirmLabel: string;
  onConfirm: (sampleId: string) => void;
  disabled?: (sampleId: string) => boolean;
}

type Phase = "upload" | "processing" | "result";

// 每步固定时长（避免 Math.random），总时长约 1.8–2.6s
const STEP_MS = [450, 620, 540, 660, 520, 480];

export function AiSimDialog({
  open,
  onClose,
  title,
  steps,
  samples,
  uploadHint,
  autoStart,
  renderResult,
  confirmLabel,
  onConfirm,
  disabled,
}: AiSimDialogProps) {
  const [phase, setPhase] = useState<Phase>("upload");
  const [sampleId, setSampleId] = useState<string>(samples?.[0]?.id ?? "default");
  const [doneSteps, setDoneSteps] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const startProcessing = (sid: string) => {
    clearTimers();
    setSampleId(sid);
    setPhase("processing");
    setDoneSteps(0);
    let acc = 0;
    steps.forEach((_, i) => {
      acc += STEP_MS[i % STEP_MS.length];
      timers.current.push(setTimeout(() => setDoneSteps(i + 1), acc));
    });
    timers.current.push(setTimeout(() => setPhase("result"), acc + 320));
  };

  // 关闭弹窗或卸载即中止动画；autoStart 打开即进入处理
  useEffect(() => clearTimers, []);
  useEffect(() => {
    if (!open) {
      clearTimers();
      setPhase("upload");
      setDoneSteps(0);
    } else if (autoStart) {
      startProcessing(samples?.[0]?.id ?? "default");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const confirmDisabled = disabled ? disabled(sampleId) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(44,42,42,.45)] p-4" onClick={onClose}>
      <div
        className="rounded-card flex max-h-[86dvh] w-full max-w-[640px] flex-col overflow-hidden bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-line-soft flex items-center gap-2.5 border-b px-5 py-4">
          <span className="bg-ai-bg text-ai-deep flex h-8 w-8 items-center justify-center rounded-lg">
            <Sparkles size={16} strokeWidth={1.8} />
          </span>
          <div className="text-[15px] font-bold">{title}</div>
          <span className="bg-ai-bg text-ai-deep ml-2 rounded-full px-2 py-px text-[10.5px] font-medium">
            模拟演示 · 未调用真实模型
          </span>
          <button type="button" onClick={onClose} className="text-faint hover:text-ink ml-auto cursor-pointer">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {phase === "upload" && (
            <div className="flex flex-col gap-4">
              <label className="border-line hover:border-ai text-sub flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[10px] border-2 border-dashed px-6 py-10 transition-colors">
                <UploadCloud size={30} strokeWidth={1.5} className="text-faint" />
                <div className="text-[13px]">点击或拖放文件到此处上传</div>
                {uploadHint && <div className="text-faint text-xs">{uploadHint}</div>}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    // 内容一律不读，任意文件默认走第一个样例结果
                    if (e.target.files?.length) startProcessing(samples?.[0]?.id ?? "default");
                  }}
                />
              </label>
              {samples && samples.length > 0 && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-sub text-xs">或使用样例：</span>
                  {samples.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => startProcessing(s.id)}
                      className="border-line hover:border-ai hover:text-ai-deep flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-[12.5px] font-medium transition-colors"
                    >
                      {s.thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.thumb} alt="" className="h-9 w-9 rounded-md object-cover" />
                      )}
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {phase === "processing" && (
            <div className="flex flex-col gap-5 py-4">
              <div className="bg-ai-bg h-2 overflow-hidden rounded-full">
                <div
                  className="bg-ai h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(8, Math.round((doneSteps / steps.length) * 100))}%` }}
                />
              </div>
              <div className="flex flex-col gap-3">
                {steps.map((s, i) => (
                  <div key={s} className="flex items-center gap-2.5 text-[13px]">
                    {i < doneSteps ? (
                      <span className="bg-ai flex h-[18px] w-[18px] items-center justify-center rounded-full">
                        <Check size={11} strokeWidth={3} className="text-white" />
                      </span>
                    ) : i === doneSteps ? (
                      <span className="border-ai h-[18px] w-[18px] animate-pulse rounded-full border-[2.5px]" />
                    ) : (
                      <span className="border-line h-[18px] w-[18px] rounded-full border-2" />
                    )}
                    <span className={i < doneSteps ? "text-ink" : i === doneSteps ? "text-ai-deep font-medium" : "text-faint"}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === "result" && <div>{renderResult(sampleId)}</div>}
        </div>

        {phase === "result" && (
          <div className="border-line-soft flex items-center justify-end gap-2.5 border-t px-5 py-3.5">
            {!autoStart && (
              <Btn variant="secondary" onClick={() => setPhase("upload")}>
                重新上传
              </Btn>
            )}
            <Btn variant="primary" disabled={confirmDisabled} onClick={() => onConfirm(sampleId)}>
              {confirmLabel}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
