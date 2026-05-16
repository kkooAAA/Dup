import { describe, it, expect } from 'vitest';
import { MetaFormSchemaEngine } from '../../src/services/draft/MetaFormSchemaEngine';
import { VALID_OPTIMIZATION_GOALS, VALID_DESTINATION_TYPES, BID_CAP_STRATEGIES, ATTRIBUTION_SPEC_OBJECTIVES, PROMOTED_OBJECT_REQUIREMENTS } from '../../src/services/draft/MetaFieldRegistry';

const ALL_OBJECTIVES = Object.keys(VALID_OPTIMIZATION_GOALS);

// ─── Campaign Form Schema ───

describe('Campaign Form Schema', () => {
  it('has required sections: identity, budget, special', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema();
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('identity');
    expect(sectionIds).toContain('budget');
    expect(sectionIds).toContain('special');
  });

  it('objective field is not editable (immutable)', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema();
    const identity = schema.sections.find(s => s.id === 'identity')!;
    const objectiveField = identity.fields.find(f => f.key === 'objective')!;
    expect(objectiveField.editable).toBe(false);
    expect(objectiveField.options).toHaveLength(6);
  });

  it('buying_type is not editable', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema();
    const identity = schema.sections.find(s => s.id === 'identity')!;
    const btField = identity.fields.find(f => f.key === 'buying_type')!;
    expect(btField.editable).toBe(false);
  });

  it('status defaults to PAUSED', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema();
    const identity = schema.sections.find(s => s.id === 'identity')!;
    const statusField = identity.fields.find(f => f.key === 'status')!;
    expect(statusField.defaultValue).toBe('PAUSED');
    expect(statusField.editable).toBe(false);
  });

  it('daily_budget and lifetime_budget are incompatible', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema();
    const budget = schema.sections.find(s => s.id === 'budget')!;
    const dailyField = budget.fields.find(f => f.key === 'daily_budget')!;
    const lifetimeField = budget.fields.find(f => f.key === 'lifetime_budget')!;
    expect(dailyField.incompatibleWith).toContain('lifetime_budget');
    expect(lifetimeField.incompatibleWith).toContain('daily_budget');
  });

  it('objective invalidates downstream fields', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema();
    const identity = schema.sections.find(s => s.id === 'identity')!;
    const objectiveField = identity.fields.find(f => f.key === 'objective')!;
    expect(objectiveField.invalidates).toContain('optimization_goal');
    expect(objectiveField.invalidates).toContain('destination_type');
  });

  it('special_ad_categories is multiEnum with all options', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema();
    const special = schema.sections.find(s => s.id === 'special')!;
    const field = special.fields.find(f => f.key === 'special_ad_categories')!;
    expect(field.type).toBe('multiEnum');
    expect(field.options!.length).toBeGreaterThanOrEqual(7);
    expect(field.defaultValue).toEqual(['NONE']);
  });
});

// ─── Ad Set Form Schema per Objective ───

describe('Ad Set Form Schema per Objective', () => {
  for (const objective of ALL_OBJECTIVES) {
    describe(`${objective}`, () => {
      it('has valid optimization_goal options', () => {
        const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective, isCBO: false });
        const delivery = schema.sections.find(s => s.id === 'delivery')!;
        const goalField = delivery.fields.find(f => f.key === 'optimization_goal')!;
        const validGoals = VALID_OPTIMIZATION_GOALS[objective];
        expect(goalField.options!.map(o => o.value)).toEqual(validGoals);
      });

      it('has valid destination_type options', () => {
        const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective, isCBO: false });
        const delivery = schema.sections.find(s => s.id === 'delivery')!;
        const destField = delivery.fields.find(f => f.key === 'destination_type')!;
        const validDests = VALID_DESTINATION_TYPES[objective];
        expect(destField.options!.map(o => o.value)).toEqual(validDests);
      });

      it('promoted_object required matches registry', () => {
        const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective, isCBO: false });
        const promotedSection = schema.sections.find(s => s.id === 'promoted_object')!;
        const promotedField = promotedSection.fields[0];
        const required = PROMOTED_OBJECT_REQUIREMENTS[objective] || [];
        expect(promotedField.required).toBe(required.length > 0);
      });

      if (ATTRIBUTION_SPEC_OBJECTIVES.has(objective)) {
        it('includes attribution section', () => {
          const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective, isCBO: false });
          const attrSection = schema.sections.find(s => s.id === 'attribution');
          expect(attrSection).toBeDefined();
        });
      } else {
        it('excludes attribution section', () => {
          const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective, isCBO: false });
          const attrSection = schema.sections.find(s => s.id === 'attribution');
          expect(attrSection).toBeUndefined();
        });
      }
    });
  }
});

