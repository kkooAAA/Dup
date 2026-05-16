"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useWideCreationStore } from "@/store/useWideCreationStore";
import { draftApi } from "@/services/api";
import { Loader2, Copy, Image as ImageIcon } from "lucide-react";

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_TRAFFIC: "Traffic",
  OUTCOME_LEADS: "Leads",
  OUTCOME_SALES: "Sales",
  OUTCOME_AWARENESS: "Awareness",
  OUTCOME_ENGAGEMENT: "Engagement",
  OUTCOME_APP_PROMOTION: "App Promotion",
};

export function StepAdConfig() {
  const store = useWideCreationStore();
  const objectives = store.getObjectives();
  const [activeObjective, setActiveObjective] = useState(objectives[0] || "");
  const [applyToAll, setApplyToAll] = useState(true);
  const [creativeMode, setCreativeMode] = useState<"id" | "inline">("id");

  const campaigns = store.getCampaignsByObjective(activeObjective);
  const firstCampaign = campaigns[0];
  const firstAdSet = firstCampaign?.adSets[0];
  const firstAd = firstAdSet?.ads[0];

  const totalAds = campaigns.reduce(
    (s, c) => s + c.adSets.reduce((s2, as) => s2 + as.ads.length, 0), 0
  );

  const handleChange = (field: string, value: any) => {
    if (applyToAll) {
      store.bulkUpdateAdField(activeObjective, field, value);
    } else if (firstCampaign && firstAdSet && firstAd) {
      store.updateAdField(firstCampaign.id, firstAdSet.id, firstAd.id, field, value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Objective tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {objectives.map((obj) => {
          const count = store.getCampaignsByObjective(obj).reduce(
            (s, c) => s + c.adSets.reduce((s2, as) => s2 + as.ads.length, 0), 0
          );
          return (
            <button
              key={obj}
              onClick={() => setActiveObjective(obj)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                obj === activeObjective
                  ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                  : "text-gray-500 hover:text-gray-300 border-gray-700"
              }`}
            >
              {OBJECTIVE_LABELS[obj]}
              <span className="ml-1.5 text-[10px] opacity-70">({count} ads)</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Checkbox checked={applyToAll} onCheckedChange={(v) => setApplyToAll(!!v)} />
        <span>Apply to all {totalAds} {OBJECTIVE_LABELS[activeObjective]} ads</span>
        <Copy className="w-3 h-3" />
      </div>

      {/* Creative Configuration */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-300">Creative</CardTitle>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCreativeMode("id")}
                className={`px-2 py-1 rounded text-[10px] ${
                  creativeMode === "id"
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Existing ID
              </button>
              <button
                onClick={() => setCreativeMode("inline")}
                className={`px-2 py-1 rounded text-[10px] ${
                  creativeMode === "inline"
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Inline
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {creativeMode === "id" ? (
            <div>
              <Label className="text-xs text-gray-500">Creative ID (reuse existing)</Label>
              <Input
                value={firstAd?.fields.creative?.creative_id || ""}
                onChange={(e) => handleChange("creative", { creative_id: e.target.value })}
                placeholder="Enter creative_id to reuse"
                className="bg-gray-800 border-gray-700 mt-1"
              />
              <p className="text-[10px] text-gray-600 mt-1">
                Reuses an existing creative to preserve social proof (likes, comments, shares)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Page ID</Label>
                <Input
                  value={firstAd?.fields.creative?.object_story_spec?.page_id || ""}
                  onChange={(e) => handleChange("creative", {
                    object_story_spec: {
                      ...firstAd?.fields.creative?.object_story_spec,
                      page_id: e.target.value,
                    },
                  })}
                  placeholder="Facebook Page ID"
                  className="bg-gray-800 border-gray-700 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Primary Text</Label>
                <Input
                  value={firstAd?.fields.creative?.object_story_spec?.link_data?.message || ""}
                  onChange={(e) => handleChange("creative", {
                    object_story_spec: {
                      ...firstAd?.fields.creative?.object_story_spec,
                      link_data: {
                        ...firstAd?.fields.creative?.object_story_spec?.link_data,
                        message: e.target.value,
                      },
                    },
                  })}
                  placeholder="Ad copy text"
                  className="bg-gray-800 border-gray-700 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Link URL</Label>
                <Input
                  value={firstAd?.fields.creative?.object_story_spec?.link_data?.link || ""}
                  onChange={(e) => handleChange("creative", {
                    object_story_spec: {
                      ...firstAd?.fields.creative?.object_story_spec,
                      link_data: {
                        ...firstAd?.fields.creative?.object_story_spec?.link_data,
                        link: e.target.value,
                      },
                    },
                  })}
                  placeholder="https://example.com"
                  className="bg-gray-800 border-gray-700 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Image URL</Label>
                <Input
                  value={firstAd?.fields.creative?.object_story_spec?.link_data?.picture || ""}
                  onChange={(e) => handleChange("creative", {
                    object_story_spec: {
                      ...firstAd?.fields.creative?.object_story_spec,
                      link_data: {
                        ...firstAd?.fields.creative?.object_story_spec?.link_data,
                        picture: e.target.value,
                      },
                    },
                  })}
                  placeholder="https://example.com/image.jpg"
                  className="bg-gray-800 border-gray-700 mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tracking (objective-specific) */}
      {(activeObjective === "OUTCOME_SALES" || activeObjective === "OUTCOME_LEADS") && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">Tracking Specs (JSON)</Label>
              <Input
                value={firstAd?.fields.tracking_specs ? JSON.stringify(firstAd.fields.tracking_specs) : ""}
                onChange={(e) => {
                  try {
                    handleChange("tracking_specs", JSON.parse(e.target.value));
                  } catch { /* ignore parse errors during typing */ }
                }}
                placeholder='[{"action.type": ["offsite_conversion"], "fb_pixel": ["PIXEL_ID"]}]'
                className="bg-gray-800 border-gray-700 mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-gray-600 mt-1">
                Required for conversion tracking. Configure in draft editor for complex setups.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* App-specific */}
      {activeObjective === "OUTCOME_APP_PROMOTION" && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">App Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">
              App-specific ad configuration (deep links, app events) can be configured in the draft editor after generation.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-3">
          <p className="text-xs text-gray-400">
            After generating drafts, you can refine individual ads in the draft editor with the full Meta-compatible form system.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
