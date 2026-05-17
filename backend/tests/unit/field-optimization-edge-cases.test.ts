import { describe, it, expect } from 'vitest';
import { FieldOptimizationEngine } from '../../src/services/draft/FieldOptimizationEngine';

describe('FieldOptimizationEngine.applyOverrides', () => {
  it('applies override to editable field', () => {
    const baseResult = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'Test AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        daily_budget: '5000',
        targeting: { geo_locations: { countries: ['TH'] } },
        status: 'ACTIVE',
      },
      'OUTCOME_TRAFFIC',
      false
    );

    const overridden = FieldOptimizationEngine.applyOverrides(
      baseResult,
      { daily_budget: '10000' },
      'OUTCOME_TRAFFIC'
    );
    expect(overridden.payload.daily_budget).toBe('10000');
  });

  it('ignores override for non-editable field', () => {
    const baseResult = FieldOptimizationEngine.optimizeCampaignForDuplication(
      {
        name: 'Test Campaign',
        objective: 'OUTCOME_TRAFFIC',
        status: 'ACTIVE',
        buying_type: 'AUCTION',
      }
    );

    const overridden = FieldOptimizationEngine.applyOverrides(
      baseResult,
      { objective: 'OUTCOME_SALES' },
      'OUTCOME_TRAFFIC'
    );
    expect(overridden.payload.objective).toBe('OUTCOME_TRAFFIC');
  });

  it('revalidates after override — campaign budget conflict detected in initial optimization', () => {
    // optimizeCampaignForDuplication auto-strips lifetime_budget if both present
    const baseResult = FieldOptimizationEngine.optimizeCampaignForDuplication(
      {
        name: 'Campaign',
        objective: 'OUTCOME_TRAFFIC',
        daily_budget: '5000',
        lifetime_budget: '50000',
        status: 'ACTIVE',
      }
    );

    // The optimizer kept daily_budget only and warned
    expect(baseResult.warnings.some(w => w.includes('daily_budget') && w.includes('lifetime_budget'))).toBe(true);
    expect(baseResult.payload.lifetime_budget).toBeUndefined();
  });

  it('revalidates adset — detects invalid optimization_goal after override', () => {
    const baseResult = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: { geo_locations: { countries: ['TH'] } },
        daily_budget: '5000',
        status: 'ACTIVE',
      },
      'OUTCOME_TRAFFIC',
      false
    );

    const overridden = FieldOptimizationEngine.applyOverrides(
      baseResult,
      { optimization_goal: 'APP_INSTALLS' },
      'OUTCOME_TRAFFIC'
    );
    expect(overridden.errors.some(e => e.includes('APP_INSTALLS') && e.includes('not valid'))).toBe(true);
  });

  it('revalidates adset — warns about bid cap without bid_amount', () => {
    // Need bid_strategy in source so it appears in fields array
    const baseResult = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: { geo_locations: { countries: ['TH'] } },
        daily_budget: '5000',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        status: 'ACTIVE',
      },
      'OUTCOME_TRAFFIC',
      false
    );

    const overridden = FieldOptimizationEngine.applyOverrides(
      baseResult,
      { bid_strategy: 'COST_CAP' },
      'OUTCOME_TRAFFIC'
    );
    expect(overridden.warnings.some(w => w.includes('COST_CAP') && w.includes('bid_amount'))).toBe(true);
  });

  it('revalidates adset — validates destination_type in initial optimization', () => {
    // destination_type is validated during the initial optimization
    const result = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: { geo_locations: { countries: ['TH'] } },
        daily_budget: '5000',
        destination_type: 'WEBSITE',
        status: 'ACTIVE',
      },
      'OUTCOME_TRAFFIC',
      false
    );

    // Valid destination_type should not cause errors
    expect(result.errors).toHaveLength(0);
    expect(result.payload.destination_type).toBe('WEBSITE');
  });

  it('revalidates adset — detects both daily and lifetime budget', () => {
    // Need lifetime_budget in source for it to be in fields array
    const baseResult = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: { geo_locations: { countries: ['TH'] } },
        daily_budget: '5000',
        lifetime_budget: '50000',
        status: 'ACTIVE',
      },
      'OUTCOME_TRAFFIC',
      false
    );

    // The optimizer handles dual budget — check it's detected in warnings or errors
    const hasBudgetIssue = baseResult.warnings.some(w => w.includes('budget')) ||
                           baseResult.errors.some(e => e.includes('budget'));
    expect(hasBudgetIssue || baseResult.payload.lifetime_budget === undefined).toBe(true);
  });

  it('revalidates adset — detects missing promoted_object for OUTCOME_SALES', () => {
    const baseResult = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'OFFSITE_CONVERSIONS',
        targeting: { geo_locations: { countries: ['TH'] } },
        daily_budget: '5000',
        status: 'ACTIVE',
      },
      'OUTCOME_SALES',
      false
    );

    // promoted_object is required for OUTCOME_SALES but not present
    expect(baseResult.errors.some(e => e.includes('promoted_object'))).toBe(true);
  });

  it('revalidates adset — detects promoted_object with wrong fields via applyOverrides', () => {
    // Use OUTCOME_TRAFFIC first (no promoted_object requirement) so it stays in payload
    const baseResult = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'OFFSITE_CONVERSIONS',
        targeting: { geo_locations: { countries: ['TH'] } },
        daily_budget: '5000',
        promoted_object: { custom_field: 'invalid' },
        status: 'ACTIVE',
      },
      'OUTCOME_SALES',
      false
    );

    const overridden = FieldOptimizationEngine.applyOverrides(
      baseResult,
      {},
      'OUTCOME_SALES'
    );
    expect(overridden.errors.some(e => e.includes('promoted_object') && e.includes('must include'))).toBe(true);
  });

  it('revalidates campaign — dual budget through override', () => {
    // Source has both budgets, optimizer keeps daily only
    const baseResult = FieldOptimizationEngine.optimizeCampaignForDuplication(
      {
        name: 'Campaign',
        objective: 'OUTCOME_TRAFFIC',
        daily_budget: '5000',
        lifetime_budget: '50000',
        status: 'ACTIVE',
      }
    );

    // Override lifetime_budget back in (field is editable and in fields array)
    const overridden = FieldOptimizationEngine.applyOverrides(
      baseResult,
      { lifetime_budget: '50000' },
      'OUTCOME_TRAFFIC'
    );
    expect(overridden.errors.some(e => e.includes('daily_budget') && e.includes('lifetime_budget'))).toBe(true);
  });

  it('revalidates adset — detects invalid destination_type via applyOverrides', () => {
    const baseResult = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: { geo_locations: { countries: ['TH'] } },
        daily_budget: '5000',
        destination_type: 'WEBSITE',
        status: 'ACTIVE',
      },
      'OUTCOME_TRAFFIC',
      false
    );

    // Override destination_type to invalid value for the objective
    const overridden = FieldOptimizationEngine.applyOverrides(
      baseResult,
      { destination_type: 'SHOP_AUTOMATIC' },
      'OUTCOME_TRAFFIC'
    );
    expect(overridden.errors.some(e => e.includes('SHOP_AUTOMATIC') && e.includes('not valid'))).toBe(true);
  });

  it('revalidates adset — missing promoted_object via applyOverrides for OUTCOME_SALES', () => {
    // Create adset without promoted_object for OUTCOME_TRAFFIC (no requirement)
    const baseResult = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: { geo_locations: { countries: ['TH'] } },
        daily_budget: '5000',
        status: 'ACTIVE',
      },
      'OUTCOME_TRAFFIC',
      false
    );

    // Now revalidate against OUTCOME_SALES which requires promoted_object
    const overridden = FieldOptimizationEngine.applyOverrides(
      baseResult,
      {},
      'OUTCOME_SALES'
    );
    expect(overridden.errors.some(e => e.includes('promoted_object') && e.includes('required'))).toBe(true);
  });

  it('revalidates adset — dual budget through override', () => {
    // Start with daily only
    const baseResult = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: { geo_locations: { countries: ['TH'] } },
        daily_budget: '5000',
        lifetime_budget: '50000',
        status: 'ACTIVE',
      },
      'OUTCOME_TRAFFIC',
      false
    );

    // Override lifetime_budget back in
    const overridden = FieldOptimizationEngine.applyOverrides(
      baseResult,
      { lifetime_budget: '80000' },
      'OUTCOME_TRAFFIC'
    );
    expect(overridden.errors.some(e => e.includes('daily_budget') && e.includes('lifetime_budget'))).toBe(true);
  });
});

