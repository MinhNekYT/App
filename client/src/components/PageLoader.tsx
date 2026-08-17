import { FrierenMark } from "@/components/FrierenMark";

export function PageLoader() {
  return (
    <div className="blueprint-page grid min-h-dvh place-items-center p-6 text-white">
      <div className="flex flex-col items-center gap-5">
        <FrierenMark />
        <div className="h-px w-36 overflow-hidden bg-white/15"><div className="scan-line h-full w-2/5 bg-cyan-200" /></div>
        <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-cyan-100/65">Synchronizing session</p>
      </div>
    </div>
  );
}
