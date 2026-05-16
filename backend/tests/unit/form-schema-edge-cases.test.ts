import { describe, it, expect } from 'vitest';
import { MetaFormSchemaEngine } from '../../src/services/draft/MetaFormSchemaEngine';

describe('MetaFormSchemaEngine.resolveFieldVisibility', () => {
  it('resolves field states with dependency show effect', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_SALES' });
    const states = MetaFormSchemaEngine.resolveFieldVisibility(schema, {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      billing_event: 'IMPRESSIONS',
    });
    expect(states).toBeInstanceOf(Map);
  });

  it('resolves field states with empty values', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema({ objective: 'OUTCOME_TRAFFIC' });
    const states = MetaFormSchemaEngine.resolveFieldVisibility(schema, {});
    expect(states).toBeInstanceOf(Map);
    expect(states.size).toBeGreaterThan(0);
  });

  it('handles incompatibleWith fields', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema({ objective: 'OUTCOME_TRAFFIC' });
    const states = MetaFormSchemaEngine.resolveFieldVisibility(schema, {
      daily_budget: '5000',
      lifetime_budget: '50000',
    });
    expect(states).toBeInstanceOf(Map);
  });

  it('resolves objectSchema sub-fields', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC' });
    const states = MetaFormSchemaEngine.resolveFieldVisibility(schema, {
      targeting: { geo_locations: { countries: ['TH'] } },
    });
    expect(states).toBeInstanceOf(Map);
  });

  it('evaluates condition: equals', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_SALES' });
    const states = MetaFormSchemaEngine.resolveFieldVisibility(schema, {
      bid_strategy: 'COST_CAP',
    });
    expect(states).toBeInstanceOf(Map);
  });

  it('evaluates condition: notEquals', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC' });
    const states = MetaFormSchemaEngine.resolveFieldVisibility(schema, {
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    });
    expect(states).toBeInstanceOf(Map);
  });

  it('evaluates condition: in (array value)', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC' });
    const states = MetaFormSchemaEngine.resolveFieldVisibility(schema, {
      optimization_goal: 'LINK_CLICKS',
    });
    expect(states).toBeInstanceOf(Map);
  });

  it('evaluates condition: exists', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_SALES' });
    const states = MetaFormSchemaEngine.resolveFieldVisibility(schema, {
      promoted_object: { pixel_id: '123' },
    });
    expect(states).toBeInstanceOf(Map);
  });

  it('evaluates condition: notExists', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_SALES' });
    const states = MetaFormSchemaEngine.resolveFieldVisibility(schema, {
      promoted_object: undefined,
    });
    expect(states).toBeInstanceOf(Map);
  });
});

describe('MetaFormSchemaEngine.getInvalidatedFields', () => {
  it('returns fields invalidated by changed field', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC' });
    const invalidated = MetaFormSchemaEngine.getInvalidatedFields(schema, 'optimization_goal');
    expect(Array.isArray(invalidated)).toBe(true);
  });

  it('returns unique entries', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema({ objective: 'OUTCOME_TRAFFIC' });
    const invalidated = MetaFormSchemaEngine.getInvalidatedFields(schema, 'bid_strategy');
    const unique = [...new Set(invalidated)];
    expect(invalidated).toEqual(unique);
  });

  it('returns empty array for non-invalidating field', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema({ objective: 'OUTCOME_TRAFFIC' });
    const invalidated = MetaFormSchemaEngine.getInvalidatedFields(schema, 'name');
    expect(Array.isArray(invalidated)).toBe(true);
  });

  it('handles field that both invalidates and is invalidated by others', () => {
    const mockSchema: any = {
      sections: [{
        fields: [
          { key: 'field_a', invalidates: ['field_b'] },
          { key: 'field_b', invalidates: ['field_a', 'field_c'] },
          { key: 'field_c' },
        ],
      }],
    };
    const invalidated = MetaFormSchemaEngine.getInvalidatedFields(mockSchema, 'field_b');
    expect(invalidated).toContain('field_a');
    expect(invalidated).toContain('field_c');
  });

  it('handles reverse invalidation lookup', () => {
    const mockSchema: any = {
      sections: [{
        fields: [
          { key: 'field_a', invalidates: ['field_b'] },
          { key: 'field_b' },
        ],
      }],
    };
    const invalidated = MetaFormSchemaEngine.getInvalidatedFields(mockSchema, 'field_b');
    expect(invalidated).toContain('field_a');
  });
});

