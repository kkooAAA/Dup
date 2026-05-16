"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useWideCreationStore } from "@/store/useWideCreationStore";
import { Plus, Trash2, Target, Megaphone, MousePointerClick, Users, ShoppingCart, Smartphone } from "lucide-react";

const OBJECTIVES = [
  { value: "OUTCOME_TRAFFIC", label: "Traffic", icon: MousePointerClick, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "OUTCOME_LEADS", label: "Leads", icon: Users, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  { value: "OUTCOME_SALES", label: "Sales", icon: ShoppingCart, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  { value: "OUTCOME_AWARENESS", label: "Awareness", icon: Megaphone, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement", icon: Target, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
  { value: "OUTCOME_APP_PROMOTION", label: "App Promotion", icon: Smartphone, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
];

export function StepObjectives() {
  const store = useWideCreationStore();
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);

  const totalCampaigns = store.objectiveSelections.reduce((sum, s) => sum + s.count, 0);
  const totalEntities = totalCampaigns * store.adSetsPerCampaign * store.adsPerAdSet;

  const handleAddObjective = (objective: string) => {
    const existing = store.objectiveSelections.findIndex(s => s.objective === objective);
    if (existing >= 0) {
      store.updateObjectiveSelection(existing, { count: store.objectiveSelections[existing].count + 1 });
    } else {
      store.addObjectiveSelection(objective, 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Objective Picker */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-300">
            Select Campaign Objectives
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {OBJECTIVES.map((obj) => {
              const Icon = obj.icon;
              const current = store.objectiveSelections.find(s => s.objective === obj.value);
              return (
                <button
                  key={obj.value}
                  onClick={() => handleAddObjective(obj.value)}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border transition-all hover:scale-[1.02] ${obj.bg} hover:border-opacity-60`}
                >
                  <Icon className={`w-6 h-6 ${obj.color}`} />
                  <span className={`text-xs font-medium ${obj.color}`}>{obj.label}</span>
                  {current && (
                    <Badge className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] min-w-[20px] h-5 flex items-center justify-center">
                      {current.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Objectives & Counts */}
      {store.objectiveSelections.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300">
              Campaign Counts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {store.objectiveSelections.map((sel, i) => {
              const objInfo = OBJECTIVES.find(o => o.value === sel.objective);
              const Icon = objInfo?.icon || Target;
              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
                  <Icon className={`w-4 h-4 ${objInfo?.color || "text-gray-400"}`} />
                  <span className={`text-sm font-medium ${objInfo?.color || "text-gray-300"} flex-1`}>
                    {objInfo?.label || sel.objective}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => store.updateObjectiveSelection(i, { count: Math.max(1, sel.count - 1) })}
                      className="w-6 h-6 rounded bg-gray-700 text-gray-300 flex items-center justify-center hover:bg-gray-600 text-sm"
                    >
                      -
                    </button>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={sel.count}
                      onChange={(e) => store.updateObjectiveSelection(i, { count: Math.max(1, Number(e.target.value)) })}
                      className="w-16 h-7 bg-gray-800 border-gray-600 text-center text-sm"
                    />
                    <button
                      onClick={() => store.updateObjectiveSelection(i, { count: sel.count + 1 })}
                      className="w-6 h-6 rounded bg-gray-700 text-gray-300 flex items-center justify-center hover:bg-gray-600 text-sm"
                    >
                      +
                    </button>
                    <button
                      onClick={() => store.removeObjectiveSelection(i)}
                      className="text-red-500/50 hover:text-red-400 p-1 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Structure counts */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-300">
            Structure per Campaign
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Ad Sets per Campaign</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={store.adSetsPerCampaign}
                onChange={(e) => store.setAdSetsPerCampaign(Math.max(1, Number(e.target.value)))}
                className="bg-gray-800 border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Ads per Ad Set</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={store.adsPerAdSet}
                onChange={(e) => store.setAdsPerAdSet(Math.max(1, Number(e.target.value)))}
                className="bg-gray-800 border-gray-700 mt-1"
              />
            </div>
            <div className="flex items-end">
              <div className="text-xs text-gray-500 pb-2">
                <span className="text-gray-300 font-medium">{totalCampaigns}</span> campaigns ×{" "}
                <span className="text-gray-300 font-medium">{store.adSetsPerCampaign}</span> ad sets ×{" "}
                <span className="text-gray-300 font-medium">{store.adsPerAdSet}</span> ads ={" "}
                <span className="text-blue-400 font-bold">{totalEntities}</span> total ads
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Naming Patterns */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-300">Naming Patterns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Campaign</Label>
              <Input
                value={store.namingPattern.campaign}
                onChange={(e) => store.setNamingPattern("campaign", e.target.value)}
                className="bg-gray-800 border-gray-700 mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Ad Set</Label>
              <Input
                value={store.namingPattern.adSet}
                onChange={(e) => store.setNamingPattern("adSet", e.target.value)}
                className="bg-gray-800 border-gray-700 mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Ad</Label>
              <Input
                value={store.namingPattern.ad}
                onChange={(e) => store.setNamingPattern("ad", e.target.value)}
                className="bg-gray-800 border-gray-700 mt-1 font-mono text-xs"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-600">
            Variables: {"{index}"} {"{index:02d}"} {"{objective}"} {"{parent}"} {"{total}"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
