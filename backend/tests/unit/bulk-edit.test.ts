import { describe, it, expect } from 'vitest';
import { BulkEditCompatibilityEngine } from '../../src/services/draft/BulkEditCompatibilityEngine';
import { VALID_OPTIMIZATION_GOALS, VALID_DESTINATION_TYPES } from '../../src/services/draft/MetaFieldRegistry';

// ─── Mock Drafts ───

function makeCampaignDraft(overrides: Partial<{ id: string; objective: string; metaId: string; data: Record<string, any> }>) {
  return {
    id: overrides.id || `draft-${Math.random().toString(36).slice(2)}`,
    objective: overrides.objective || 'OUTCOME_TRAFFIC',
    metaId: overrides.metaId || null,
    data: {
      name: 'Test Campaign',
      objective: overrides.objective || 'OUTCOME_TRAFFIC',
      buying_type: 'AUCTION',
      status: 'PAUSED',
      daily_budget: '5000',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      special_ad_categories: ['NONE'],
      ...overrides.data,
    },
  };
}

function makeAdSetDraft(overrides: Partial<{ id: string; campaignObjective: string; isCBO: boolean; metaId: string; data: Record<string, any> }>) {
  return {
    id: overrides.id || `draft-${Math.random().toString(36).slice(2)}`,
    campaignObjective: overrides.campaignObjective || 'OUTCOME_TRAFFIC',
    isCBO: overrides.isCBO || false,
    metaId: overrides.metaId || null,
    data: {
      name: 'Test Ad Set',
      optimization_goal: 'LINK_CLICKS',
      billing_event: 'IMPRESSIONS',
      destination_type: 'WEBSITE',
      daily_budget: '5000',
      targeting: { geo_locations: { countries: ['TH'] } },
      ...overrides.data,
    },
  };
}

// ─── Fingerprint ───

describe('computeFingerprint', () => {
  it('campaign fingerprint extracts objective and buying type', () => {
    const draft = makeCampaignDraft({ objective: 'OUTCOME_LEADS', data: { buying_type: 'RESERVED', is_adset_budget_sharing_enabled: true } });
    const fp = BulkEditCompatibilityEngine.computeFingerprint(draft, 'campaign');
    expect(fp.level).toBe('campaign');
    expect(fp.objective).toBe('OUTCOME_LEADS');
    expect(fp.buyingType).toBe('RESERVED');
    expect(fp.isCBO).toBe(true);
  });

  it('adset fingerprint extracts campaign objective and CBO', () => {
    const draft = makeAdSetDraft({ campaignObjective: 'OUTCOME_SALES', isCBO: true });
    const fp = BulkEditCompatibilityEngine.computeFingerprint(draft, 'adSet');
    expect(fp.level).toBe('adSet');
    expect(fp.objective).toBe('OUTCOME_SALES');
    expect(fp.isCBO).toBe(true);
  });
});

// ─── Compatibility ───

describe('areCompatible', () => {
  it('single entity is always compatible', () => {
    const result = BulkEditCompatibilityEngine.areCompatible([
      { level: 'campaign', objective: 'OUTCOME_TRAFFIC' },
    ]);
    expect(result.compatible).toBe(true);
  });

  it('same-level entities are compatible', () => {
    const result = BulkEditCompatibilityEngine.areCompatible([
      { level: 'campaign', objective: 'OUTCOME_TRAFFIC' },
      { level: 'campaign', objective: 'OUTCOME_LEADS' },
    ]);
    expect(result.compatible).toBe(true);
  });

  it('different-level entities are incompatible', () => {
    const result = BulkEditCompatibilityEngine.areCompatible([
      { level: 'campaign', objective: 'OUTCOME_TRAFFIC' },
      { level: 'adSet', objective: 'OUTCOME_TRAFFIC' },
    ]);
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('different levels');
  });

  it('empty array is incompatible', () => {
    const result = BulkEditCompatibilityEngine.areCompatible([]);
    expect(result.compatible).toBe(false);
  });
});

// ─── Schema Computation ───

