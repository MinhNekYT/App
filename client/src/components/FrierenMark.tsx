import { Cloud } from "lucide-react";

export function FrierenMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="FrierenCloud">
      <div className="relative grid h-10 w-10 place-items-center overflow-hidden border border-cyan-200/70 bg-cyan-200 text-[#061a60] shadow-[4px_4px_0_rgba(118,230,255,0.2)]">
        <Cloud size={22} strokeWidth={2.4} />
        <span className="absolute right-0 top-0 h-2 w-2 border-b border-l border-[#061a60]" />
      </div>
      {!compact && (
        <div>
          <p className="font-display text-[1.05rem] font-extrabold leading-none tracking-[-0.045em] text-white">FrierenCloud</p>
          <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.19em] text-cyan-100/65">VPS control plane</p>
        </div>
      )}
    </div>
  );
}
