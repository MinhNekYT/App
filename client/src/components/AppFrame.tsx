import { FrierenMark } from "@/components/FrierenMark";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Boxes, Settings2 } from "lucide-react";
import { type ReactNode } from "react";
import { useLocation } from "wouter";

type AppFrameProps = { children: ReactNode; title?: string; eyebrow?: string };

const navigation = [
  { href: "/vm-instances", label: "VM Instances", icon: Boxes },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppFrame({ children, title, eyebrow }: AppFrameProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  return (
    <div className="blueprint-page min-h-dvh text-white">
      <header className="technical-header">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate("/vm-instances")} className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
            <FrierenMark />
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-cyan-100/55">Discord session</p>
              <p className="max-w-32 truncate text-xs font-semibold text-white/90">{user?.name || "Authenticated"}</p>
            </div>
            <div className="grid h-9 w-9 place-items-center border border-white/25 bg-white/10 font-display text-sm font-bold text-cyan-100">
              {(user?.name || "D").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-7 sm:px-6 sm:pt-10 lg:px-8">
        {(eyebrow || title) && (
          <div className="mb-7 flex items-end justify-between gap-5 sm:mb-9">
            <div>
              {eyebrow && <p className="technical-kicker">{eyebrow}</p>}
              {title && <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.055em] text-white sm:text-4xl">{title}</h1>}
            </div>
            <div className="hidden h-12 w-20 border-l border-t border-cyan-100/40 opacity-80 sm:block" aria-hidden="true" />
          </div>
        )}
        {children}
      </main>

      <nav className="bottom-nav" aria-label="Điều hướng chính">
        <div className="mx-auto grid max-w-md grid-cols-2 px-2">
          {navigation.map(item => {
            const Icon = item.icon;
            const active = location === item.href || (item.href === "/vm-instances" && location.startsWith("/vm-instances"));
            return (
              <button
                type="button"
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn("bottom-nav-item", active && "bottom-nav-item-active")}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
