"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

export const StatusBadge = memo(({ status }: { status: string }) => (
  <span className={cn(
    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
    status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' :
    status === 'PAUSED' ? 'bg-amber-500/15 text-amber-400' :
    'bg-gray-800 text-gray-500'
  )}>
    {status === 'ACTIVE' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 pulse-dot" />}
    {status}
  </span>
));
StatusBadge.displayName = 'StatusBadge';
