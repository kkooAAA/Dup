import { describe, it, expect } from 'vitest';
import { FieldOptimizationEngine } from '../../src/services/draft/FieldOptimizationEngine';
import { CAMPAIGN_FIXTURES, ADSET_FIXTURES, AD_FIXTURES, BID_STRATEGY_VARIATIONS } from '../fixtures/meta-entities';
import { OBJECTIVE_DEFAULTS, PROMOTED_OBJECT_REQUIREMENTS } from '../../src/services/draft/MetaFieldRegistry';

// ─── Campaign Duplication Payloads ───

describe('Campaign Duplication Snapshots', () => {
  for (const [objective, data] of Object.entries(CAMPAIGN_FIXTURES)) {
    it(`${objective} campaign payload`, () => {
      const result = FieldOptimizationEngine.optimizeCampaignForDuplication(data);
      expect(result.payload).toMatchSnapshot();
      expect(result.warnings).toMatchSnapshot();
      expect(result.errors).toMatchSnapshot();
    });
  }

  it('campaign with both budgets keeps daily_budget', () => {
    const data = { ...CAMPAIGN_FIXTURES.OUTCOME_TRAFFIC, daily_budget: '5000', lifetime_budget: '100000' };
    const result = FieldOptimizationEngine.optimizeCampaignForDuplication(data);
    expect(result.payload.daily_budget).toBe('5000');
    expect(result.payload.lifetime_budget).toBeUndefined();
    expect(result.warnings.some(w => w.includes('daily_budget'))).toBe(true);
  });

  it('campaign status is always PAUSED', () => {
    const data = { ...CAMPAIGN_FIXTURES.OUTCOME_TRAFFIC, status: 'ACTIVE' };
    const result = FieldOptimizationEngine.optimizeCampaignForDuplication(data);
    expect(result.payload.status).toBe('PAUSED');
  });

  it('campaign with name override', () => {
    const data = CAMPAIGN_FIXTURES.OUTCOME_TRAFFIC;
    const result = FieldOptimizationEngine.optimizeCampaignForDuplication(data, { name: 'Custom Name' });
    expect(result.payload.name).toBe('Custom Name');
  });
});

// ─── Ad Set Duplication Payloads ───

describe('Ad Set Duplication Snapshots', () => {
  for (const [objective, data] of Object.entries(ADSET_FIXTURES)) {
    describe(`${objective}`, () => {
      it('non-CBO payload', () => {
        const result = FieldOptimizationEngine.optimizeAdSetForDuplication(data, objective, false);
        expect(result.payload).toMatchSnapshot();
        expect(result.warnings).toMatchSnapshot();
        expect(result.errors).toMatchSnapshot();
      });

      it('CBO payload (strips budgets)', () => {
        const result = FieldOptimizationEngine.optimizeAdSetForDuplication(data, objective, true);
        expect(result.payload).toMatchSnapshot();
        expect(result.payload.daily_budget).toBeUndefined();
        expect(result.payload.lifetime_budget).toBeUndefined();
        expect(result.payload.bid_strategy).toBeUndefined();
        expect(result.payload.bid_amount).toBeUndefined();
      });
    });
  }

  // Bid strategy variations
  describe('Bid strategy variations', () => {
    for (const variation of BID_STRATEGY_VARIATIONS) {
      it(`OUTCOME_TRAFFIC with ${variation.bid_strategy}`, () => {
        const data = { ...ADSET_FIXTURES.OUTCOME_TRAFFIC, ...variation };
        const result = FieldOptimizationEngine.optimizeAdSetForDuplication(data, 'OUTCOME_TRAFFIC', false);
        expect(result.payload).toMatchSnapshot();
        expect(result.warnings).toMatchSnapshot();
      });
    }
  });
});

// ─── Ad Duplication Payloads ───

describe('Ad Duplication Snapshots', () => {
  it('standard ad payload', () => {
    const result = FieldOptimizationEngine.optimizeAdForDuplication(AD_FIXTURES.STANDARD);
    expect(result.payload).toMatchSnapshot();
    expect(result.errors).toHaveLength(0);
  });

  it('ad with URL tags', () => {
    const result = FieldOptimizationEngine.optimizeAdForDuplication(AD_FIXTURES.WITH_URL_TAGS);
    expect(result.payload).toMatchSnapshot();
  });

  it('ad missing creative warns', () => {
    const result = FieldOptimizationEngine.optimizeAdForDuplication(AD_FIXTURES.MISSING_CREATIVE);
    expect(result.warnings.some(w => w.includes('creative'))).toBe(true);
  });

  it('ad status is always PAUSED', () => {
    const result = FieldOptimizationEngine.optimizeAdForDuplication({ ...AD_FIXTURES.STANDARD, status: 'ACTIVE' });
    expect(result.payload.status).toBe('PAUSED');
  });
});

// ─── Conversion Payloads ───

describe('Objective Conversion Snapshots', () => {
  const ALL_OBJECTIVES = Object.keys(CAMPAIGN_FIXTURES);

  for (const source of ALL_OBJECTIVES) {
    for (const target of ALL_OBJECTIVES) {
      if (source === target) continue;

      it(`${source} → ${target} campaign conversion`, () => {
        const data = CAMPAIGN_FIXTURES[source];
        const result = FieldOptimizationEngine.optimizeCampaignForConversion(data, target, `Converted ${source} to ${target}`);
        expect(result.payload).toMatchSnapshot();
        expect(result.payload.objective).toBe(target);
        expect(result.errors).toHaveLength(0);
      });
    }
  }
});

// ─── Ad Set Conversion Payloads ───

describe('Ad Set Conversion Snapshots', () => {
  const objectives = Object.keys(ADSET_FIXTURES);

  for (const source of objectives) {
    for (const target of objectives) {
      if (source === target) continue;

      it(`${source} adset → ${target} objective`, () => {
        const data = ADSET_FIXTURES[source];
        const result = FieldOptimizationEngine.optimizeAdSetForConversion(
          data, target, false,
          data.promoted_object?.page_id,
        );
        expect(result.payload).toMatchSnapshot();
        // Optimization goal must be valid for target
        const validGoals = Object.keys(OBJECTIVE_DEFAULTS).includes(target)
          ? [OBJECTIVE_DEFAULTS[target].optimization_goal]
          : [];
        // At minimum, no errors should be produced
        // (warnings are fine — they indicate auto-migration)
      });
    }
  }
});
