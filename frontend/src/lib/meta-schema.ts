// Frontend mirror of backend MetaFieldRegistry — single source of truth for UI rendering

export type Mutability = 'mutable' | 'immutable';
export type FieldType = 'string' | 'number' | 'enum' | 'boolean' | 'object' | 'array';

export interface FieldConfig {
  mutability: Mutability;
  required: boolean | 'conditional';
  type: FieldType;
  label: string;
  enumValues?: string[];
  enumLabels?: Record<string, string>;
  dependsOn?: string[];
  incompatibleWith?: string[];
  readOnlyOnMeta?: boolean;
  isBudget?: boolean;
}

export const CAMPAIGN_FIELDS: Record<string, FieldConfig> = {
  name: { mutability: 'mutable', required: true, type: 'string', label: 'Campaign Name' },
  objective: {
    mutability: 'immutable', required: true, type: 'enum', label: 'Objective',
    enumValues: ['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_APP_PROMOTION'],
    enumLabels: { OUTCOME_AWARENESS: 'Awareness', OUTCOME_TRAFFIC: 'Traffic', OUTCOME_ENGAGEMENT: 'Engagement', OUTCOME_LEADS: 'Leads', OUTCOME_SALES: 'Sales', OUTCOME_APP_PROMOTION: 'App Promotion' },
  },
  buying_type: {
    mutability: 'immutable', required: false, type: 'enum', label: 'Buying Type',
    enumValues: ['AUCTION', 'RESERVED'],
    enumLabels: { AUCTION: 'Auction', RESERVED: 'Reach & Frequency' },
  },
  status: {
    mutability: 'mutable', required: true, type: 'enum', label: 'Status',
    enumValues: ['ACTIVE', 'PAUSED'],
    enumLabels: { ACTIVE: 'Active', PAUSED: 'Paused' },
  },
  daily_budget: { mutability: 'mutable', required: false, type: 'number', label: 'Daily Budget', incompatibleWith: ['lifetime_budget'], isBudget: true },
  lifetime_budget: { mutability: 'mutable', required: false, type: 'number', label: 'Lifetime Budget', incompatibleWith: ['daily_budget'], isBudget: true },
  bid_strategy: {
    mutability: 'mutable', required: false, type: 'enum', label: 'Bid Strategy',
    enumValues: ['LOWEST_COST_WITHOUT_CAP', 'LOWEST_COST_WITH_BID_CAP', 'COST_CAP', 'LOWEST_COST_WITH_MIN_ROAS'],
    enumLabels: { LOWEST_COST_WITHOUT_CAP: 'Highest Volume', LOWEST_COST_WITH_BID_CAP: 'Bid Cap', COST_CAP: 'Cost Per Result Goal', LOWEST_COST_WITH_MIN_ROAS: 'ROAS Goal' },
  },
  spend_cap: { mutability: 'mutable', required: false, type: 'number', label: 'Spend Cap', isBudget: true },
};

export const ADSET_FIELDS: Record<string, FieldConfig> = {
  name: { mutability: 'mutable', required: true, type: 'string', label: 'Ad Set Name' },
  optimization_goal: { mutability: 'mutable', required: true, type: 'enum', label: 'Optimization Goal', dependsOn: ['objective'] },
  destination_type: { mutability: 'immutable', required: 'conditional', type: 'enum', label: 'Destination Type', dependsOn: ['objective'] },
  billing_event: {
    mutability: 'mutable', required: true, type: 'enum', label: 'Billing Event',
    enumValues: ['IMPRESSIONS', 'LINK_CLICKS', 'APP_INSTALLS', 'THRUPLAY', 'POST_ENGAGEMENT'],
    enumLabels: { IMPRESSIONS: 'Impressions', LINK_CLICKS: 'Link Clicks', APP_INSTALLS: 'App Installs', THRUPLAY: 'ThruPlay', POST_ENGAGEMENT: 'Post Engagement' },
  },
  daily_budget: { mutability: 'mutable', required: 'conditional', type: 'number', label: 'Daily Budget', incompatibleWith: ['lifetime_budget'], isBudget: true },
  lifetime_budget: { mutability: 'mutable', required: 'conditional', type: 'number', label: 'Lifetime Budget', incompatibleWith: ['daily_budget'], isBudget: true },
  bid_amount: { mutability: 'mutable', required: false, type: 'number', label: 'Bid Amount', isBudget: true },
  bid_strategy: {
    mutability: 'mutable', required: false, type: 'enum', label: 'Bid Strategy',
    enumValues: ['LOWEST_COST_WITHOUT_CAP', 'LOWEST_COST_WITH_BID_CAP', 'COST_CAP', 'LOWEST_COST_WITH_MIN_ROAS'],
    enumLabels: { LOWEST_COST_WITHOUT_CAP: 'Highest Volume', LOWEST_COST_WITH_BID_CAP: 'Bid Cap', COST_CAP: 'Cost Per Result Goal', LOWEST_COST_WITH_MIN_ROAS: 'ROAS Goal' },
  },
};

