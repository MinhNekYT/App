import { AppFrame } from "@/components/AppFrame";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Check, ChevronLeft, CircleAlert, Github, KeyRound, Loader2, ShieldCheck, Terminal } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

export default function CreateVm() {
  const [, navigate] = useLocation();
  const [hostname, setHostname] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [acknowledgment, setAcknowledgment] = useState(false);
  const settings = trpc.github.settings.useQuery();
  const createVm = trpc.vm.create.useMutation({ onSuccess: instance => instance && navigate(`/vm-instances/${instance.id}/logs`) });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (acknowledgment && githubToken && hostname) createVm.mutate({ hostname, githubToken, acknowledgment });
  };

  return (
    <AppFrame eyebrow="Provision / 002" title="Tạo một Linux VPS">
      <button type="button" onClick={() => navigate("/vm-instances")} className="back-link"><ChevronLeft size={16} /> Quay lại VM Instances</button>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <form className="blueprint-card p-5 sm:p-7" onSubmit={submit}>
          <div className="flex items-start gap-3 border-b border-white/15 pb-5">
            <div className="grid h-10 w-10 place-items-center border border-cyan-100/35 text-cyan-200"><Terminal size={20} /></div>
            <div>
              <p className="technical-kicker">Instance definition</p>
              <p className="mt-1 text-sm leading-5 text-cyan-50/65">Tên máy được chuyển nguyên trạng vào workflow sau khi vượt qua kiểm tra hostname Linux.</p>
            </div>
          </div>
          <div className="mt-7 grid gap-6">
            <div className="grid gap-2.5">
              <Label htmlFor="hostname" className="form-label">Tên máy</Label>
              <Input id="hostname" value={hostname} onChange={e => setHostname(e.target.value)} placeholder="frieren-edge-01" autoComplete="off" className="blueprint-input" required maxLength={63} />
              <p className="form-help">1–63 ký tự, chỉ gồm chữ cái, số và dấu gạch ngang.</p>
            </div>
            <div className="grid gap-2.5">
              <Label htmlFor="githubToken" className="form-label">GitHub token</Label>
              <div className="relative"><KeyRound size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyan-100/50" /><Input id="githubToken" type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)} placeholder="github_pat_…" autoComplete="off" className="blueprint-input pl-10" required /></div>
              <p className="form-help">Dùng token có quyền Actions: write cho repository đã cấu hình. Token chỉ tồn tại trong request dispatch; không được lưu lại.</p>
            </div>
            <label className="acknowledgment-box">
              <Checkbox checked={acknowledgment} onCheckedChange={checked => setAcknowledgment(checked === true)} aria-label="Xác nhận GitHub token không thuộc tài khoản chính" />
              <span><strong>Tôi xác nhận rằng mã token Github tôi đã nhập không thuộc về tài khoản chính của tôi</strong><small>I agree that the Github token I entered does not belong to my main account.</small></span>
            </label>
            {createVm.error && <div className="flex gap-2.5 border border-red-300/40 bg-red-950/25 p-3.5 text-sm leading-5 text-red-100"><CircleAlert size={18} className="mt-0.5 shrink-0" />{createVm.error.message}</div>}
            <Button type="submit" disabled={!hostname || !githubToken || !acknowledgment || createVm.isPending || !settings.data} className="primary-blueprint-button h-12 justify-center disabled:opacity-45">
              {createVm.isPending ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} {createVm.isPending ? "Đang kích hoạt workflow…" : "Xác nhận"}
            </Button>
          </div>
        </form>
        <aside className="blueprint-card p-5">
          <p className="technical-kicker">Runner linkage</p>
          {settings.isLoading && <div className="mt-5 h-20 animate-pulse bg-white/10" />}
          {settings.data ? (
            <div className="mt-5 space-y-4">
              <InfoRow icon={<Github size={17} />} label="Repository" value={`${settings.data.githubOwner}/${settings.data.githubRepo}`} />
              <InfoRow icon={<Terminal size={17} />} label="Workflow" value={settings.data.workflowFile} />
              <InfoRow icon={<ShieldCheck size={17} />} label="Git ref" value={settings.data.ref} />
              <p className="border-t border-white/15 pt-4 text-xs leading-5 text-cyan-50/60">Workflow thay hostname, chạy chính xác lệnh SSHX và gửi từng dòng output về log của instance.</p>
            </div>
          ) : !settings.isLoading ? (
            <div className="mt-5 border border-amber-200/40 bg-amber-200/10 p-4 text-sm leading-6 text-amber-50">Chưa có runner repository. Vào <button type="button" className="font-bold underline underline-offset-4" onClick={() => navigate("/settings")}>Settings</button> để khai báo trước khi xác nhận.</div>
          ) : null}
        </aside>
      </div>
    </AppFrame>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex gap-3"><div className="mt-0.5 text-cyan-200">{icon}</div><div className="min-w-0"><p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-cyan-100/55">{label}</p><p className="mt-1 break-words text-sm font-semibold text-white">{value}</p></div></div>;
}
