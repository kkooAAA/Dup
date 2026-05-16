import { prisma } from '../../prisma';
import { FacebookService } from '../facebook.service';
import { DraftStatus } from '@prisma/client';
import {
  BID_CAP_STRATEGIES,
  ATTRIBUTION_SPEC_OBJECTIVES,
  stripImmutableFields,
  stripReadOnlyFields,
} from './MetaFieldRegistry';
import { DraftValidationEngine } from './DraftValidationEngine';

const VALID_DESTINATION_TYPES = new Set([
  'WEBSITE', 'APP', 'MESSENGER', 'APPLINKS_AUTOMATIC', 'FACEBOOK',
  'INSTAGRAM_DIRECT', 'WHATSAPP', 'SHOP_AUTOMATIC', 'ON_AD', 'ON_POST',
  'ON_EVENT', 'ON_VIDEO', 'ON_PAGE',
]);

export class DraftPublishService {
  static async publishCampaign(campaignId: string, accessToken: string) {
    if (!accessToken) {
      throw new Error('No Facebook access token provided');
    }

    const fbService = new FacebookService(accessToken);
    const campaign = await prisma.draftCampaign.findUnique({
      where: { id: campaignId },
      include: {
        adSets: {
          include: {
            ads: true,
          },
        },
      },
    });

    if (!campaign) throw new Error('Campaign draft not found');

    const validation = await DraftValidationEngine.validateFullDraft(campaign);
    if (!validation.isValid) {
      const allErrors = [
        ...validation.campaignErrors,
        ...Object.values(validation.adSetErrors).flat(),
        ...Object.values(validation.adErrors).flat(),
      ].filter(e => e.severity === 'error');

      throw new Error(
        `Validation failed: ${allErrors.map(e => `[${e.field}] ${e.message}`).join('; ')}`
      );
    }

    const normalizeAccountId = (id: string) =>
      id.startsWith('act_') ? id : `act_${id}`;

    const campaignAccountId = normalizeAccountId(campaign.adAccountId);

    try {
      await prisma.draftCampaign.update({
        where: { id: campaignId },
        data: { status: DraftStatus.PUBLISHING },
      });

      const campaignData = campaign.data as any;
      const isCBO = !!(campaignData.daily_budget || campaignData.lifetime_budget);

      let metaCampaignId: string;
      if (campaign.metaId) {
        metaCampaignId = campaign.metaId;

        const exists = await fbService.checkExistence(metaCampaignId);
        if (!exists) {
          console.warn(`[DraftPublishService] Meta campaign ${metaCampaignId} no longer exists, will recreate`);
          await prisma.draftCampaign.update({
            where: { id: campaignId },
            data: { metaId: null },
          });
          metaCampaignId = await this.createMetaCampaign(
            fbService, campaignAccountId, campaign.name, campaignData, isCBO
          );
          await prisma.draftCampaign.update({
            where: { id: campaignId },
            data: { metaId: metaCampaignId },
          });
        } else {
          await this.updateMetaCampaign(fbService, metaCampaignId, campaign.name, campaignData, isCBO);
        }
      } else {
        metaCampaignId = await this.createMetaCampaign(
          fbService, campaignAccountId, campaign.name, campaignData, isCBO
        );
        await prisma.draftCampaign.update({
          where: { id: campaignId },
          data: { metaId: metaCampaignId },
        });
      }

      for (const adSet of campaign.adSets) {
        await prisma.draftAdSet.update({
          where: { id: adSet.id },
          data: { status: DraftStatus.PUBLISHING },
        });

        const adSetAccountId = normalizeAccountId(adSet.adAccountId);

        let metaAdSetId: string;
        if (adSet.metaId) {
          const exists = await fbService.checkExistence(adSet.metaId);
          if (!exists) {
            console.warn(`[DraftPublishService] Meta ad set ${adSet.metaId} no longer exists, will recreate`);
            await prisma.draftAdSet.update({
              where: { id: adSet.id },
              data: { metaId: null },
            });
            metaAdSetId = await this.createMetaAdSet(
              fbService, adSetAccountId, adSet, metaCampaignId, campaignData, isCBO
            );
            await prisma.draftAdSet.update({
              where: { id: adSet.id },
              data: { metaId: metaAdSetId },
            });
          } else {
            metaAdSetId = adSet.metaId;
            await this.updateMetaAdSet(fbService, metaAdSetId, adSet, isCBO);
          }
        } else {
          metaAdSetId = await this.createMetaAdSet(
            fbService, adSetAccountId, adSet, metaCampaignId, campaignData, isCBO
          );
          await prisma.draftAdSet.update({
            where: { id: adSet.id },
            data: { metaId: metaAdSetId },
          });
        }

        await prisma.draftAdSet.update({
          where: { id: adSet.id },
          data: { status: DraftStatus.PUBLISHED },
        });

        for (const ad of adSet.ads) {
          await prisma.draftAd.update({
            where: { id: ad.id },
            data: { status: DraftStatus.PUBLISHING },
          });

          const adAccountId = normalizeAccountId(ad.adAccountId);

          let metaAdId: string;
          if (ad.metaId) {
            const exists = await fbService.checkExistence(ad.metaId);
            if (!exists) {
              console.warn(`[DraftPublishService] Meta ad ${ad.metaId} no longer exists, will recreate`);
              await prisma.draftAd.update({
                where: { id: ad.id },
                data: { metaId: null },
              });
              metaAdId = await this.createMetaAd(fbService, adAccountId, ad, metaAdSetId);
              await prisma.draftAd.update({
                where: { id: ad.id },
                data: { metaId: metaAdId },
              });
            } else {
              metaAdId = ad.metaId;
            }
          } else {
            metaAdId = await this.createMetaAd(fbService, adAccountId, ad, metaAdSetId);
            await prisma.draftAd.update({
              where: { id: ad.id },
              data: { metaId: metaAdId },
            });
          }

          await prisma.draftAd.update({
            where: { id: ad.id },
            data: { status: DraftStatus.PUBLISHED },
          });
        }
      }

      await prisma.draftCampaign.update({
        where: { id: campaignId },
        data: { status: DraftStatus.PUBLISHED },
      });

      return { success: true, metaCampaignId };
    } catch (error: any) {
      console.error('Publishing failed:', error.message);

      await prisma.draftCampaign.update({
        where: { id: campaignId },
        data: { status: DraftStatus.FAILED },
      });
      await prisma.draftAdSet.updateMany({
        where: { draftCampaignId: campaignId, status: DraftStatus.PUBLISHING },
        data: { status: DraftStatus.FAILED },
      });
      const adSetIds = campaign.adSets.map((s) => s.id);
      if (adSetIds.length > 0) {
        await prisma.draftAd.updateMany({
          where: { draftAdSetId: { in: adSetIds }, status: DraftStatus.PUBLISHING },
          data: { status: DraftStatus.FAILED },
        });
      }

      await prisma.draftPublishLog.create({
        data: {
          draftId: campaignId,
          draftType: 'CAMPAIGN',
          status: 'FAILED',
          error: error.message,
        },
      });

      throw error;
    }
  }

