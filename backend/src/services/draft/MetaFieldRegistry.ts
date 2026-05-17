// ─── Core types ───

type Mutability = 'mutable' | 'immutable';
type Required = boolean | 'conditional';
type FieldType = 'string' | 'number' | 'enum' | 'boolean' | 'object' | 'array';

export interface FieldConfig {
  mutability: Mutability;
  required: Required;
  type: FieldType;
  label: string;
  enumValues?: string[];
  enumLabels?: Record<string, string>;
  dependsOn?: string[];
  incompatibleWith?: string[];
  readOnlyOnMeta?: boolean;
}

// ─── Campaign fields ───

export const CAMPAIGN_FIELDS: Record<string, FieldConfig> = {
  name: {
    mutability: 'mutable', required: true, type: 'string',
    label: 'Campaign Name',
  },
  objective: {
    mutability: 'immutable', required: true, type: 'enum',
    label: 'Objective',
    enumValues: ['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_APP_PROMOTION'],
    enumLabels: {
      OUTCOME_AWARENESS: 'Awareness', OUTCOME_TRAFFIC: 'Traffic',
      OUTCOME_ENGAGEMENT: 'Engagement', OUTCOME_LEADS: 'Leads',
      OUTCOME_SALES: 'Sales', OUTCOME_APP_PROMOTION: 'App Promotion',
    },
  },
  buying_type: {
    mutability: 'immutable', required: false, type: 'enum',
    label: 'Buying Type',
    enumValues: ['AUCTION', 'RESERVED'],
    enumLabels: { AUCTION: 'Auction', RESERVED: 'Reach & Frequency' },
  },
  status: {
    mutability: 'mutable', required: true, type: 'enum',
    label: 'Status',
    enumValues: ['ACTIVE', 'PAUSED'],
    enumLabels: { ACTIVE: 'Active', PAUSED: 'Paused' },
  },
  daily_budget: {
    mutability: 'mutable', required: false, type: 'number',
    label: 'Daily Budget',
    incompatibleWith: ['lifetime_budget'],
  },
  lifetime_budget: {
    mutability: 'mutable', required: false, type: 'number',
    label: 'Lifetime Budget',
    incompatibleWith: ['daily_budget'],
  },
  bid_strategy: {
    mutability: 'mutable', required: false, type: 'enum',
    label: 'Bid Strategy',
    enumValues: ['LOWEST_COST_WITHOUT_CAP', 'LOWEST_COST_WITH_BID_CAP', 'COST_CAP', 'LOWEST_COST_WITH_MIN_ROAS'],
    enumLabels: {
      LOWEST_COST_WITHOUT_CAP: 'Highest Volume',
      LOWEST_COST_WITH_BID_CAP: 'Bid Cap',
      COST_CAP: 'Cost Per Result Goal',
      LOWEST_COST_WITH_MIN_ROAS: 'ROAS Goal',
    },
  },
  spend_cap: {
    mutability: 'mutable', required: false, type: 'number',
    label: 'Spend Cap',
  },
  special_ad_categories: {
    mutability: 'mutable', required: true, type: 'array',
    label: 'Special Ad Categories',
    enumValues: ['NONE', 'CREDIT', 'EMPLOYMENT', 'HOUSING', 'ISSUES_ELECTIONS_POLITICS', 'FINANCIAL_PRODUCTS_SERVICES', 'ONLINE_GAMBLING_AND_GAMING'],
  },
  is_adset_budget_sharing_enabled: {
    mutability: 'mutable', required: false, type: 'boolean',
    label: 'Campaign Budget Optimization',
  },
};

// ─── Ad Set fields ───

