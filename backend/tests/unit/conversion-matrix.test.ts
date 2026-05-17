import { describe, it, expect } from 'vitest';
import { FieldOptimizationEngine } from '../../src/services/draft/FieldOptimizationEngine';
import { VALID_OPTIMIZATION_GOALS, VALID_DESTINATION_TYPES, OBJECTIVE_DEFAULTS, PROMOTED_OBJECT_REQUIREMENTS } from '../../src/services/draft/MetaFieldRegistry';
import { ObjectiveConversionService } from '../../src/services/objectiveConversion.service';
import { CAMPAIGN_FIXTURES, ADSET_FIXTURES } from '../fixtures/meta-entities';

const ALL_OBJECTIVES = Object.keys(VALID_OPTIMIZATION_GOALS);

// ─── Full N×N Objective Conversion Matrix ───
// 6 objectives × 5 targets = 30 conversion test cases (auto-generated)

describe('Campaign Conversion Matrix (N×N)', () => {
  for (const source of ALL_OBJECTIVES) {
    for (const target of ALL_OBJECTIVES) {
      if (source === target) continue;

      it(`${source} → ${target}`, () => {
        const campaignData = CAMPAIGN_FIXTURES[source] || {
          name: `Test ${source}`,
          objective: source,
          status: 'ACTIVE',
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
          daily_budget: '5000',
          special_ad_categories: ['NONE'],
        };

        const result = FieldOptimizationEngine.optimizeCampaignForConversion(
          campaignData, target, `${source} → ${target}`,
        );

        // MUST produce a valid objective
        expect(result.payload.objective).toBe(target);
        // MUST NOT have errors
        expect(result.errors).toHaveLength(0);
        // MUST have a name
        expect(result.payload.name).toBeDefined();
        // MUST always be PAUSED
        expect(result.payload.status).toBe('PAUSED');
      });
    }
  }
});

// ─── Ad Set Conversion Matrix ───

describe('Ad Set Conversion Matrix (N×N)', () => {
  for (const source of ALL_OBJECTIVES) {
    for (const target of ALL_OBJECTIVES) {
      if (source === target) continue;

      describe(`${source} → ${target}`, () => {
        it('produces valid optimization_goal for target', () => {
          const adSetData = ADSET_FIXTURES[source] || {
            name: `AdSet ${source}`,
            optimization_goal: OBJECTIVE_DEFAULTS[source].optimization_goal,
            billing_event: 'IMPRESSIONS',
            destination_type: OBJECTIVE_DEFAULTS[source].destination_type,
            targeting: { geo_locations: { countries: ['TH'] } },
          };

          const result = FieldOptimizationEngine.optimizeAdSetForConversion(
            adSetData, target, false, adSetData.promoted_object?.page_id,
          );

          const validGoals = VALID_OPTIMIZATION_GOALS[target];
          expect(validGoals).toContain(result.payload.optimization_goal);
        });

        it('produces valid destination_type for target', () => {
          const adSetData = ADSET_FIXTURES[source] || {
            name: `AdSet ${source}`,
            optimization_goal: OBJECTIVE_DEFAULTS[source].optimization_goal,
            billing_event: 'IMPRESSIONS',
            destination_type: OBJECTIVE_DEFAULTS[source].destination_type,
            targeting: { geo_locations: { countries: ['TH'] } },
          };

          const result = FieldOptimizationEngine.optimizeAdSetForConversion(
            adSetData, target, false,
          );

          const validDests = VALID_DESTINATION_TYPES[target];
          expect(validDests).toContain(result.payload.destination_type);
        });

        it('preserves targeting', () => {
          const adSetData = ADSET_FIXTURES[source] || {
            name: `AdSet ${source}`,
            optimization_goal: OBJECTIVE_DEFAULTS[source].optimization_goal,
            billing_event: 'IMPRESSIONS',
            targeting: { geo_locations: { countries: ['TH'] } },
          };

          const result = FieldOptimizationEngine.optimizeAdSetForConversion(
            adSetData, target, false,
          );

          expect(result.payload.targeting).toBeDefined();
          expect(result.payload.targeting.geo_locations).toBeDefined();
        });

        it('CBO mode strips budgets', () => {
          const adSetData = {
            ...(ADSET_FIXTURES[source] || {
              name: `AdSet ${source}`,
              optimization_goal: OBJECTIVE_DEFAULTS[source].optimization_goal,
              billing_event: 'IMPRESSIONS',
              targeting: { geo_locations: { countries: ['TH'] } },
            }),
            daily_budget: '5000',
            bid_strategy: 'COST_CAP',
            bid_amount: '2000',
          };

          const result = FieldOptimizationEngine.optimizeAdSetForConversion(
            adSetData, target, true,
          );

          expect(result.payload.daily_budget).toBeUndefined();
          expect(result.payload.lifetime_budget).toBeUndefined();
          expect(result.payload.bid_strategy).toBeUndefined();
          expect(result.payload.bid_amount).toBeUndefined();
        });
      });
    }
  }
});