  private static async createMetaCampaign(
    fbService: FacebookService,
    accountId: string,
    name: string,
    campaignData: any,
    isCBO: boolean,
  ): Promise<string> {
    const campaignPayload: any = {
      name,
      objective: campaignData.objective,
      status: 'PAUSED',
      special_ad_categories: campaignData.special_ad_categories || [],
    };

    if (campaignData.buying_type) {
      campaignPayload.buying_type = campaignData.buying_type;
    }

    if (isCBO) {
      if (campaignData.daily_budget && campaignData.lifetime_budget) {
        campaignPayload.daily_budget = String(campaignData.daily_budget);
      } else if (campaignData.daily_budget) {
        campaignPayload.daily_budget = String(campaignData.daily_budget);
      } else if (campaignData.lifetime_budget) {
        campaignPayload.lifetime_budget = String(campaignData.lifetime_budget);
      }
      if (campaignData.bid_strategy && !BID_CAP_STRATEGIES.has(campaignData.bid_strategy)) {
        campaignPayload.bid_strategy = campaignData.bid_strategy;
      } else {
        campaignPayload.bid_strategy = 'LOWEST_COST_WITHOUT_CAP';
      }
    } else {
      campaignPayload.is_adset_budget_sharing_enabled = false;
    }

    console.log(`[DraftPublishService] Creating campaign:`, JSON.stringify(campaignPayload));
    try {
      const fbCampaign = await fbService.client.post(`/${accountId}/campaigns`, campaignPayload);
      return fbCampaign.data.id;
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      throw new Error(`Facebook API Error (Campaign): ${errMsg}`);
    }
  }

