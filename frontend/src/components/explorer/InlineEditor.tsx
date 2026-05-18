"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Braces, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function resolvePattern(pattern: string, ctx: Record<string, string | undefined>): string {
  return pattern.replace(/\{\{(.*?)\}\}/g, (match, inner) => {
    const [key, transform] = inner.split('|').map((s: string) => s.trim());
    let val = ctx[key];
    if (val === undefined) return match;
    switch ((transform || '').toLowerCase()) {
      case 'upper': return val.toUpperCase();
      case 'lower': return val.toLowerCase();
      case 'snake': return val.replace(/\s+/g, '_').toLowerCase();
      case 'camel': return val.replace(/(?:^\w|[A-Z]|\b\w)/g, (w: string, i: number) => i === 0 ? w.toLowerCase() : w.toUpperCase()).replace(/\s+/g, '');
      case 'pascal': return val.replace(/(?:^\w|[A-Z]|\b\w)/g, (w: string) => w.toUpperCase()).replace(/\s+/g, '');
      default: return val;
    }
  });
}

const VARS_BY_TYPE = {
  CAMPAIGN: ['campaign_name', 'objective', 'date'],
  ADSET:    ['adset_name', 'campaign_name', 'date'],
  AD:       ['ad_name', 'adset_name', 'date'],
} as const;

interface InlineEditorProps {
  id: string;
  type: 'CAMPAIGN' | 'ADSET' | 'AD';
  context?: Record<string, string | undefined>;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onSave: (id: string, type: 'CAMPAIGN' | 'ADSET' | 'AD', resolvedName: string) => void;
  onCancel: () => void;
  updating: boolean;
}

export function InlineEditor({
  id, type, context = {},
  editValue, onEditValueChange, onSave, onCancel, updating,
}: InlineEditorProps) {
  const [templateMode, setTemplateMode] = useState(false);
  const fullCtx = { ...context, date: format(new Date(), 'yyyy-MM-dd') };
  const hasVars = editValue.includes('{{');
  const resolved = hasVars ? resolvePattern(editValue, fullCtx) : editValue;

  return (
    <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5">
        <Input
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          className={cn("h-7 bg-gray-950 border-gray-700 text-sm focus:border-blue-500", hasVars && "font-mono")}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') onSave(id, type, resolved); if (e.key === 'Escape') onCancel(); }}
        />
        <Button size="icon" variant="ghost"
          className={cn("h-7 w-7 shrink-0", templateMode ? "text-blue-400 bg-blue-500/10" : "text-gray-600 hover:text-gray-300")}
          onClick={() => setTemplateMode(m => !m)}
          title="Template variables">
          <Braces className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-emerald-500 hover:bg-emerald-500/10"
          onClick={() => onSave(id, type, resolved)} disabled={updating}>
          {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-gray-500 hover:bg-gray-800"
          onClick={onCancel} disabled={updating}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {templateMode && (
        <div className="flex flex-wrap gap-1 pl-0.5">
          {VARS_BY_TYPE[type].map(v => (
            <button key={v}
              onClick={() => onEditValueChange(editValue + `{{${v}}}`)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 font-mono">
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      )}

      {hasVars && (
        <p className="text-[11px] text-gray-500 font-mono pl-0.5 truncate">→ {resolved}</p>
      )}
    </div>
  );
}