export const ADSET_FIELDS: Record<string, FieldConfig> = {
  name: {
    mutability: 'mutable', required: true, type: 'string',
    label: 'Ad Set Name',
  },
  campaign_id: {
    mutability: 'immutable', required: true, type: 'string',
    label: 'Campaign ID', readOnlyOnMeta: true,
  },
  optimization_goal: {
    mutability: 'mutable', required: true, type: 'enum',
    label: 'Optimization Goal',
    dependsOn: ['objective'],
  },
  billing_event: {
    mutability: 'mutable', required: true, type: 'enum',
    label: 'Billing Event',
    enumValues: ['IMPRESSIONS', 'LINK_CLICKS', 'APP_INSTALLS', 'THRUPLAY', 'POST_ENGAGEMENT', 'PAGE_LIKES', 'PURCHASE', 'CLICKS'],
    enumLabels: {
      IMPRESSIONS: 'Impressions', LINK_CLICKS: 'Link Clicks',
      APP_INSTALLS: 'App Installs', THRUPLAY: 'ThruPlay',
      POST_ENGAGEMENT: 'Post Engagement', PAGE_LIKES: 'Page Likes',
      PURCHASE: 'Purchase', CLICKS: 'Clicks',
    },
  },
  destination_type: {
    mutability: 'immutable', required: 'conditional', type: 'enum',
    label: 'Destination Type',
    dependsOn: ['objective'],
  },
  promoted_object: {
    mutability: 'immutable', required: 'conditional', type: 'object',
    label: 'Promoted Object',
    dependsOn: ['objective'],
  },
  targeting: {
    mutability: 'mutable', required: true, type: 'object',
    label: 'Targeting',
  },
  daily_budget: {
    mutability: 'mutable', required: 'conditional', type: 'number',
    label: 'Daily Budget',
    incompatibleWith: ['lifetime_budget'],
  },
  lifetime_budget: {
    mutability: 'mutable', required: 'conditional', type: 'number',
    label: 'Lifetime Budget',
    incompatibleWith: ['daily_budget'],
  },
  bid_amount: {
    mutability: 'mutable', required: false, type: 'number',
    label: 'Bid Amount',
  },
  bid_strategy: {
    mutability: 'mutable', required: false, type: 'enum',
    label: 'Bid Strategy',
    enumValues: ['LOWEST_COST_WITHOUT_CAP', 'LOWEST_COST_WITH_BID_CAP', 'COST_CAP', 'LOWEST_COST_WITH_MIN_ROAS'],
    enumLabels: {
      LOWEST_COST_WITHOUT_CAP: 'Highest Volume',
      LOWEST_COST_WITH_BID_CAP: 'Bid Cap',
      COST_CAP: 'Cost Per Result Goal',
      LOWEST_COST_WITH_MIN_ROAS: 'ROAS Goal',
    },
  },
  attribution_spec: {
    mutability: 'mutable', required: false, type: 'object',
    label: 'Attribution Spec',
    dependsOn: ['objective'],
  },
  start_time: {
    mutability: 'mutable', required: false, type: 'string',
    label: 'Start Time',
  },
  end_time: {
    mutability: 'mutable', required: false, type: 'string',
    label: 'End Time',
  },
};

// ─── Ad fields ───

export const AD_FIELDS: Record<string, FieldConfig> = {
  name: {
    mutability: 'mutable', required: true, type: 'string',
    label: 'Ad Name',
  },
  adset_id: {
    mutability: 'immutable', required: true, type: 'string',
    label: 'Ad Set ID', readOnlyOnMeta: true,
  },
  creative: {
    mutability: 'mutable', required: true, type: 'object',
    label: 'Creative',
  },
  status: {
    mutability: 'mutable', required: true, type: 'enum',
    label: 'Status',
    enumValues: ['ACTIVE', 'PAUSED'],
    enumLabels: { ACTIVE: 'Active', PAUSED: 'Paused' },
  },
  tracking_specs: {
    mutability: 'mutable', required: false, type: 'object',
    label: 'Tracking Specs',
  },
};

// ─── Objective compatibility maps ───

