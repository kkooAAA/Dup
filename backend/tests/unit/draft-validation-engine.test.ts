import { describe, it, expect } from 'vitest';
import { DraftValidationEngine } from '../../src/services/draft/DraftValidationEngine';

function makeCampaign(overrides: any = {}) {
  return {
    id: 'camp-1',
    name: 'Test Campaign',
    objective: 'OUTCOME_TRAFFIC',
    data: { objective: 'OUTCOME_TRAFFIC' },
    metaId: null,
    ...overrides,
  } as any;
}

function makeAdSet(overrides: any = {}) {
  return {
    id: 'adset-1',
    name: 'Test Ad Set',
    data: {
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'LINK_CLICKS',
      targeting: { geo_locations: { countries: ['TH'] } },
    },
    metaId: null,
    ...overrides,
  } as any;
}

function makeAd(overrides: any = {}) {
  return {
    id: 'ad-1',
    name: 'Test Ad',
    data: { creative: { creative_id: '123' } },
    metaId: null,
    ...overrides,
  } as any;
}

describe('DraftValidationEngine.validateCampaign', () => {
  it('returns no errors for a valid campaign', async () => {
    const errors = await DraftValidationEngine.validateCampaign(makeCampaign());
    expect(errors).toHaveLength(0);
  });

  it('requires campaign name', async () => {
    const errors = await DraftValidationEngine.validateCampaign(makeCampaign({ name: '' }));
    expect(errors.some(e => e.field === 'name')).toBe(true);
  });

  it('requires objective', async () => {
    const errors = await DraftValidationEngine.validateCampaign(
      makeCampaign({ objective: null, data: {} })
    );
    expect(errors.some(e => e.field === 'objective' && e.message.includes('required'))).toBe(true);
  });

  it('rejects unknown objective', async () => {
    const errors = await DraftValidationEngine.validateCampaign(
      makeCampaign({ data: { objective: 'INVALID_OBJ' } })
    );
    expect(errors.some(e => e.field === 'objective' && e.message.includes('Unknown'))).toBe(true);
  });

  it('rejects both daily_budget and lifetime_budget', async () => {
    const errors = await DraftValidationEngine.validateCampaign(
      makeCampaign({ data: { objective: 'OUTCOME_TRAFFIC', daily_budget: '5000', lifetime_budget: '50000' } })
    );
    expect(errors.some(e => e.field === 'budget')).toBe(true);
  });

  it('errors when bid cap strategy lacks bid_amount', async () => {
    const errors = await DraftValidationEngine.validateCampaign(
      makeCampaign({ data: { objective: 'OUTCOME_TRAFFIC', bid_strategy: 'COST_CAP' } })
    );
    expect(errors.some(e => e.field === 'bid_strategy' && e.severity === 'error')).toBe(true);
  });

  it('does not warn when bid cap strategy has bid_amount', async () => {
    const errors = await DraftValidationEngine.validateCampaign(
      makeCampaign({ data: { objective: 'OUTCOME_TRAFFIC', bid_strategy: 'COST_CAP', bid_amount: '1000' } })
    );
    expect(errors.some(e => e.field === 'bid_strategy')).toBe(false);
  });

  it('does not warn when bid cap strategy has bid_constraints', async () => {
    const errors = await DraftValidationEngine.validateCampaign(
      makeCampaign({ data: { objective: 'OUTCOME_TRAFFIC', bid_strategy: 'COST_CAP', bid_constraints: {} } })
    );
    expect(errors.some(e => e.field === 'bid_strategy')).toBe(false);
  });

  it('warns about immutable field changes on published campaigns', async () => {
    const errors = await DraftValidationEngine.validateCampaign(
      makeCampaign({
        metaId: 'meta_123',
        data: {
          objective: 'OUTCOME_TRAFFIC',
          buying_type: 'AUCTION',
          _original_buying_type: 'RESERVED',
        },
      })
    );
    expect(errors.some(e => e.field === 'buying_type' && e.severity === 'warning')).toBe(true);
  });

  it('does not warn when immutable field unchanged', async () => {
    const errors = await DraftValidationEngine.validateCampaign(
      makeCampaign({
        metaId: 'meta_123',
        data: {
          objective: 'OUTCOME_TRAFFIC',
          buying_type: 'AUCTION',
          _original_buying_type: 'AUCTION',
        },
      })
    );
    expect(errors.some(e => e.field === 'buying_type')).toBe(false);
  });
});