export const AD_FIELDS: Record<string, FieldConfig> = {
  name: { mutability: 'mutable', required: true, type: 'string', label: 'Ad Name' },
  status: {
    mutability: 'mutable', required: true, type: 'enum', label: 'Status',
    enumValues: ['ACTIVE', 'PAUSED'],
    enumLabels: { ACTIVE: 'Active', PAUSED: 'Paused' },
  },
};

// ─── Objective compatibility maps ───

export const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_AWARENESS: 'Awareness', OUTCOME_TRAFFIC: 'Traffic',
  OUTCOME_ENGAGEMENT: 'Engagement', OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Sales', OUTCOME_APP_PROMOTION: 'App Promotion',
};

export const VALID_OPTIMIZATION_GOALS: Record<string, { value: string; label: string }[]> = {
  OUTCOME_AWARENESS:     [{ value: 'REACH', label: 'Reach' }, { value: 'IMPRESSIONS', label: 'Impressions' }, { value: 'AD_RECALL_LIFT', label: 'Ad Recall Lift' }, { value: 'THRUPLAY', label: 'ThruPlay' }],
  OUTCOME_TRAFFIC:       [{ value: 'LINK_CLICKS', label: 'Link Clicks' }, { value: 'LANDING_PAGE_VIEWS', label: 'Landing Page Views' }, { value: 'REACH', label: 'Reach' }, { value: 'IMPRESSIONS', label: 'Impressions' }, { value: 'OFFSITE_CONVERSIONS', label: 'Conversions' }],
  OUTCOME_ENGAGEMENT:    [{ value: 'POST_ENGAGEMENT', label: 'Post Engagement' }, { value: 'VIDEO_VIEWS', label: 'Video Views' }, { value: 'THRUPLAY', label: 'ThruPlay' }, { value: 'MESSAGES', label: 'Messages' }],
  OUTCOME_LEADS:         [{ value: 'LEAD_GENERATION', label: 'Lead Generation' }, { value: 'OFFSITE_CONVERSIONS', label: 'Conversions' }, { value: 'LINK_CLICKS', label: 'Link Clicks' }, { value: 'QUALITY_LEAD', label: 'Quality Lead' }],
  OUTCOME_SALES:         [{ value: 'OFFSITE_CONVERSIONS', label: 'Conversions' }, { value: 'VALUE', label: 'Value' }, { value: 'LINK_CLICKS', label: 'Link Clicks' }],
  OUTCOME_APP_PROMOTION: [{ value: 'APP_INSTALLS', label: 'App Installs' }, { value: 'LINK_CLICKS', label: 'Link Clicks' }, { value: 'OFFSITE_CONVERSIONS', label: 'Conversions' }, { value: 'VALUE', label: 'Value' }],
};