export const VALID_OPTIMIZATION_GOALS: Record<string, string[]> = {
  OUTCOME_AWARENESS:     ['REACH', 'IMPRESSIONS', 'AD_RECALL_LIFT', 'THRUPLAY'],
  OUTCOME_TRAFFIC:       ['LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'REACH', 'IMPRESSIONS', 'OFFSITE_CONVERSIONS'],
  OUTCOME_ENGAGEMENT:    ['POST_ENGAGEMENT', 'VIDEO_VIEWS', 'THRUPLAY', 'MESSAGES', 'REACH', 'IMPRESSIONS'],
  OUTCOME_LEADS:         ['LEAD_GENERATION', 'OFFSITE_CONVERSIONS', 'LINK_CLICKS', 'QUALITY_LEAD', 'QUALITY_CALL'],
  OUTCOME_SALES:         ['OFFSITE_CONVERSIONS', 'VALUE', 'LINK_CLICKS', 'CONVERSATIONS'],
  OUTCOME_APP_PROMOTION: ['APP_INSTALLS', 'LINK_CLICKS', 'OFFSITE_CONVERSIONS', 'VALUE', 'APP_INSTALLS_AND_OFFSITE_CONVERSIONS'],
};

export const OPTIMIZATION_GOAL_LABELS: Record<string, string> = {
  REACH: 'Reach', IMPRESSIONS: 'Impressions', AD_RECALL_LIFT: 'Ad Recall Lift',
  THRUPLAY: 'ThruPlay', LINK_CLICKS: 'Link Clicks',
  LANDING_PAGE_VIEWS: 'Landing Page Views', OFFSITE_CONVERSIONS: 'Conversions',
  POST_ENGAGEMENT: 'Post Engagement', VIDEO_VIEWS: 'Video Views',
  MESSAGES: 'Messages', LEAD_GENERATION: 'Lead Generation',
  QUALITY_LEAD: 'Quality Lead', QUALITY_CALL: 'Quality Call',
  VALUE: 'Value', CONVERSATIONS: 'Conversations',
  APP_INSTALLS: 'App Installs',
  APP_INSTALLS_AND_OFFSITE_CONVERSIONS: 'App Installs & Conversions',
};

export const VALID_DESTINATION_TYPES: Record<string, string[]> = {
  OUTCOME_AWARENESS:     ['UNDEFINED'],
  OUTCOME_TRAFFIC:       ['WEBSITE', 'APP', 'MESSENGER', 'WHATSAPP', 'INSTAGRAM_DIRECT'],
  OUTCOME_ENGAGEMENT:    ['WEBSITE', 'ON_POST', 'ON_VIDEO', 'ON_PAGE', 'ON_EVENT', 'FACEBOOK', 'INSTAGRAM_DIRECT'],
  OUTCOME_LEADS:         ['WEBSITE', 'ON_AD', 'MESSENGER', 'INSTAGRAM_DIRECT', 'WHATSAPP'],
  OUTCOME_SALES:         ['WEBSITE', 'APP', 'MESSENGER', 'WHATSAPP', 'SHOP_AUTOMATIC'],
  OUTCOME_APP_PROMOTION: ['APP', 'UNDEFINED'],
};

export const DESTINATION_TYPE_LABELS: Record<string, string> = {
  UNDEFINED: 'Default', WEBSITE: 'Website', APP: 'App',
  MESSENGER: 'Messenger', WHATSAPP: 'WhatsApp',
  INSTAGRAM_DIRECT: 'Instagram DM', ON_AD: 'Instant Form',
  ON_POST: 'On Post', ON_VIDEO: 'On Video', ON_PAGE: 'On Page',
  ON_EVENT: 'On Event', FACEBOOK: 'Facebook',
  SHOP_AUTOMATIC: 'Shop', APPLINKS_AUTOMATIC: 'App Links',
};

export const PROMOTED_OBJECT_REQUIREMENTS: Record<string, string[]> = {
  OUTCOME_SALES:          ['pixel_id'],
  OUTCOME_LEADS:          ['page_id'],
  OUTCOME_APP_PROMOTION:  ['application_id'],
  OUTCOME_ENGAGEMENT:     [],
  OUTCOME_TRAFFIC:        [],
  OUTCOME_AWARENESS:      [],
};

export const ATTRIBUTION_SPEC_OBJECTIVES = new Set([
  'OUTCOME_SALES', 'OUTCOME_LEADS', 'OUTCOME_APP_PROMOTION',
]);

export const BID_CAP_STRATEGIES = new Set([
  'LOWEST_COST_WITH_BID_CAP', 'COST_CAP', 'LOWEST_COST_WITH_MIN_ROAS',
]);

// ─── Objective conversion defaults ───
// When converting from one objective to another, use these as safe defaults

export const OBJECTIVE_DEFAULTS: Record<string, { optimization_goal: string; billing_event: string; destination_type: string }> = {
  OUTCOME_AWARENESS:     { optimization_goal: 'REACH',                billing_event: 'IMPRESSIONS', destination_type: 'UNDEFINED' },
  OUTCOME_TRAFFIC:       { optimization_goal: 'LINK_CLICKS',         billing_event: 'IMPRESSIONS', destination_type: 'WEBSITE' },
  OUTCOME_ENGAGEMENT:    { optimization_goal: 'POST_ENGAGEMENT',     billing_event: 'IMPRESSIONS', destination_type: 'WEBSITE' },
  OUTCOME_LEADS:         { optimization_goal: 'LEAD_GENERATION',     billing_event: 'IMPRESSIONS', destination_type: 'WEBSITE' },
  OUTCOME_SALES:         { optimization_goal: 'OFFSITE_CONVERSIONS', billing_event: 'IMPRESSIONS', destination_type: 'WEBSITE' },
  OUTCOME_APP_PROMOTION: { optimization_goal: 'APP_INSTALLS',        billing_event: 'IMPRESSIONS', destination_type: 'APP' },
};

// ─── Optimization goal migration map ───
// When the current optimization_goal isn't valid for the target objective,
// try to map it to the closest equivalent before falling back to the default.

export const OPTIMIZATION_GOAL_MIGRATION: Record<string, string> = {
  LINK_CLICKS:         'LINK_CLICKS',
  LANDING_PAGE_VIEWS:  'LINK_CLICKS',
  OFFSITE_CONVERSIONS: 'OFFSITE_CONVERSIONS',
  REACH:               'REACH',
  IMPRESSIONS:         'IMPRESSIONS',
  POST_ENGAGEMENT:     'POST_ENGAGEMENT',
  VIDEO_VIEWS:         'VIDEO_VIEWS',
  THRUPLAY:            'THRUPLAY',
  MESSAGES:            'MESSAGES',
  LEAD_GENERATION:     'LEAD_GENERATION',
  APP_INSTALLS:        'APP_INSTALLS',
  VALUE:               'VALUE',
  AD_RECALL_LIFT:      'REACH',
  QUALITY_LEAD:        'LEAD_GENERATION',
  QUALITY_CALL:        'LEAD_GENERATION',
  CONVERSATIONS:       'OFFSITE_CONVERSIONS',
  APP_INSTALLS_AND_OFFSITE_CONVERSIONS: 'APP_INSTALLS',
};

// ─── Derived lists ───

export const IMMUTABLE_CAMPAIGN_FIELDS = Object.entries(CAMPAIGN_FIELDS)
  .filter(([, v]) => v.mutability === 'immutable')
  .map(([k]) => k);

export const IMMUTABLE_ADSET_FIELDS = Object.entries(ADSET_FIELDS)
  .filter(([, v]) => v.mutability === 'immutable')
  .map(([k]) => k);

export const IMMUTABLE_AD_FIELDS = Object.entries(AD_FIELDS)
  .filter(([, v]) => v.mutability === 'immutable')
  .map(([k]) => k);

// ─── Read-only fields Meta returns but rejects on create ───

export const READ_ONLY_FIELDS = new Set([
  'id', 'account_id', 'effective_status', 'configured_status',
  'created_time', 'updated_time', 'smart_pse_enabled',
  'issues_info', 'recommendations', 'source_campaign_id',
  'budget_remaining', 'budget_rebalance_flag',
  'can_create_brand_lift_study', 'can_use_spend_cap',
  'topline_id', 'source_campaign',
]);

export const PROMOTED_OBJECT_READ_ONLY = new Set([
  'id', 'smart_pse_enabled',
]);

export const TARGETING_READ_ONLY = new Set([
  'id', 'targeting_automation', 'contextual_targeting_options',
]);

// ─── Utility functions ───

export interface ImmutableFieldConflict {
  field: string;
  draftValue: any;
  metaValue: any;
}

export function detectImmutableConflicts(
  entityType: 'campaign' | 'adSet' | 'ad',
  draftData: Record<string, any>,
  sourceSnapshot: Record<string, any> | null,
): ImmutableFieldConflict[] {
  if (!sourceSnapshot) return [];
  const immutableFields =
    entityType === 'campaign' ? IMMUTABLE_CAMPAIGN_FIELDS :
    entityType === 'adSet'   ? IMMUTABLE_ADSET_FIELDS :
    IMMUTABLE_AD_FIELDS;

  const conflicts: ImmutableFieldConflict[] = [];
  for (const field of immutableFields) {
    const draftVal = draftData[field];
    const sourceVal = sourceSnapshot[field];
    if (draftVal !== undefined && sourceVal !== undefined &&
        JSON.stringify(draftVal) !== JSON.stringify(sourceVal)) {
      conflicts.push({ field, draftValue: draftVal, metaValue: sourceVal });
    }
  }
  return conflicts;
}

export function stripImmutableFields(
  entityType: 'campaign' | 'adSet' | 'ad',
  payload: Record<string, any>,
): { cleaned: Record<string, any>; stripped: string[] } {
  const immutableFields =
    entityType === 'campaign' ? IMMUTABLE_CAMPAIGN_FIELDS :
    entityType === 'adSet'   ? IMMUTABLE_ADSET_FIELDS :
    IMMUTABLE_AD_FIELDS;

  const cleaned = { ...payload };
  const stripped: string[] = [];
  for (const field of immutableFields) {
    if (field in cleaned) {
      stripped.push(field);
      delete cleaned[field];
    }
  }
  return { cleaned, stripped };
}

export function stripReadOnlyFields(data: Record<string, any>): Record<string, any> {
  const cleaned = { ...data };
  for (const field of READ_ONLY_FIELDS) {
    delete cleaned[field];
  }
  return cleaned;
}

export function sanitizePromotedObject(obj: any): any {
  if (!obj) return undefined;
  const cleaned = { ...obj };
  for (const field of PROMOTED_OBJECT_READ_ONLY) {
    delete cleaned[field];
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function sanitizeTargeting(targeting: any): any {
  const defaultTargeting = { geo_locations: { countries: ['TH'] }, age_min: 20 };
  if (!targeting) return defaultTargeting;
  try {
    const sanitized = JSON.parse(JSON.stringify(targeting));
    for (const field of TARGETING_READ_ONLY) {
      delete sanitized[field];
    }
    if (!sanitized.geo_locations || Object.keys(sanitized.geo_locations).length === 0) {
      sanitized.geo_locations = defaultTargeting.geo_locations;
    }
    // Thailand requires age_min >= 20
    const countries = sanitized.geo_locations?.countries || [];
    if (countries.includes('TH') && (!sanitized.age_min || sanitized.age_min < 20)) {
      sanitized.age_min = 20;
    }
    if (!sanitized.age_min) {
      sanitized.age_min = 18;
    }
    return sanitized;
  } catch {
    return defaultTargeting;
  }
}

export function migrateOptimizationGoal(
  currentGoal: string,
  targetObjective: string,
): { goal: string; migrated: boolean; reason?: string } {
  const validGoals = VALID_OPTIMIZATION_GOALS[targetObjective] || [];

  if (validGoals.includes(currentGoal)) {
    return { goal: currentGoal, migrated: false };
  }

  const mapped = OPTIMIZATION_GOAL_MIGRATION[currentGoal];
  if (mapped && validGoals.includes(mapped)) {
    return {
      goal: mapped,
      migrated: true,
      reason: `${currentGoal} mapped to ${mapped} for ${targetObjective}`,
    };
  }

  const fallback = OBJECTIVE_DEFAULTS[targetObjective]?.optimization_goal || validGoals[0];
  return {
    goal: fallback,
    migrated: true,
    reason: `${currentGoal} not supported for ${targetObjective}, fell back to ${fallback}`,
  };
}

export function migrateDestinationType(
  currentType: string | undefined,
  targetObjective: string,
): { type: string; migrated: boolean; reason?: string } {
  const validTypes = VALID_DESTINATION_TYPES[targetObjective] || [];
  const fallback = OBJECTIVE_DEFAULTS[targetObjective]?.destination_type || validTypes[0] || 'UNDEFINED';

  if (!currentType || currentType === 'UNDEFINED') {
    return { type: fallback, migrated: false };
  }

  if (validTypes.includes(currentType)) {
    return { type: currentType, migrated: false };
  }

  return {
    type: fallback,
    migrated: true,
    reason: `${currentType} not valid for ${targetObjective}, changed to ${fallback}`,
  };
}