describe('DraftValidationEngine.validateAdSet', () => {
  it('returns no errors for a valid ad set', async () => {
    const errors = await DraftValidationEngine.validateAdSet(makeAdSet());
    expect(errors).toHaveLength(0);
  });

  it('requires name', async () => {
    const errors = await DraftValidationEngine.validateAdSet(makeAdSet({ name: '' }));
    expect(errors.some(e => e.field === 'name')).toBe(true);
  });

  it('requires billing_event', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({ data: { optimization_goal: 'LINK_CLICKS', targeting: {} } })
    );
    expect(errors.some(e => e.field === 'billing_event')).toBe(true);
  });

  it('requires optimization_goal', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({ data: { billing_event: 'IMPRESSIONS', targeting: {} } })
    );
    expect(errors.some(e => e.field === 'optimization_goal')).toBe(true);
  });

  it('requires targeting', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({ data: { billing_event: 'IMPRESSIONS', optimization_goal: 'LINK_CLICKS' } })
    );
    expect(errors.some(e => e.field === 'targeting')).toBe(true);
  });

  it('validates optimization_goal against objective', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({ data: { billing_event: 'IMPRESSIONS', optimization_goal: 'APP_INSTALLS', targeting: {} } }),
      'OUTCOME_TRAFFIC'
    );
    expect(errors.some(e => e.field === 'optimization_goal' && e.message.includes('not valid'))).toBe(true);
  });

  it('accepts valid optimization_goal for objective', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({ data: { billing_event: 'IMPRESSIONS', optimization_goal: 'LINK_CLICKS', targeting: {} } }),
      'OUTCOME_TRAFFIC'
    );
    expect(errors.some(e => e.field === 'optimization_goal')).toBe(false);
  });

  it('validates destination_type against objective', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({
        data: {
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'REACH',
          targeting: {},
          destination_type: 'WEBSITE',
        },
      }),
      'OUTCOME_AWARENESS'
    );
    // OUTCOME_AWARENESS only allows 'UNDEFINED'
    expect(errors.some(e => e.field === 'destination_type')).toBe(true);
  });

  it('requires promoted_object for OUTCOME_LEADS', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({
        data: { billing_event: 'IMPRESSIONS', optimization_goal: 'LEAD_GENERATION', targeting: {} },
      }),
      'OUTCOME_LEADS'
    );
    expect(errors.some(e => e.field === 'promoted_object')).toBe(true);
  });

  it('validates promoted_object has required fields', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({
        data: {
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'LEAD_GENERATION',
          targeting: {},
          promoted_object: { custom_field: 'something' },
        },
      }),
      'OUTCOME_LEADS'
    );
    expect(errors.some(e => e.field === 'promoted_object' && e.message.includes('must include'))).toBe(true);
  });

  it('accepts valid promoted_object', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({
        data: {
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'LEAD_GENERATION',
          targeting: {},
          promoted_object: { page_id: '12345' },
        },
      }),
      'OUTCOME_LEADS'
    );
    expect(errors.some(e => e.field === 'promoted_object')).toBe(false);
  });

  it('warns about attribution_spec on unsupported objectives', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({
        data: {
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'REACH',
          targeting: {},
          attribution_spec: [{ event_type: 'CLICK_THROUGH' }],
        },
      }),
      'OUTCOME_AWARENESS'
    );
    expect(errors.some(e => e.field === 'attribution_spec' && e.severity === 'warning')).toBe(true);
  });

  it('allows attribution_spec on OUTCOME_SALES', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({
        data: {
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'OFFSITE_CONVERSIONS',
          targeting: {},
          attribution_spec: [{ event_type: 'CLICK_THROUGH' }],
          promoted_object: { pixel_id: '123' },
        },
      }),
      'OUTCOME_SALES'
    );
    expect(errors.some(e => e.field === 'attribution_spec')).toBe(false);
  });

  it('rejects adset budget under CBO', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({
        data: {
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'LINK_CLICKS',
          targeting: {},
          daily_budget: '5000',
        },
      }),
      'OUTCOME_TRAFFIC',
      true
    );
    expect(errors.some(e => e.field === 'budget' && e.message.includes('CBO'))).toBe(true);
  });

  it('warns about missing budget for non-CBO', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({
        data: {
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'LINK_CLICKS',
          targeting: {},
        },
      }),
      'OUTCOME_TRAFFIC',
      false
    );
    expect(errors.some(e => e.field === 'budget' && e.severity === 'warning')).toBe(true);
  });

  it('rejects both daily and lifetime budget on non-CBO adset', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({
        data: {
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'LINK_CLICKS',
          targeting: {},
          daily_budget: '5000',
          lifetime_budget: '50000',
        },
      }),
      'OUTCOME_TRAFFIC',
      false
    );
    expect(errors.some(e => e.field === 'budget' && e.severity === 'error')).toBe(true);
  });

  it('warns about immutable adset fields on published entities', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({
        metaId: 'meta_adset_1',
        data: {
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'LINK_CLICKS',
          targeting: {},
          destination_type: 'WEBSITE',
          _original_destination_type: 'APP',
        },
      })
    );
    expect(errors.some(e => e.field === 'destination_type' && e.severity === 'warning')).toBe(true);
  });

  it('skips campaign_id in immutable check', async () => {
    const errors = await DraftValidationEngine.validateAdSet(
      makeAdSet({
        metaId: 'meta_adset_1',
        data: {
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'LINK_CLICKS',
          targeting: {},
          campaign_id: 'new_campaign',
          _original_campaign_id: 'old_campaign',
        },
      })
    );
    expect(errors.some(e => e.field === 'campaign_id')).toBe(false);
  });
});