// ─── Promoted Object Inheritance During Conversion ───

describe('Promoted Object Behavior During Conversion', () => {
  it('OUTCOME_LEADS gets page_id from source', () => {
    const adSetData = {
      ...ADSET_FIXTURES.OUTCOME_TRAFFIC,
      promoted_object: { page_id: '999999' },
    };
    const result = FieldOptimizationEngine.optimizeAdSetForConversion(
      adSetData, 'OUTCOME_LEADS', false, '999999',
    );
    expect(result.payload.promoted_object).toEqual({ page_id: '999999' });
  });

  it('OUTCOME_ENGAGEMENT inherits page_id', () => {
    const adSetData = {
      ...ADSET_FIXTURES.OUTCOME_TRAFFIC,
      promoted_object: { page_id: '888888' },
    };
    const result = FieldOptimizationEngine.optimizeAdSetForConversion(
      adSetData, 'OUTCOME_ENGAGEMENT', false, '888888',
    );
    expect(result.payload.promoted_object).toEqual({ page_id: '888888' });
  });
});

// ─── Edge Cases ───

describe('Conversion Edge Cases', () => {
  it('handles empty source data gracefully', () => {
    const result = FieldOptimizationEngine.optimizeCampaignForConversion(
      { name: 'empty', objective: 'OUTCOME_TRAFFIC' },
      'OUTCOME_SALES',
      'Empty → Sales',
    );
    expect(result.payload.objective).toBe('OUTCOME_SALES');
    expect(result.errors).toHaveLength(0);
  });

  it('handles missing optimization_goal in source', () => {
    const result = FieldOptimizationEngine.optimizeAdSetForConversion(
      { name: 'test', billing_event: 'IMPRESSIONS', targeting: { geo_locations: { countries: ['TH'] } } },
      'OUTCOME_TRAFFIC',
      false,
    );
    const validGoals = VALID_OPTIMIZATION_GOALS['OUTCOME_TRAFFIC'];
    expect(validGoals).toContain(result.payload.optimization_goal);
  });

  it('handles conversion from deprecated/unknown optimization_goal', () => {
    const result = FieldOptimizationEngine.optimizeAdSetForConversion(
      { name: 'test', optimization_goal: 'SOME_DEPRECATED_GOAL', billing_event: 'IMPRESSIONS', targeting: { geo_locations: { countries: ['TH'] } } },
      'OUTCOME_LEADS',
      false,
    );
    const validGoals = VALID_OPTIMIZATION_GOALS['OUTCOME_LEADS'];
    expect(validGoals).toContain(result.payload.optimization_goal);
  });
});

describe('ObjectiveConversionService.transformAd', () => {
  const service = new ObjectiveConversionService({} as any);

  it('uses creative.id when present', () => {
    const result = service.transformAd(
      { creative: { id: 'cr-123' } },
      'OUTCOME_TRAFFIC', 'Ad Name', 'adset-1'
    );
    expect(result.creative).toEqual({ creative_id: 'cr-123' });
  });

  it('uses creative.creative_id as fallback', () => {
    const result = service.transformAd(
      { creative: { creative_id: 'cr-456' } },
      'OUTCOME_TRAFFIC', 'Ad Name', 'adset-1'
    );
    expect(result.creative).toEqual({ creative_id: 'cr-456' });
  });

  it('omits creative field when no valid creative found', () => {
    const result = service.transformAd(
      { creative: {} },
      'OUTCOME_TRAFFIC', 'Ad Name', 'adset-1'
    );
    expect(result.creative).toBeUndefined();
  });

  it('omits creative field when data has no creative', () => {
    const result = service.transformAd(
      {},
      'OUTCOME_TRAFFIC', 'Ad Name', 'adset-1'
    );
    expect(result.creative).toBeUndefined();
  });

  it('includes tracking_specs when present', () => {
    const result = service.transformAd(
      { creative: { id: 'cr-1' }, tracking_specs: [{ action: 'offsite_conversion' }] },
      'OUTCOME_SALES', 'Ad Name', 'adset-1'
    );
    expect(result.tracking_specs).toEqual([{ action: 'offsite_conversion' }]);
  });
});
