import { AppFrame } from "@/components/AppFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Check, Copy, Github, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

const workflowSnippet = ".github/workflows/frierencloud-vm.yml";

export default function Settings() {
  const { user, logout } = useAuth();
  const settings = trpc.github.settings.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ githubOwner: "MinhNekYT", githubRepo: "WindowsGHCS", workflowFile: "frierencloud-vm.yml", ref: "main" });
  const [copied, setCopied] = useState(false);
  const save = trpc.github.saveSettings.useMutation({ onSuccess: () => utils.github.settings.invalidate() });

  useEffect(() => { if (settings.data) setForm({ githubOwner: settings.data.githubOwner, githubRepo: settings.data.githubRepo, workflowFile: settings.data.workflowFile, ref: settings.data.ref }); }, [settings.data]);
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(form); };
  const copyWorkflowPath = async () => { await navigator.clipboard.writeText(workflowSnippet); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };

  return (
    <AppFrame eyebrow="Configuration / 004" title="Settings">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <form className="blueprint-card p-5 sm:p-7" onSubmit={submit}>
          <div className="flex gap-3 border-b border-white/15 pb-5"><div className="grid h-10 w-10 place-items-center border border-cyan-100/35 text-cyan-200"><Github size={20} /></div><div><p className="technical-kicker">GitHub Actions runner</p><p className="mt-1 text-sm leading-5 text-cyan-50/65">FrierenCloud dispatch workflow bằng token chỉ dùng một lần do bạn nhập khi tạo VPS.</p></div></div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Field label="GitHub owner" value={form.githubOwner} onChange={value => update("githubOwner", value)} placeholder="MinhNekYT" />
            <Field label="Repository" value={form.githubRepo} onChange={value => update("githubRepo", value)} placeholder="WindowsGHCS" />
            <Field label="Workflow file" value={form.workflowFile} onChange={value => update("workflowFile", value)} placeholder="frierencloud-vm.yml" />
            <Field label="Git ref" value={form.ref} onChange={value => update("ref", value)} placeholder="main" />
          </div>
          {save.error && <p className="mt-4 text-sm text-red-100">{save.error.message}</p>}
          <Button type="submit" disabled={save.isPending} className="primary-blueprint-button mt-7 h-11"><>{save.isPending ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}</> Lưu runner settings</Button>
          {save.isSuccess && <p className="mt-3 text-sm text-cyan-100">Đã lưu cấu hình runner.</p>}
        </form>
        <aside className="grid gap-5">
          <section className="blueprint-card p-5"><p className="technical-kicker">Workflow source</p><p className="mt-3 text-sm leading-6 text-cyan-50/65">Đặt workflow mẫu của FrierenCloud tại đường dẫn sau trong repository runner trước khi tạo VPS.</p><button type="button" onClick={copyWorkflowPath} className="mt-4 flex w-full items-center justify-between border border-cyan-100/30 bg-cyan-100/5 px-3 py-3 text-left font-mono text-xs text-cyan-50 hover:bg-cyan-100/10"><span>{workflowSnippet}</span>{copied ? <Check size={15} /> : <Copy size={15} />}</button><div className="mt-4 flex gap-2 text-xs leading-5 text-cyan-50/60"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-cyan-200" />Workflow đặt hostname rồi chạy lệnh SSHX đã yêu cầu; liên kết chỉ xuất hiện khi output thật được nhận.</div></section>
          <section className="blueprint-card p-5"><p className="technical-kicker">Discord identity</p><p className="mt-2 text-sm font-semibold text-white">{user?.name || "Discord user"}</p><p className="mt-1 text-xs text-cyan-50/60">Chỉ dùng để đăng nhập FrierenCloud.</p><Button type="button" variant="outline" onClick={() => logout()} className="mt-5 w-full border-white/25 bg-transparent text-cyan-50 hover:bg-white/10 hover:text-white"><LogOut size={16} /> Đăng xuất</Button></section>
        </aside>
      </div>
    </AppFrame>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return <div className="grid gap-2"><Label htmlFor={id} className="form-label">{label}</Label><Input id={id} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="blueprint-input" required /></div>;
}
