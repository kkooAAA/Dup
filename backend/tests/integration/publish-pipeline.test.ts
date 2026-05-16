import { describe, it, expect } from 'vitest';
import { FieldOptimizationEngine } from '../../src/services/draft/FieldOptimizationEngine';
import { DraftValidationEngine } from '../../src/services/draft/DraftValidationEngine';
import { CAMPAIGN_FIXTURES, ADSET_FIXTURES, AD_FIXTURES, BUDGET_VARIATIONS, BID_STRATEGY_VARIATIONS } from '../fixtures/meta-entities';
import { validateAgainstContract, CAMPAIGN_CONTRACT, ADSET_CONTRACT, AD_CONTRACT } from '../contracts/meta-api-contracts';
import { VALID_OPTIMIZATION_GOALS, OBJECTIVE_DEFAULTS, PROMOTED_OBJECT_REQUIREMENTS } from '../../src/services/draft/MetaFieldRegistry';

const ALL_OBJECTIVES = Object.keys(VALID_OPTIMIZATION_GOALS);

// ─── Full Pipeline: Optimize → Validate → Check Contract ───

describe('Full Publish Pipeline (Optimize → Contract)', () => {
  for (const objective of ALL_OBJECTIVES) {
    describe(`${objective} Campaign`, () => {
      const campaignData = CAMPAIGN_FIXTURES[objective];
      const adSetData = ADSET_FIXTURES[objective];

      it('campaign: optimize → contract', () => {
        const optimized = FieldOptimizationEngine.optimizeCampaignForDuplication(campaignData);
        expect(optimized.errors).toHaveLength(0);

        const violations = validateAgainstContract(optimized.payload, CAMPAIGN_CONTRACT);
        expect(violations).toEqual([]);
      });

      it('adset (non-CBO): optimize → contract', () => {
        const optimized = FieldOptimizationEngine.optimizeAdSetForDuplication(adSetData, objective, false);
        const fullPayload = { ...optimized.payload, campaign_id: '12345' };
        const violations = validateAgainstContract(fullPayload, ADSET_CONTRACT, { objective });

        // Filter acceptable conditionals
        const real = violations.filter(v => {
          if (v.field === 'end_time') return false;
          if (v.field === 'bid_amount') return false;
          return true;
        });
        expect(real).toEqual([]);
      });

      it('adset (CBO): optimize → contract', () => {
        const optimized = FieldOptimizationEngine.optimizeAdSetForDuplication(adSetData, objective, true);
        const fullPayload = { ...optimized.payload, campaign_id: '12345' };
        const violations = validateAgainstContract(fullPayload, ADSET_CONTRACT, { objective });

        const real = violations.filter(v => {
          if (v.field === 'end_time') return false;
          if (v.field === 'bid_amount') return false;
          return true;
        });
        expect(real).toEqual([]);
      });

      it('ad: optimize → contract', () => {
        const optimized = FieldOptimizationEngine.optimizeAdForDuplication(AD_FIXTURES.STANDARD);
        const fullPayload = { ...optimized.payload, adset_id: '12345' };
        const violations = validateAgainstContract(fullPayload, AD_CONTRACT);
        expect(violations).toEqual([]);
      });
    });
  }
});

// ─── Budget × Bid Strategy × Objective Combinatorial ───

describe('Budget × Bid × Objective Combinations', () => {
  const budgetModes = [
    { label: 'CBO', isCBO: true, adsetBudget: {} },
    { label: 'AdSet Daily', isCBO: false, adsetBudget: { daily_budget: '5000' } },
    { label: 'AdSet Lifetime', isCBO: false, adsetBudget: { lifetime_budget: '100000', end_time: '2025-12-31T00:00:00+0000' } },
  ];

  for (const objective of ALL_OBJECTIVES) {
    for (const budget of budgetModes) {
      for (const bidVar of BID_STRATEGY_VARIATIONS) {
        const label = `${objective} / ${budget.label} / ${bidVar.bid_strategy}`;

        it(label, () => {
          const adSetData = {
            name: label,
            optimization_goal: OBJECTIVE_DEFAULTS[objective].optimization_goal,
            billing_event: 'IMPRESSIONS',
            destination_type: OBJECTIVE_DEFAULTS[objective].destination_type,
            targeting: { geo_locations: { countries: ['TH'] } },
            ...budget.adsetBudget,
            ...bidVar,
            ...(PROMOTED_OBJECT_REQUIREMENTS[objective]?.length ? {
              promoted_object: { [PROMOTED_OBJECT_REQUIREMENTS[objective][0]]: '12345' },
            } : {}),
          };

          const result = FieldOptimizationEngine.optimizeAdSetForDuplication(
            adSetData, objective, budget.isCBO,
          );

          // Must not produce errors
          expect(result.errors).toHaveLength(0);

          // If CBO, budget fields must be stripped
          if (budget.isCBO) {
            expect(result.payload.daily_budget).toBeUndefined();
            expect(result.payload.lifetime_budget).toBeUndefined();
            expect(result.payload.bid_strategy).toBeUndefined();
          }

          // Optimization goal must be valid
          expect(VALID_OPTIMIZATION_GOALS[objective]).toContain(result.payload.optimization_goal);

          // Contract check
          const fullPayload = { ...result.payload, campaign_id: '12345' };
          const violations = validateAgainstContract(fullPayload, ADSET_CONTRACT, { objective });
          const real = violations.filter(v => !['end_time', 'bid_amount'].includes(v.field));
          expect(real).toEqual([]);
        });
      }
    }
  }
});

