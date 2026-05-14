"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { useEffect, useState } from "react";
import { adAccountApi } from "@/services/api";
import { Campaign, AdSet, Ad } from "@/types";
import { 
  ChevronRight, 
  ChevronDown, 
  Megaphone, 
  Layers, 
  Image as ImageIcon,
  Copy,
  Plus,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Edit2,
  Check,
  X
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { DuplicateModal } from "@/components/dashboard/DuplicateModal";
import { ObjectiveConversionModal } from "@/components/dashboard/ObjectiveConversionModal";
import { Input } from "@/components/ui/input";

export default function ExplorerPage() {
  const { selectedAccount } = useAppStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [adSets, setAdSets] = useState<Record<string, AdSet[]>>({});
  const [ads, setAds] = useState<Record<string, Ad[]>>({});
  const [selectedItems, setSelectedItems] = useState<Map<string, { id: string, type: string, name: string }>>(new Map());
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [updating, setUpdating] = useState(false);

  const selectedItemsList = Array.from(selectedItems.values());
  const canConvertObjective = selectedItemsList.length === 1 && selectedItemsList[0].type === 'CAMPAIGN';

  useEffect(() => {
    if (selectedAccount) {
      fetchCampaigns();
    }
  }, [selectedAccount]);

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.objective.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await adAccountApi.getCampaigns(selectedAccount!.id);
      setCampaigns(response.data);
    } catch (error) {
      toast.error("Failed to fetch campaigns");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async (id: string, type: 'CAMPAIGN' | 'ADSET' | 'AD') => {
    if (!editValue.trim()) return;
    setUpdating(true);
    try {
      await adAccountApi.updateName(id, editValue);
      toast.success("Name updated successfully");
      
      // Update local state
      if (type === 'CAMPAIGN') {
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, name: editValue } : c));
      } else if (type === 'ADSET') {
        setAdSets(prev => {
          const newState = { ...prev };
          for (const campaignId in newState) {
            newState[campaignId] = newState[campaignId].map(as => as.id === id ? { ...as, name: editValue } : as);
          }
          return newState;
        });
      } else if (type === 'AD') {
        setAds(prev => {
          const newState = { ...prev };
          for (const adsetId in newState) {
            newState[adsetId] = newState[adsetId].map(ad => ad.id === id ? { ...ad, name: editValue } : ad);
          }
          return newState;
        });
      }
      
      setEditingId(null);
    } catch (error) {
      toast.error("Failed to update name");
    } finally {
      setUpdating(false);
    }
  };

  const toggleCampaign = async (campaignId: string) => {
    const newExpanded = new Set(expandedCampaigns);
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId);
    } else {
      newExpanded.add(campaignId);
      if (!adSets[campaignId]) {
        try {
          const response = await adAccountApi.getAdSets(campaignId);
          setAdSets(prev => ({ ...prev, [campaignId]: response.data }));
        } catch (error) {
          toast.error("Failed to fetch ad sets");
        }
      }
    }
    setExpandedCampaigns(newExpanded);
  };

  const toggleAdSet = async (adSetId: string) => {
    const newExpanded = new Set(expandedAdSets);
    if (newExpanded.has(adSetId)) {
      newExpanded.delete(adSetId);
    } else {
      newExpanded.add(adSetId);
      if (!ads[adSetId]) {
        try {
          const response = await adAccountApi.getAds(adSetId);
          setAds(prev => ({ ...prev, [adSetId]: response.data }));
        } catch (error) {
          toast.error("Failed to fetch ads");
        }
      }
    }
    setExpandedAdSets(newExpanded);
  };

  const handleSelection = (id: string, type: string, name: string) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.set(id, { id, type, name });
    }
    setSelectedItems(newSelected);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Campaign Explorer</h2>
            <p className="text-gray-400 mt-1">Browse and select structures to duplicate.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              className="gap-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              onClick={() => setIsConversionModalOpen(true)}
              disabled={!canConvertObjective}
            >
              <RefreshCw className="w-4 h-4" />
              Convert Objective
            </Button>
            <Button 
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => setIsDuplicateModalOpen(true)}
              disabled={selectedItems.size === 0}
            >
              <Copy className="w-4 h-4" />
              Duplicate Selected ({selectedItems.size})
            </Button>
          </div>
        </div>

        {!selectedAccount ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-400">Please select an ad account from the dashboard first.</p>
            <Button variant="link" onClick={() => window.location.href = '/dashboard'}>Go to Dashboard</Button>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center gap-4 bg-gray-900/50">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search campaigns, adsets or ads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-2 border-gray-800" onClick={() => setSearchQuery("")}>
                Clear
              </Button>
              <Button variant="ghost" size="sm" onClick={fetchCampaigns}>
                Refresh
              </Button>
            </div>

            <div className="overflow-auto max-h-[700px]">
              {loading ? (
                <div className="p-20 flex flex-col items-center justify-center text-gray-500 gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p>Loading campaigns...</p>
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  {searchQuery ? `No items match "${searchQuery}"` : "No campaigns found in this account."}
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {filteredCampaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-gray-900">
                      {/* Campaign Row */}
                      <div className="flex items-center gap-3 p-4 hover:bg-gray-800/50 transition-colors group">
                        <Checkbox 
                          checked={selectedItems.has(campaign.id)}
                          onCheckedChange={() => handleSelection(campaign.id, 'CAMPAIGN', campaign.name)}
                        />
                        <button 
                          onClick={() => toggleCampaign(campaign.id)}
                          className="text-gray-500 hover:text-white transition-colors"
                        >
                          {expandedCampaigns.has(campaign.id) ? <ChevronDown /> : <ChevronRight />}
                        </button>
                        <Megaphone className="w-5 h-5 text-blue-400" />
                        <div className="flex-1">
                          {editingId === campaign.id ? (
                            <div className="flex items-center gap-2">
                              <Input 
                                value={editValue} 
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 bg-gray-950 border-gray-800"
                                autoFocus
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => handleUpdateName(campaign.id, 'CAMPAIGN')} disabled={updating}>
                                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setEditingId(null)} disabled={updating}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-semibold text-gray-200">{campaign.name}</p>
                                <p className="text-xs text-gray-500">{campaign.objective}</p>
                              </div>
                              <button 
                                onClick={() => { setEditingId(campaign.id); setEditValue(campaign.name); }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            campaign.status === 'ACTIVE' ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-400'
                          }`}>
                            {campaign.status}
                          </span>
                        </div>
                      </div>

                      {/* Ad Sets Section */}
                      {expandedCampaigns.has(campaign.id) && (
                        <div className="bg-gray-950/50 ml-8 border-l border-gray-800">
                          {adSets[campaign.id]?.length === 0 ? (
                            <div className="p-3 text-xs text-gray-600 italic">No ad sets</div>
                          ) : adSets[campaign.id]?.map((adset) => (
                            <div key={adset.id}>
                              {/* Ad Set Row */}
                              <div className="flex items-center gap-3 p-3 hover:bg-gray-800/50 transition-colors group">
                                <Checkbox 
                                  checked={selectedItems.has(adset.id)}
                                  onCheckedChange={() => handleSelection(adset.id, 'ADSET', adset.name)}
                                />
                                <button 
                                  onClick={() => toggleAdSet(adset.id)}
                                  className="text-gray-500 hover:text-white transition-colors"
                                >
                                  {expandedAdSets.has(adset.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                <Layers className="w-4 h-4 text-purple-400" />
                                <div className="flex-1">
                                  {editingId === adset.id ? (
                                    <div className="flex items-center gap-2">
                                      <Input 
                                        value={editValue} 
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="h-8 bg-gray-950 border-gray-800 text-sm"
                                        autoFocus
                                      />
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => handleUpdateName(adset.id, 'ADSET')} disabled={updating}>
                                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setEditingId(null)} disabled={updating}>
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-300">{adset.name}</p>
                                      <button 
                                        onClick={() => { setEditingId(adset.id); setEditValue(adset.name); }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                                      >
                                        <Edit2 className="w-3 h-3 text-gray-400" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {adset.status}
                                </span>
                              </div>

                              {/* Ads Section */}
                              {expandedAdSets.has(adset.id) && (
                                <div className="bg-gray-950/80 ml-8 border-l border-gray-800">
                                  {ads[adset.id]?.length === 0 ? (
                                    <div className="p-2 text-xs text-gray-600 italic">No ads</div>
                                  ) : ads[adset.id]?.map((ad) => (
                                    <div key={ad.id} className="flex items-center gap-3 p-2 pl-4 hover:bg-gray-800/50 transition-colors group">
                                      <Checkbox 
                                        checked={selectedItems.has(ad.id)}
                                        onCheckedChange={() => handleSelection(ad.id, 'AD', ad.name)}
                                      />
                                      <ImageIcon className="w-4 h-4 text-pink-400" />
                                      <div className="flex-1">
                                        {editingId === ad.id ? (
                                          <div className="flex items-center gap-2">
                                            <Input 
                                              value={editValue} 
                                              onChange={(e) => setEditValue(e.target.value)}
                                              className="h-7 bg-gray-950 border-gray-800 text-xs"
                                              autoFocus
                                            />
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={() => handleUpdateName(ad.id, 'AD')} disabled={updating}>
                                              {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setEditingId(null)} disabled={updating}>
                                              <X className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <p className="text-sm text-gray-400">{ad.name}</p>
                                            <button 
                                              onClick={() => { setEditingId(ad.id); setEditValue(ad.name); }}
                                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                                            >
                                              <Edit2 className="w-2.5 h-2.5 text-gray-500" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-gray-600">
                                        {ad.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <DuplicateModal 
        isOpen={isDuplicateModalOpen} 
        onClose={() => setIsDuplicateModalOpen(false)}
        selectedItems={Array.from(selectedItems.values())}
        adAccountId={selectedAccount?.id || ""}
        onSuccess={() => {
          setSelectedItems(new Map());
          fetchCampaigns();
        }}
      />

      <ObjectiveConversionModal
        isOpen={isConversionModalOpen}
        onClose={() => setIsConversionModalOpen(false)}
        selectedItems={selectedItemsList}
        adAccountId={selectedAccount?.id || ""}
        onSuccess={() => {
          setSelectedItems(new Map());
          fetchCampaigns();
        }}
      />
    </DashboardLayout>
  );
}
