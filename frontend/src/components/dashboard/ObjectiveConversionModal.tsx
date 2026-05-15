"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
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
  Layers
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { duplicationApi } from "@/services/api";

interface ObjectiveConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: Array<{ id: string, type: string, name: string }>;
  adAccountId: string;
  onSuccess: () => void;
}

const OBJECTIVES = [
  { value: 'OUTCOME_AWARENESS', label: 'Awareness', description: 'Maximize reach and ad recall' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic', description: 'Send people to a destination' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement', description: 'Get more messages, video views, or post engagement' },
  { value: 'OUTCOME_LEADS', label: 'Leads', description: 'Collect leads for your business' },
  { value: 'OUTCOME_SALES', label: 'Sales', description: 'Find people likely to purchase' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion', description: 'Get people to install your app' },
];

export const ObjectiveConversionModal = ({ isOpen, onClose, selectedItems, adAccountId, onSuccess }: ObjectiveConversionModalProps) => {
  const [step, setStep] = useState(1);
  const [targetObjective, setTargetObjective] = useState('OUTCOME_TRAFFIC');
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const selectedItem = selectedItems[0];
  const isBulk = selectedItems.length > 1;

  useEffect(() => {
    if (selectedItem) {
      setNewName(isBulk ? `${selectedItems.length} Campaigns selected` : `${selectedItem.name} - Converted`);
    }
  }, [selectedItems, isBulk]);

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      fetchPreview();
    }
  };

  const fetchPreview = async () => {
    setLoading(true);
    try {
      // For preview, we always preview the first item as a representative sample
      const response = await duplicationApi.previewConversion({
        type: selectedItem.type,
        id: selectedItem.id,
        targetObjective,
        newName: isBulk ? undefined : newName
      });
      setPreviewData(response.data);
      setStep(3);
    } catch (error: any) {
      toast.error("Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (mode: 'draft' | 'publish') => {
    setLoading(true);
    try {
      await duplicationApi.convertObjective({
        items: selectedItems,
        targetObjective,
        newName: isBulk ? undefined : newName,
        adAccountId,
        saveAsDraft: mode === 'draft'
      });

      toast.success(
        mode === 'draft'
          ? `Saved ${selectedItems.length} item(s) as draft. Review in Drafts before publishing.`
          : `Successfully converted ${selectedItems.length} item(s) to ${targetObjective}!`
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to convert objective";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (selectedItems.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800 text-gray-100">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <RefreshCw className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
                Objective Conversion
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {isBulk
                  ? `Transform ${selectedItems.length} campaigns into a different objective.`
                  : `Transform "${selectedItem.name}" into a different campaign type.`
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between px-2 py-4 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-500"
                }`}>
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              <span className={`text-sm ${step >= s ? "text-gray-200" : "text-gray-500"}`}>
                {s === 1 ? "Select Objective" : s === 2 ? "Configuration" : "Preview Diff"}
              </span>
              {s < 3 && <div className="w-12 h-[2px] bg-gray-800 ml-2" />}
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
                  className={`p-4 rounded-xl border-2 text-left transition-all ${targetObjective === obj.value
                      ? "border-blue-600 bg-blue-600/10"
                      : "border-gray-800 bg-gray-950 hover:border-gray-700"
                    }`}
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
                  We will automatically map compatible settings and replace others with safe Meta defaults. All new items will be created as <strong>PAUSED</strong>.
                  {isBulk && <p className="mt-2 text-xs opacity-80">Note: All campaigns will be appended with "- Converted" to their original names.</p>}
                </div>
              </div>
            </div>
          )}

          {step === 3 && previewData && (
            <div className="space-y-6">
              {/* Campaign Diff */}
              <div>
                <div className="text-sm font-medium text-gray-400 mb-2">Campaign level changes:</div>
                <div className="bg-gray-950 rounded-xl border border-gray-800 divide-y divide-gray-800 overflow-hidden">
                  {Object.entries(previewData.diff).map(([key, change]: [string, any]) => (
                    <div key={key} className="p-3 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3 text-xs font-mono text-gray-500">{key}</div>
                      <div className="col-span-4 text-xs text-red-400 line-through truncate px-2 bg-red-400/5 rounded">
                        {JSON.stringify(change.from)}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="col-span-4 text-xs text-green-400 truncate px-2 bg-green-400/5 rounded">
                        {JSON.stringify(change.to)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Child Summary */}
              {previewData.childSummary && (
                <div className="p-4 bg-blue-600/5 border border-blue-500/20 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-blue-400 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Conversion Scope
                    </h3>
                    <div className="flex gap-2">
                      <div className="px-2 py-1 bg-blue-500/10 rounded text-[10px] font-bold text-blue-300">
                        {previewData.childSummary.adSetsCount} Ad Sets
                      </div>
                      <div className="px-2 py-1 bg-pink-500/10 rounded text-[10px] font-bold text-pink-300">
                        {previewData.childSummary.adsCount} Total Ads Covered
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Optimization goal set to <strong>{previewData.childSummary.sampleAdSet?.optimization_goal}</strong>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      Billing event set to <strong>{previewData.childSummary.sampleAdSet?.billing_event}</strong>
                    </div>
                    {isBulk && (
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                        Applying to <strong>{selectedItems.length}</strong> selected campaigns
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={loading}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose} disabled={loading} className="mr-2">
            Cancel
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => handleConvert('draft')}
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 min-w-[150px]"
              >
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (
                  <>
                    <Layers className="w-4 h-4 mr-2" />
                    Save as Draft
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleConvert('publish')}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 min-w-[150px]"
              >
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Converting...</> : (
                  <>
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Publish Now
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
