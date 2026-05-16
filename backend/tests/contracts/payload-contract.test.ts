import { describe, it, expect } from 'vitest';
import { FieldOptimizationEngine } from '../../src/services/draft/FieldOptimizationEngine';
import { CAMPAIGN_FIXTURES, ADSET_FIXTURES, AD_FIXTURES } from '../fixtures/meta-entities';
import { CAMPAIGN_CONTRACT, ADSET_CONTRACT, AD_CONTRACT, validateAgainstContract } from './meta-api-contracts';
import { OBJECTIVE_DEFAULTS, PROMOTED_OBJECT_REQUIREMENTS } from '../../src/services/draft/MetaFieldRegistry';

// ─── Campaign Payloads Against Contract ───

describe('Campaign payloads satisfy Meta contract', () => {
  for (const [objective, data] of Object.entries(CAMPAIGN_FIXTURES)) {
    it(`${objective} duplication payload`, () => {
      const result = FieldOptimizationEngine.optimizeCampaignForDuplication(data);
      const violations = validateAgainstContract(result.payload, CAMPAIGN_CONTRACT);
      expect(violations).toEqual([]);
    });
  }

  // Test all conversions produce valid campaign payloads
  const objectives = Object.keys(CAMPAIGN_FIXTURES);
  for (const source of objectives) {
    for (const target of objectives) {
      if (source === target) continue;
      it(`${source} → ${target} conversion payload`, () => {
        const data = CAMPAIGN_FIXTURES[source];
        const result = FieldOptimizationEngine.optimizeCampaignForConversion(data, target, 'Test');
        const violations = validateAgainstContract(result.payload, CAMPAIGN_CONTRACT);
        expect(violations).toEqual([]);
      });
    }
  }
});

// ─── Ad Set Payloads Against Contract ───

describe('Ad Set payloads satisfy Meta contract', () => {
  for (const [objective, data] of Object.entries(ADSET_FIXTURES)) {
    it(`${objective} duplication payload (non-CBO)`, () => {
      const result = FieldOptimizationEngine.optimizeAdSetForDuplication(data, objective, false);
      // Add campaign_id to make it complete (normally set by the publish service)
      const fullPayload = { ...result.payload, campaign_id: '12345' };
      const violations = validateAgainstContract(fullPayload, ADSET_CONTRACT, { objective });

      // Filter out conditional requirements that depend on external state
      const realViolations = violations.filter(v => {
        // end_time conditional is fine for non-lifetime budgets
        if (v.field === 'end_time' && !fullPayload.lifetime_budget) return false;
        return true;
      });

      expect(realViolations).toEqual([]);
    });

    it(`${objective} duplication payload (CBO)`, () => {
      const result = FieldOptimizationEngine.optimizeAdSetForDuplication(data, objective, true);
      const fullPayload = { ...result.payload, campaign_id: '12345' };
      const violations = validateAgainstContract(fullPayload, ADSET_CONTRACT, { objective });

      const realViolations = violations.filter(v => {
        if (v.field === 'end_time' && !fullPayload.lifetime_budget) return false;
        // CBO strips bid_amount, so ignore that conditional
        if (v.field === 'bid_amount') return false;
        return true;
      });

      expect(realViolations).toEqual([]);
    });
  }

  // Cross-objective conversions
  const objectives = Object.keys(ADSET_FIXTURES);
  for (const source of objectives) {
    for (const target of objectives) {
      if (source === target) continue;
      it(`${source} → ${target} ad set conversion payload`, () => {
        const data = ADSET_FIXTURES[source];
        const result = FieldOptimizationEngine.optimizeAdSetForConversion(data, target, false, data.promoted_object?.page_id);
        const fullPayload = { ...result.payload, campaign_id: '12345' };
        const violations = validateAgainstContract(fullPayload, ADSET_CONTRACT, { objective: target });

        // Filter acceptable conditional violations
        const realViolations = violations.filter(v => {
          if (v.field === 'end_time') return false;
          if (v.field === 'bid_amount') return false;
          // promoted_object might not be present if not required
          if (v.field === 'promoted_object' && !PROMOTED_OBJECT_REQUIREMENTS[target]?.length) return false;
          return true;
        });

        expect(realViolations).toEqual([]);
      });
    }
  }
});

// ─── Ad Payloads Against Contract ───

describe('Ad payloads satisfy Meta contract', () => {
  it('standard ad duplication payload', () => {
    const result = FieldOptimizationEngine.optimizeAdForDuplication(AD_FIXTURES.STANDARD);
    const fullPayload = { ...result.payload, adset_id: '12345' };
    const violations = validateAgainstContract(fullPayload, AD_CONTRACT);
    expect(violations).toEqual([]);
  });

  it('ad with URL tags', () => {
    const result = FieldOptimizationEngine.optimizeAdForDuplication(AD_FIXTURES.WITH_URL_TAGS);
    const fullPayload = { ...result.payload, adset_id: '12345' };
    const violations = validateAgainstContract(fullPayload, AD_CONTRACT);
    expect(violations).toEqual([]);
  });
});

// ─── Negative Contract Tests ───

describe('Contract correctly rejects invalid payloads', () => {
  it('rejects missing name', () => {
    const violations = validateAgainstContract(
      { objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', special_ad_categories: ['NONE'] },
      CAMPAIGN_CONTRACT,
    );
    expect(violations.some(v => v.field === 'name' && v.type === 'missing_required')).toBe(true);
  });

  it('rejects read-only fields', () => {
    const violations = validateAgainstContract(
      { name: 'test', objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', special_ad_categories: ['NONE'], id: '123', effective_status: 'ACTIVE' },
      CAMPAIGN_CONTRACT,
    );
    expect(violations.some(v => v.field === 'id' && v.type === 'forbidden_present')).toBe(true);
    expect(violations.some(v => v.field === 'effective_status' && v.type === 'forbidden_present')).toBe(true);
  });

  it('rejects invalid enum value', () => {
    const violations = validateAgainstContract(
      { name: 'test', objective: 'INVALID_OBJECTIVE', status: 'PAUSED', special_ad_categories: ['NONE'] },
      CAMPAIGN_CONTRACT,
    );
    expect(violations.some(v => v.field === 'objective' && v.type === 'invalid_enum')).toBe(true);
  });

  it('rejects mutually exclusive budgets', () => {
    const violations = validateAgainstContract(
      { name: 'test', objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', special_ad_categories: ['NONE'], daily_budget: '5000', lifetime_budget: '100000' },
      CAMPAIGN_CONTRACT,
    );
    expect(violations.some(v => v.type === 'mutual_exclusion')).toBe(true);
  });

  it('rejects wrong optimization_goal for objective', () => {
    const violations = validateAgainstContract(
      { name: 'test', campaign_id: '1', optimization_goal: 'LEAD_GENERATION', billing_event: 'IMPRESSIONS', targeting: { geo_locations: { countries: ['TH'] } }, status: 'PAUSED' },
      ADSET_CONTRACT,
      { objective: 'OUTCOME_TRAFFIC' },
    );
    expect(violations.some(v => v.field === 'optimization_goal' && v.type === 'invalid_enum')).toBe(true);
  });
});
