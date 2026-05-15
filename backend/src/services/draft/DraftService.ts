import { prisma } from '../../prisma';
import { FacebookService } from '../facebook.service';
import { DraftStatus } from '@prisma/client';
import { ObjectiveConversionService } from '../objectiveConversion.service';

export class DraftService {
  static async duplicateCampaignToDraft(campaignId: string, userId: string, accessToken: string) {
    const fbService = new FacebookService(accessToken);

    // 1. Fetch Campaign
    console.log(`[DraftService] Fetching source campaign: ${campaignId}`);
    let campaignData: any;
    try {
      const campaignResp = await fbService.get(`/${campaignId}`, {
        fields: 'name,objective,bid_strategy,buying_type,special_ad_categories,daily_budget,lifetime_budget,account_id'
      });
      campaignData = campaignResp.data;
    } catch (error: any) {
      console.error(`[DraftService] Failed to fetch source campaign ${campaignId}:`, error.response?.data || error.message);
      throw new Error(`Facebook API Error: ${error.response?.data?.error?.message || error.message}`);
    }

    const adAccountId = `act_${campaignData.account_id}`;
    console.log(`[DraftService] Source campaign found. adAccountId: ${adAccountId}`);

    // 2. Create Draft Campaign
    const draftCampaign = await prisma.draftCampaign.create({
      data: {
        userId,
        adAccountId,
        name: `${campaignData.name} - Internal Draft`,
        objective: campaignData.objective,
        data: campaignData,
        status: DraftStatus.DRAFT,
      }
    });

    // 3. Fetch Ad Sets
    const adSets = await fbService.getAdSets(campaignId);

    for (const adSet of adSets) {
      const draftAdSet = await prisma.draftAdSet.create({
        data: {
          userId,
          adAccountId,
          draftCampaignId: draftCampaign.id,
          name: `${adSet.name} - Internal Draft`,
          data: adSet,
          status: DraftStatus.DRAFT,
        }
      });

      // 4. Fetch Ads
      const ads = await fbService.getAds(adSet.id);
      for (const ad of ads) {
        await prisma.draftAd.create({
          data: {
            userId,
            adAccountId,
            draftAdSetId: draftAdSet.id,
            name: `${ad.name} - Internal Draft`,
            data: ad,
            status: DraftStatus.DRAFT,
          }
        });
      }
    }

    return draftCampaign;
  }
  static async convertCampaignToDraft(
    campaignId: string,
    targetObjective: string,
    newName: string,
    adAccountId: string,
    userId: string,
    accessToken: string
  ) {
    const fbService = new FacebookService(accessToken);
    const conversionService = new ObjectiveConversionService(fbService);

    // 1. Fetch original campaign
    const originalCampaign = await fbService.get(`/${campaignId}`, {
      fields: 'name,objective,bid_strategy,daily_budget,lifetime_budget,special_ad_categories,account_id'
    });
    const campaignData = originalCampaign.data;

    const normalizedAccountId = adAccountId.startsWith('act_')
      ? adAccountId
      : `act_${adAccountId}`;

    // 2. Transform campaign data (no Meta publish)
    const transformedCampaign = conversionService.transformCampaign(
      campaignData,
      targetObjective,
      newName
    );

    // 3. Save as Draft Campaign
    const draftCampaign = await prisma.draftCampaign.create({
      data: {
        userId,
        adAccountId: normalizedAccountId,
        name: newName,
        objective: targetObjective,
        data: transformedCampaign,
        status: DraftStatus.DRAFT,
      }
    });

    // 4. Fetch and transform Ad Sets
    const adSets = await fbService.getAdSets(campaignId);

    for (const adSet of adSets) {
      const fullAdSet = await fbService.get(`/${adSet.id}`, {
        fields: 'name,billing_event,optimization_goal,bid_amount,daily_budget,lifetime_budget,start_time,end_time,targeting,promoted_object,attribution_spec,destination_type,bid_strategy'
      });
      const adSetData = fullAdSet.data;

      // Try to find page_id
      let pageId: string | undefined = adSetData.promoted_object?.page_id;
      if (!pageId) {
        try {
          const ads = await fbService.getAds(adSet.id);
          if (ads.length > 0) {
            const adResp = await fbService.get(`/${ads[0].id}`, { fields: 'creative' });
            const creativeId = adResp.data.creative?.id;
            if (creativeId) {
              const creativeResp = await fbService.get(`/${creativeId}`, {
                fields: 'object_id,actor_id,object_story_spec'
              });
              const cr = creativeResp.data;
              pageId = cr.object_id || cr.actor_id || cr.object_story_spec?.page_id;
            }
          }
        } catch (e) {
          console.warn(`[DraftService] Could not find page_id for ad set ${adSet.id}`);
        }
      }

      const transformedAdSet = conversionService.transformAdSet(
        adSetData,
        targetObjective,
        `${adSetData.name || 'Ad Set'} - Converted`,
        'PENDING_CAMPAIGN_ID', // replaced at publish time
        pageId
      );

      const draftAdSet = await prisma.draftAdSet.create({
        data: {
          userId,
          adAccountId: normalizedAccountId,
          draftCampaignId: draftCampaign.id,
          name: transformedAdSet.name,
          data: transformedAdSet,
          status: DraftStatus.DRAFT,
        }
      });

      // 5. Fetch and transform Ads
      const ads = await fbService.getAds(adSet.id);
      for (const ad of ads) {
        const fullAd = await fbService.get(`/${ad.id}`, {
          fields: 'name,creative,tracking_specs'
        });
        const transformedAd = conversionService.transformAd(
          fullAd.data,
          targetObjective,
          `${fullAd.data.name || 'Ad'} - Converted`,
          'PENDING_ADSET_ID' // replaced at publish time
        );

        await prisma.draftAd.create({
          data: {
            userId,
            adAccountId: normalizedAccountId,
            draftAdSetId: draftAdSet.id,
            name: transformedAd.name,
            data: transformedAd,
            status: DraftStatus.DRAFT,
          }
        });
      }
    }

    return draftCampaign;
  }
}

