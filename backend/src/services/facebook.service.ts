import axios from 'axios';

const FB_API_VERSION = 'v19.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

export class FacebookService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  public get client() {
    return axios.create({
      baseURL: FB_BASE_URL,
      params: {
        access_token: this.accessToken,
      },
    });
  }

  async get(path: string, params: any = {}) {
    return this.client.get(path, { params });
  }

  async getAdAccounts() {
    const response = await this.client.get('/me/adaccounts', {
      params: {
        fields: 'name,account_id,id,currency,timezone_name',
      },
    });
    return response.data.data;
  }

  async checkExistence(id: string) {
    try {
      await this.client.get(`/${id}`, { params: { fields: 'id' } });
      return true;
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async getCampaigns(adAccountId: string) {
    const response = await this.client.get(`/${adAccountId}/campaigns`, {
      params: {
        fields: 'name,id,status,objective,bid_strategy,daily_budget,lifetime_budget,start_time,stop_time,buying_type,special_ad_categories',
        filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'PENDING_REVIEW', 'DISAPPROVED', 'PREAPPROVED', 'PENDING_BILLING_INFO', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'IN_PROCESS', 'WITH_ISSUES'] }]),
      },
    });
    return response.data.data;
  }

  async getAdSets(campaignId: string) {
    const response = await this.client.get(`/${campaignId}/adsets`, {
      params: {
        fields: 'name,id,status,billing_event,optimization_goal,bid_amount,daily_budget,lifetime_budget,targeting,promoted_object,attribution_spec,optimization_sub_event,destination_type,bid_strategy',
        filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'PENDING_REVIEW', 'DISAPPROVED', 'PREAPPROVED', 'PENDING_BILLING_INFO', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'IN_PROCESS', 'WITH_ISSUES'] }]),
      },
    });
    return response.data.data;
  }

  async getAds(adSetId: string) {
    const response = await this.client.get(`/${adSetId}/ads`, {
      params: {
        fields: 'name,id,status,creative,tracking_specs,recommendations',
        filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'PENDING_REVIEW', 'DISAPPROVED', 'PREAPPROVED', 'PENDING_BILLING_INFO', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'IN_PROCESS', 'WITH_ISSUES'] }]),
      },
    });
    return response.data.data;
  }

  async duplicateCampaign(campaignId: string, newName: string, adAccountId: string, customBudget?: string) {
    console.log(`[FacebookService] Duplicating Campaign: ${campaignId}`);
    const original = await this.client.get(`/${campaignId}`, {
      params: {
        fields: 'objective,bid_strategy,buying_type,special_ad_categories,daily_budget,lifetime_budget',
      },
    });

    const data = original.data;
    let payload: any = {
      name: newName,
      objective: data.objective,
      status: 'PAUSED',
      special_ad_categories: data.special_ad_categories || [],
      is_adset_budget_sharing_enabled: false
    };

    if (data.buying_type) payload.buying_type = data.buying_type;
    
    // Handle Budget for Campaign (CBO)
    const isCBO = !!(data.bid_strategy || data.daily_budget || data.lifetime_budget);

    if (customBudget && isCBO) {
      payload.daily_budget = customBudget;
      if (data.bid_strategy) payload.bid_strategy = data.bid_strategy;
    } else if (data.bid_strategy) {
      payload.bid_strategy = data.bid_strategy;
      if (data.daily_budget) payload.daily_budget = data.daily_budget;
      if (data.lifetime_budget) payload.lifetime_budget = data.lifetime_budget;
      
      if (!payload.daily_budget && !payload.lifetime_budget) {
        payload.daily_budget = "100";
      }
    } else {
      if (data.daily_budget) payload.daily_budget = data.daily_budget;
      if (data.lifetime_budget) payload.lifetime_budget = data.lifetime_budget;
    }

    try {
      const response = await this.client.post(`/${adAccountId}/campaigns`, payload);
      return response.data;
    } catch (error: any) {
      console.error(`[FacebookService] Campaign Duplication Failed:`, error.response?.data || error.message);
      throw error;
    }
  }

  async duplicateAdSet(adSetId: string, newName: string, campaignId: string, adAccountId: string, customBudget?: string, parentCampaignIsCBO?: boolean) {
    console.log(`[FacebookService] Duplicating AdSet: ${adSetId} into Campaign: ${campaignId}`);
    
    // 1. Detect CBO if not provided
    let isCBO = parentCampaignIsCBO;
    if (isCBO === undefined) {
      try {
        const campaign = await this.client.get(`/${campaignId}`, {
          params: { fields: 'bid_strategy,daily_budget,lifetime_budget,is_adset_budget_sharing_enabled,buying_type' }
        });
        
        // is_adset_budget_sharing_enabled is the definitive flag for CBO
        isCBO = campaign.data.is_adset_budget_sharing_enabled === true || 
                !!(campaign.data.daily_budget && campaign.data.daily_budget !== "0" && campaign.data.daily_budget !== 0) || 
                !!(campaign.data.lifetime_budget && campaign.data.lifetime_budget !== "0" && campaign.data.lifetime_budget !== 0);
                
        console.log(`[FacebookService] CBO Detection for ${campaignId}: ${isCBO}`, campaign.data);
      } catch (error) {
        console.warn(`[FacebookService] Failed to detect CBO status for campaign ${campaignId}, defaulting to false`);
        isCBO = false;
      }
    }

    const original = await this.client.get(`/${adSetId}`, {
      params: {
        fields: 'billing_event,optimization_goal,bid_amount,daily_budget,lifetime_budget,targeting,promoted_object,attribution_spec,optimization_sub_event,destination_type,bid_strategy',
      },
    });

    const data = original.data;
    
    // Helper to build payload
    const buildPayload = (includeBudget: boolean) => {
      let payload: any = {
        name: newName,
        campaign_id: campaignId,
        status: 'PAUSED',
        billing_event: data.billing_event,
        optimization_goal: data.optimization_goal,
        targeting: data.targeting
      };

      if (includeBudget) {
        if (customBudget) {
          payload.daily_budget = customBudget;
        } else {
          if (data.daily_budget) payload.daily_budget = data.daily_budget;
          if (data.lifetime_budget) payload.lifetime_budget = data.lifetime_budget;
        }
        if (data.bid_strategy) payload.bid_strategy = data.bid_strategy;
        if (data.bid_amount) payload.bid_amount = data.bid_amount;
      }

      if (data.promoted_object) {
        // Remove read-only fields from promoted_object (like 'id')
        const { id, ...sanitizedPromotedObject } = data.promoted_object;
        payload.promoted_object = sanitizedPromotedObject;
      }

      if (data.targeting) {
        // Deep clone and sanitize targeting
        const sanitizedTargeting = JSON.parse(JSON.stringify(data.targeting));
        delete sanitizedTargeting.id;
        delete sanitizedTargeting.targeting_automation;
        delete sanitizedTargeting.contextual_targeting_options;
        payload.targeting = sanitizedTargeting;
      }

      if (data.attribution_spec) payload.attribution_spec = data.attribution_spec;
      if (data.optimization_sub_event) payload.optimization_sub_event = data.optimization_sub_event;
      if (data.destination_type) payload.destination_type = data.destination_type;

      return payload;
    };

    try {
      // Try with budget if not CBO
      const payload = buildPayload(!isCBO);
      const response = await this.client.post(`/${adAccountId}/adsets`, payload);
      return response.data;
    } catch (error: any) {
      const fbError = error.response?.data?.error;
      
      // Handle "Budget Conflict" error (subcode 1885621)
      if (fbError?.error_subcode === 1885621 || (fbError?.code === 100 && fbError?.message?.includes('budget'))) {
        console.warn(`[FacebookService] Budget conflict detected (CBO mismatch). Retrying WITHOUT budget fields...`);
        try {
          const retryPayload = buildPayload(false);
          const response = await this.client.post(`/${adAccountId}/adsets`, retryPayload);
          console.log(`[FacebookService] Retry successful! AdSet duplicated without budget.`);
          return response.data;
        } catch (retryError: any) {
          console.error(`[FacebookService] Retry also failed:`, retryError.response?.data || retryError.message);
          throw retryError;
        }
      }

      console.error(`[FacebookService] AdSet Duplication Failed:`, error.response?.data || error.message);
      throw error;
    }
  }

  async duplicateAd(adId: string, newName: string, adSetId: string, adAccountId: string) {
    const original = await this.client.get(`/${adId}`, {
      params: {
        fields: 'creative,tracking_specs',
      },
    });

    const data = original.data;
    const payload: any = {
      name: newName,
      adset_id: adSetId,
      status: 'PAUSED',
      creative: { creative_id: data.creative.id },
    };

    if (data.tracking_specs) payload.tracking_specs = data.tracking_specs;

    try {
      const response = await this.client.post(`/${adAccountId}/ads`, payload);
      return response.data;
    } catch (error: any) {
      console.error(`[FacebookService] Ad Duplication Failed:`, error.response?.data || error.message);
      throw error;
    }
  }

  async duplicateAdSetDeep(adSetId: string, newName: string, campaignId: string, adAccountId: string, customBudget?: string) {
    // 1. Duplicate the Ad Set itself
    const newAdSet = await this.duplicateAdSet(adSetId, newName, campaignId, adAccountId, customBudget);
    
    // 2. Fetch and duplicate all ads within this ad set
    try {
      const ads = await this.getAds(adSetId);
      for (const ad of ads) {
        await this.duplicateAd(ad.id, `${ad.name} - Copy`, newAdSet.id, adAccountId);
      }
    } catch (error) {
      console.warn(`[FacebookService] Failed to duplicate ads for ad set ${adSetId}:`, error);
      // We still return the new ad set even if ads fail
    }

    return newAdSet;
  }

  async duplicateCampaignDeep(campaignId: string, campaignName: string, adAccountId: string, customBudget?: string) {
    // 1. Fetch original campaign to check if it's CBO
    const original = await this.client.get(`/${campaignId}`, {
      params: { fields: 'bid_strategy,daily_budget,lifetime_budget' }
    });
    const isCBO = !!(original.data.bid_strategy || original.data.daily_budget || original.data.lifetime_budget);
    
    // 2. Duplicate Campaign
    const newCampaign = await this.duplicateCampaign(campaignId, campaignName, adAccountId, customBudget);
    
    // 3. Fetch Ad Sets
    const adSets = await this.getAdSets(campaignId);
    
    for (const adSet of adSets) {
      // 4. Duplicate Ad Set (Pass isCBO flag to prevent budget conflict)
      const newAdSet = await this.duplicateAdSet(adSet.id, `${adSet.name} - Copy`, newCampaign.id, adAccountId, customBudget, isCBO);
      
      // 5. Duplicate Ads
      const ads = await this.getAds(adSet.id);
      for (const ad of ads) {
        await this.duplicateAd(ad.id, `${ad.name} - Copy`, newAdSet.id, adAccountId);
      }
    }

    return newCampaign;
  }
}
