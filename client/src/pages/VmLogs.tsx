import { AppFrame } from "@/components/AppFrame";
import { StatusBadge } from "@/pages/VmInstances";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, CircleAlert, ExternalLink, Loader2, Terminal } from "lucide-react";
import { useRoute, useLocation } from "wouter";

export default function VmLogs() {
  const [, params] = useRoute("/vm-instances/:id/logs");
  const [, navigate] = useLocation();
  const instanceId = Number(params?.id);
  const details = trpc.vm.details.useQuery({ instanceId }, { enabled: Number.isInteger(instanceId) && instanceId > 0, refetchInterval: 2_500 });

  return (
    <AppFrame eyebrow="Observability / 003" title="Setup log">
      <button type="button" onClick={() => navigate("/vm-instances")} className="back-link"><ChevronLeft size={16} /> Quay lại VM Instances</button>
      {details.isLoading && <div className="blueprint-card mt-6 grid min-h-72 place-items-center"><Loader2 className="animate-spin text-cyan-200" /></div>}
      {details.isError && <div className="blueprint-card mt-6 flex gap-3 border-red-300/40 p-5 text-red-100"><CircleAlert className="shrink-0" /><p>{details.error.message}</p></div>}
      {details.data && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <section className="blueprint-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/15 bg-white/[0.035] px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5"><Terminal size={16} className="text-cyan-200" /><p className="font-mono text-xs text-cyan-50/80">github-actions / live output</p></div>
              <span className="live-indicator">poll / 2.5s</span>
            </div>
            <div className="terminal-log min-h-[340px] max-h-[58vh] overflow-auto p-4 sm:p-5" aria-live="polite">
              {details.data.logs.length === 0 ? <p className="terminal-muted">Đang chờ GitHub Actions trả output…</p> : details.data.logs.map(log => <p key={log.id}><span className="terminal-time">[{new Date(log.createdAt).toLocaleTimeString("vi-VN")} ]</span> {log.message}</p>)}
            </div>
          </section>
          <aside className="blueprint-card p-5">
            <p className="technical-kicker">Instance signal</p>
            <h2 className="mt-3 break-words font-display text-xl font-extrabold tracking-[-0.045em] text-white">{details.data.instance.hostname}</h2>
            <div className="mt-3"><StatusBadge status={details.data.instance.status} /></div>
            <dl className="mt-6 space-y-4 border-t border-white/15 pt-5 text-sm">
              <div><dt className="technical-kicker">Runner</dt><dd className="mt-1.5 break-words font-mono text-xs text-cyan-50/80">{details.data.instance.githubOwner}/{details.data.instance.githubRepo}</dd></div>
              {details.data.instance.workflowRunId && <div><dt className="technical-kicker">Run ID</dt><dd className="mt-1.5 font-mono text-xs text-cyan-50/80">{details.data.instance.workflowRunId}</dd></div>}
            </dl>
            {details.data.instance.sshxUrl ? (
              <a className="sshx-link mt-6" href={details.data.instance.sshxUrl} target="_blank" rel="noreferrer"><span>Open SSHX session</span><ExternalLink size={16} /></a>
            ) : <p className="mt-6 border border-dashed border-cyan-100/25 p-3 text-xs leading-5 text-cyan-50/60">SSHX URL sẽ xuất hiện tại đây khi output thực tế của runner chứa liên kết.</p>}
          </aside>
        </div>
      )}
    </AppFrame>
  );
}
