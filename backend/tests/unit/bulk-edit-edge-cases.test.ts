import { describe, it, expect } from 'vitest';
import { BulkEditCompatibilityEngine } from '../../src/services/draft/BulkEditCompatibilityEngine';

describe('BulkEditCompatibilityEngine edge cases', () => {
  it('computeFingerprint returns level-only for ad level', () => {
    const draft = {
      id: 'ad-1',
      data: { name: 'Ad', creative: { creative_id: '123' } },
    };
    const fingerprint = BulkEditCompatibilityEngine.computeFingerprint(draft, 'ad');
    expect(fingerprint.level).toBe('ad');
    expect(fingerprint.objective).toBe('');
  });

  it('areCompatible returns false for empty array', () => {
    const result = BulkEditCompatibilityEngine.areCompatible([]);
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('No entities');
  });

  it('areCompatible returns true for single entity', () => {
    const result = BulkEditCompatibilityEngine.areCompatible([
      { level: 'campaign', objective: 'OUTCOME_TRAFFIC' } as any,
    ]);
    expect(result.compatible).toBe(true);
  });

  it('areCompatible returns false for mixed levels', () => {
    const result = BulkEditCompatibilityEngine.areCompatible([
      { level: 'campaign', objective: 'OUTCOME_TRAFFIC' } as any,
      { level: 'adSet', objective: 'OUTCOME_TRAFFIC' } as any,
    ]);
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('different levels');
  });

  it('computeBulkSchema returns incompatible for empty array', () => {
    const result = BulkEditCompatibilityEngine.computeBulkSchema([], 'campaign');
    expect(result.compatible).toBe(false);
    expect(result.incompatibleReason).toContain('No entities');
  });

  it('computeBulkSchema with valid entities returns compatible', () => {
    const drafts = [
      { id: 'd1', objective: 'OUTCOME_TRAFFIC', data: { objective: 'OUTCOME_TRAFFIC' } },
      { id: 'd2', objective: 'OUTCOME_TRAFFIC', data: { objective: 'OUTCOME_TRAFFIC' } },
    ];
    const result = BulkEditCompatibilityEngine.computeBulkSchema(drafts, 'campaign');
    expect(result.compatible).toBe(true);
    expect(result.entityLevel).toBe('campaign');
  });

  it('validateBulkEdit validates destination_type against objective', () => {
    const drafts = [
      {
        id: 'd1',
        objective: 'OUTCOME_TRAFFIC',
        metaId: null,
        data: {
          name: 'AdSet',
          optimization_goal: 'LINK_CLICKS',
          billing_event: 'IMPRESSIONS',
          destination_type: 'WEBSITE',
          targeting: {},
        },
      },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { destination_type: 'INVALID_DEST' },
      'adSet'
    );
    expect(result.valid).toBe(false);
  });

  it('validateBulkEdit validates optimization_goal', () => {
    const drafts = [
      {
        id: 'd1',
        objective: 'OUTCOME_TRAFFIC',
        data: {
          name: 'AdSet',
          optimization_goal: 'LINK_CLICKS',
          billing_event: 'IMPRESSIONS',
          destination_type: 'WEBSITE',
          targeting: {},
        },
      },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { optimization_goal: 'APP_INSTALLS' },
      'adSet'
    );
    expect(result.valid).toBe(false);
  });

  it('validateBulkEdit detects budget conflict', () => {
    const drafts = [
      {
        id: 'd1',
        objective: 'OUTCOME_TRAFFIC',
        data: {
          name: 'AdSet',
          optimization_goal: 'LINK_CLICKS',
          billing_event: 'IMPRESSIONS',
          daily_budget: '5000',
          targeting: {},
        },
      },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { lifetime_budget: '50000' },
      'adSet'
    );
    expect(result.valid).toBe(false);
  });

  it('computeBulkSchema handles adset level with mixed objectives', () => {
    const drafts = [
      {
        id: 'd1',
        campaignObjective: 'OUTCOME_TRAFFIC',
        isCBO: false,
        data: {
          name: 'AdSet 1',
          optimization_goal: 'LINK_CLICKS',
          billing_event: 'IMPRESSIONS',
          destination_type: 'WEBSITE',
          targeting: {},
        },
      },
      {
        id: 'd2',
        campaignObjective: 'OUTCOME_SALES',
        isCBO: false,
        data: {
          name: 'AdSet 2',
          optimization_goal: 'OFFSITE_CONVERSIONS',
          billing_event: 'IMPRESSIONS',
          destination_type: 'WEBSITE',
          targeting: {},
        },
      },
    ];
    const result = BulkEditCompatibilityEngine.computeBulkSchema(drafts, 'adSet');
    expect(result.compatible).toBe(true);
    // Objective-dependent fields should be locked
    const lockedFields = result.fields.filter(f => f.locked);
    expect(lockedFields.length).toBeGreaterThan(0);
  });

  it('validateBulkEdit handles draft with null data', () => {
    const drafts = [
      {
        id: 'd1',
        objective: 'OUTCOME_TRAFFIC',
        data: null,
      },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { name: 'Updated' },
      'campaign'
    );
    expect(result.valid).toBe(true);
  });

  it('validateBulkEdit at campaign level skips adSet-specific validation', () => {
    const drafts = [
      {
        id: 'd1',
        objective: 'OUTCOME_TRAFFIC',
        data: { optimization_goal: 'INVALID_GOAL', destination_type: 'INVALID_DEST' },
      },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { name: 'Updated' },
      'campaign'
    );
    expect(result.valid).toBe(true);
  });

  it('validateBulkEdit detects clearing a required field', () => {
    const drafts = [
      {
        id: 'd1',
        objective: 'OUTCOME_TRAFFIC',
        data: { name: 'AdSet', billing_event: 'IMPRESSIONS' },
      },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { billing_event: '' },
      'adSet'
    );
    expect(result.valid).toBe(false);
    expect(result.perEntityErrors['d1']).toBeDefined();
  });

  it('applyBulkEdit handles draft with null data', () => {
    const drafts = [{ id: 'd1', data: null }];
    const results = BulkEditCompatibilityEngine.applyBulkEdit(
      drafts,
      { name: 'New Name' },
      'campaign'
    );
    expect(results[0].updatedData).toEqual({ name: 'New Name' });
  });

  it('applyBulkEdit sets objective field separately', () => {
    const drafts = [{ id: 'd1', data: { name: 'Camp' } }];
    const results = BulkEditCompatibilityEngine.applyBulkEdit(
      drafts,
      { objective: 'OUTCOME_SALES' },
      'campaign'
    );
    expect(results[0].objective).toBe('OUTCOME_SALES');
    expect(results[0].updatedData).not.toHaveProperty('objective');
  });

  it('applyBulkEdit deletes field when value is empty string', () => {
    const drafts = [{ id: 'd1', data: { name: 'Camp', bid_strategy: 'COST_CAP' } }];
    const results = BulkEditCompatibilityEngine.applyBulkEdit(
      drafts,
      { bid_strategy: '' },
      'campaign'
    );
    expect(results[0].updatedData).not.toHaveProperty('bid_strategy');
  });

  it('applyBulkEdit deletes field when value is null', () => {
    const drafts = [{ id: 'd1', data: { name: 'Camp', bid_amount: '500' } }];
    const results = BulkEditCompatibilityEngine.applyBulkEdit(
      drafts,
      { bid_amount: null },
      'campaign'
    );
    expect(results[0].updatedData).not.toHaveProperty('bid_amount');
  });

  it('applyBulkEdit removes lifetime_budget when daily_budget set', () => {
    const drafts = [{ id: 'd1', data: { lifetime_budget: '50000' } }];
    const results = BulkEditCompatibilityEngine.applyBulkEdit(
      drafts,
      { daily_budget: '3000' },
      'adSet'
    );
    expect(results[0].updatedData).toHaveProperty('daily_budget', '3000');
    expect(results[0].updatedData).not.toHaveProperty('lifetime_budget');
  });

  it('applyBulkEdit removes daily_budget when lifetime_budget set', () => {
    const drafts = [{ id: 'd1', data: { daily_budget: '3000' } }];
    const results = BulkEditCompatibilityEngine.applyBulkEdit(
      drafts,
      { lifetime_budget: '50000' },
      'adSet'
    );
    expect(results[0].updatedData).toHaveProperty('lifetime_budget', '50000');
    expect(results[0].updatedData).not.toHaveProperty('daily_budget');
  });

  it('validateBulkEdit at ad level uses ad immutable fields', () => {
    const drafts = [
      {
        id: 'd1',
        objective: 'OUTCOME_TRAFFIC',
        metaId: 'meta_ad_1',
        data: { creative: { creative_id: '123' } },
      },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { name: 'Updated Ad' },
      'ad'
    );
    expect(result.valid).toBe(true);
  });

  it('validateBulkEdit on published adSet with immutable field edit', () => {
    const drafts = [
      {
        id: 'd1',
        objective: 'OUTCOME_TRAFFIC',
        metaId: 'meta_adset_1',
        data: { billing_event: 'IMPRESSIONS', optimization_goal: 'LINK_CLICKS' },
      },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { destination_type: 'WEBSITE' },
      'adSet'
    );
    expect(result.valid).toBe(false);
    expect(result.perEntityErrors['d1']).toBeDefined();
    expect(result.perEntityErrors['d1'][0].message).toContain('immutable');
  });

  it('validateBulkEdit on published draft with non-immutable field is valid', () => {
    const drafts = [
      {
        id: 'd1',
        objective: 'OUTCOME_TRAFFIC',
        metaId: 'meta_camp_1',
        data: { name: 'Campaign', objective: 'OUTCOME_TRAFFIC' },
      },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { name: 'New Name' },
      'campaign'
    );
    expect(result.valid).toBe(true);
  });

  it('validateBulkEdit with valid optimization_goal passes adSet validation', () => {
    const drafts = [
      {
        id: 'd1',
        objective: 'OUTCOME_TRAFFIC',
        data: { billing_event: 'IMPRESSIONS' },
      },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { optimization_goal: 'LINK_CLICKS' },
      'adSet'
    );
    expect(result.valid).toBe(true);
  });

  it('validateBulkEdit with valid destination_type passes adSet validation', () => {
    const drafts = [
      {
        id: 'd1',
        objective: 'OUTCOME_TRAFFIC',
        data: { billing_event: 'IMPRESSIONS' },
      },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { destination_type: 'WEBSITE' },
      'adSet'
    );
    expect(result.valid).toBe(true);
  });

  it('validateBulkEdit global warning for cap strategy without bid_amount', () => {
    const drafts = [
      { id: 'd1', objective: 'OUTCOME_TRAFFIC', data: {} },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { bid_strategy: 'COST_CAP' },
      'adSet'
    );
    expect(result.globalWarnings.length).toBeGreaterThan(0);
    expect(result.globalWarnings[0]).toContain('bid_amount');
  });

  it('validateBulkEdit global error for both daily and lifetime budget', () => {
    const drafts = [
      { id: 'd1', objective: 'OUTCOME_TRAFFIC', data: {} },
    ];
    const result = BulkEditCompatibilityEngine.validateBulkEdit(
      drafts,
      { daily_budget: '3000', lifetime_budget: '50000' },
      'campaign'
    );
    expect(result.valid).toBe(false);
    expect(result.globalErrors[0]).toContain('Cannot set both');
  });

  it('computeBulkSchema handles campaign level with published drafts', () => {
    const drafts = [
      {
        id: 'd1',
        objective: 'OUTCOME_TRAFFIC',
        metaId: 'meta_123',
        data: {
          name: 'Campaign 1',
          objective: 'OUTCOME_TRAFFIC',
          buying_type: 'AUCTION',
          status: 'PAUSED',
        },
      },
    ];
    const result = BulkEditCompatibilityEngine.computeBulkSchema(drafts, 'campaign');
    expect(result.compatible).toBe(true);
    // Immutable fields should have warnings
    const immutableField = result.fields.find(f => f.key === 'buying_type');
    if (immutableField) {
      expect(immutableField.locked).toBe(true);
    }
  });
});