describe('DraftValidationEngine.validateAd', () => {
  it('returns no errors for a valid ad', async () => {
    const errors = await DraftValidationEngine.validateAd(makeAd());
    expect(errors).toHaveLength(0);
  });

  it('requires ad name', async () => {
    const errors = await DraftValidationEngine.validateAd(makeAd({ name: '' }));
    expect(errors.some(e => e.field === 'name')).toBe(true);
  });

  it('requires creative', async () => {
    const errors = await DraftValidationEngine.validateAd(makeAd({ data: {} }));
    expect(errors.some(e => e.field === 'creative' && e.message.includes('required'))).toBe(true);
  });

  it('requires creative_id or id in creative', async () => {
    const errors = await DraftValidationEngine.validateAd(
      makeAd({ data: { creative: { some_field: 'value' } } })
    );
    expect(errors.some(e => e.field === 'creative' && e.message.includes('creative_id'))).toBe(true);
  });

  it('accepts creative with id', async () => {
    const errors = await DraftValidationEngine.validateAd(
      makeAd({ data: { creative: { id: '123' } } })
    );
    expect(errors).toHaveLength(0);
  });
});

describe('DraftValidationEngine.validateFullDraft', () => {
  it('validates full draft tree with valid data', async () => {
    const campaign = {
      ...makeCampaign(),
      adSets: [{
        ...makeAdSet(),
        ads: [makeAd()],
      }],
    };
    const result = await DraftValidationEngine.validateFullDraft(campaign);
    expect(result.isValid).toBe(true);
    expect(result.campaignErrors).toHaveLength(0);
  });

  it('detects CBO from campaign data', async () => {
    const campaign = {
      ...makeCampaign({ data: { objective: 'OUTCOME_TRAFFIC', daily_budget: '5000' } }),
      adSets: [{
        ...makeAdSet({
          data: {
            billing_event: 'IMPRESSIONS',
            optimization_goal: 'LINK_CLICKS',
            targeting: {},
            daily_budget: '3000',
          },
        }),
        ads: [makeAd()],
      }],
    };
    const result = await DraftValidationEngine.validateFullDraft(campaign);
    expect(result.isValid).toBe(false);
    expect(Object.values(result.adSetErrors).flat().some(e => e.message.includes('CBO'))).toBe(true);
  });

  it('marks invalid when campaign has errors', async () => {
    const campaign = {
      ...makeCampaign({ name: '', data: { objective: 'OUTCOME_TRAFFIC' } }),
      adSets: [],
    };
    const result = await DraftValidationEngine.validateFullDraft(campaign);
    expect(result.isValid).toBe(false);
  });

  it('marks invalid when ad has errors', async () => {
    const campaign = {
      ...makeCampaign(),
      adSets: [{
        ...makeAdSet(),
        ads: [makeAd({ data: {} })],
      }],
    };
    const result = await DraftValidationEngine.validateFullDraft(campaign);
    expect(result.isValid).toBe(false);
  });

  it('handles campaign without adSets gracefully', async () => {
    const campaign = makeCampaign();
    const result = await DraftValidationEngine.validateFullDraft(campaign);
    expect(result.isValid).toBe(true);
  });

  it('handles adSet without ads gracefully', async () => {
    const campaign = {
      ...makeCampaign(),
      adSets: [makeAdSet()],
    };
    const result = await DraftValidationEngine.validateFullDraft(campaign);
    expect(result.isValid).toBe(true);
  });

  it('uses campaign.objective when data.objective is missing', async () => {
    const campaign = {
      ...makeCampaign({ objective: 'OUTCOME_TRAFFIC', data: {} }),
      adSets: [{
        ...makeAdSet(),
        ads: [makeAd()],
      }],
    };
    const result = await DraftValidationEngine.validateFullDraft(campaign);
    expect(result.isValid).toBe(true);
  });
});

describe('DraftValidationEngine.validateAdSet edge cases', () => {
  it('skips destination_type validation for unknown objective', async () => {
    const adSet = makeAdSet({
      data: {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: { geo_locations: { countries: ['TH'] } },
        destination_type: 'ANYTHING',
      },
    });
    const errors = await DraftValidationEngine.validateAdSet(adSet, 'UNKNOWN_OBJECTIVE', false);
    expect(errors.some(e => e.field === 'destination_type')).toBe(false);
  });

  it('skips promoted_object validation for objectives without requirements', async () => {
    const adSet = makeAdSet({
      data: {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: { geo_locations: { countries: ['TH'] } },
        daily_budget: '5000',
      },
    });
    // OUTCOME_TRAFFIC has no promoted_object requirements
    const errors = await DraftValidationEngine.validateAdSet(adSet, 'OUTCOME_TRAFFIC', false);
    expect(errors.some(e => e.field === 'promoted_object')).toBe(false);
  });

  it('skips budget validation when isCBO is undefined', async () => {
    const adSet = makeAdSet({
      data: {
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: { geo_locations: { countries: ['TH'] } },
      },
    });
    const errors = await DraftValidationEngine.validateAdSet(adSet, 'OUTCOME_TRAFFIC', undefined as any);
    expect(errors.some(e => e.field === 'budget')).toBe(false);
  });
});
