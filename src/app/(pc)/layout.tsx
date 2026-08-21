import { Sidebar } from "@/components/shell/Sidebar";

export default function PcLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-page flex min-h-dvh">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