describe('MetaFormSchemaEngine.getDefaultsForObjective', () => {
  it('returns defaults for OUTCOME_TRAFFIC', () => {
    const defaults = MetaFormSchemaEngine.getDefaultsForObjective('OUTCOME_TRAFFIC');
    expect(defaults).toHaveProperty('optimization_goal');
    expect(defaults).toHaveProperty('billing_event');
  });

  it('returns defaults for OUTCOME_SALES', () => {
    const defaults = MetaFormSchemaEngine.getDefaultsForObjective('OUTCOME_SALES');
    expect(defaults).toHaveProperty('optimization_goal');
  });

  it('returns empty object for unknown objective', () => {
    const defaults = MetaFormSchemaEngine.getDefaultsForObjective('INVALID');
    expect(defaults).toEqual({});
  });

  it('returns a copy (not reference)', () => {
    const defaults1 = MetaFormSchemaEngine.getDefaultsForObjective('OUTCOME_TRAFFIC');
    const defaults2 = MetaFormSchemaEngine.getDefaultsForObjective('OUTCOME_TRAFFIC');
    defaults1.optimization_goal = 'MODIFIED';
    expect(defaults2.optimization_goal).not.toBe('MODIFIED');
  });
});

describe('MetaFormSchemaEngine.evaluateCondition edge cases', () => {
  it('handles "in" condition with array value containing match', () => {
    const schema = MetaFormSchemaEngine.getAdSetFormSchema({ objective: 'OUTCOME_TRAFFIC' });
    const states = MetaFormSchemaEngine.resolveFieldVisibility(schema, {
      special_ad_categories: ['HOUSING', 'CREDIT'],
    });
    expect(states).toBeInstanceOf(Map);
  });

  it('handles "notIn" condition', () => {
    const schema = MetaFormSchemaEngine.getCampaignFormSchema({ objective: 'OUTCOME_TRAFFIC' });
    const states = MetaFormSchemaEngine.resolveFieldVisibility(schema, {
      buying_type: 'RESERVED',
    });
    expect(states).toBeInstanceOf(Map);
  });

  it('handles default condition (unknown condition type)', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'other', condition: 'unknownCondition', effect: 'show' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { other: 'value' });
    expect(states.get('test_field')?.visible).toBe(true);
  });

  it('handles "hide" effect', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'trigger', condition: 'equals', value: 'hide_it', effect: 'hide' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { trigger: 'hide_it' });
    expect(states.get('test_field')?.visible).toBe(false);
  });

  it('handles "require" effect', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'trigger', condition: 'equals', value: 'req', effect: 'require' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { trigger: 'req' });
    expect(states.get('test_field')?.required).toBe(true);
  });

  it('handles "disable" effect', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'trigger', condition: 'equals', value: 'dis', effect: 'disable' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { trigger: 'dis' });
    expect(states.get('test_field')?.disabled).toBe(true);
  });

  it('handles nested value lookup', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'parent.child', condition: 'equals', value: 'nested', effect: 'show' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { parent: { child: 'nested' } });
    expect(states.get('test_field')?.visible).toBe(true);
  });

  it('evaluates "in" condition where value is an array containing a match', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'categories', condition: 'in', values: ['HOUSING', 'CREDIT'], effect: 'show' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { categories: ['HOUSING', 'EMPLOYMENT'] });
    expect(states.get('test_field')?.visible).toBe(true);
  });

  it('evaluates "in" condition where value is an array with no match', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'categories', condition: 'in', values: ['HOUSING', 'CREDIT'], effect: 'show' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { categories: ['EMPLOYMENT'] });
    expect(states.get('test_field')?.visible).toBe(false);
  });

  it('evaluates "notIn" condition with matching value', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'status', condition: 'notIn', values: ['DELETED', 'ARCHIVED'], effect: 'show' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { status: 'ACTIVE' });
    expect(states.get('test_field')?.visible).toBe(true);
  });

  it('evaluates "notIn" condition with value in the list', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'status', condition: 'notIn', values: ['DELETED', 'ARCHIVED'], effect: 'show' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { status: 'DELETED' });
    expect(states.get('test_field')?.visible).toBe(false);
  });

  it('evaluates "notExists" condition with null value', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'optional', condition: 'notExists', effect: 'show' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { optional: null });
    expect(states.get('test_field')?.visible).toBe(true);
  });

  it('evaluates "notExists" condition with empty string', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'optional', condition: 'notExists', effect: 'show' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { optional: '' });
    expect(states.get('test_field')?.visible).toBe(true);
  });

  it('evaluates "notExists" condition with present value', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'optional', condition: 'notExists', effect: 'show' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { optional: 'present' });
    expect(states.get('test_field')?.visible).toBe(false);
  });

  it('evaluates "notEquals" condition — values differ', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'status', condition: 'notEquals', value: 'DELETED', effect: 'show' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { status: 'ACTIVE' });
    expect(states.get('test_field')?.visible).toBe(true);
  });

  it('evaluates "notEquals" condition — values match (condition false)', () => {
    const mockSchema: any = {
      sections: [{
        fields: [{
          key: 'test_field',
          editable: true,
          dependsOn: [{ field: 'status', condition: 'notEquals', value: 'DELETED', effect: 'show' }],
        }],
      }],
    };
    const states = MetaFormSchemaEngine.resolveFieldVisibility(mockSchema, { status: 'DELETED' });
    expect(states.get('test_field')?.visible).toBe(false);
  });
});
