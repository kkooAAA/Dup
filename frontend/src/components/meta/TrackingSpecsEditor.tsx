"use client";

import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

// A single Meta tracking spec: an `action.type` array plus an optional object
// reference array (page / fb_pixel / conversion_id / custom key). Mirrors the
// shape stored in node overrides and consumed by the backend publish path.
export interface TrackingSpec {
  "action.type": string[];
  page?: string[];
  fb_pixel?: string[];
  conversion_id?: string[];
  [key: string]: string[] | undefined;
}

// Known action types and the single object field each one binds to. Meta rejects
// specs whose action type carries no object (error 100/1634005) — for the types
// here that DO require an object (page/pixel/conversion), the editor surfaces an
// input so the user can supply it. Types with `objectKey: null` (link_click,
// landing page view, video view) are valid object-free and need no extra input.
// Keep this list aligned with the action types Meta accepts.
interface ActionTypeDef {
  value: string;
  label: string;
  objectKey: "page" | "fb_pixel" | "conversion_id" | null;
  objectLabel?: string;
  objectPlaceholder?: string;
}

const ACTION_TYPES: ActionTypeDef[] = [
  { value: "link_click", label: "Link Click", objectKey: null },
  {
    value: "post_engagement",
    label: "Post Engagement",
    objectKey: "page",
    objectLabel: "Page ID",
    objectPlaceholder: "e.g. 1064753226727354",
  },
  {
    value: "post_interaction_gross",
    label: "Post Interaction",
    objectKey: "page",
    objectLabel: "Page ID",
    objectPlaceholder: "e.g. 1064753226727354",
  },
  {
    value: "onsite_conversion",
    label: "On-site Conversion",
    objectKey: "conversion_id",
    objectLabel: "Conversion ID",
    objectPlaceholder: "e.g. 25753534954323372",
  },
  { value: "one_pd_landing_page_view", label: "Landing Page View", objectKey: null },
  {
    value: "offsite_conversion",
    label: "Offsite Conversion",
    objectKey: "fb_pixel",
    objectLabel: "Pixel ID",
    objectPlaceholder: "e.g. 123456789",
  },
  { value: "video_view", label: "Video View", objectKey: null },
];

const ACTION_TYPE_MAP = new Map(ACTION_TYPES.map((a) => [a.value, a]));

const CUSTOM = "__custom__";

// First element of `action.type` is the action; Meta stores it as an array.
function getActionType(spec: TrackingSpec): string {
  return spec["action.type"]?.[0] ?? "";
}

// For a known action type, read the value of its object field (first element).
function getObjectValue(spec: TrackingSpec, objectKey: string): string {
  const v = spec[objectKey];
  return Array.isArray(v) ? v[0] ?? "" : "";
}

// For a custom spec, find the first object key/value that isn't `action.type`.
function getCustomObject(spec: TrackingSpec): { key: string; value: string } {
  for (const [k, v] of Object.entries(spec)) {
    if (k === "action.type") continue;
    if (Array.isArray(v)) return { key: k, value: v[0] ?? "" };
  }
  return { key: "", value: "" };
}

interface TrackingSpecsEditorProps {
  value: TrackingSpec[] | undefined;
  onChange: (specs: TrackingSpec[] | undefined) => void;
  disabled?: boolean;
}