describe('FieldOptimizationEngine.validatePayload', () => {
  it('validates a valid campaign payload', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'campaign',
      { name: 'Test', objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', special_ad_categories: ['NONE'] },
      'OUTCOME_TRAFFIC'
    );
    expect(result.valid).toBe(true);
  });

  it('detects missing required fields', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'campaign',
      { status: 'PAUSED' },
      'OUTCOME_TRAFFIC'
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('required'))).toBe(true);
  });

  it('validates adSet with invalid optimization_goal for objective', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'adSet',
      {
        name: 'Test',
        optimization_goal: 'APP_INSTALLS',
        billing_event: 'IMPRESSIONS',
        targeting: {},
        status: 'PAUSED',
      },
      'OUTCOME_TRAFFIC'
    );
    expect(result.errors.some(e => e.includes('APP_INSTALLS') && e.includes('invalid'))).toBe(true);
  });

  it('warns about read-only fields in payload', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'campaign',
      { name: 'Test', objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', id: '123', created_time: '2024-01-01' },
      'OUTCOME_TRAFFIC'
    );
    expect(result.warnings.some(w => w.includes('read-only'))).toBe(true);
  });

  it('validates ad payload', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'ad',
      { name: 'Test Ad', status: 'PAUSED', creative: { creative_id: '123' } },
    );
    expect(result.valid).toBe(true);
  });

  it('skips campaign_id and adset_id in required check', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'adSet',
      {
        name: 'Test',
        optimization_goal: 'LINK_CLICKS',
        billing_event: 'IMPRESSIONS',
        targeting: { geo_locations: { countries: ['TH'] } },
        status: 'PAUSED',
      },
      'OUTCOME_TRAFFIC'
    );
    expect(result.errors.some(e => e.includes('campaign_id'))).toBe(false);
  });

  it('validates adSet with valid optimization_goal for objective (no error)', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'adSet',
      {
        name: 'Test',
        optimization_goal: 'LINK_CLICKS',
        billing_event: 'IMPRESSIONS',
        targeting: { geo_locations: { countries: ['TH'] } },
        status: 'PAUSED',
        destination_type: 'WEBSITE',
      },
      'OUTCOME_TRAFFIC'
    );
    expect(result.errors).toHaveLength(0);
  });

  it('validates adSet without campaignObjective (skips objective-specific validation)', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'adSet',
      {
        name: 'Test',
        optimization_goal: 'APP_INSTALLS',
        billing_event: 'IMPRESSIONS',
        targeting: { geo_locations: { countries: ['TH'] } },
        status: 'PAUSED',
      },
    );
    expect(result.errors.some(e => e.includes('APP_INSTALLS'))).toBe(false);
  });

  it('revalidates adset — promoted_object with correct required field passes', () => {
    const baseResult = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'OFFSITE_CONVERSIONS',
        targeting: { geo_locations: { countries: ['TH'] } },
        daily_budget: '5000',
        promoted_object: { pixel_id: '123456' },
        status: 'ACTIVE',
      },
      'OUTCOME_SALES',
      false
    );

    expect(baseResult.errors.some(e => e.includes('promoted_object') && e.includes('must include'))).toBe(false);
  });

  it('optimization with unknown objective has no objective-specific errors', () => {
    const baseResult = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: { geo_locations: { countries: ['TH'] } },
        daily_budget: '5000',
        status: 'ACTIVE',
      },
      'INVALID_OBJECTIVE',
      false
    );
    expect(baseResult.errors).toHaveLength(0);
  });

  it('marks optimization_goal as auto_mapped when migrated for duplication', () => {
    const result = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'Test AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'APP_INSTALLS',
        daily_budget: '5000',
        targeting: { geo_locations: { countries: ['TH'] } },
      },
      'OUTCOME_AWARENESS',
      false
    );
    const goalField = result.fields.find(f => f.field === 'optimization_goal');
    expect(goalField?.action).toBe('auto_mapped');
  });

  it('marks optimization_goal as kept when already valid for duplication', () => {
    const result = FieldOptimizationEngine.optimizeAdSetForDuplication(
      {
        name: 'Test AdSet',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        daily_budget: '5000',
        targeting: { geo_locations: { countries: ['TH'] } },
      },
      'OUTCOME_TRAFFIC',
      false
    );
    const goalField = result.fields.find(f => f.field === 'optimization_goal');
    expect(goalField?.action).toBe('kept');
  });
});
