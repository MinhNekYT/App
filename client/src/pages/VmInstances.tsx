import { AppFrame } from "@/components/AppFrame";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Box, ChevronRight, CircleAlert, Clock3, Plus, Server, Terminal } from "lucide-react";
import { useLocation } from "wouter";

const statusLabel = { queued: "Đang xếp hàng", running: "Đang setup", failed: "Cần kiểm tra", completed: "Sẵn sàng" } as const;

export default function VmInstances() {
  const [, navigate] = useLocation();
  const instances = trpc.vm.list.useQuery(undefined, { refetchInterval: 6_000 });

  return (
    <AppFrame eyebrow="Infrastructure / 001" title="VM Instances">
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/15 pb-5">
        <p className="max-w-md text-sm leading-6 text-cyan-50/65">Khởi tạo Linux session từ runner của bạn và theo dõi setup trực tiếp từ GitHub Actions.</p>
        <Button onClick={() => navigate("/vm-instances/new")} className="hidden shrink-0 bg-cyan-200 text-[#061a60] hover:bg-white sm:flex">
          <Plus size={17} /> Tạo một Linux VPS
        </Button>
      </div>

      {instances.isLoading && <VmListSkeleton />}
      {instances.isError && <ErrorPanel text="Không thể tải VM Instances. Hãy thử làm mới lại trang." />}
      {instances.data?.length === 0 && <EmptyState onCreate={() => navigate("/vm-instances/new")} />}
      {instances.data && instances.data.length > 0 && (
        <div className="grid gap-3">
          {instances.data.map(instance => (
            <button
              type="button"
              key={instance.id}
              onClick={() => navigate(`/vm-instances/${instance.id}/logs`)}
              className="blueprint-card group flex w-full items-center gap-4 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-100/65 hover:bg-white/[0.09] sm:p-5"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center border border-cyan-100/35 bg-cyan-100/5 text-cyan-200"><Server size={20} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="truncate font-display text-base font-bold text-white">{instance.hostname}</h2>
                  <StatusBadge status={instance.status} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.64rem] uppercase tracking-[0.1em] text-cyan-100/55">
                  <span>{instance.githubOwner}/{instance.githubRepo}</span>
                  <span>{new Date(instance.updatedAt).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
              </div>
              <ChevronRight size={19} className="shrink-0 text-cyan-100/45 transition group-hover:translate-x-0.5 group-hover:text-cyan-100" />
            </button>
          ))}
        </div>
      )}
      <Button onClick={() => navigate("/vm-instances/new")} className="fixed bottom-[5.6rem] right-4 z-20 h-12 bg-cyan-200 text-[#061a60] shadow-[4px_4px_0_rgba(3,11,59,.45)] hover:bg-white sm:hidden">
        <Plus size={18} /> Tạo một Linux VPS
      </Button>
    </AppFrame>
  );
}

export function StatusBadge({ status }: { status: keyof typeof statusLabel }) {
  return <span className={`status-badge status-${status}`}>{statusLabel[status]}</span>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="blueprint-card relative grid min-h-[390px] place-items-center overflow-hidden p-6 text-center">
      <div className="absolute inset-5 border border-dashed border-cyan-100/20" />
      <div className="relative max-w-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center border border-cyan-100/40 bg-cyan-100/5 text-cyan-200 shadow-[6px_6px_0_rgba(118,230,255,.14)]"><Box size={28} /></div>
        <p className="technical-kicker mt-7">No compute attached</p>
        <h2 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.045em] text-white">Chưa có Linux VPS nào.</h2>
        <p className="mt-3 text-sm leading-6 text-cyan-50/65">Tạo một session mới để chạy hostname do bạn chọn, theo dõi log setup và nhận SSHX URL trực tiếp từ runner.</p>
        <Button onClick={onCreate} className="mt-7 h-11 bg-cyan-200 px-5 text-[#061a60] hover:bg-white"><Terminal size={17} /> Tạo một Linux VPS</Button>
      </div>
    </section>
  );
}

function VmListSkeleton() {
  return <div className="grid gap-3">{[1, 2].map(item => <div key={item} className="blueprint-card h-[86px] animate-pulse bg-white/[0.06]" />)}</div>;
}

function ErrorPanel({ text }: { text: string }) {
  return <div className="blueprint-card flex items-start gap-3 border-red-300/50 p-5 text-red-100"><CircleAlert size={19} className="mt-0.5 shrink-0" /><p className="text-sm leading-6">{text}</p></div>;
}
