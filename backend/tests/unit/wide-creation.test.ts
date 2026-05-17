import { describe, it, expect } from 'vitest';
import {
  WideCreationService,
  WideCreationTemplate,
  WideCampaignNode,
  WideAdSetNode,
} from '../../src/services/draft/WideCreationService';
import {
  VALID_OPTIMIZATION_GOALS,
  VALID_DESTINATION_TYPES,
  OBJECTIVE_DEFAULTS,
  PROMOTED_OBJECT_REQUIREMENTS,
} from '../../src/services/draft/MetaFieldRegistry';

const ALL_OBJECTIVES = Object.keys(VALID_OPTIMIZATION_GOALS);
const AD_DEFAULTS = { ad: { creative: { creative_id: '99999' } } };

// ─── Template Validation ───

describe('WideCreationService.validateTemplate', () => {

  it('accepts a minimal valid template', () => {
    const template: WideCreationTemplate = {
      name: 'Test Template',
      adAccountId: 'act_123456',
      defaults: AD_DEFAULTS,
      campaigns: [{
        fields: { objective: 'OUTCOME_TRAFFIC', name: 'Campaign 1' },
        adSetCount: 1,
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects empty campaigns array', () => {
    const template: WideCreationTemplate = {
      name: 'Empty',
      adAccountId: 'act_123456',
      campaigns: [],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('At least one campaign'))).toBe(true);
  });

  it('rejects missing adAccountId', () => {
    const template: WideCreationTemplate = {
      name: 'No Account',
      adAccountId: '',
      campaigns: [{
        fields: { objective: 'OUTCOME_TRAFFIC', name: 'C1' },
        adSetCount: 1,
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('adAccountId'))).toBe(true);
  });

  it('rejects missing objective', () => {
    const template: WideCreationTemplate = {
      name: 'No Obj',
      adAccountId: 'act_123',
      campaigns: [{
        fields: { name: 'Campaign' },
        adSetCount: 1,
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'objective')).toBe(true);
  });

  it('rejects invalid objective', () => {
    const template: WideCreationTemplate = {
      name: 'Bad Obj',
      adAccountId: 'act_123',
      campaigns: [{
        fields: { objective: 'INVALID_OBJECTIVE', name: 'C' },
        adSetCount: 1,
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('Invalid objective'))).toBe(true);
  });

  it('rejects campaign without name or naming pattern', () => {
    const template: WideCreationTemplate = {
      name: 'No Name',
      adAccountId: 'act_123',
      campaigns: [{
        fields: { objective: 'OUTCOME_TRAFFIC' },
        adSetCount: 1,
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'name')).toBe(true);
  });

  it('accepts naming pattern instead of explicit name', () => {
    const template: WideCreationTemplate = {
      name: 'Pattern',
      adAccountId: 'act_123',
      defaults: AD_DEFAULTS,
      namingPattern: { campaign: '{objective}_{index:02d}' },
      campaigns: [{
        fields: { objective: 'OUTCOME_TRAFFIC' },
        adSetCount: 1,
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(true);
  });

  // Per-objective validation
  for (const objective of ALL_OBJECTIVES) {
    it(`validates ${objective} campaign correctly`, () => {
      const template: WideCreationTemplate = {
        name: `${objective} test`,
        adAccountId: 'act_123',
        defaults: AD_DEFAULTS,
        campaigns: [{
          fields: { objective, name: `${objective} Campaign` },
          adSetCount: 1,
          adSets: [{
            fields: {
              optimization_goal: OBJECTIVE_DEFAULTS[objective].optimization_goal,
              destination_type: OBJECTIVE_DEFAULTS[objective].destination_type,
              ...(PROMOTED_OBJECT_REQUIREMENTS[objective]?.length
                ? { promoted_object: { [PROMOTED_OBJECT_REQUIREMENTS[objective][0]]: '12345' } }
                : {}),
            },
            adCount: 1,
          }],
        }],
      };
      const result = WideCreationService.validateTemplate(template);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  }

  it('warns when dual budgets are set on campaign', () => {
    const template: WideCreationTemplate = {
      name: 'Dual Budget',
      adAccountId: 'act_123',
      campaigns: [{
        fields: {
          objective: 'OUTCOME_TRAFFIC',
          name: 'C1',
          daily_budget: '5000',
          lifetime_budget: '100000',
        },
        adSetCount: 1,
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.warnings.some(w => w.message.includes('daily_budget'))).toBe(true);
  });

  it('warns when CBO campaign has adset budgets', () => {
    const template: WideCreationTemplate = {
      name: 'CBO Conflict',
      adAccountId: 'act_123',
      campaigns: [{
        fields: {
          objective: 'OUTCOME_TRAFFIC',
          name: 'CBO Campaign',
          daily_budget: '5000',
        },
        adSetCount: 0,
        adSets: [{
          fields: { daily_budget: '2000' },
          adCount: 1,
        }],
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.warnings.some(w => w.message.includes('CBO'))).toBe(true);
  });

  it('detects invalid optimization_goal for objective', () => {
    const template: WideCreationTemplate = {
      name: 'Bad Goal',
      adAccountId: 'act_123',
      campaigns: [{
        fields: { objective: 'OUTCOME_TRAFFIC', name: 'C' },
        adSetCount: 0,
        adSets: [{
          fields: { optimization_goal: 'LEAD_GENERATION' },
          adCount: 1,
        }],
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('LEAD_GENERATION'))).toBe(true);
  });

  it('detects invalid destination_type for objective', () => {
    const template: WideCreationTemplate = {
      name: 'Bad Dest',
      adAccountId: 'act_123',
      campaigns: [{
        fields: { objective: 'OUTCOME_AWARENESS', name: 'C' },
        adSetCount: 0,
        adSets: [{
          fields: { destination_type: 'WEBSITE' },
          adCount: 1,
        }],
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('WEBSITE'))).toBe(true);
  });

  it('warns about missing promoted_object for objectives that require it', () => {
    for (const objective of ALL_OBJECTIVES) {
      const reqs = PROMOTED_OBJECT_REQUIREMENTS[objective] || [];
      if (reqs.length === 0) continue;

      const template: WideCreationTemplate = {
        name: 'Missing promoted',
        adAccountId: 'act_123',
        campaigns: [{
          fields: { objective, name: 'C' },
          adSetCount: 0,
          adSets: [{
            fields: {},
            adCount: 1,
          }],
        }],
      };
      const result = WideCreationService.validateTemplate(template);
      expect(result.warnings.some(w => w.message.includes('promoted_object'))).toBe(true);
    }
  });

  it('errors on bid_cap strategy without bid_amount', () => {
    const template: WideCreationTemplate = {
      name: 'Bid Cap',
      adAccountId: 'act_123',
      defaults: AD_DEFAULTS,
      campaigns: [{
        fields: { objective: 'OUTCOME_TRAFFIC', name: 'C' },
        adSetCount: 0,
        adSets: [{
          fields: { bid_strategy: 'COST_CAP' },
          adCount: 1,
        }],
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('bid_amount'))).toBe(true);
  });

  it('counts total entities correctly', () => {
    const template: WideCreationTemplate = {
      name: 'Count',
      adAccountId: 'act_123',
      campaigns: [
        {
          fields: { objective: 'OUTCOME_TRAFFIC', name: 'C1' },
          adSetCount: 0,
          adSets: [
            { fields: {}, adCount: 0, ads: [{ fields: {} }, { fields: {} }] },
            { fields: {}, adCount: 0, ads: [{ fields: {} }] },
          ],
        },
        {
          fields: { objective: 'OUTCOME_SALES', name: 'C2' },
          adSetCount: 0,
          adSets: [
            { fields: {}, adCount: 0, ads: [{ fields: {} }, { fields: {} }, { fields: {} }] },
          ],
        },
      ],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.totalEntities).toEqual({ campaigns: 2, adSets: 3, ads: 6 });
  });

  it('warns when campaign has no adsets', () => {
    const template: WideCreationTemplate = {
      name: 'No AdSets',
      adAccountId: 'act_123',
      campaigns: [{
        fields: { objective: 'OUTCOME_TRAFFIC', name: 'C' },
        adSetCount: 0,
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.warnings.some(w => w.message.includes('no ad sets'))).toBe(true);
  });
});

// ─── Optimization Goal × Objective validation in templates ───

describe('Wide Creation Goal Validation Matrix', () => {
  for (const objective of ALL_OBJECTIVES) {
    const validGoals = VALID_OPTIMIZATION_GOALS[objective];

    for (const goal of validGoals) {
      it(`${objective} + ${goal} is valid`, () => {
        const template: WideCreationTemplate = {
          name: 'Goal Matrix',
          adAccountId: 'act_123',
          campaigns: [{
            fields: { objective, name: 'C' },
            adSetCount: 0,
            adSets: [{
              fields: { optimization_goal: goal },
              adCount: 1,
            }],
          }],
        };
        const result = WideCreationService.validateTemplate(template);
        const goalErrors = result.errors.filter(e => e.field === 'optimization_goal');
        expect(goalErrors).toHaveLength(0);
      });
    }
  }
});

// ─── Destination Type × Objective validation in templates ───

describe('Wide Creation Destination Type Validation Matrix', () => {
  for (const objective of ALL_OBJECTIVES) {
    const validTypes = VALID_DESTINATION_TYPES[objective];

    for (const destType of validTypes) {
      if (destType === 'UNDEFINED') continue;
      it(`${objective} + ${destType} is valid`, () => {
        const template: WideCreationTemplate = {
          name: 'Dest Matrix',
          adAccountId: 'act_123',
          campaigns: [{
            fields: { objective, name: 'C' },
            adSetCount: 0,
            adSets: [{
              fields: { destination_type: destType },
              adCount: 1,
            }],
          }],
        };
        const result = WideCreationService.validateTemplate(template);
        const destErrors = result.errors.filter(e => e.field === 'destination_type');
        expect(destErrors).toHaveLength(0);
      });
    }
  }
});

// ─── Template Defaults Inheritance ───

describe('Template Defaults Inheritance', () => {
  it('campaign inherits template defaults', () => {
    const template: WideCreationTemplate = {
      name: 'Defaults',
      adAccountId: 'act_123',
      defaults: {
        campaign: {
          objective: 'OUTCOME_TRAFFIC',
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        },
        ...AD_DEFAULTS,
      },
      namingPattern: { campaign: 'C_{index}' },
      campaigns: [
        { fields: {}, adSetCount: 1 },
        { fields: {}, adSetCount: 1 },
      ],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(true);
  });

  it('adset inherits template adSet defaults', () => {
    const template: WideCreationTemplate = {
      name: 'AdSet Defaults',
      adAccountId: 'act_123',
      defaults: {
        adSet: {
          optimization_goal: 'LINK_CLICKS',
          billing_event: 'IMPRESSIONS',
          targeting: { geo_locations: { countries: ['US'] } },
        },
        ...AD_DEFAULTS,
      },
      campaigns: [{
        fields: { objective: 'OUTCOME_TRAFFIC', name: 'C' },
        adSetCount: 0,
        adSets: [
          { fields: {}, adCount: 1 },
          { fields: {}, adCount: 1 },
        ],
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(true);
  });

  it('explicit fields override template defaults', () => {
    const template: WideCreationTemplate = {
      name: 'Override',
      adAccountId: 'act_123',
      defaults: {
        campaign: { objective: 'OUTCOME_TRAFFIC' },
        ...AD_DEFAULTS,
      },
      campaigns: [{
        fields: { objective: 'OUTCOME_SALES', name: 'Sales C' },
        adSetCount: 1,
      }],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(true);
  });
});

// ─── Naming Pattern Resolution ───

describe('Naming Pattern Resolution', () => {
  it('validates with naming patterns instead of explicit names', () => {
    const template: WideCreationTemplate = {
      name: 'Pattern Test',
      adAccountId: 'act_123',
      defaults: AD_DEFAULTS,
      namingPattern: {
        campaign: '{objective} Campaign {index:02d}',
        adSet: 'AdSet {index} of {total}',
        ad: '{parent} - Ad {index}',
      },
      campaigns: [
        { fields: { objective: 'OUTCOME_TRAFFIC' }, adSetCount: 2 },
        { fields: { objective: 'OUTCOME_SALES' }, adSetCount: 3 },
      ],
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(true);
    expect(result.totalEntities.campaigns).toBe(2);
  });
});

// ─── Large Structure Validation ───

describe('Large Structure Validation', () => {
  it('validates 10 campaigns × 5 adsets × 3 ads', () => {
    const campaigns: WideCampaignNode[] = ALL_OBJECTIVES.slice(0, 5).flatMap(obj => [
      {
        fields: { objective: obj, name: `${obj}_A` },
        adSetCount: 0,
        adSets: Array.from({ length: 5 }, (_, i) => ({
          fields: {
            optimization_goal: OBJECTIVE_DEFAULTS[obj].optimization_goal,
            ...(PROMOTED_OBJECT_REQUIREMENTS[obj]?.length
              ? { promoted_object: { [PROMOTED_OBJECT_REQUIREMENTS[obj][0]]: '12345' } }
              : {}),
          },
          adCount: 0,
          ads: Array.from({ length: 3 }, () => ({ fields: {} })),
        })),
      },
      {
        fields: { objective: obj, name: `${obj}_B` },
        adSetCount: 0,
        adSets: Array.from({ length: 5 }, (_, i) => ({
          fields: {
            optimization_goal: OBJECTIVE_DEFAULTS[obj].optimization_goal,
            ...(PROMOTED_OBJECT_REQUIREMENTS[obj]?.length
              ? { promoted_object: { [PROMOTED_OBJECT_REQUIREMENTS[obj][0]]: '12345' } }
              : {}),
          },
          adCount: 0,
          ads: Array.from({ length: 3 }, () => ({ fields: {} })),
        })),
      },
    ]);

    const template: WideCreationTemplate = {
      name: 'Large',
      adAccountId: 'act_123',
      defaults: AD_DEFAULTS,
      namingPattern: { adSet: 'AS_{index}', ad: 'Ad_{index}' },
      campaigns,
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(true);
    expect(result.totalEntities.campaigns).toBe(10);
    expect(result.totalEntities.adSets).toBe(50);
    expect(result.totalEntities.ads).toBe(150);
  });

  it('validates quickly (under 50ms for 150 entities)', () => {
    const campaigns: WideCampaignNode[] = Array.from({ length: 10 }, (_, ci) => ({
      fields: { objective: ALL_OBJECTIVES[ci % ALL_OBJECTIVES.length], name: `C_${ci}` },
      adSetCount: 0,
      adSets: Array.from({ length: 5 }, () => ({
        fields: {},
        adCount: 0,
        ads: Array.from({ length: 3 }, () => ({ fields: {} })),
      })),
    }));

    const template: WideCreationTemplate = {
      name: 'Perf',
      adAccountId: 'act_123',
      defaults: AD_DEFAULTS,
      namingPattern: { adSet: 'AS_{index}', ad: 'Ad_{index}' },
      campaigns,
    };

    const start = performance.now();
    WideCreationService.validateTemplate(template);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

// ─── Cross-Objective Validation ───

describe('Cross-Objective Wide Creation', () => {
  it('validates mixed-objective template (all 6 objectives)', () => {
    const campaigns: WideCampaignNode[] = ALL_OBJECTIVES.map((obj, i) => ({
      fields: { objective: obj, name: `${obj} Campaign` },
      adSetCount: 0,
      adSets: [{
        fields: {
          optimization_goal: OBJECTIVE_DEFAULTS[obj].optimization_goal,
          destination_type: OBJECTIVE_DEFAULTS[obj].destination_type,
          ...(PROMOTED_OBJECT_REQUIREMENTS[obj]?.length
            ? { promoted_object: { [PROMOTED_OBJECT_REQUIREMENTS[obj][0]]: '12345' } }
            : {}),
        },
        adCount: 2,
      }],
    }));

    const template: WideCreationTemplate = {
      name: 'All Objectives',
      adAccountId: 'act_123',
      defaults: AD_DEFAULTS,
      namingPattern: { ad: '{parent} Ad {index}' },
      campaigns,
    };
    const result = WideCreationService.validateTemplate(template);
    expect(result.valid).toBe(true);
    expect(result.totalEntities.campaigns).toBe(6);
    expect(result.totalEntities.adSets).toBe(6);
    expect(result.totalEntities.ads).toBe(12);
  });
});

// ─── Budget Combinations ───

describe('Wide Creation Budget Combinations', () => {
  const budgetConfigs = [
    { label: 'CBO daily', campaignBudget: { daily_budget: '5000' }, adsetBudget: {} },
    { label: 'CBO lifetime', campaignBudget: { lifetime_budget: '100000' }, adsetBudget: {} },
    { label: 'AdSet daily', campaignBudget: {}, adsetBudget: { daily_budget: '3000' } },
    { label: 'AdSet lifetime', campaignBudget: {}, adsetBudget: { lifetime_budget: '50000' } },
  ];

  for (const objective of ALL_OBJECTIVES) {
    for (const budgetConfig of budgetConfigs) {
      it(`${objective} / ${budgetConfig.label}`, () => {
        const template: WideCreationTemplate = {
          name: 'Budget',
          adAccountId: 'act_123',
          defaults: AD_DEFAULTS,
          campaigns: [{
            fields: { objective, name: 'C', ...budgetConfig.campaignBudget },
            adSetCount: 0,
            adSets: [{
              fields: {
                ...budgetConfig.adsetBudget,
                ...(PROMOTED_OBJECT_REQUIREMENTS[objective]?.length
                  ? { promoted_object: { [PROMOTED_OBJECT_REQUIREMENTS[objective][0]]: '12345' } }
                  : {}),
              },
              adCount: 1,
            }],
          }],
        };
        const result = WideCreationService.validateTemplate(template);
        expect(result.valid).toBe(true);
      });
    }
  }
});
