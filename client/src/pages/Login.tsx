import { FrierenMark } from "@/components/FrierenMark";
import { PageLoader } from "@/components/PageLoader";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowUpRight, Boxes, Disc3, ShieldCheck } from "lucide-react";
import { Redirect } from "wouter";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (isAuthenticated) return <Redirect to="/vm-instances" />;

  return (
    <div className="blueprint-page relative min-h-dvh overflow-hidden text-white">
      <div className="absolute inset-0 blueprint-geometry pointer-events-none" aria-hidden="true" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <FrierenMark />
        <span className="technical-kicker border border-cyan-100/30 px-2.5 py-1.5 text-cyan-100/80">Secure terminal</span>
      </header>
      <main className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-12 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.18fr_.82fr] lg:items-center lg:px-10 lg:pt-24">
        <section>
          <p className="technical-kicker">A clearer cloud control surface</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl font-extrabold leading-[0.94] tracking-[-0.075em] sm:text-6xl lg:text-7xl">
            Design your next <span className="text-cyan-200">Linux session.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-cyan-50/70 sm:text-lg">
            FrierenCloud là control plane tối giản cho Linux VPS chạy qua GitHub Actions, với trạng thái setup và SSHX session được đọc từ output thật.
          </p>
          <button type="button" onClick={startLogin} className="primary-blueprint-button mt-9">
            <Disc3 size={19} />
            <span>Đăng nhập với Discord</span>
            <ArrowUpRight size={18} className="ml-2" />
          </button>
          <p className="mt-4 font-mono text-[0.66rem] uppercase tracking-[0.13em] text-cyan-100/50">Discord OAuth2 · scope: identify · no extra permissions</p>
        </section>

        <section className="blueprint-card relative overflow-hidden p-5 sm:p-7">
          <div className="absolute right-0 top-0 h-16 w-16 border-b border-l border-cyan-100/35" />
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <p className="technical-kicker">System outline</p>
            <span className="font-mono text-[0.61rem] text-cyan-100/60">REV. 01</span>
          </div>
          <div className="mt-7 space-y-5">
            <Feature icon={<Boxes size={19} />} number="01" title="VM Instances" text="Danh sách VPS, trạng thái workflow và phiên SSHX trong một bề mặt rõ ràng." />
            <Feature icon={<ShieldCheck size={19} />} number="02" title="Scoped access" text="GitHub token chỉ dùng trong thời điểm dispatch; không được ghi vào database hoặc log." />
            <Feature icon={<Disc3 size={19} />} number="03" title="Discord sign-in" text="Chỉ dùng đăng nhập Discord với quyền nhận diện tối thiểu." />
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, number, title, text }: { icon: React.ReactNode; number: string; title: string; text: string }) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr] gap-3">
      <div className="grid h-10 w-10 place-items-center border border-cyan-100/35 text-cyan-200">{icon}</div>
      <div>
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.15em] text-cyan-100/55">Module {number}</p>
        <h2 className="mt-1 font-display text-sm font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-cyan-50/65">{text}</p>
      </div>
    </div>
  );
}