// ─── CBO Mode ───

describe('CBO Budget Hiding', () => {
  for (const objective of ALL_OBJECTIVES) {
    it(`${objective} with CBO has empty budget fields`, () => {
      const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective, isCBO: true });
      const budgetSection = schema.sections.find(s => s.id === 'budget')!;
      expect(budgetSection.fields).toHaveLength(0);
      expect(budgetSection.description).toContain('CBO');
    });

    it(`${objective} without CBO has budget fields`, () => {
      const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective, isCBO: false });
      const budgetSection = schema.sections.find(s => s.id === 'budget')!;
      expect(budgetSection.fields.length).toBeGreaterThan(0);
      expect(budgetSection.fields.find(f => f.key === 'daily_budget')).toBeDefined();
      expect(budgetSection.fields.find(f => f.key === 'bid_strategy')).toBeDefined();
    });
  }
});

// ─── Targeting Schema ───

describe('Targeting Schema Structure', () => {
  it('has geo_locations as required object', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC', isCBO: false });
    const targetingSection = schema.sections.find(s => s.id === 'targeting')!;
    const targetingField = targetingSection.fields[0];
    expect(targetingField.type).toBe('object');
    expect(targetingField.required).toBe(true);

    const geoField = targetingField.objectSchema!.find(f => f.key === 'geo_locations')!;
    expect(geoField.required).toBe(true);
    expect(geoField.type).toBe('object');

    const countriesField = geoField.objectSchema!.find(f => f.key === 'countries')!;
    expect(countriesField.type).toBe('array');
  });

  it('has age fields', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC', isCBO: false });
    const targetingSection = schema.sections.find(s => s.id === 'targeting')!;
    const targetingField = targetingSection.fields[0];
    const ageMin = targetingField.objectSchema!.find(f => f.key === 'age_min')!;
    const ageMax = targetingField.objectSchema!.find(f => f.key === 'age_max')!;
    expect(ageMin.min).toBe(13);
    expect(ageMin.max).toBe(65);
    expect(ageMax.min).toBe(13);
    expect(ageMax.max).toBe(65);
  });

  it('has platform and placement fields', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC', isCBO: false });
    const targetingSection = schema.sections.find(s => s.id === 'targeting')!;
    const targetingField = targetingSection.fields[0];
    const platforms = targetingField.objectSchema!.find(f => f.key === 'publisher_platforms')!;
    expect(platforms.type).toBe('multiEnum');
    expect(platforms.options!.map(o => o.value)).toContain('facebook');
    expect(platforms.options!.map(o => o.value)).toContain('instagram');
  });

  it('has flexible_spec for interest targeting', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC', isCBO: false });
    const targetingSection = schema.sections.find(s => s.id === 'targeting')!;
    const targetingField = targetingSection.fields[0];
    const flexSpec = targetingField.objectSchema!.find(f => f.key === 'flexible_spec')!;
    expect(flexSpec.type).toBe('array');
    expect(flexSpec.arrayItemSchema).toBeDefined();
    expect(flexSpec.arrayItemSchema!.type).toBe('object');
  });
});

// ─── Promoted Object Schema per Objective ───

describe('Promoted Object Schema per Objective', () => {
  it('OUTCOME_SALES requires pixel_id', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_SALES', isCBO: false });
    const section = schema.sections.find(s => s.id === 'promoted_object')!;
    const field = section.fields[0];
    const pixelField = field.objectSchema!.find(f => f.key === 'pixel_id')!;
    expect(pixelField.required).toBe(true);
  });

  it('OUTCOME_SALES has custom_event_type', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_SALES', isCBO: false });
    const section = schema.sections.find(s => s.id === 'promoted_object')!;
    const field = section.fields[0];
    const eventField = field.objectSchema!.find(f => f.key === 'custom_event_type')!;
    expect(eventField.type).toBe('enum');
    expect(eventField.options!.map(o => o.value)).toContain('PURCHASE');
  });

  it('OUTCOME_LEADS requires page_id', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_LEADS', isCBO: false });
    const section = schema.sections.find(s => s.id === 'promoted_object')!;
    const field = section.fields[0];
    const pageField = field.objectSchema!.find(f => f.key === 'page_id')!;
    expect(pageField.required).toBe(true);
  });

  it('OUTCOME_APP_PROMOTION requires application_id', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_APP_PROMOTION', isCBO: false });
    const section = schema.sections.find(s => s.id === 'promoted_object')!;
    const field = section.fields[0];
    const appField = field.objectSchema!.find(f => f.key === 'application_id')!;
    expect(appField.required).toBe(true);
  });

  it('OUTCOME_AWARENESS has no required promoted_object fields', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_AWARENESS', isCBO: false });
    const section = schema.sections.find(s => s.id === 'promoted_object')!;
    const field = section.fields[0];
    expect(field.required).toBe(false);
  });
});