  private static async updateMetaCampaign(
    fbService: FacebookService,
    metaCampaignId: string,
    name: string,
    campaignData: any,
    isCBO: boolean,
  ): Promise<void> {
    const updatePayload: any = {
      name,
      status: 'PAUSED',
      special_ad_categories: campaignData.special_ad_categories || [],
    };

    if (isCBO) {
      if (campaignData.daily_budget && campaignData.lifetime_budget) {
        updatePayload.daily_budget = String(campaignData.daily_budget);
      } else if (campaignData.daily_budget) {
        updatePayload.daily_budget = String(campaignData.daily_budget);
      } else if (campaignData.lifetime_budget) {
        updatePayload.lifetime_budget = String(campaignData.lifetime_budget);
      }
      if (campaignData.bid_strategy && !BID_CAP_STRATEGIES.has(campaignData.bid_strategy)) {
        updatePayload.bid_strategy = campaignData.bid_strategy;
      } else {
        updatePayload.bid_strategy = 'LOWEST_COST_WITHOUT_CAP';
      }
    }

    const { cleaned, stripped } = stripImmutableFields('campaign', updatePayload);
    if (stripped.length > 0) {
      console.warn(`[DraftPublishService] Stripped immutable fields from campaign update: ${stripped.join(', ')}`);
    }

    console.log(`[DraftPublishService] Updating existing Meta campaign ${metaCampaignId}:`, JSON.stringify(cleaned));
    try {
      await fbService.client.post(`/${metaCampaignId}`, cleaned);
    } catch (error: any) {
      console.error(`[DraftPublishService] Failed to update Meta campaign ${metaCampaignId}:`, error.response?.data?.error || error.message);
    }
  }

