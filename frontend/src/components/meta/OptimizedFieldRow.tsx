"use client";

import { Input } from "@/components/ui/input";
import { Lock, Trash2, ArrowRightLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldActionBadge } from "./FieldActionBadge";
import type { OptimizedField } from "@/lib/meta-schema";

interface OptimizedFieldRowProps {
  field: OptimizedField;
  onChangeValue: (field: string, value: any) => void;
  compact?: boolean;
}

export function OptimizedFieldRow({ field, onChangeValue, compact }: OptimizedFieldRowProps) {
  const isObject = field.type === "object";
  const isRemoved = field.action === "removed";
  const isLocked = field.action === "locked";
  const showDiff = field.originalValue !== undefined && field.originalValue !== field.newValue && !isRemoved;

  const actionIcon =
    isLocked ? <Lock className="w-3 h-3 text-gray-600" /> :
    isRemoved ? <Trash2 className="w-3 h-3 text-red-500" /> :
    field.action === "auto_mapped" ? <ArrowRightLeft className="w-3 h-3 text-amber-400" /> :
    null;

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      compact ? "p-2" : "p-2.5",
      isRemoved ? "border-red-500/20 bg-red-500/5 opacity-60" :
      isLocked ? "border-gray-800/40 bg-gray-900/30 opacity-70" :
      field.action === "auto_mapped" ? "border-amber-500/20 bg-amber-500/5" :
      field.action === "transformed" ? "border-blue-500/20 bg-blue-500/5" :
      "border-gray-800/30 bg-gray-900/20"
    )}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {actionIcon}
          <span className="text-xs font-medium text-gray-300">{field.label}</span>
          {!compact && <span className="text-[10px] text-gray-600 font-mono">{field.field}</span>}
        </div>
        <FieldActionBadge action={field.action} />
      </div>

      {field.reason && (
        <p className="text-[10px] text-gray-500 mb-1.5">{field.reason}</p>
      )}

      {!isRemoved && (
        <div className="flex items-center gap-2">
          {showDiff && (
            <>
              <span className="text-[10px] text-red-400/60 line-through truncate max-w-[120px]">
                {isObject ? "..." : String(field.originalValue)}
              </span>
              <ChevronRight className="w-3 h-3 text-gray-700 shrink-0" />
            </>
          )}

          {field.editable && field.type === "enum" && field.enumValues ? (
            <select
              value={field.newValue || ""}
              onChange={(e) => onChangeValue(field.field, e.target.value)}
              className="flex-1 h-7 rounded-md bg-gray-950 border border-gray-800 text-[11px] text-gray-200 px-2 focus:outline-none focus:border-blue-500"
            >
              {field.enumValues.map((v) => (
                <option key={v} value={v}>{field.enumLabels?.[v] || v}</option>
              ))}
            </select>
          ) : field.editable && field.type === "number" ? (
            <Input
              type="number"
              value={field.newValue || ""}
              onChange={(e) => onChangeValue(field.field, e.target.value)}
              className="flex-1 h-7 bg-gray-950 border-gray-800 text-[11px] font-mono text-yellow-400"
            />
          ) : field.editable && field.type === "string" ? (
            <Input
              value={field.newValue || ""}
              onChange={(e) => onChangeValue(field.field, e.target.value)}
              className="flex-1 h-7 bg-gray-950 border-gray-800 text-[11px]"
            />
          ) : (
            <span className="text-[11px] text-gray-400 font-mono truncate">
              {isObject ? JSON.stringify(field.newValue) : String(field.newValue ?? "—")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
