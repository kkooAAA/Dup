"use client";

import { cn } from "@/lib/utils";
import { ACTION_STYLES } from "@/lib/meta-schema";

export function FieldActionBadge({ action }: { action: string }) {
  const style = ACTION_STYLES[action] || ACTION_STYLES.kept;
  return (
    <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", style.bg, style.text)}>
      {style.label}
    </span>
  );
}

export function FieldSummaryBadges({ fields }: { fields: Array<{ action: string }> }) {
  const counts: Record<string, number> = {};
  for (const f of fields) {
    counts[f.action] = (counts[f.action] || 0) + 1;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(counts).map(([action, count]) => {
        const style = ACTION_STYLES[action] || ACTION_STYLES.kept;
        return (
          <span key={action} className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", style.bg, style.text)}>
            {count} {style.label}
          </span>
        );
      })}
    </div>
  );
}
