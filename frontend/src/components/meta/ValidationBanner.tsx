"use client";

import { AlertTriangle, Info } from "lucide-react";

export function ValidationBanner({ warnings, errors }: { warnings?: string[]; errors?: string[] }) {
  if ((!warnings || warnings.length === 0) && (!errors || errors.length === 0)) return null;

  return (
    <div className="space-y-2">
      {errors && errors.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-lg space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <span className="text-[11px] text-red-400">{e}</span>
            </div>
          ))}
        </div>
      )}
      {warnings && warnings.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-lg space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-[11px] text-amber-400">{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
