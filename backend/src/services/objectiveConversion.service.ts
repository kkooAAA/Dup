import { FacebookService } from './facebook.service';

export interface ConversionMapping {
  objective: string;
  optimization_goal: string;
  billing_event: string;
}

export const OBJECTIVE_DEFAULTS: Record<string, ConversionMapping> = {
  'OUTCOME_AWARENESS': {
    objective: 'OUTCOME_AWARENESS',
    optimization_goal: 'REACH',
    billing_event: 'IMPRESSIONS'
  },
  'OUTCOME_TRAFFIC': {
    objective: 'OUTCOME_TRAFFIC',
    optimization_goal: 'LINK_CLICKS',
    billing_event: 'IMPRESSIONS'
  },
  'OUTCOME_ENGAGEMENT': {
    objective: 'OUTCOME_ENGAGEMENT',
    optimization_goal: 'POST_ENGAGEMENT',
    billing_event: 'IMPRESSIONS'
  },
  'OUTCOME_LEADS': {
    objective: 'OUTCOME_LEADS',
    optimization_goal: 'LEADS',
    billing_event: 'IMPRESSIONS'
  },
  'OUTCOME_SALES': {
    objective: 'OUTCOME_SALES',
    optimization_goal: 'OFFSITE_CONVERSIONS',
    billing_event: 'IMPRESSIONS'
  },
  'OUTCOME_APP_PROMOTION': {
    objective: 'OUTCOME_APP_PROMOTION',
    optimization_goal: 'APP_INSTALLS',
    billing_event: 'IMPRESSIONS'
  }
};

// Legacy objectives mapping
export const LEGACY_OBJECTIVE_MAP: Record<string, string> = {
  'REACH': 'OUTCOME_AWARENESS',
  'BRAND_AWARENESS': 'OUTCOME_AWARENESS',
  'LINK_CLICKS': 'OUTCOME_TRAFFIC',
  'POST_ENGAGEMENT': 'OUTCOME_ENGAGEMENT',
  'CONVERSIONS': 'OUTCOME_SALES',
  'PRODUCT_CATALOG_SALES': 'OUTCOME_SALES',
  'LEAD_GENERATION': 'OUTCOME_LEADS',
  'APP_INSTALLS': 'OUTCOME_APP_PROMOTION'
};

export class ObjectiveConversionService {
  private fbService: FacebookService;

  constructor(fbService: FacebookService) {
    this.fbService = fbService;
  }

  async getPreview(type: 'CAMPAIGN' | 'ADSET' | 'AD', id: string, targetObjective: string, newName?: string) {
    if (type === 'CAMPAIGN') {
      return this.previewCampaign(id, targetObjective, newName);
    } else if (type === 'ADSET') {
      return this.previewAdSet(id, targetObjective, newName);
    } else if (type === 'AD') {
      return this.previewAd(id, targetObjective, newName);
    }
    throw new Error('Invalid type for preview');
  }

  private async previewCampaign(campaignId: string, targetObjective: string, newName?: string) {
    const original = await this.fbService.get(`/${campaignId}`, {
      params: { fields: 'name,objective,bid_strategy,daily_budget,lifetime_budget,special_ad_categories' }
    });

    const campaignData = original.data;
    const transformed = this.transformCampaign(campaignData, targetObjective, newName || `${campaignData.name || 'Campaign'} - Converted`);

    // Fetch all ad sets to get accurate counts
    const adSets = await this.fbService.getAdSets(campaignId);
    let totalAdsCount = 0;
    
    // We fetch ads for all ad sets to get the true total count
    for (const adSet of adSets) {
      try {
        const ads = await this.fbService.getAds(adSet.id);
        totalAdsCount += ads.length;
      } catch (e) {
        console.warn(`[ObjectiveConversionService] Could not fetch ads for ad set ${adSet.id}`);
      }
    }

    let childSummary: any = {
      adSetsCount: adSets.length,
      adsCount: totalAdsCount,
      sampleAdSet: null,
      sampleAd: null
    };

    if (adSets.length > 0) {
      try {
        const fullAdSetResponse = await this.fbService.get(`/${adSets[0].id}`, {
          params: { fields: 'name,billing_event,optimization_goal,bid_amount,daily_budget,lifetime_budget,targeting,promoted_object,attribution_spec,destination_type' }
        });
        const adSetData = fullAdSetResponse.data;
        childSummary.sampleAdSet = this.transformAdSet(adSetData, targetObjective, `${adSetData.name || 'Ad Set'} - Converted`, 'NEW_CAMPAIGN_ID');
        
        const sampleAds = await this.fbService.getAds(adSets[0].id);
        if (sampleAds.length > 0) {
          const fullAdResponse = await this.fbService.get(`/${sampleAds[0].id}`, {
            params: { fields: 'name,creative,tracking_specs' }
          });
          const adData = fullAdResponse.data;
          childSummary.sampleAd = this.transformAd(adData, targetObjective, `${adData.name || 'Ad'} - Converted`, 'NEW_ADSET_ID');
        }
      } catch (e) {
        console.warn(`[ObjectiveConversionService] Error generating sample child data for preview`, e);
      }
    }

    return {
      original: campaignData,
      transformed,
      diff: this.generateDiff(campaignData, transformed),
      childSummary
    };
  }


