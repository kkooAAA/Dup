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
    optimization_goal: 'LEAD_GENERATION',
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
    // FIX: Pass fields directly, not nested in params
    const original = await this.fbService.get(`/${campaignId}`, {
      fields: 'name,objective,bid_strategy,daily_budget,lifetime_budget,special_ad_categories'
    });

    const campaignData = original.data;
    const transformed = this.transformCampaign(campaignData, targetObjective, newName || `${campaignData.name || 'Campaign'} - Converted`);

    const adSets = await this.fbService.getAdSets(campaignId);
    let totalAdsCount = 0;
    
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
          fields: 'name,billing_event,optimization_goal,bid_amount,daily_budget,lifetime_budget,targeting,promoted_object,attribution_spec,destination_type'
        });
        const adSetData = fullAdSetResponse.data;
        childSummary.sampleAdSet = this.transformAdSet(adSetData, targetObjective, `${adSetData.name || 'Ad Set'} - Converted`, 'NEW_CAMPAIGN_ID');
        
        const sampleAds = await this.fbService.getAds(adSets[0].id);
        if (sampleAds.length > 0) {
          const fullAdResponse = await this.fbService.get(`/${sampleAds[0].id}`, {
            fields: 'name,creative,tracking_specs'
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
      fields: 'name,billing_event,optimization_goal,bid_amount,daily_budget,lifetime_budget,targeting,promoted_object,attribution_spec,destination_type'
    });

    const transformed = this.transformAdSet(original.data, targetObjective, newName || `${original.data.name || 'Ad Set'} - Converted`, 'DUMMY_CAMPAIGN_ID');

    return {
      original: original.data,
      transformed,
      diff: this.generateDiff(original.data, transformed)
    };
  }

  private async previewAd(adId: string, targetObjective: string, newName?: string) {
    const original = await this.fbService.get(`/${adId}`, {
      fields: 'name,creative,tracking_specs'
    });

    const transformed = this.transformAd(original.data, targetObjective, newName || `${original.data.name || 'Ad'} - Converted`, 'DUMMY_ADSET_ID');

    return {
      original: original.data,
      transformed,
      diff: this.generateDiff(original.data, transformed)
    };
  }

  public transformCampaign(data: any, targetObjective: string, newName: string) {
    // Detect if original was CBO
    const isCBO = !!(data.bid_strategy || (data.daily_budget && data.daily_budget !== "0" && data.daily_budget !== 0) || (data.lifetime_budget && data.lifetime_budget !== "0" && data.lifetime_budget !== 0));
    
    let payload: any = {
      name: newName,
      objective: targetObjective,
      status: 'PAUSED',
      special_ad_categories: data.special_ad_categories || [],
      // We EXPLICITLY set the simplest bid strategy for maximum compatibility during conversion
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP'
    };

    if (isCBO) {
      if (data.daily_budget) payload.daily_budget = data.daily_budget;
      if (data.lifetime_budget) payload.lifetime_budget = data.lifetime_budget;
    }

    return payload;
  }

  public transformAdSet(data: any, targetObjective: string, newName: string, campaignId: string, pageId?: string) {
    const defaults = OBJECTIVE_DEFAULTS[targetObjective] || OBJECTIVE_DEFAULTS['OUTCOME_AWARENESS'];
    
    // Smart optimization goal mapping
    let optimization_goal = defaults.optimization_goal;
    
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

    // Smart Destination Mapping
    if (targetObjective === 'OUTCOME_LEADS') {
      // Default to ON_AD (Instant Forms) for leads if original was something else
      payload.destination_type = (data.destination_type === 'WEBSITE' || data.destination_type === 'UNDEFINED') 
                                 ? 'ON_AD' : data.destination_type;
    } else if (targetObjective === 'OUTCOME_TRAFFIC') {
      payload.destination_type = 'WEBSITE';
    } else if (data.destination_type && data.destination_type !== 'UNDEFINED') {
      payload.destination_type = data.destination_type;
    }

    // Budgets are carried over but will be deleted in main loop if parent is CBO
    if (data.daily_budget) payload.daily_budget = data.daily_budget;
    if (data.lifetime_budget) payload.lifetime_budget = data.lifetime_budget;

    // Manual bids are OMITTED for conversion safety
    
    // Smart transformation for promoted_object
    if (targetObjective === 'OUTCOME_SALES' || targetObjective === 'OUTCOME_LEADS' || targetObjective === 'OUTCOME_APP_PROMOTION') {
      if (data.promoted_object) {
        payload.promoted_object = this.sanitizePromotedObject(data.promoted_object);
      }
      
      // Mandatory for Leads/Engagement ON_AD: We MUST have a page_id
      if (targetObjective === 'OUTCOME_LEADS' && payload.destination_type === 'ON_AD') {
        if (!payload.promoted_object?.page_id && pageId) {
          payload.promoted_object = { ...payload.promoted_object, page_id: pageId };
          console.log(`[ObjectiveConversionService] Injected inherited page_id: ${pageId}`);
        }
      }
    } else if (targetObjective === 'OUTCOME_ENGAGEMENT') {
      if (data.promoted_object?.page_id) {
        payload.promoted_object = { page_id: data.promoted_object.page_id };
      } else if (pageId) {
        payload.promoted_object = { page_id: pageId };
      }
    }

    if (data.attribution_spec) payload.attribution_spec = data.attribution_spec;

    return payload;
  }

  public transformAd(data: any, targetObjective: string, newName: string, adSetId: string) {
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
    const defaultTargeting = { geo_locations: { countries: ['TH'] } };
    if (!targeting) return defaultTargeting;
    
    try {
      const sanitized = JSON.parse(JSON.stringify(targeting));
      delete sanitized.id;
      delete sanitized.targeting_automation;
      delete sanitized.contextual_targeting_options;
      if (!sanitized.geo_locations || Object.keys(sanitized.geo_locations).length === 0) {
        sanitized.geo_locations = defaultTargeting.geo_locations;
      }
      return sanitized;
    } catch (e) {
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
    console.log(`[ObjectiveConversionService] !!! STARTING DEEP CONVERSION !!!`);
    
    // 1. Fetch original campaign (FIXED GET CALL)
    const originalCampaign = await this.fbService.get(`/${campaignId}`, {
      fields: 'name,objective,bid_strategy,daily_budget,lifetime_budget,special_ad_categories'
    });
    console.log(`[ObjectiveConversionService] Original Campaign Data:`, originalCampaign.data);

    // 2. Transform and create campaign
    const campaignPayload = this.transformCampaign(originalCampaign.data, targetObjective, newName);
    const isNewCampaignCBO = !!(campaignPayload.daily_budget || campaignPayload.lifetime_budget);
    
    console.log(`[ObjectiveConversionService] Creating new campaign with payload:`, JSON.stringify(campaignPayload));
    const newCampaign = (await this.fbService.client.post(`/${adAccountId}/campaigns`, campaignPayload)).data;
    console.log(`[ObjectiveConversionService] SUCCESS: Created campaign ID: ${newCampaign.id}`);

    // 3. Fetch Ad Sets
    const adSets = await this.fbService.getAdSets(campaignId);
    console.log(`[ObjectiveConversionService] Found ${adSets?.length || 0} ad sets to convert`);

    for (let i = 0; i < adSets.length; i++) {
      const adSet = adSets[i];
      try {
        console.log(`[ObjectiveConversionService] --- Processing Ad Set ${i+1}/${adSets.length}: ${adSet.id} ---`);
        
        // 4. Fetch full ad set data
        const fullAdSet = await this.fbService.get(`/${adSet.id}`, {
          fields: 'name,billing_event,optimization_goal,bid_amount,daily_budget,lifetime_budget,targeting,promoted_object,attribution_spec,destination_type,bid_strategy'
        });
        const adSetData = fullAdSet.data;
        
        // 4.5 Intelligence: If objective is Leads/Engagement, we MUST find a page_id.
        let inheritedPageId = adSetData.promoted_object?.page_id;
        
        if (!inheritedPageId) {
          console.log(`[ObjectiveConversionService] No page_id in ad set ${adSet.id}, deep diving into ads to find one...`);
          const originalAds = await this.fbService.getAds(adSet.id);
          if (originalAds.length > 0) {
            try {
              // 1. Get the creative ID from the first ad
              const adResponse = await this.fbService.get(`/${originalAds[0].id}`, { fields: 'creative' });
              const creativeId = adResponse.data.creative?.id;
              
              if (creativeId) {
                // 2. Fetch creative details to find the page
                const creativeResponse = await this.fbService.get(`/${creativeId}`, { 
                  fields: 'object_id,actor_id,object_story_spec' 
                });
                const cr = creativeResponse.data;
                
                // 3. Extract page_id from various possible fields
                inheritedPageId = cr.object_id || cr.actor_id || cr.object_story_spec?.page_id;
                
                if (inheritedPageId) {
                  // Fetch Page Details & Permissions for verification
                  try {
                    const pageInfo = await this.fbService.get(`/${inheritedPageId}`, { 
                      fields: 'name,access_token,tasks,can_post,is_published' 
                    });
                    const p = pageInfo.data;
                    console.log(`[ObjectiveConversionService] PAGE VERIFIED: "${p.name}" (ID: ${inheritedPageId})`);
                    console.log(`[ObjectiveConversionService] PAGE TASKS:`, p.tasks || 'No specific tasks found');
                  } catch (e: any) {
                    console.error(`[ObjectiveConversionService] PERMISSION ERROR: Could not verify Page ID ${inheritedPageId}. Token may lack permissions for this page. Error:`, e.response?.data?.error?.message || e.message);
                  }
                }
              }
            } catch (pageDiscoveryError) {
              console.warn(`[ObjectiveConversionService] Failed to discover Page ID from ads:`, pageDiscoveryError);
            }
          }
        }

        // 5. Transform and create ad set
        const adSetPayload = this.transformAdSet(adSetData, targetObjective, `${adSetData.name || 'Ad Set'} - Converted`, newCampaign.id, inheritedPageId);
        
        if (isNewCampaignCBO) {
          console.log(`[ObjectiveConversionService] Omitting budget from ad set payload due to CBO`);
          delete adSetPayload.daily_budget;
          delete adSetPayload.lifetime_budget;
        }

        console.log(`[ObjectiveConversionService] Creating Ad Set with payload:`, JSON.stringify(adSetPayload));
        const newAdSet = (await this.fbService.client.post(`/${adAccountId}/adsets`, adSetPayload)).data;
        console.log(`[ObjectiveConversionService] SUCCESS: Created ad set ID: ${newAdSet.id}`);

        // 6. Fetch Ads
        const ads = await this.fbService.getAds(adSet.id);
        for (let j = 0; j < ads.length; j++) {
          const ad = ads[j];
          try {
            console.log(`[ObjectiveConversionService] --- Processing Ad ${j+1}/${ads.length}: ${ad.id} ---`);
            const fullAd = await this.fbService.get(`/${ad.id}`, {
              fields: 'name,creative,tracking_specs'
            });
            const adData = fullAd.data;

            const adPayload = this.transformAd(adData, targetObjective, `${adData.name || 'Ad'} - Converted`, newAdSet.id);
            console.log(`[ObjectiveConversionService] Creating Ad with payload:`, JSON.stringify(adPayload));
            const newAdResult = (await this.fbService.client.post(`/${adAccountId}/ads`, adPayload)).data;
            console.log(`[ObjectiveConversionService] SUCCESS: Created ad ID: ${newAdResult.id}`);
          } catch (adError: any) {
            console.error(`[ObjectiveConversionService] ERROR: Failed to convert ad ${ad.id}:`, JSON.stringify(adError.response?.data || adError.message));
          }
        }
      } catch (adSetError: any) {
        console.error(`[ObjectiveConversionService] ERROR: Failed to convert ad set ${adSet.id}:`, JSON.stringify(adSetError.response?.data || adSetError.message));
      }
    }

    console.log(`[ObjectiveConversionService] !!! DEEP CONVERSION FINISHED !!!`);
    return newCampaign;
  }
}
