import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftStatus } from '@prisma/client';

vi.mock('../../src/prisma', () => ({
  prisma: {
    draftCampaign: { create: vi.fn() },
    draftAdSet: { create: vi.fn() },
    draftAd: { create: vi.fn() },
  },
}));

let mockFbGet: ReturnType<typeof vi.fn>;
let mockFbGetAdSets: ReturnType<typeof vi.fn>;
let mockFbGetAds: ReturnType<typeof vi.fn>;

vi.mock('../../src/services/facebook.service', () => ({
  FacebookService: vi.fn().mockImplementation(function () {
    return {
      get: (...args: any[]) => mockFbGet(...args),
      getAdSets: (...args: any[]) => mockFbGetAdSets(...args),
      getAds: (...args: any[]) => mockFbGetAds(...args),
    };
  }),
}));

let mockTransformCampaign: ReturnType<typeof vi.fn>;
let mockTransformAdSet: ReturnType<typeof vi.fn>;
let mockTransformAd: ReturnType<typeof vi.fn>;

vi.mock('../../src/services/objectiveConversion.service', () => ({
  ObjectiveConversionService: vi.fn().mockImplementation(function () {
    return {
      transformCampaign: (...args: any[]) => mockTransformCampaign(...args),
      transformAdSet: (...args: any[]) => mockTransformAdSet(...args),
      transformAd: (...args: any[]) => mockTransformAd(...args),
    };
  }),
}));

import { prisma } from '../../src/prisma';
import { DraftService } from '../../src/services/draft/DraftService';

const mockPrisma = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockFbGet = vi.fn();
  mockFbGetAdSets = vi.fn().mockResolvedValue([]);
  mockFbGetAds = vi.fn().mockResolvedValue([]);
  mockTransformCampaign = vi.fn();
  mockTransformAdSet = vi.fn();
  mockTransformAd = vi.fn();
});

describe('DraftService.duplicateCampaignToDraft', () => {
  it('fetches campaign, adsets, and ads then creates drafts', async () => {
    mockFbGet.mockResolvedValue({
      data: { name: 'Source Campaign', objective: 'OUTCOME_TRAFFIC', account_id: '123456' },
    });
    mockFbGetAdSets.mockResolvedValue([{ id: 'adset-fb-1', name: 'AdSet 1' }]);
    mockFbGetAds.mockResolvedValue([{ id: 'ad-fb-1', name: 'Ad 1' }]);

    mockPrisma.draftCampaign.create.mockResolvedValue({ id: 'draft-camp-1' });
    mockPrisma.draftAdSet.create.mockResolvedValue({ id: 'draft-adset-1' });
    mockPrisma.draftAd.create.mockResolvedValue({ id: 'draft-ad-1' });

    const result = await DraftService.duplicateCampaignToDraft('camp-fb-1', 'user-1', 'token');
    expect(result.id).toBe('draft-camp-1');
    expect(mockPrisma.draftCampaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Source Campaign - Internal Draft',
          objective: 'OUTCOME_TRAFFIC',
          adAccountId: 'act_123456',
          status: DraftStatus.DRAFT,
        }),
      })
    );
    expect(mockPrisma.draftAdSet.create).toHaveBeenCalled();
    expect(mockPrisma.draftAd.create).toHaveBeenCalled();
  });

  it('throws on Facebook API error', async () => {
    mockFbGet.mockRejectedValue({
      response: { data: { error: { message: 'Invalid campaign ID' } } },
    });

    await expect(DraftService.duplicateCampaignToDraft('bad-id', 'user-1', 'token'))
      .rejects.toThrow('Facebook API Error');
  });

  it('handles multiple ad sets with multiple ads', async () => {
    mockFbGet.mockResolvedValue({
      data: { name: 'Campaign', objective: 'OUTCOME_SALES', account_id: '789' },
    });
    mockFbGetAdSets.mockResolvedValue([
      { id: 'adset-1', name: 'AS1' },
      { id: 'adset-2', name: 'AS2' },
    ]);
    mockFbGetAds
      .mockResolvedValueOnce([{ id: 'ad-1', name: 'Ad 1' }, { id: 'ad-2', name: 'Ad 2' }])
      .mockResolvedValueOnce([{ id: 'ad-3', name: 'Ad 3' }]);

    mockPrisma.draftCampaign.create.mockResolvedValue({ id: 'draft-camp' });
    mockPrisma.draftAdSet.create.mockResolvedValue({ id: 'draft-adset' });
    mockPrisma.draftAd.create.mockResolvedValue({ id: 'draft-ad' });

    await DraftService.duplicateCampaignToDraft('camp-1', 'user-1', 'token');
    expect(mockPrisma.draftAdSet.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.draftAd.create).toHaveBeenCalledTimes(3);
  });
});