  private async previewAdSet(adSetId: string, targetObjective: string, newName?: string) {
    const original = await this.fbService.get(`/${adSetId}`, {
      params: { fields: 'name,billing_event,optimization_goal,bid_amount,daily_budget,lifetime_budget,targeting,promoted_object,attribution_spec,destination_type' }
    });

    const transformed = this.transformAdSet(original.data, targetObjective, newName || `${original.data.name} - Converted`, 'DUMMY_CAMPAIGN_ID');

    return {
      original: original.data,
      transformed,
      diff: this.generateDiff(original.data, transformed)
    };
  }

  private async previewAd(adId: string, targetObjective: string, newName?: string) {
    const original = await this.fbService.get(`/${adId}`, {
      params: { fields: 'name,creative,tracking_specs' }
    });

    const transformed = this.transformAd(original.data, targetObjective, newName || `${original.data.name} - Converted`, 'DUMMY_ADSET_ID');

    return {
      original: original.data,
      transformed,
      diff: this.generateDiff(original.data, transformed)
    };
  }

  public transformCampaign(data: any, targetObjective: string, newName: string) {
    const isCBO = !!(data.bid_strategy || (data.daily_budget && data.daily_budget !== "0" && data.daily_budget !== 0) || (data.lifetime_budget && data.lifetime_budget !== "0" && data.lifetime_budget !== 0));
    
    let payload: any = {
      name: newName,
      objective: targetObjective,
      status: 'PAUSED',
      special_ad_categories: data.special_ad_categories || [],
      is_adset_budget_sharing_enabled: isCBO
    };

    if (data.daily_budget) payload.daily_budget = data.daily_budget;
    if (data.lifetime_budget) payload.lifetime_budget = data.lifetime_budget;
    if (data.bid_strategy) payload.bid_strategy = data.bid_strategy;

    return payload;
  }

  public transformAdSet(data: any, targetObjective: string, newName: string, campaignId: string) {
    const defaults = OBJECTIVE_DEFAULTS[targetObjective] || OBJECTIVE_DEFAULTS['OUTCOME_AWARENESS'];
    
    // Smart optimization goal mapping
    let optimization_goal = defaults.optimization_goal;
    
    // Keep some original goals if compatible with new objective
    if (targetObjective === 'OUTCOME_ENGAGEMENT' && 
       ['POST_ENGAGEMENT', 'VIDEO_VIEWS', 'THRUPLAY', 'MESSAGES'].includes(data.optimization_goal)) {
      optimization_goal = data.optimization_goal;
    } else if (targetObjective === 'OUTCOME_TRAFFIC' && 
              ['LINK_CLICKS', 'LANDING_PAGE_VIEWS'].includes(data.optimization_goal)) {
      optimization_goal = data.optimization_goal;
    }

    const sanitizedTargeting = this.sanitizeTargeting(data.targeting);

    let payload: any = {
      name: newName,
      campaign_id: campaignId,
      status: 'PAUSED',
      billing_event: defaults.billing_event,
      optimization_goal: optimization_goal,
      targeting: sanitizedTargeting
    };

    if (data.daily_budget) payload.daily_budget = data.daily_budget;
    if (data.lifetime_budget) payload.lifetime_budget = data.lifetime_budget;
    if (data.bid_strategy) payload.bid_strategy = data.bid_strategy;
    if (data.bid_amount) payload.bid_amount = data.bid_amount;

    // Smart transformation for promoted_object
    if (targetObjective === 'OUTCOME_SALES' || targetObjective === 'OUTCOME_LEADS' || targetObjective === 'OUTCOME_APP_PROMOTION') {
      if (data.promoted_object) {
        payload.promoted_object = this.sanitizePromotedObject(data.promoted_object);
      } else if (targetObjective === 'OUTCOME_APP_PROMOTION') {
        // App Promotion requires a promoted_object. If missing, this will fail creation, 
        // but we'll let Meta throw the specific error for application_id.
      }
    } else if (targetObjective === 'OUTCOME_ENGAGEMENT') {
      // For engagement, we might keep the Page if it's there
      if (data.promoted_object?.page_id) {
        payload.promoted_object = { page_id: data.promoted_object.page_id };
      }
    }

    if (data.attribution_spec) payload.attribution_spec = data.attribution_spec;
    if (data.destination_type) payload.destination_type = data.destination_type;

    return payload;
  }