  private static async createMetaAdSet(
    fbService: FacebookService,
    accountId: string,
    adSet: any,
    metaCampaignId: string,
    campaignData: any,
    isCBO: boolean,
  ): Promise<string> {
    const adSetData = adSet.data as any;
    const campaignObjective: string = campaignData.objective || '';

    let cleanPromotedObject: any = undefined;
    if (adSetData.promoted_object) {
      const { smart_pse_enabled, id, ...writableFields } = adSetData.promoted_object;
      if (Object.keys(writableFields).length > 0) {
        cleanPromotedObject = writableFields;
      }
    }

    const adSetPayload: any = {
      name: adSet.name,
      campaign_id: metaCampaignId,
      status: 'PAUSED',
      billing_event: adSetData.billing_event || 'IMPRESSIONS',
      optimization_goal: adSetData.optimization_goal,
      targeting: adSetData.targeting || { geo_locations: { countries: ['TH'] } },
      ...(cleanPromotedObject && { promoted_object: cleanPromotedObject }),
      ...(adSetData.destination_type && VALID_DESTINATION_TYPES.has(adSetData.destination_type) && { destination_type: adSetData.destination_type }),
      ...(adSetData.attribution_spec && ATTRIBUTION_SPEC_OBJECTIVES.has(campaignObjective) && { attribution_spec: adSetData.attribution_spec }),
    };

    if (!isCBO) {
      const adSetBidStrategy: string | undefined = adSetData.bid_strategy;
      const adSetBidAmount: number | string | undefined = adSetData.bid_amount;
      if (adSetBidStrategy && BID_CAP_STRATEGIES.has(adSetBidStrategy)) {
        if (adSetBidAmount) {
          adSetPayload.bid_strategy = adSetBidStrategy;
          adSetPayload.bid_amount = String(adSetBidAmount);
        }
      } else {
        if (adSetBidStrategy) adSetPayload.bid_strategy = adSetBidStrategy;
        if (adSetBidAmount) adSetPayload.bid_amount = String(adSetBidAmount);
      }

      const adSetDailyBudget = Number(adSetData.daily_budget) || 0;
      const adSetLifetimeBudget = Number(adSetData.lifetime_budget) || 0;
      if (adSetDailyBudget > 0 && adSetLifetimeBudget > 0) {
        adSetPayload.daily_budget = String(adSetDailyBudget);
      } else if (adSetDailyBudget > 0) {
        adSetPayload.daily_budget = String(adSetDailyBudget);
      } else if (adSetLifetimeBudget > 0) {
        adSetPayload.lifetime_budget = String(adSetLifetimeBudget);
      }
      if (adSetData.start_time) adSetPayload.start_time = adSetData.start_time;
      if (adSetData.end_time) adSetPayload.end_time = adSetData.end_time;
    }

    console.log(`[DraftPublishService] Creating ad set ${adSet.id}:`, JSON.stringify(adSetPayload));
    try {
      const fbAdSet = await fbService.client.post(`/${accountId}/adsets`, adSetPayload);
      return fbAdSet.data.id;
    } catch (error: any) {
      const errData = error.response?.data?.error;
      console.error(`[DraftPublishService] Ad set creation failed:`, JSON.stringify(errData) || error.message);

      const bidErrorSubcodes = new Set([2490487, 1815857]);
      if (bidErrorSubcodes.has(errData?.error_subcode)) {
        const bidlessPayload = { ...adSetPayload };
        delete bidlessPayload.bid_strategy;
        delete bidlessPayload.bid_amount;
        delete bidlessPayload.bid_constraints;
        console.log(`[DraftPublishService] Retrying ad set ${adSet.id} without bid fields`);
        try {
          const fbAdSetRetry = await fbService.client.post(`/${accountId}/adsets`, bidlessPayload);
          return fbAdSetRetry.data.id;
        } catch (retryError: any) {
          const retryErrData = retryError.response?.data?.error;
          const retryDetail = retryErrData
            ? `${retryErrData.message} (code ${retryErrData.code}/${retryErrData.error_subcode ?? 'no subcode'})${retryErrData.error_user_msg ? ': ' + retryErrData.error_user_msg : ''}`
            : retryError.message;
          throw new Error(`Facebook API Error (AdSet ${adSet.id}): ${retryDetail}`);
        }
      }

      const detail = errData
        ? `${errData.message} (code ${errData.code}/${errData.error_subcode ?? 'no subcode'})${errData.error_user_msg ? ': ' + errData.error_user_msg : ''}`
        : error.message;
      throw new Error(`Facebook API Error (AdSet ${adSet.id}): ${detail}`);
    }
  }