// ─── Dependency Resolution ───

describe('Dependency Resolution', () => {
  it('bid_amount becomes required when bid_strategy is COST_CAP', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC', isCBO: false });
    const visibility = MetaFormSchemaEngine.resolveFieldVisibility(schema, { bid_strategy: 'COST_CAP' });
    expect(visibility.get('bid_amount')?.required).toBe(true);
  });

  it('bid_amount not required for LOWEST_COST_WITHOUT_CAP', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC', isCBO: false });
    const visibility = MetaFormSchemaEngine.resolveFieldVisibility(schema, { bid_strategy: 'LOWEST_COST_WITHOUT_CAP' });
    expect(visibility.get('bid_amount')?.required).toBe(false);
  });

  it('end_time becomes required when lifetime_budget is set', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC', isCBO: false });
    const visibility = MetaFormSchemaEngine.resolveFieldVisibility(schema, { lifetime_budget: '100000' });
    expect(visibility.get('end_time')?.required).toBe(true);
  });

  it('end_time not required when lifetime_budget is absent', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC', isCBO: false });
    const visibility = MetaFormSchemaEngine.resolveFieldVisibility(schema, {});
    expect(visibility.get('end_time')?.required).toBe(false);
  });
});

// ─── Cascade Invalidation ───

describe('Cascade Invalidation', () => {
  it('objective change invalidates dependent fields', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema();
    const invalidated = MetaFormSchemaEngine.getInvalidatedFields(schema, 'objective');
    expect(invalidated).toContain('optimization_goal');
    expect(invalidated).toContain('destination_type');
    expect(invalidated).toContain('promoted_object');
    expect(invalidated).toContain('billing_event');
  });

  it('bid_strategy change invalidates bid_amount', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC', isCBO: false });
    const invalidated = MetaFormSchemaEngine.getInvalidatedFields(schema, 'bid_strategy');
    expect(invalidated).toContain('bid_amount');
  });
});

// ─── Structural Validation ───

describe('Schema Structural Validation', () => {
  for (const objective of ALL_OBJECTIVES) {
    it(`${objective} adSet schema is structurally sound`, () => {
      const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective, isCBO: false });

      for (const section of schema.sections) {
        // Every section has an id and title
        expect(section.id).toBeTruthy();
        expect(section.title).toBeTruthy();

        for (const field of section.fields) {
          // Every field has key, label, type
          expect(field.key).toBeTruthy();
          expect(field.label).toBeTruthy();
          expect(field.type).toBeTruthy();

          // Enum fields have options
          if (field.type === 'enum' || field.type === 'multiEnum') {
            expect(field.options).toBeDefined();
            expect(field.options!.length).toBeGreaterThan(0);
            // Every option has value and label
            for (const opt of field.options!) {
              expect(opt.value).toBeTruthy();
              expect(opt.label).toBeTruthy();
            }
          }

          // Object fields with schema have valid sub-fields
          if (field.objectSchema) {
            for (const subField of field.objectSchema) {
              expect(subField.key).toBeTruthy();
              expect(subField.label).toBeTruthy();
            }
          }

          // Array fields with item schema are valid
          if (field.arrayItemSchema) {
            expect(field.arrayItemSchema.key).toBeTruthy();
            expect(field.arrayItemSchema.type).toBeTruthy();
          }

          // Number fields have valid bounds
          if (field.type === 'number' || field.type === 'currency') {
            if (field.min !== undefined && field.max !== undefined) {
              expect(field.min).toBeLessThanOrEqual(field.max);
            }
          }
        }
      }
    });
  }

  it('campaign schema is structurally sound', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema();
    expect(schema.entityType).toBe('campaign');
    expect(schema.sections.length).toBeGreaterThanOrEqual(3);
  });

  it('ad schema is structurally sound', () => {
    const schema = MetaFormSchemaEngine.getAdFormSchema();
    expect(schema.entityType).toBe('ad');
    expect(schema.sections.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Objective Defaults Integration ───

describe('getDefaultsForObjective', () => {
  for (const objective of ALL_OBJECTIVES) {
    it(`${objective} returns valid defaults`, () => {
      const defaults = MetaFormSchemaEngine.getDefaultsForObjective(objective);
      expect(defaults.optimization_goal).toBeDefined();
      expect(defaults.billing_event).toBeDefined();
      expect(defaults.destination_type).toBeDefined();
      // Defaults must be valid for the objective
      expect(VALID_OPTIMIZATION_GOALS[objective]).toContain(defaults.optimization_goal);
      expect(VALID_DESTINATION_TYPES[objective]).toContain(defaults.destination_type);
    });
  }
});
