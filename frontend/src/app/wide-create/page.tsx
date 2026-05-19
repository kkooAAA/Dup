"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWideCreationStore } from "@/store/useWideCreationStore";
import { useAppStore } from "@/store/useAppStore";
import { wideCreationApi } from "@/services/api";
import { toast } from "sonner";
import { StepObjectives } from "@/components/wide-create/StepObjectives";
import { StepStructure } from "@/components/wide-create/StepStructure";
import { StepCampaignConfig } from "@/components/wide-create/StepCampaignConfig";
import { StepAdSetConfig } from "@/components/wide-create/StepAdSetConfig";
import { StepAdConfig } from "@/components/wide-create/StepAdConfig";
import {
  Grid3X3,
  ArrowRight,
  ArrowLeft,
  Rocket,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { extractApiError } from "@/lib/utils";

const STEP_LABELS = [
  { n: 1, label: "Objectives" },
  { n: 2, label: "Structure" },
  { n: 3, label: "Campaigns" },
  { n: 4, label: "Ad Sets" },
  { n: 5, label: "Ads" },
];

export default function WideCreatePage() {
  const store = useWideCreationStore();
  const { selectedAccount } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<any>(null);
  const [generationResult, setGenerationResult] = useState<any>(null);

  const totalCampaigns = store.campaigns.length;
  const totalAdSets = store.campaigns.reduce((sum, c) => sum + c.adSets.length, 0);
  const totalAds = store.campaigns.reduce(
    (sum, c) => sum + c.adSets.reduce((s, as) => s + as.ads.length, 0), 0
  );

  const canGoNext = (): boolean => {
    if (store.step === 1) return store.objectiveSelections.length > 0;
    if (store.step === 2) return totalCampaigns > 0;
    return true;
  };

  const handleNext = () => {
    if (store.step === 1) {
      store.generateStructure();
    } else if (store.step < 5) {
      store.setStep((store.step + 1) as any);
    }
  };

  const handleBack = () => {
    if (store.step > 1) {
      store.setStep((store.step - 1) as any);
    }
  };

  const handleValidate = async () => {
    if (!selectedAccount) {
      toast.error("Please select an ad account first");
      return;
    }
    setIsValidating(true);
    try {
      const template = store.toTemplate(selectedAccount.adaccount_id || selectedAccount.id);
      const res = await wideCreationApi.validate(template);
      setValidation(res.data);
      if (res.data.valid) {
        toast.success(`Valid! ${res.data.totalEntities.campaigns} campaigns, ${res.data.totalEntities.adSets} ad sets, ${res.data.totalEntities.ads} ads ready`);
      } else {
        toast.error(`${res.data.errors.length} error(s) found`);
      }
    } catch (error: any) {
      toast.error(extractApiError(error, "Validation failed"));
    } finally {
      setIsValidating(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedAccount) {
      toast.error("Please select an ad account first");
      return;
    }
    setIsGenerating(true);
    try {
      const template = store.toTemplate(selectedAccount.adaccount_id || selectedAccount.id);
      const res = await wideCreationApi.generate(template);
      setGenerationResult(res.data);
      toast.success(
        `Created ${res.data.totalCreated.campaigns} campaigns, ${res.data.totalCreated.adSets} ad sets, ${res.data.totalCreated.ads} ads as drafts`
      );
    } catch (error: any) {
      toast.error(extractApiError(error, "Generation failed"));
      if (error.response?.data?.validation) {
        setValidation(error.response.data.validation);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    if (!confirm("Reset all wide creation data?")) return;
    store.reset();
    setValidation(null);
    setGenerationResult(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Grid3X3 className="w-6 h-6 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-gray-100">Wide Creation</h1>
              <p className="text-sm text-gray-500">
                Generate large Campaign → Ad Set → Ad structures at scale
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {totalCampaigns > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="text-blue-400 border-blue-400/30">
                  {totalCampaigns} Campaign{totalCampaigns > 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline" className="text-green-400 border-green-400/30">
                  {totalAdSets} Ad Set{totalAdSets > 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline" className="text-purple-400 border-purple-400/30">
                  {totalAds} Ad{totalAds > 1 ? "s" : ""}
                </Badge>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-gray-400 border-gray-700"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Step indicators — horizontally scrollable on mobile */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex items-center gap-1 min-w-max">
          {STEP_LABELS.map(({ n, label }, i) => (
            <div key={n} className="flex items-center">
              <button
                onClick={() => {
                  if (n <= store.step || (n === 2 && totalCampaigns > 0)) {
                    store.setStep(n as any);
                  }
                }}
                disabled={n > store.step && !(n === 2 && totalCampaigns > 0)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  n === store.step
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : n < store.step
                    ? "text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600"
                    : "text-gray-600 border border-gray-800 cursor-not-allowed"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  n === store.step ? "bg-blue-600 text-white" :
                  n < store.step ? "bg-gray-700 text-gray-300" : "bg-gray-800 text-gray-600"
                }`}>
                  {n < store.step ? "✓" : n}
                </span>
                {label}
              </button>
              {i < STEP_LABELS.length - 1 && (
                <div className={`w-4 h-px mx-1 ${n < store.step ? "bg-blue-500/50" : "bg-gray-800"}`} />
              )}
            </div>
          ))}
        </div>
        </div>

        {/* Step Content */}
        {store.step === 1 && <StepObjectives />}
        {store.step === 2 && <StepStructure />}
        {store.step === 3 && <StepCampaignConfig />}
        {store.step === 4 && <StepAdSetConfig />}
        {store.step === 5 && <StepAdConfig />}

        {/* Navigation + Actions */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                {store.step > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    className="text-gray-400 border-gray-700"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Back
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {validation && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {validation.valid ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400">Valid</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-400">{validation.errors.length} error(s)</span>
                      </>
                    )}
                  </div>
                )}

                {store.step >= 3 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleValidate}
                      disabled={isValidating}
                      className="border-gray-700 text-gray-300"
                    >
                      {isValidating && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                      Validate
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleGenerate}
                      disabled={isGenerating || totalCampaigns === 0}
                      className="bg-green-600 hover:bg-green-500"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Rocket className="w-3.5 h-3.5 mr-1" />
                      )}
                      Generate Drafts
                    </Button>
                  </>
                )}

                {store.step < 5 && (
                  <Button
                    size="sm"
                    onClick={handleNext}
                    disabled={!canGoNext()}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    Next
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>

            {/* Validation errors */}
            {validation && !validation.valid && (
              <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                {validation.errors.map((err: any, i: number) => (
                  <div key={i} className="text-xs text-red-400 flex items-start gap-1.5">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>
                      <span className="text-red-300 font-mono">{err.path}</span>
                      {err.field && <span>.{err.field}</span>}: {err.message}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Generation result */}
            {generationResult && (
              <div className="mt-3 p-3 bg-green-950/30 border border-green-800/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">
                    Generated {generationResult.totalCreated.campaigns} campaigns,{" "}
                    {generationResult.totalCreated.adSets} ad sets,{" "}
                    {generationResult.totalCreated.ads} ads as drafts
                  </span>
                </div>
                {generationResult.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {generationResult.warnings.map((w: string, i: number) => (
                      <div key={i} className="text-xs text-yellow-400">{w}</div>
                    ))}
                  </div>
                )}
                <a href="/drafts" className="text-xs text-blue-400 hover:underline mt-2 inline-block">
                  View in Drafts →
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