  private static async updateMetaAdSet(
    fbService: FacebookService,
    metaAdSetId: string,
    adSet: any,
    isCBO: boolean,
  ): Promise<void> {
    const adSetData = adSet.data as any;
    const updatePayload: any = {
      name: adSet.name,
      status: 'PAUSED',
      billing_event: adSetData.billing_event || 'IMPRESSIONS',
      optimization_goal: adSetData.optimization_goal,
      targeting: adSetData.targeting,
    };

    if (!isCBO) {
      if (adSetData.bid_amount) updatePayload.bid_amount = String(adSetData.bid_amount);
      const adSetDailyBudget = Number(adSetData.daily_budget) || 0;
      const adSetLifetimeBudget = Number(adSetData.lifetime_budget) || 0;
      if (adSetDailyBudget > 0) updatePayload.daily_budget = String(adSetDailyBudget);
      else if (adSetLifetimeBudget > 0) updatePayload.lifetime_budget = String(adSetLifetimeBudget);
    }

    const { cleaned, stripped } = stripImmutableFields('adSet', updatePayload);
    if (stripped.length > 0) {
      console.warn(`[DraftPublishService] Stripped immutable fields from ad set update: ${stripped.join(', ')}`);
    }

    console.log(`[DraftPublishService] Updating existing Meta ad set ${metaAdSetId}:`, JSON.stringify(cleaned));
    try {
      await fbService.client.post(`/${metaAdSetId}`, cleaned);
    } catch (error: any) {
      console.error(`[DraftPublishService] Failed to update Meta ad set ${metaAdSetId}:`, error.response?.data?.error || error.message);
    }
  }

  private static async createMetaAd(
    fbService: FacebookService,
    accountId: string,
    ad: any,
    metaAdSetId: string,
  ): Promise<string> {
    const adData = ad.data as any;
    const adPayload: any = {
      name: ad.name,
      adset_id: metaAdSetId,
      status: 'PAUSED',
      ...(adData.creative?.id
        ? { creative: { creative_id: String(adData.creative.id) } }
        : adData.creative?.creative_id
          ? { creative: { creative_id: String(adData.creative.creative_id) } }
          : {}),
      ...(adData.tracking_specs && { tracking_specs: adData.tracking_specs }),
    };

    console.log(`[DraftPublishService] Creating ad ${ad.id}:`, JSON.stringify(adPayload));
    try {
      const fbAd = await fbService.client.post(`/${accountId}/ads`, adPayload);
      return fbAd.data.id;
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      throw new Error(`Facebook API Error (Ad ${ad.id}): ${errMsg}`);
    }
  }

  static async cleanupOrphanedMetaObjects(campaignId: string, accessToken: string): Promise<{ deleted: string[] }> {
    const fbService = new FacebookService(accessToken);
    const campaign = await prisma.draftCampaign.findUnique({
      where: { id: campaignId },
      include: { adSets: { include: { ads: true } } },
    });

    if (!campaign) throw new Error('Draft not found');
    const deleted: string[] = [];

    for (const adSet of campaign.adSets) {
      for (const ad of adSet.ads) {
        if (ad.metaId) {
          try {
            await fbService.client.post(`/${ad.metaId}`, { status: 'DELETED' });
            deleted.push(`ad:${ad.metaId}`);
          } catch { /* already gone */ }
          await prisma.draftAd.update({ where: { id: ad.id }, data: { metaId: null, status: DraftStatus.DRAFT } });
        }
      }
      if (adSet.metaId) {
        try {
          await fbService.client.post(`/${adSet.metaId}`, { status: 'DELETED' });
          deleted.push(`adset:${adSet.metaId}`);
        } catch { /* already gone */ }
        await prisma.draftAdSet.update({ where: { id: adSet.id }, data: { metaId: null, status: DraftStatus.DRAFT } });
      }
    }

    if (campaign.metaId) {
      try {
        await fbService.client.post(`/${campaign.metaId}`, { status: 'DELETED' });
        deleted.push(`campaign:${campaign.metaId}`);
      } catch { /* already gone */ }
      await prisma.draftCampaign.update({ where: { id: campaignId }, data: { metaId: null, status: DraftStatus.DRAFT } });
    }

    return { deleted };
  }
}