describe('computeBulkSchema', () => {
  it('same-objective campaigns show full editable fields', () => {
    const drafts = [
      makeCampaignDraft({ id: 'a', objective: 'OUTCOME_TRAFFIC' }),
      makeCampaignDraft({ id: 'b', objective: 'OUTCOME_TRAFFIC' }),
    ];
    const schema = BulkEditCompatibilityEngine.computeBulkSchema(drafts, 'campaign');
    expect(schema.compatible).toBe(true);
    expect(schema.warnings).toHaveLength(0);

    const editableFields = schema.fields.filter(f => f.editable);
    expect(editableFields.some(f => f.field === 'name')).toBe(true);
    expect(editableFields.some(f => f.field === 'daily_budget')).toBe(true);
    expect(editableFields.some(f => f.field === 'bid_strategy')).toBe(true);
  });

  it('objective and buying_type are always locked', () => {
    const drafts = [makeCampaignDraft({ id: 'a' }), makeCampaignDraft({ id: 'b' })];
    const schema = BulkEditCompatibilityEngine.computeBulkSchema(drafts, 'campaign');
    const objField = schema.fields.find(f => f.field === 'objective');
    const btField = schema.fields.find(f => f.field === 'buying_type');
    expect(objField?.locked).toBe(true);
    expect(btField?.locked).toBe(true);
  });

  it('mixed objectives warn and lock dependent fields', () => {
    const drafts = [
      makeCampaignDraft({ id: 'a', objective: 'OUTCOME_TRAFFIC' }),
      makeCampaignDraft({ id: 'b', objective: 'OUTCOME_LEADS' }),
    ];
    const schema = BulkEditCompatibilityEngine.computeBulkSchema(drafts, 'campaign');
    expect(schema.compatible).toBe(true);
    expect(schema.warnings.some(w => w.includes('different objectives'))).toBe(true);
  });

  it('CBO adsets have budget fields locked', () => {
    const drafts = [
      makeAdSetDraft({ id: 'a', isCBO: true }),
      makeAdSetDraft({ id: 'b', isCBO: true }),
    ];
    const schema = BulkEditCompatibilityEngine.computeBulkSchema(drafts, 'adSet');
    const budgetField = schema.fields.find(f => f.field === 'daily_budget');
    expect(budgetField?.locked).toBe(true);
    expect(budgetField?.lockReason).toContain('CBO');
  });

  it('non-CBO adsets have budget fields editable', () => {
    const drafts = [
      makeAdSetDraft({ id: 'a', isCBO: false }),
      makeAdSetDraft({ id: 'b', isCBO: false }),
    ];
    const schema = BulkEditCompatibilityEngine.computeBulkSchema(drafts, 'adSet');
    const budgetField = schema.fields.find(f => f.field === 'daily_budget');
    expect(budgetField?.editable).toBe(true);
  });

  it('published drafts lock immutable fields', () => {
    const drafts = [
      makeCampaignDraft({ id: 'a', metaId: '120210001' }),
      makeCampaignDraft({ id: 'b' }),
    ];
    const schema = BulkEditCompatibilityEngine.computeBulkSchema(drafts, 'campaign');
    const objField = schema.fields.find(f => f.field === 'objective');
    expect(objField?.locked).toBe(true);
  });

  it('detects mixed values', () => {
    const drafts = [
      makeCampaignDraft({ id: 'a', data: { daily_budget: '5000' } }),
      makeCampaignDraft({ id: 'b', data: { daily_budget: '10000' } }),
    ];
    const schema = BulkEditCompatibilityEngine.computeBulkSchema(drafts, 'campaign');
    const budgetField = schema.fields.find(f => f.field === 'daily_budget');
    expect(budgetField?.isMixed).toBe(true);
    expect(budgetField?.commonValue).toBeUndefined();
  });

  it('detects common values', () => {
    const drafts = [
      makeCampaignDraft({ id: 'a', data: { bid_strategy: 'COST_CAP' } }),
      makeCampaignDraft({ id: 'b', data: { bid_strategy: 'COST_CAP' } }),
    ];
    const schema = BulkEditCompatibilityEngine.computeBulkSchema(drafts, 'campaign');
    const bidField = schema.fields.find(f => f.field === 'bid_strategy');
    expect(bidField?.isMixed).toBe(false);
    expect(bidField?.commonValue).toBe('COST_CAP');
  });

  it('same-objective adsets get correct optimization_goal options', () => {
    const drafts = [
      makeAdSetDraft({ id: 'a', campaignObjective: 'OUTCOME_LEADS' }),
      makeAdSetDraft({ id: 'b', campaignObjective: 'OUTCOME_LEADS' }),
    ];
    const schema = BulkEditCompatibilityEngine.computeBulkSchema(drafts, 'adSet');
    const goalField = schema.fields.find(f => f.field === 'optimization_goal');
    expect(goalField?.enumValues).toEqual(VALID_OPTIMIZATION_GOALS['OUTCOME_LEADS']);
  });
});

// ─── Validation ───