// ─── Override Application Pipeline ───

describe('Override Application', () => {
  it('applies valid override and revalidates', () => {
    const adSetData = ADSET_FIXTURES.OUTCOME_TRAFFIC;
    const optimized = FieldOptimizationEngine.optimizeAdSetForDuplication(adSetData, 'OUTCOME_TRAFFIC', false);

    const withOverride = FieldOptimizationEngine.applyOverrides(
      optimized,
      { optimization_goal: 'LANDING_PAGE_VIEWS' },
      'OUTCOME_TRAFFIC',
    );

    expect(withOverride.payload.optimization_goal).toBe('LANDING_PAGE_VIEWS');
    expect(withOverride.errors).toHaveLength(0);
  });

  it('detects invalid override', () => {
    const adSetData = ADSET_FIXTURES.OUTCOME_TRAFFIC;
    const optimized = FieldOptimizationEngine.optimizeAdSetForDuplication(adSetData, 'OUTCOME_TRAFFIC', false);

    const withOverride = FieldOptimizationEngine.applyOverrides(
      optimized,
      { optimization_goal: 'LEAD_GENERATION' }, // Invalid for TRAFFIC
      'OUTCOME_TRAFFIC',
    );

    expect(withOverride.errors.some(e => e.includes('LEAD_GENERATION'))).toBe(true);
  });

  it('detects conflicting budgets when both are present in payload', () => {
    // Directly test revalidation by manually constructing a result with both budgets
    const adSetData = { ...ADSET_FIXTURES.OUTCOME_TRAFFIC, daily_budget: '5000', lifetime_budget: '100000' };
    const optimized = FieldOptimizationEngine.optimizeAdSetForDuplication(adSetData, 'OUTCOME_TRAFFIC', false);

    // The optimization engine itself catches this during duplication
    expect(optimized.warnings.some(w => w.includes('budget'))).toBe(true);
    // And keeps only daily_budget
    expect(optimized.payload.daily_budget).toBeDefined();
    expect(optimized.payload.lifetime_budget).toBeUndefined();
  });
});

// ─── Validation Engine ───

describe('DraftValidationEngine', () => {
  it('validates a complete valid campaign payload', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'campaign',
      {
        name: 'Test Campaign',
        objective: 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        special_ad_categories: ['NONE'],
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        daily_budget: '5000',
      },
      'OUTCOME_TRAFFIC',
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('invalidates campaign missing name', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'campaign',
      { objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', special_ad_categories: ['NONE'] },
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('name') || e.includes('Name'))).toBe(true);
  });

  it('validates adset with valid optimization_goal', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'adSet',
      {
        name: 'Test AdSet',
        optimization_goal: 'LINK_CLICKS',
        billing_event: 'IMPRESSIONS',
        targeting: { geo_locations: { countries: ['TH'] } },
      },
      'OUTCOME_TRAFFIC',
    );
    expect(result.valid).toBe(true);
  });

  it('invalidates adset with wrong optimization_goal for objective', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'adSet',
      {
        name: 'Test AdSet',
        optimization_goal: 'LEAD_GENERATION',
        billing_event: 'IMPRESSIONS',
        targeting: { geo_locations: { countries: ['TH'] } },
      },
      'OUTCOME_TRAFFIC', // LEAD_GENERATION is not valid for TRAFFIC
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('LEAD_GENERATION'))).toBe(true);
  });

  it('warns on read-only fields', () => {
    const result = FieldOptimizationEngine.validatePayload(
      'campaign',
      {
        name: 'Test',
        objective: 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        special_ad_categories: ['NONE'],
        id: '12345', // read-only
        effective_status: 'ACTIVE', // read-only
      },
    );
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('read-only'))).toBe(true);
  });
});