export function TrackingSpecsEditor({ value, onChange, disabled }: TrackingSpecsEditorProps) {
  const specs = value ?? [];

  // Empty list collapses to `undefined` so the override is dropped (the store
  // only strips ''/null/undefined, never []), reverting to the bulk default.
  const emit = (next: TrackingSpec[]) => {
    onChange(next.length === 0 ? undefined : next);
  };

  const updateSpec = (index: number, spec: TrackingSpec) => {
    emit(specs.map((s, i) => (i === index ? spec : s)));
  };

  const removeSpec = (index: number) => {
    emit(specs.filter((_, i) => i !== index));
  };

  const addSpec = () => {
    emit([...specs, { "action.type": ["link_click"] }]);
  };

  // Switching action type rebuilds the spec so stale object keys don't linger
  // (e.g. moving from offsite_conversion → link_click must drop fb_pixel).
  const changeActionType = (index: number, rawValue: string) => {
    const existing = specs[index];
    if (rawValue === CUSTOM) {
      const prior = getCustomObject(existing);
      const spec: TrackingSpec = { "action.type": [""] };
      if (prior.key) spec[prior.key] = [prior.value];
      updateSpec(index, spec);
      return;
    }
    const def = ACTION_TYPE_MAP.get(rawValue);
    const spec: TrackingSpec = { "action.type": [rawValue] };
    if (def?.objectKey) {
      // Preserve any prior object value when the key is the same.
      spec[def.objectKey] = [getObjectValue(existing, def.objectKey)];
    }
    updateSpec(index, spec);
  };

  const changeObjectValue = (index: number, objectKey: string, raw: string) => {
    const existing = specs[index];
    updateSpec(index, { ...existing, [objectKey]: [raw] });
  };

  const changeCustomType = (index: number, raw: string) => {
    const existing = specs[index];
    updateSpec(index, { ...existing, "action.type": [raw] });
  };

  // Replace the custom object key (renaming it) while keeping its value, and drop
  // the previous key so we don't accumulate orphaned keys.
  const changeCustomKey = (index: number, newKey: string) => {
    const existing = specs[index];
    const prior = getCustomObject(existing);
    const spec: TrackingSpec = { "action.type": existing["action.type"] };
    if (newKey) spec[newKey] = [prior.value];
    updateSpec(index, spec);
  };

  const changeCustomValue = (index: number, raw: string) => {
    const existing = specs[index];
    const prior = getCustomObject(existing);
    const key = prior.key || "page";
    const spec: TrackingSpec = { "action.type": existing["action.type"] };
    spec[key] = [raw];
    updateSpec(index, spec);
  };

  return (
    <div>
      {specs.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-700 bg-gray-800/30 px-3 py-3 text-center">
          <p className="text-[10px] text-gray-500">No tracking specs</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {specs.map((spec, index) => {
            const actionType = getActionType(spec);
            const isKnown = ACTION_TYPE_MAP.has(actionType);
            const def = ACTION_TYPE_MAP.get(actionType);
            const selectValue = isKnown ? actionType : CUSTOM;

            return (
              <div
                key={index}
                className="flex flex-wrap items-end gap-1.5 rounded-md bg-gray-800/50 border border-gray-700/60 p-1.5"
              >
                <div className="min-w-[120px] flex-1">
                  <label className="block text-[9px] text-gray-500 mb-0.5">Action</label>
                  <select
                    value={selectValue}
                    disabled={disabled}
                    onChange={(e) => changeActionType(index, e.target.value)}
                    className="w-full rounded-md bg-gray-800 border border-gray-700 text-[11px] text-gray-200 px-2 py-1 h-7 disabled:opacity-50"
                  >
                    {ACTION_TYPES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                    <option value={CUSTOM}>Custom</option>
                  </select>
                </div>

                {/* Known type that requires an object → single labeled input */}
                {isKnown && def?.objectKey && (
                  <div className="min-w-[120px] flex-1">
                    <label className="block text-[9px] text-gray-500 mb-0.5">
                      {def.objectLabel}
                    </label>
                    <Input
                      type="text"
                      value={getObjectValue(spec, def.objectKey)}
                      disabled={disabled}
                      placeholder={def.objectPlaceholder}
                      onChange={(e) => changeObjectValue(index, def.objectKey!, e.target.value)}
                      className="bg-gray-800 border-gray-700 h-7 text-[11px]"
                    />
                  </div>
                )}

                {/* Custom type → raw action type + object key/value inputs */}
                {!isKnown && (
                  <>
                    <div className="min-w-[110px] flex-1">
                      <label className="block text-[9px] text-gray-500 mb-0.5">Type</label>
                      <Input
                        type="text"
                        value={actionType}
                        disabled={disabled}
                        placeholder="action type"
                        onChange={(e) => changeCustomType(index, e.target.value)}
                        className="bg-gray-800 border-gray-700 h-7 text-[11px]"
                      />
                    </div>
                    <div className="min-w-[90px] flex-1">
                      <label className="block text-[9px] text-gray-500 mb-0.5">Object key</label>
                      <Input
                        type="text"
                        value={getCustomObject(spec).key}
                        disabled={disabled}
                        placeholder="e.g. page"
                        onChange={(e) => changeCustomKey(index, e.target.value)}
                        className="bg-gray-800 border-gray-700 h-7 text-[11px]"
                      />
                    </div>
                    <div className="min-w-[90px] flex-1">
                      <label className="block text-[9px] text-gray-500 mb-0.5">Value</label>
                      <Input
                        type="text"
                        value={getCustomObject(spec).value}
                        disabled={disabled}
                        placeholder="id"
                        onChange={(e) => changeCustomValue(index, e.target.value)}
                        className="bg-gray-800 border-gray-700 h-7 text-[11px]"
                      />
                    </div>
                  </>
                )}

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeSpec(index)}
                  className="text-red-500/40 hover:text-red-400 p-1 disabled:opacity-50"
                  title="Remove tracking spec"
                  aria-label="Remove tracking spec"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={addSpec}
        className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-[10px] text-gray-300 hover:border-gray-600 hover:text-gray-100 disabled:opacity-50"
      >
        <Plus className="w-3 h-3" />
        Add tracking spec
      </button>
    </div>
  );
}
