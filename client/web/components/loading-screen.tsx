"use client";

export function LoadingScreen({ message = "Loading Invoixe..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-slate-100">
      <div className="relative flex items-center justify-center">
        {/* Glowing background aura */}
        <div className="absolute h-36 w-36 animate-pulse rounded-full bg-teal-500/10 blur-2xl" />
        
        {/* Dual spinning animated gradient borders */}
        <div className="absolute h-28 w-28 animate-[spin_2s_linear_infinite] rounded-full border border-dashed border-teal-500/30" />
        <div className="absolute h-24 w-24 animate-[spin_1s_linear_infinite] rounded-full border-2 border-transparent border-t-teal-500 border-r-cyan-400" />
        
        {/* Core logo container */}
        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-white dark:bg-slate-900 p-2.5 shadow-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center transition-all duration-300 scale-100 hover:scale-105">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Invoixe Logo" className="h-full w-full object-contain" />
        </div>
      </div>
      
      {/* Visual branding texts */}
      <div className="mt-8 text-center space-y-1.5 animate-pulse">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-400/80">
          {message}
        </h2>
        <p className="text-[10px] text-slate-500 font-mono tracking-wider">
          Initializing secure billing context...
        </p>
      </div>
    </div>
  );
}