describe('DraftService.convertCampaignToDraft', () => {
  it('converts campaign to different objective', async () => {
    // Call sequence:
    // 1. fbService.get(campaignId) - fetch original
    // 2. fbService.get(adset.id) - fetch full adset
    // 3. fbService.get(ad.id) - for page_id lookup creative
    // 4. fbService.get(creativeId) - fetch creative for page_id
    // 5. fbService.get(ad.id) - fetch full ad for transform
    mockFbGet
      .mockResolvedValueOnce({
        data: { name: 'Original', objective: 'OUTCOME_TRAFFIC', account_id: '123' },
      })
      .mockResolvedValueOnce({
        data: { id: 'adset-1', name: 'AdSet', billing_event: 'IMPRESSIONS', optimization_goal: 'LINK_CLICKS' },
      })
      .mockResolvedValueOnce({
        data: { id: 'ad-1', name: 'Ad', creative: { id: 'cr-1' } },
      })
      .mockResolvedValueOnce({
        data: { id: 'cr-1', object_id: 'page-123' },
      })
      .mockResolvedValueOnce({
        data: { id: 'ad-1', name: 'Ad', creative: { creative_id: 'cr-1' } },
      });
    mockFbGetAdSets.mockResolvedValue([{ id: 'adset-1', name: 'AdSet' }]);
    mockFbGetAds.mockResolvedValue([{ id: 'ad-1', name: 'Ad' }]);

    mockTransformCampaign.mockReturnValue({ name: 'Converted', objective: 'OUTCOME_SALES' });
    mockTransformAdSet.mockReturnValue({ name: 'AdSet - Converted', optimization_goal: 'OFFSITE_CONVERSIONS' });
    mockTransformAd.mockReturnValue({ name: 'Ad - Converted', creative: { creative_id: 'cr-1' } });

    mockPrisma.draftCampaign.create.mockResolvedValue({ id: 'conv-camp' });
    mockPrisma.draftAdSet.create.mockResolvedValue({ id: 'conv-adset' });
    mockPrisma.draftAd.create.mockResolvedValue({ id: 'conv-ad' });

    const result = await DraftService.convertCampaignToDraft(
      'camp-fb-1', 'OUTCOME_SALES', 'Converted Campaign', 'act_123', 'user-1', 'token'
    );
    expect(result.id).toBe('conv-camp');
    expect(mockTransformCampaign).toHaveBeenCalled();
    expect(mockTransformAdSet).toHaveBeenCalled();
    expect(mockTransformAd).toHaveBeenCalled();
  });

  it('normalizes adAccountId without act_ prefix', async () => {
    mockFbGet.mockResolvedValue({ data: { name: 'Camp', objective: 'OUTCOME_TRAFFIC', account_id: '123' } });
    mockFbGetAdSets.mockResolvedValue([]);

    mockTransformCampaign.mockReturnValue({ name: 'Conv', objective: 'OUTCOME_LEADS' });

    mockPrisma.draftCampaign.create.mockResolvedValue({ id: 'conv-camp' });

    await DraftService.convertCampaignToDraft(
      'camp-1', 'OUTCOME_LEADS', 'New', '123456', 'user-1', 'token'
    );
    expect(mockPrisma.draftCampaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ adAccountId: 'act_123456' }),
      })
    );
  });

  it('falls back when page_id not found in promoted_object', async () => {
    mockFbGet
      .mockResolvedValueOnce({ data: { name: 'Camp', objective: 'OUTCOME_TRAFFIC', account_id: '123' } })
      .mockResolvedValueOnce({ data: { id: 'adset-1', name: 'AS' } })
      .mockResolvedValueOnce({ data: { id: 'ad-1', name: 'Ad', creative: { id: 'cr-1' } } })
      .mockResolvedValueOnce({ data: { id: 'cr-1', actor_id: 'page-456' } })
      .mockResolvedValueOnce({ data: { id: 'ad-1', name: 'Ad Full', creative: { creative_id: 'cr-1' } } });
    mockFbGetAdSets.mockResolvedValue([{ id: 'adset-1', name: 'AS' }]);
    mockFbGetAds.mockResolvedValue([{ id: 'ad-1', name: 'Ad' }]);

    mockTransformCampaign.mockReturnValue({ name: 'Conv', objective: 'OUTCOME_LEADS' });
    mockTransformAdSet.mockReturnValue({ name: 'AS Conv' });
    mockTransformAd.mockReturnValue({ name: 'Ad Conv' });

    mockPrisma.draftCampaign.create.mockResolvedValue({ id: 'conv-camp' });
    mockPrisma.draftAdSet.create.mockResolvedValue({ id: 'conv-adset' });
    mockPrisma.draftAd.create.mockResolvedValue({ id: 'conv-ad' });

    await DraftService.convertCampaignToDraft(
      'camp-1', 'OUTCOME_LEADS', 'New', 'act_123', 'user-1', 'token'
    );
    expect(mockTransformAdSet).toHaveBeenCalledWith(
      expect.anything(),
      'OUTCOME_LEADS',
      expect.any(String),
      'PENDING_CAMPAIGN_ID',
      'page-456'
    );
  });

  it('handles error when fetching page_id from creative (getAds throws)', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFbGet
      .mockResolvedValueOnce({ data: { name: 'Camp', objective: 'OUTCOME_TRAFFIC', account_id: '123' } })
      .mockResolvedValueOnce({ data: { id: 'adset-1', name: 'AS' } })
      .mockResolvedValueOnce({ data: { id: 'ad-1', name: 'Ad Full', creative: { creative_id: 'cr-1' } } });
    mockFbGetAdSets.mockResolvedValue([{ id: 'adset-1', name: 'AS' }]);
    // getAds throws an error for page_id lookup
    mockFbGetAds
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([{ id: 'ad-1', name: 'Ad' }]);

    mockTransformCampaign.mockReturnValue({ name: 'Conv', objective: 'OUTCOME_LEADS' });
    mockTransformAdSet.mockReturnValue({ name: 'AS Conv' });
    mockTransformAd.mockReturnValue({ name: 'Ad Conv' });

    mockPrisma.draftCampaign.create.mockResolvedValue({ id: 'conv-camp' });
    mockPrisma.draftAdSet.create.mockResolvedValue({ id: 'conv-adset' });
    mockPrisma.draftAd.create.mockResolvedValue({ id: 'conv-ad' });

    await DraftService.convertCampaignToDraft(
      'camp-1', 'OUTCOME_LEADS', 'New', 'act_123', 'user-1', 'token'
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not find page_id'));
    expect(mockTransformAdSet).toHaveBeenCalledWith(
      expect.anything(),
      'OUTCOME_LEADS',
      expect.any(String),
      'PENDING_CAMPAIGN_ID',
      undefined
    );
    consoleSpy.mockRestore();
  });

  it('handles ads.length === 0 in page_id lookup (no ads available)', async () => {
    mockFbGet
      .mockResolvedValueOnce({ data: { name: 'Camp', objective: 'OUTCOME_TRAFFIC', account_id: '123' } })
      .mockResolvedValueOnce({ data: { id: 'adset-1', name: 'AS' } })
      .mockResolvedValueOnce({ data: { id: 'ad-1', name: 'Ad Full', creative: { creative_id: 'cr-1' } } });
    mockFbGetAdSets.mockResolvedValue([{ id: 'adset-1', name: 'AS' }]);
    // First getAds call for page_id lookup returns empty, second for ad transforms
    mockFbGetAds
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'ad-1', name: 'Ad' }]);

    mockTransformCampaign.mockReturnValue({ name: 'Conv', objective: 'OUTCOME_LEADS' });
    mockTransformAdSet.mockReturnValue({ name: 'AS Conv' });
    mockTransformAd.mockReturnValue({ name: 'Ad Conv' });

    mockPrisma.draftCampaign.create.mockResolvedValue({ id: 'conv-camp' });
    mockPrisma.draftAdSet.create.mockResolvedValue({ id: 'conv-adset' });
    mockPrisma.draftAd.create.mockResolvedValue({ id: 'conv-ad' });

    await DraftService.convertCampaignToDraft(
      'camp-1', 'OUTCOME_LEADS', 'New', 'act_123', 'user-1', 'token'
    );
    expect(mockTransformAdSet).toHaveBeenCalledWith(
      expect.anything(),
      'OUTCOME_LEADS',
      expect.any(String),
      'PENDING_CAMPAIGN_ID',
      undefined
    );
  });

  it('handles creative without id (creativeId undefined)', async () => {
    mockFbGet
      .mockResolvedValueOnce({ data: { name: 'Camp', objective: 'OUTCOME_TRAFFIC', account_id: '123' } })
      .mockResolvedValueOnce({ data: { id: 'adset-1', name: 'AS' } })
      // ad has creative but no id field
      .mockResolvedValueOnce({ data: { id: 'ad-1', name: 'Ad', creative: {} } })
      .mockResolvedValueOnce({ data: { id: 'ad-1', name: 'Ad Full', creative: { creative_id: 'cr-1' } } });
    mockFbGetAdSets.mockResolvedValue([{ id: 'adset-1', name: 'AS' }]);
    mockFbGetAds.mockResolvedValue([{ id: 'ad-1', name: 'Ad' }]);

    mockTransformCampaign.mockReturnValue({ name: 'Conv', objective: 'OUTCOME_LEADS' });
    mockTransformAdSet.mockReturnValue({ name: 'AS Conv' });
    mockTransformAd.mockReturnValue({ name: 'Ad Conv' });

    mockPrisma.draftCampaign.create.mockResolvedValue({ id: 'conv-camp' });
    mockPrisma.draftAdSet.create.mockResolvedValue({ id: 'conv-adset' });
    mockPrisma.draftAd.create.mockResolvedValue({ id: 'conv-ad' });

    await DraftService.convertCampaignToDraft(
      'camp-1', 'OUTCOME_LEADS', 'New', 'act_123', 'user-1', 'token'
    );
    expect(mockTransformAdSet).toHaveBeenCalledWith(
      expect.anything(),
      'OUTCOME_LEADS',
      expect.any(String),
      'PENDING_CAMPAIGN_ID',
      undefined
    );
  });

  it('extracts page_id from object_story_spec.page_id fallback', async () => {
    mockFbGet
      .mockResolvedValueOnce({ data: { name: 'Camp', objective: 'OUTCOME_TRAFFIC', account_id: '123' } })
      .mockResolvedValueOnce({ data: { id: 'adset-1', name: 'AS' } })
      .mockResolvedValueOnce({ data: { id: 'ad-1', name: 'Ad', creative: { id: 'cr-1' } } })
      // creative has neither object_id nor actor_id, only object_story_spec.page_id
      .mockResolvedValueOnce({ data: { id: 'cr-1', object_story_spec: { page_id: 'page-789' } } })
      .mockResolvedValueOnce({ data: { id: 'ad-1', name: 'Ad Full', creative: { creative_id: 'cr-1' } } });
    mockFbGetAdSets.mockResolvedValue([{ id: 'adset-1', name: 'AS' }]);
    mockFbGetAds.mockResolvedValue([{ id: 'ad-1', name: 'Ad' }]);

    mockTransformCampaign.mockReturnValue({ name: 'Conv', objective: 'OUTCOME_LEADS' });
    mockTransformAdSet.mockReturnValue({ name: 'AS Conv' });
    mockTransformAd.mockReturnValue({ name: 'Ad Conv' });

    mockPrisma.draftCampaign.create.mockResolvedValue({ id: 'conv-camp' });
    mockPrisma.draftAdSet.create.mockResolvedValue({ id: 'conv-adset' });
    mockPrisma.draftAd.create.mockResolvedValue({ id: 'conv-ad' });

    await DraftService.convertCampaignToDraft(
      'camp-1', 'OUTCOME_LEADS', 'New', 'act_123', 'user-1', 'token'
    );
    expect(mockTransformAdSet).toHaveBeenCalledWith(
      expect.anything(),
      'OUTCOME_LEADS',
      expect.any(String),
      'PENDING_CAMPAIGN_ID',
      'page-789'
    );
  });

  it('uses promoted_object.page_id when available (skips ad lookup)', async () => {
    mockFbGet
      .mockResolvedValueOnce({ data: { name: 'Camp', objective: 'OUTCOME_TRAFFIC', account_id: '123' } })
      .mockResolvedValueOnce({ data: { id: 'adset-1', name: 'AS', promoted_object: { page_id: 'page-direct' } } })
      .mockResolvedValueOnce({ data: { id: 'ad-1', name: 'Ad Full', creative: { creative_id: 'cr-1' } } });
    mockFbGetAdSets.mockResolvedValue([{ id: 'adset-1', name: 'AS' }]);
    mockFbGetAds.mockResolvedValue([{ id: 'ad-1', name: 'Ad' }]);

    mockTransformCampaign.mockReturnValue({ name: 'Conv', objective: 'OUTCOME_LEADS' });
    mockTransformAdSet.mockReturnValue({ name: 'AS Conv' });
    mockTransformAd.mockReturnValue({ name: 'Ad Conv' });

    mockPrisma.draftCampaign.create.mockResolvedValue({ id: 'conv-camp' });
    mockPrisma.draftAdSet.create.mockResolvedValue({ id: 'conv-adset' });
    mockPrisma.draftAd.create.mockResolvedValue({ id: 'conv-ad' });

    await DraftService.convertCampaignToDraft(
      'camp-1', 'OUTCOME_LEADS', 'New', 'act_123', 'user-1', 'token'
    );
    expect(mockTransformAdSet).toHaveBeenCalledWith(
      expect.anything(),
      'OUTCOME_LEADS',
      expect.any(String),
      'PENDING_CAMPAIGN_ID',
      'page-direct'
    );
  });

  it('uses fallback name when adSet.name is empty', async () => {
    mockFbGet
      .mockResolvedValueOnce({ data: { name: 'Camp', objective: 'OUTCOME_TRAFFIC', account_id: '123' } })
      .mockResolvedValueOnce({ data: { id: 'adset-1' } }); // no name
    mockFbGetAdSets.mockResolvedValue([{ id: 'adset-1', name: 'AS' }]);
    mockFbGetAds.mockResolvedValue([]);

    mockTransformCampaign.mockReturnValue({ name: 'Conv', objective: 'OUTCOME_LEADS' });
    mockTransformAdSet.mockReturnValue({ name: 'Ad Set - Converted' });

    mockPrisma.draftCampaign.create.mockResolvedValue({ id: 'conv-camp' });
    mockPrisma.draftAdSet.create.mockResolvedValue({ id: 'conv-adset' });

    await DraftService.convertCampaignToDraft(
      'camp-1', 'OUTCOME_LEADS', 'New', 'act_123', 'user-1', 'token'
    );
    expect(mockTransformAdSet).toHaveBeenCalledWith(
      expect.anything(),
      'OUTCOME_LEADS',
      'Ad Set - Converted',
      'PENDING_CAMPAIGN_ID',
      undefined
    );
  });

  it('uses fallback name when ad.name is empty', async () => {
    mockFbGet
      .mockResolvedValueOnce({ data: { name: 'Camp', objective: 'OUTCOME_TRAFFIC', account_id: '123' } })
      .mockResolvedValueOnce({ data: { id: 'adset-1', name: 'AS' } })
      // page_id lookup: ad has creative with id
      .mockResolvedValueOnce({ data: { id: 'ad-1', name: 'Ad', creative: { id: 'cr-1' } } })
      .mockResolvedValueOnce({ data: { id: 'cr-1', object_id: 'page-123' } })
      // full ad fetch: no name
      .mockResolvedValueOnce({ data: { id: 'ad-1', creative: { creative_id: 'cr-1' } } });
    mockFbGetAdSets.mockResolvedValue([{ id: 'adset-1', name: 'AS' }]);
    mockFbGetAds.mockResolvedValue([{ id: 'ad-1', name: 'Ad' }]);

    mockTransformCampaign.mockReturnValue({ name: 'Conv', objective: 'OUTCOME_LEADS' });
    mockTransformAdSet.mockReturnValue({ name: 'AS Conv' });
    mockTransformAd.mockReturnValue({ name: 'Ad - Converted' });

    mockPrisma.draftCampaign.create.mockResolvedValue({ id: 'conv-camp' });
    mockPrisma.draftAdSet.create.mockResolvedValue({ id: 'conv-adset' });
    mockPrisma.draftAd.create.mockResolvedValue({ id: 'conv-ad' });

    await DraftService.convertCampaignToDraft(
      'camp-1', 'OUTCOME_LEADS', 'New', 'act_123', 'user-1', 'token'
    );
    expect(mockTransformAd).toHaveBeenCalledWith(
      expect.anything(),
      'OUTCOME_LEADS',
      'Ad - Converted',
      'PENDING_ADSET_ID'
    );
  });
});
