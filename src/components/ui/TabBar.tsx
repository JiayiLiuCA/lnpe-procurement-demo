"use client";

export interface TabItem {
  key: string;
  label: string;
  badge?: number;
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="border-line no-scrollbar flex items-center gap-1 overflow-x-auto border-b">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`-mb-px cursor-pointer px-4 py-2.5 text-[13.5px] whitespace-nowrap ${
              isActive ? "text-primary-hover border-primary border-b-2 font-bold" : "text-ink-2 border-b-2 border-transparent"
            }`}
          >
            {t.label}
            {t.badge != null && <span className={`ml-1 font-medium ${isActive ? "text-faint" : "text-faint"}`}>{t.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
