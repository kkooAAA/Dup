import { prisma } from '../../prisma';
import { FacebookService } from '../facebook.service';
import { DraftStatus } from '@prisma/client';

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

    // ✅ FIX: Normalize adAccountId — Meta API always requires the act_ prefix.
    // Without it, the API receives a bare number and returns:
    // "Object does not exist, cannot be loaded due to missing permissions"
    const normalizeAccountId = (id: string) =>
      id.startsWith('act_') ? id : `act_${id}`;

    const campaignAccountId = normalizeAccountId(campaign.adAccountId);

    try {
      // 1. Update status to PUBLISHING
      await prisma.draftCampaign.update({
        where: { id: campaignId },
        data: { status: DraftStatus.PUBLISHING },
      });

      // 2. Publish Campaign
      const campaignData = campaign.data as any;
      const campaignPayload = {
        name: campaign.name,
        objective: campaignData.objective || campaign.objective,
        status: 'PAUSED',
        special_ad_categories: campaignData.special_ad_categories || [],
        ...(campaignData.daily_budget && { daily_budget: String(campaignData.daily_budget) }),
        ...(campaignData.lifetime_budget && { lifetime_budget: String(campaignData.lifetime_budget) }),
        ...(campaignData.bid_strategy && { bid_strategy: campaignData.bid_strategy }),
      };

      let metaCampaignId: string;
      try {
        const fbCampaign = await fbService.client.post(
          `/${campaignAccountId}/campaigns`,  // ✅ Fixed: was /${campaign.adAccountId}/campaigns
          campaignPayload
        );
        metaCampaignId = fbCampaign.data.id;
      } catch (error: any) {
        console.error('Failed to publish campaign to Facebook:', error.response?.data || error.message);
        throw new Error(`Facebook API Error (Campaign): ${error.response?.data?.error?.message || error.message}`);
      }

      await prisma.draftCampaign.update({
        where: { id: campaignId },
        data: { metaId: metaCampaignId, status: DraftStatus.PUBLISHED },
      });

      // 3. Publish Ad Sets
      for (const adSet of campaign.adSets) {
        await prisma.draftAdSet.update({
          where: { id: adSet.id },
          data: { status: DraftStatus.PUBLISHING },
        });

        const adSetAccountId = normalizeAccountId(adSet.adAccountId); // ✅ Fixed per ad set

        const adSetData = adSet.data as any;
        const adSetPayload = {
          name: adSet.name,
          campaign_id: metaCampaignId,
          status: 'PAUSED',
          billing_event: adSetData.billing_event || 'IMPRESSIONS',
          optimization_goal: adSetData.optimization_goal,
          targeting: adSetData.targeting || { geo_locations: { countries: ['TH'] } },
          ...(adSetData.daily_budget && { daily_budget: String(adSetData.daily_budget) }),
          ...(adSetData.lifetime_budget && { lifetime_budget: String(adSetData.lifetime_budget) }),
          ...(adSetData.start_time && { start_time: adSetData.start_time }),
          ...(adSetData.end_time && { end_time: adSetData.end_time }),
          ...(adSetData.bid_amount && { bid_amount: String(adSetData.bid_amount) }),
          ...(adSetData.promoted_object && { promoted_object: adSetData.promoted_object }),
          ...(adSetData.destination_type && { destination_type: adSetData.destination_type }),
          ...(adSetData.attribution_spec && { attribution_spec: adSetData.attribution_spec }),
        };

        let metaAdSetId: string;
        try {
          const fbAdSet = await fbService.client.post(
            `/${adSetAccountId}/adsets`,  // ✅ Fixed: was /${adSet.adAccountId}/adsets
            adSetPayload
          );
          metaAdSetId = fbAdSet.data.id;
        } catch (error: any) {
          console.error(`Failed to publish ad set ${adSet.id} to Facebook:`, error.response?.data || error.message);
          throw new Error(`Facebook API Error (AdSet ${adSet.id}): ${error.response?.data?.error?.message || error.message}`);
        }

        await prisma.draftAdSet.update({
          where: { id: adSet.id },
          data: { metaId: metaAdSetId, status: DraftStatus.PUBLISHED },
        });

        // 4. Publish Ads
        for (const ad of adSet.ads) {
          await prisma.draftAd.update({
            where: { id: ad.id },
            data: { status: DraftStatus.PUBLISHING },
          });

          const adAccountId = normalizeAccountId(ad.adAccountId); // ✅ Fixed per ad

          const adData = ad.data as any;
          const adPayload = {
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

          let metaAdId: string;
          try {
            const fbAd = await fbService.client.post(
              `/${adAccountId}/ads`,  // ✅ Fixed: was /${ad.adAccountId}/ads
              adPayload
            );
            metaAdId = fbAd.data.id;
          } catch (error: any) {
            console.error(`Failed to publish ad ${ad.id} to Facebook:`, error.response?.data || error.message);
            throw new Error(`Facebook API Error (Ad ${ad.id}): ${error.response?.data?.error?.message || error.message}`);
          }

          await prisma.draftAd.update({
            where: { id: ad.id },
            data: { metaId: metaAdId, status: DraftStatus.PUBLISHED },
          });
        }
      }

      return { success: true, metaCampaignId };
    } catch (error: any) {
      console.error('Publishing failed:', error.message);

      await prisma.draftCampaign.update({
        where: { id: campaignId },
        data: { status: DraftStatus.FAILED },
      });

      // Log the error
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
}