describe('validateBulkEdit', () => {
  it('valid update passes', () => {
    const drafts = [
      makeCampaignDraft({ id: 'a' }),
      makeCampaignDraft({ id: 'b' }),
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts, { name: 'New Name', daily_budget: '10000' }, 'campaign',
    );
    expect(result.valid).toBe(true);
    expect(result.globalErrors).toHaveLength(0);
  });

  it('rejects dual budgets', () => {
    const drafts = [makeCampaignDraft({ id: 'a' })];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts, { daily_budget: '5000', lifetime_budget: '100000' }, 'campaign',
    );
    expect(result.valid).toBe(false);
    expect(result.globalErrors.some(e => e.includes('daily_budget') || e.includes('lifetime_budget'))).toBe(true);
  });

  it('warns on cap strategy without bid_amount', () => {
    const drafts = [makeCampaignDraft({ id: 'a' })];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts, { bid_strategy: 'COST_CAP' }, 'campaign',
    );
    expect(result.globalWarnings.some(w => w.includes('bid_amount'))).toBe(true);
  });

  it('rejects immutable field change on published draft', () => {
    const drafts = [makeCampaignDraft({ id: 'a', metaId: '12345' })];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts, { objective: 'OUTCOME_LEADS' }, 'campaign',
    );
    expect(result.valid).toBe(false);
    expect(result.perEntityErrors['a']).toBeDefined();
    expect(result.perEntityErrors['a'].some(e => e.field === 'objective')).toBe(true);
  });

  it('rejects invalid optimization_goal for objective', () => {
    const drafts = [makeAdSetDraft({ id: 'a', campaignObjective: 'OUTCOME_TRAFFIC' })];
    (drafts[0] as any).objective = 'OUTCOME_TRAFFIC';
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts, { optimization_goal: 'LEAD_GENERATION' }, 'adSet',
    );
    expect(result.valid).toBe(false);
  });

  it('rejects clearing required field', () => {
    const drafts = [makeCampaignDraft({ id: 'a' })];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts, { name: '' }, 'campaign',
    );
    expect(result.valid).toBe(false);
    expect(result.perEntityErrors['a'].some(e => e.field === 'name')).toBe(true);
  });
});

// ─── Apply ───

describe('applyBulkEdit', () => {
  it('merges field updates into draft data', () => {
    const drafts = [
      makeCampaignDraft({ id: 'a', data: { name: 'Old', daily_budget: '5000' } }),
      makeCampaignDraft({ id: 'b', data: { name: 'Other', daily_budget: '3000' } }),
    ];
    const results = BulkEditCompatibilityEngine.applyBulkEdit(
      drafts, { name: 'Bulk Updated', daily_budget: '10000' }, 'campaign',
    );
    expect(results).toHaveLength(2);
    expect(results[0].updatedData.name).toBe('Bulk Updated');
    expect(results[0].updatedData.daily_budget).toBe('10000');
    expect(results[1].updatedData.name).toBe('Bulk Updated');
  });

  it('clears field when set to empty string', () => {
    const drafts = [makeCampaignDraft({ id: 'a', data: { spend_cap: '50000' } })];
    const results = BulkEditCompatibilityEngine.applyBulkEdit(
      drafts, { spend_cap: '' }, 'campaign',
    );
    expect(results[0].updatedData.spend_cap).toBeUndefined();
  });

  it('setting daily_budget clears lifetime_budget', () => {
    const drafts = [makeCampaignDraft({ id: 'a', data: { lifetime_budget: '100000' } })];
    const results = BulkEditCompatibilityEngine.applyBulkEdit(
      drafts, { daily_budget: '5000' }, 'campaign',
    );
    expect(results[0].updatedData.daily_budget).toBe('5000');
    expect(results[0].updatedData.lifetime_budget).toBeUndefined();
  });

  it('setting lifetime_budget clears daily_budget', () => {
    const drafts = [makeCampaignDraft({ id: 'a', data: { daily_budget: '5000' } })];
    const results = BulkEditCompatibilityEngine.applyBulkEdit(
      drafts, { lifetime_budget: '100000' }, 'campaign',
    );
    expect(results[0].updatedData.lifetime_budget).toBe('100000');
    expect(results[0].updatedData.daily_budget).toBeUndefined();
  });

  it('returns objective separately when changed', () => {
    const drafts = [makeCampaignDraft({ id: 'a' })];
    const results = BulkEditCompatibilityEngine.applyBulkEdit(
      drafts, { objective: 'OUTCOME_LEADS' }, 'campaign',
    );
    expect(results[0].objective).toBe('OUTCOME_LEADS');
  });
});