export const VALID_DESTINATION_TYPES: Record<string, { value: string; label: string }[]> = {
  OUTCOME_AWARENESS:     [{ value: 'UNDEFINED', label: 'Default' }],
  OUTCOME_TRAFFIC:       [{ value: 'WEBSITE', label: 'Website' }, { value: 'APP', label: 'App' }, { value: 'MESSENGER', label: 'Messenger' }, { value: 'WHATSAPP', label: 'WhatsApp' }],
  OUTCOME_ENGAGEMENT:    [{ value: 'WEBSITE', label: 'Website' }, { value: 'ON_POST', label: 'On Post' }, { value: 'ON_VIDEO', label: 'On Video' }, { value: 'FACEBOOK', label: 'Facebook' }],
  OUTCOME_LEADS:         [{ value: 'WEBSITE', label: 'Website' }, { value: 'ON_AD', label: 'Instant Form' }, { value: 'MESSENGER', label: 'Messenger' }, { value: 'INSTAGRAM_DIRECT', label: 'Instagram DM' }],
  OUTCOME_SALES:         [{ value: 'WEBSITE', label: 'Website' }, { value: 'APP', label: 'App' }, { value: 'MESSENGER', label: 'Messenger' }, { value: 'WHATSAPP', label: 'WhatsApp' }],
  OUTCOME_APP_PROMOTION: [{ value: 'APP', label: 'App' }, { value: 'UNDEFINED', label: 'Default' }],
};

export const PROMOTED_OBJECT_REQUIREMENTS: Record<string, string[]> = {
  OUTCOME_SALES: ['pixel_id'],
  OUTCOME_LEADS: ['page_id'],
  OUTCOME_APP_PROMOTION: ['application_id'],
  OUTCOME_ENGAGEMENT: [],
  OUTCOME_TRAFFIC: [],
  OUTCOME_AWARENESS: [],
};

export const PROMOTED_OBJECT_FIELD_LABELS: Record<string, string> = {
  pixel_id: 'Pixel ID',
  page_id: 'Page ID',
  application_id: 'Application ID',
  object_store_url: 'App Store URL',
};

export const BID_STRATEGIES: { value: string; label: string }[] = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Highest Volume' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Bid Cap' },
  { value: 'COST_CAP', label: 'Cost Per Result Goal' },
  { value: 'LOWEST_COST_WITH_MIN_ROAS', label: 'ROAS Goal' },
];

export const OBJECTIVES: { value: string; label: string; description: string }[] = [
  { value: 'OUTCOME_AWARENESS', label: 'Awareness', description: 'Maximize reach and ad recall' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic', description: 'Send people to a destination' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement', description: 'Get more messages, video views, or post engagement' },
  { value: 'OUTCOME_LEADS', label: 'Leads', description: 'Collect leads for your business' },
  { value: 'OUTCOME_SALES', label: 'Sales', description: 'Find people likely to purchase' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion', description: 'Get people to install your app' },
];

// ─── Action styles for optimization badges ───

export const ACTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  kept:        { bg: 'bg-gray-800/40',    text: 'text-gray-400',    label: 'Kept' },
  removed:     { bg: 'bg-red-500/10',     text: 'text-red-400',     label: 'Removed' },
  transformed: { bg: 'bg-blue-500/10',    text: 'text-blue-400',    label: 'Changed' },
  locked:      { bg: 'bg-gray-800/60',    text: 'text-gray-500',    label: 'Locked' },
  auto_mapped: { bg: 'bg-amber-500/10',   text: 'text-amber-400',   label: 'Auto-mapped' },
  added:       { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Added' },
};

export interface OptimizedField {
  field: string;
  label: string;
  action: string;
  reason?: string;
  originalValue?: any;
  newValue: any;
  editable: boolean;
  type: string;
  enumValues?: string[];
  enumLabels?: Record<string, string>;
}

export function formatBudget(cents: string | number | undefined): string {
  if (!cents) return '';
  const num = typeof cents === 'string' ? parseInt(cents, 10) : cents;
  if (isNaN(num)) return String(cents);
  return (num / 100).toFixed(2);
}

export function getFieldsForType(type: string): Record<string, FieldConfig> {
  switch (type) {
    case 'CAMPAIGN': return CAMPAIGN_FIELDS;
    case 'ADSET': return ADSET_FIELDS;
    case 'AD': return AD_FIELDS;
    default: return {};
  }
}