  public transformAd(data: any, targetObjective: string, newName: string, adSetId: string) {
    if (!data || !data.creative) {
      console.warn(`[ObjectiveConversionService] Ad data or creative missing for ${newName}. Using dummy creative.`);
    }

    const payload: any = {
      name: newName,
      adset_id: adSetId,
      status: 'PAUSED',
      creative: data?.creative?.id ? { creative_id: data.creative.id } : 
                data?.creative?.creative_id ? { creative_id: data.creative.creative_id } :
                { creative_id: "DUMMY_CREATIVE_ID" },
    };

    if (data && data.tracking_specs) {
      payload.tracking_specs = data.tracking_specs;
    }

    return payload;
  }

  private sanitizeTargeting(targeting: any) {
    // Default safe targeting if none exists
    const defaultTargeting = { geo_locations: { countries: ['TH'] } };
    
    if (!targeting) return defaultTargeting;
    
    try {
      const sanitized = JSON.parse(JSON.stringify(targeting));
      delete sanitized.id;
      delete sanitized.targeting_automation;
      delete sanitized.contextual_targeting_options;
      
      // Ensure geo_locations is present as it's required for most objectives
      if (!sanitized.geo_locations || Object.keys(sanitized.geo_locations).length === 0) {
        sanitized.geo_locations = defaultTargeting.geo_locations;
      }
      
      return sanitized;
    } catch (e) {
      console.error(`[ObjectiveConversionService] Failed to sanitize targeting`, e);
      return defaultTargeting;
    }
  }

  private sanitizePromotedObject(promotedObject: any) {
    if (!promotedObject) return undefined;
    const { id, ...sanitized } = promotedObject;
    return sanitized;
  }

  private generateDiff(original: any, transformed: any) {
    const diff: any = {};
    const allKeys = new Set([...Object.keys(original), ...Object.keys(transformed)]);

    for (const key of allKeys) {
      if (JSON.stringify(original[key]) !== JSON.stringify(transformed[key])) {
        diff[key] = {
          from: original[key],
          to: transformed[key]
        };
      }
    }
    return diff;
  }

  async convertCampaignDeep(campaignId: string, targetObjective: string, newName: string, adAccountId: string) {
    // 1. Fetch original campaign
    const originalCampaign = await this.fbService.get(`/${campaignId}`, {
      params: { fields: 'name,objective,bid_strategy,daily_budget,lifetime_budget,special_ad_categories' }
    });

    // 2. Transform and create campaign
    const campaignPayload = this.transformCampaign(originalCampaign.data, targetObjective, newName);
    const isNewCampaignCBO = campaignPayload.is_adset_budget_sharing_enabled;
    const newCampaign = (await this.fbService.client.post(`/${adAccountId}/campaigns`, campaignPayload)).data;

    // 3. Fetch Ad Sets
    const adSets = await this.fbService.getAdSets(campaignId);

    for (const adSet of adSets) {
      // 4. Fetch full ad set data
      const fullAdSet = await this.fbService.get(`/${adSet.id}`, {
        params: { fields: 'name,billing_event,optimization_goal,bid_amount,daily_budget,lifetime_budget,targeting,promoted_object,attribution_spec,destination_type' }
      });

      // 5. Transform and create ad set
      const adSetPayload = this.transformAdSet(fullAdSet.data, targetObjective, `${fullAdSet.data.name} - Converted`, newCampaign.id);
      
      // IF CBO IS ENABLED ON CAMPAIGN, WE MUST OMIT BUDGET ON AD SET
      if (isNewCampaignCBO) {
        delete adSetPayload.daily_budget;
        delete adSetPayload.lifetime_budget;
        delete adSetPayload.bid_strategy;
        delete adSetPayload.bid_amount;
      }

      const newAdSet = (await this.fbService.client.post(`/${adAccountId}/adsets`, adSetPayload)).data;

      // 6. Fetch Ads
      const ads = await this.fbService.getAds(adSet.id);
      for (const ad of ads) {
        // 7. Fetch full ad data
        const fullAd = await this.fbService.get(`/${ad.id}`, {
          params: { fields: 'name,creative,tracking_specs' }
        });

        // 8. Transform and create ad
        const adPayload = this.transformAd(fullAd.data, targetObjective, `${fullAd.data.name} - Converted`, newAdSet.id);
        await this.fbService.client.post(`/${adAccountId}/ads`, adPayload);
      }
    }

    return newCampaign;
  }
}
