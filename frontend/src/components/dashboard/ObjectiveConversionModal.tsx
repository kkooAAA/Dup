"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ArrowRightLeft,
  Layers,
  Lock,
  Trash2,
  Zap,
  Info,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { duplicationApi } from "@/services/api";
import { cn } from "@/lib/utils";

interface ObjectiveConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: Array<{ id: string; type: string; name: string }>;
  adAccountId: string;
  onSuccess: () => void;
}

const OBJECTIVES = [
  { value: "OUTCOME_AWARENESS", label: "Awareness", description: "Maximize reach and ad recall" },
  { value: "OUTCOME_TRAFFIC", label: "Traffic", description: "Send people to a destination" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement", description: "Get more messages, video views, or post engagement" },
  { value: "OUTCOME_LEADS", label: "Leads", description: "Collect leads for your business" },
  { value: "OUTCOME_SALES", label: "Sales", description: "Find people likely to purchase" },
  { value: "OUTCOME_APP_PROMOTION", label: "App Promotion", description: "Get people to install your app" },
];

interface OptimizedField {
  field: string;
  label: string;
  action: string;
  reason?: string;
  originalValue?: any;
  newValue: any;
  editable: boolean;
  type: string;
  enumValues?: string[];
  enumLabels?: Record<string, string>;
}

const ACTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  kept:        { bg: "bg-gray-800/40",    text: "text-gray-400",    label: "Kept" },
  removed:     { bg: "bg-red-500/10",     text: "text-red-400",     label: "Removed" },
  transformed: { bg: "bg-blue-500/10",    text: "text-blue-400",    label: "Changed" },
  locked:      { bg: "bg-gray-800/60",    text: "text-gray-500",    label: "Locked" },
  auto_mapped: { bg: "bg-amber-500/10",   text: "text-amber-400",   label: "Auto-mapped" },
  added:       { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Added" },
};

function FieldActionBadge({ action }: { action: string }) {
  const style = ACTION_STYLES[action] || ACTION_STYLES.kept;
  return (
    <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", style.bg, style.text)}>
      {style.label}
    </span>
  );
}

function ConversionFieldRow({
  field,
  onChangeValue,
}: {
  field: OptimizedField;
  onChangeValue: (field: string, value: any) => void;
}) {
  const isObject = field.type === "object";

  return (
    <div
      className={cn(
        "p-2.5 rounded-lg border transition-all",
        field.action === "removed"
          ? "border-red-500/20 bg-red-500/5 opacity-60"
          : field.action === "locked"
          ? "border-gray-800/40 bg-gray-900/30 opacity-70"
          : field.action === "auto_mapped"
          ? "border-amber-500/20 bg-amber-500/5"
          : field.action === "transformed"
          ? "border-blue-500/20 bg-blue-500/5"
          : "border-gray-800/30 bg-gray-900/20"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {field.action === "locked" && <Lock className="w-3 h-3 text-gray-600" />}
          {field.action === "removed" && <Trash2 className="w-3 h-3 text-red-500" />}
          {field.action === "auto_mapped" && <ArrowRightLeft className="w-3 h-3 text-amber-400" />}
          <span className="text-xs font-medium text-gray-300">{field.label}</span>
        </div>
        <FieldActionBadge action={field.action} />
      </div>

      {field.reason && (
        <p className="text-[10px] text-gray-500 mb-1.5">{field.reason}</p>
      )}

      {field.action !== "removed" && (
        <div className="flex items-center gap-2">
          {field.originalValue !== undefined && field.originalValue !== field.newValue && (
            <span className="text-[10px] text-red-400/60 line-through truncate max-w-[120px]">
              {isObject ? "..." : String(field.originalValue)}
            </span>
          )}
          {field.originalValue !== field.newValue && (
            <ChevronRight className="w-3 h-3 text-gray-700 shrink-0" />
          )}

          {field.editable && field.type === "enum" && field.enumValues ? (
            <select
              value={field.newValue || ""}
              onChange={(e) => onChangeValue(field.field, e.target.value)}
              className="flex-1 h-7 rounded-md bg-gray-950 border border-gray-800 text-[11px] text-gray-200 px-2 focus:outline-none focus:border-blue-500"
            >
              {field.enumValues.map((v) => (
                <option key={v} value={v}>
                  {field.enumLabels?.[v] || v}
                </option>
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

export const ObjectiveConversionModal = ({
  isOpen,
  onClose,
  selectedItems,
  adAccountId,
  onSuccess,
}: ObjectiveConversionModalProps) => {
  const [step, setStep] = useState(1);
  const [targetObjective, setTargetObjective] = useState("OUTCOME_TRAFFIC");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [optimizationData, setOptimizationData] = useState<any>(null);

  const selectedItem = selectedItems[0];
  const isBulk = selectedItems.length > 1;

  useEffect(() => {
    if (selectedItem) {
      setNewName(
        isBulk
          ? `${selectedItems.length} Campaigns selected`
          : `${selectedItem.name} - Converted`
      );
    }
  }, [selectedItems, isBulk]);

  const handleFetchOptimization = async () => {
    setLoading(true);
    try {
      const resp = await duplicationApi.optimizeConversion({
        type: selectedItem.type,
        id: selectedItem.id,
        targetObjective,
        newName: isBulk ? undefined : newName,
      });
      setOptimizationData(resp.data);
      setStep(3);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to analyze conversion");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (entityKey: string, field: string, value: any) => {
    if (!optimizationData) return;
    const updated = { ...optimizationData };
    const entity =
      entityKey === "campaign"
        ? updated.campaign
        : updated.adSets?.find((s: any) => s.sourceId === entityKey);
    if (!entity) return;
    const f = entity.fields?.find((fld: any) => fld.field === field);
    if (f) {
      f.newValue = value;
      f.action = "transformed";
    }
    if (entity.payload) entity.payload[field] = value;
    setOptimizationData(updated);
  };

  const handleConvert = async (mode: "draft" | "publish") => {
    setLoading(true);
    try {
      await duplicationApi.convertObjective({
        items: selectedItems,
        targetObjective,
        newName: isBulk ? undefined : newName,
        adAccountId,
        saveAsDraft: mode === "draft",
      });

      toast.success(
        mode === "draft"
          ? `Saved ${selectedItems.length} item(s) as draft.`
          : `Successfully converted ${selectedItems.length} item(s)!`
      );
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to convert");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep(1);
    setOptimizationData(null);
  };

  if (selectedItems.length === 0) return null;

  const fieldSummary = optimizationData
    ? {
        kept: 0,
        removed: 0,
        transformed: 0,
        auto_mapped: 0,
        locked: 0,
      }
    : null;

  if (fieldSummary && optimizationData) {
    const allFields = [
      ...(optimizationData.campaign?.fields || []),
      ...(optimizationData.adSets || []).flatMap((s: any) => s.fields || []),
    ];
    for (const f of allFields) {
      if (f.action in fieldSummary) {
        (fieldSummary as any)[f.action]++;
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800 text-gray-100">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <RefreshCw className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">Objective Conversion</DialogTitle>
              <DialogDescription className="text-gray-400">
                {isBulk
                  ? `Transform ${selectedItems.length} campaigns into a different objective.`
                  : `Transform "${selectedItem.name}" into a different campaign type.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between px-2 py-3 mb-2">
          {[
            { n: 1, label: "Select Objective" },
            { n: 2, label: "Configuration" },
            { n: 3, label: "Optimize & Review" },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                  step >= s.n ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-500"
                )}
              >
                {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
              </div>
              <span className={cn("text-xs", step >= s.n ? "text-gray-200" : "text-gray-500")}>
                {s.label}
              </span>
              {s.n < 3 && <div className="w-8 h-[2px] bg-gray-800 ml-1" />}
            </div>
          ))}
        </div>

        <div className="py-2">
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {OBJECTIVES.map((obj) => (
                <button
                  key={obj.value}
                  onClick={() => setTargetObjective(obj.value)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    targetObjective === obj.value
                      ? "border-blue-600 bg-blue-600/10"
                      : "border-gray-800 bg-gray-950 hover:border-gray-700"
                  )}
                >
                  <div className="font-bold text-gray-100">{obj.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{obj.description}</div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {!isBulk && (
                <div className="space-y-2">
                  <Label htmlFor="newName">New Campaign Name</Label>
                  <Input
                    id="newName"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-gray-950 border-gray-800 focus:border-blue-500"
                    placeholder="Enter new name..."
                  />
                </div>
              )}

              <div className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-lg flex gap-3 text-amber-200">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold mb-1">Intelligent Transformation</p>
                  Incompatible fields will be automatically removed or remapped. All new items will be
                  created as <strong>PAUSED</strong>.
                  {isBulk && (
                    <p className="mt-2 text-xs opacity-80">
                      All campaigns will be appended with &quot;- Converted&quot;.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && optimizationData && (
            <div className="space-y-4 max-h-[55vh] overflow-y-auto">
              {/* Summary badges */}
              {fieldSummary && (
                <div className="flex flex-wrap gap-2">
                  {fieldSummary.kept > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-800/40 text-gray-400">
                      {fieldSummary.kept} Kept
                    </span>
                  )}
                  {fieldSummary.auto_mapped > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">
                      {fieldSummary.auto_mapped} Auto-mapped
                    </span>
                  )}
                  {fieldSummary.transformed > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-500/10 text-blue-400">
                      {fieldSummary.transformed} Changed
                    </span>
                  )}
                  {fieldSummary.removed > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-500/10 text-red-400">
                      {fieldSummary.removed} Removed
                    </span>
                  )}
                  {fieldSummary.locked > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-800/60 text-gray-500">
                      {fieldSummary.locked} Locked
                    </span>
                  )}
                </div>
              )}

              <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-lg flex gap-2 items-start">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-300">
                  Converting from <strong>{optimizationData.sourceObjective}</strong> to{" "}
                  <strong>{optimizationData.targetObjective}</strong>. Fields were analyzed for
                  compatibility. Edit any field marked as editable before confirming.
                </p>
              </div>

              {/* Campaign section */}
              {optimizationData.campaign && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    Campaign
                  </h3>
                  {optimizationData.campaign.warnings?.map((w: string, i: number) => (
                    <p key={i} className="text-[10px] text-amber-400 mb-1">{w}</p>
                  ))}
                  {optimizationData.campaign.errors?.map((e: string, i: number) => (
                    <p key={i} className="text-[10px] text-red-400 mb-1">{e}</p>
                  ))}
                  <div className="space-y-1.5">
                    {optimizationData.campaign.fields?.map((f: OptimizedField) => (
                      <ConversionFieldRow
                        key={f.field}
                        field={f}
                        onChangeValue={(field, value) => handleFieldChange("campaign", field, value)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Ad Set sections */}
              {(optimizationData.adSets || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    Ad Sets
                    {optimizationData.totalAdSets > optimizationData.adSets.length && (
                      <span className="text-[10px] text-gray-500">
                        (showing {optimizationData.adSets.length} of {optimizationData.totalAdSets})
                      </span>
                    )}
                  </h3>
                  {optimizationData.adSets.map((adSet: any) => (
                    <div key={adSet.sourceId} className="mb-4">
                      <p className="text-xs text-gray-400 mb-1.5 font-medium">{adSet.sourceName}</p>
                      {adSet.warnings?.map((w: string, i: number) => (
                        <p key={i} className="text-[10px] text-amber-400 mb-1">{w}</p>
                      ))}
                      {adSet.errors?.map((e: string, i: number) => (
                        <p key={i} className="text-[10px] text-red-400 mb-1">{e}</p>
                      ))}
                      <div className="space-y-1.5">
                        {adSet.fields?.map((f: OptimizedField) => (
                          <ConversionFieldRow
                            key={f.field}
                            field={f}
                            onChangeValue={(field, value) =>
                              handleFieldChange(adSet.sourceId, field, value)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={loading}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={handleClose} disabled={loading} className="mr-2">
            Cancel
          </Button>
          {step === 1 && (
            <Button onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-700">
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleFetchOptimization} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              Optimize & Review
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleConvert("draft")}
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 min-w-[140px]"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Layers className="w-4 h-4 mr-2" />
                )}
                Save as Draft
              </Button>
              <Button
                onClick={() => handleConvert("publish")}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 min-w-[140px]"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                )}
                Publish Now
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
