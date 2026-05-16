// Realistic Meta entity fixtures for all campaign objectives.
// These mirror what the Facebook Graph API actually returns when you fetch campaigns/adsets/ads.

export const CAMPAIGN_FIXTURES: Record<string, Record<string, any>> = {
  OUTCOME_TRAFFIC: {
    id: '120210000000001',
    name: 'Traffic Campaign - TH',
    objective: 'OUTCOME_TRAFFIC',
    status: 'ACTIVE',
    buying_type: 'AUCTION',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    daily_budget: '5000',
    special_ad_categories: ['NONE'],
    is_adset_budget_sharing_enabled: true,
    // Read-only fields that Meta returns but we must strip
    account_id: 'act_123456',
    effective_status: 'ACTIVE',
    configured_status: 'ACTIVE',
    created_time: '2024-01-15T10:00:00+0000',
    updated_time: '2024-03-01T12:00:00+0000',
  },

  OUTCOME_LEADS: {
    id: '120210000000002',
    name: 'Lead Gen Campaign',
    objective: 'OUTCOME_LEADS',
    status: 'ACTIVE',
    buying_type: 'AUCTION',
    bid_strategy: 'COST_CAP',
    daily_budget: '10000',
    special_ad_categories: ['NONE'],
    is_adset_budget_sharing_enabled: true,
    account_id: 'act_123456',
    effective_status: 'ACTIVE',
  },

  OUTCOME_SALES: {
    id: '120210000000003',
    name: 'Conversion Campaign',
    objective: 'OUTCOME_SALES',
    status: 'ACTIVE',
    buying_type: 'AUCTION',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    lifetime_budget: '200000',
    special_ad_categories: ['NONE'],
    is_adset_budget_sharing_enabled: false,
    account_id: 'act_123456',
    effective_status: 'ACTIVE',
  },

  OUTCOME_AWARENESS: {
    id: '120210000000004',
    name: 'Brand Awareness Campaign',
    objective: 'OUTCOME_AWARENESS',
    status: 'PAUSED',
    buying_type: 'AUCTION',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    daily_budget: '3000',
    special_ad_categories: ['NONE'],
    is_adset_budget_sharing_enabled: true,
    account_id: 'act_123456',
    effective_status: 'PAUSED',
  },

  OUTCOME_ENGAGEMENT: {
    id: '120210000000005',
    name: 'Engagement Campaign',
    objective: 'OUTCOME_ENGAGEMENT',
    status: 'ACTIVE',
    buying_type: 'AUCTION',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    daily_budget: '8000',
    special_ad_categories: ['NONE'],
    is_adset_budget_sharing_enabled: true,
    account_id: 'act_123456',
    effective_status: 'ACTIVE',
  },

  OUTCOME_APP_PROMOTION: {
    id: '120210000000006',
    name: 'App Install Campaign',
    objective: 'OUTCOME_APP_PROMOTION',
    status: 'ACTIVE',
    buying_type: 'AUCTION',
    bid_strategy: 'LOWEST_COST_WITH_BID_CAP',
    daily_budget: '15000',
    special_ad_categories: ['NONE'],
    is_adset_budget_sharing_enabled: true,
    account_id: 'act_123456',
    effective_status: 'ACTIVE',
  },
};

export const ADSET_FIXTURES: Record<string, Record<string, any>> = {
  OUTCOME_TRAFFIC: {
    id: '120210000000101',
    name: 'Traffic AdSet - TH',
    campaign_id: '120210000000001',
    optimization_goal: 'LINK_CLICKS',
    billing_event: 'IMPRESSIONS',
    destination_type: 'WEBSITE',
    targeting: {
      geo_locations: { countries: ['TH'] },
      age_min: 18,
      age_max: 55,
      genders: [0],
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions: ['feed', 'story'],
      instagram_positions: ['stream', 'story'],
    },
    status: 'ACTIVE',
    start_time: '2024-01-15T10:00:00+0000',
    // Read-only
    id_: '120210000000101',
    effective_status: 'ACTIVE',
  },

  OUTCOME_LEADS: {
    id: '120210000000102',
    name: 'Lead Gen AdSet',
    campaign_id: '120210000000002',
    optimization_goal: 'LEAD_GENERATION',
    billing_event: 'IMPRESSIONS',
    destination_type: 'ON_AD',
    promoted_object: {
      page_id: '100000000000001',
    },
    targeting: {
      geo_locations: { countries: ['TH'] },
      age_min: 25,
      age_max: 45,
      flexible_spec: [{ interests: [{ id: '6003139266461', name: 'Shopping' }] }],
    },
    status: 'ACTIVE',
    effective_status: 'ACTIVE',
  },

  OUTCOME_SALES: {
    id: '120210000000103',
    name: 'Sales AdSet',
    campaign_id: '120210000000003',
    optimization_goal: 'OFFSITE_CONVERSIONS',
    billing_event: 'IMPRESSIONS',
    destination_type: 'WEBSITE',
    daily_budget: '5000',
    bid_strategy: 'COST_CAP',
    bid_amount: '2000',
    promoted_object: {
      pixel_id: '200000000000001',
      custom_event_type: 'PURCHASE',
    },
    targeting: {
      geo_locations: { countries: ['TH'] },
      age_min: 18,
      age_max: 65,
      custom_audiences: [{ id: '23851234567890', name: 'Website Visitors 30d' }],
    },
    attribution_spec: [{ event_type: 'CLICK_THROUGH', window_days: 7 }],
    status: 'ACTIVE',
    effective_status: 'ACTIVE',
  },

  OUTCOME_AWARENESS: {
    id: '120210000000104',
    name: 'Awareness AdSet',
    campaign_id: '120210000000004',
    optimization_goal: 'REACH',
    billing_event: 'IMPRESSIONS',
    destination_type: 'UNDEFINED',
    targeting: {
      geo_locations: { countries: ['TH'], regions: [{ key: '3455' }] },
      age_min: 18,
      age_max: 65,
    },
    status: 'PAUSED',
    effective_status: 'PAUSED',
  },

  OUTCOME_ENGAGEMENT: {
    id: '120210000000105',
    name: 'Engagement AdSet',
    campaign_id: '120210000000005',
    optimization_goal: 'POST_ENGAGEMENT',
    billing_event: 'IMPRESSIONS',
    destination_type: 'ON_POST',
    promoted_object: {
      page_id: '100000000000001',
    },
    targeting: {
      geo_locations: { countries: ['TH'] },
      age_min: 18,
      age_max: 55,
    },
    status: 'ACTIVE',
    effective_status: 'ACTIVE',
  },

  OUTCOME_APP_PROMOTION: {
    id: '120210000000106',
    name: 'App Install AdSet',
    campaign_id: '120210000000006',
    optimization_goal: 'APP_INSTALLS',
    billing_event: 'IMPRESSIONS',
    destination_type: 'APP',
    promoted_object: {
      application_id: '300000000000001',
      object_store_url: 'https://play.google.com/store/apps/details?id=com.example.app',
    },
    targeting: {
      geo_locations: { countries: ['TH'] },
      age_min: 18,
      age_max: 35,
      user_os: ['Android'],
    },
    status: 'ACTIVE',
    effective_status: 'ACTIVE',
  },
};

export const AD_FIXTURES: Record<string, Record<string, any>> = {
  STANDARD: {
    id: '120210000000201',
    name: 'Standard Ad',
    adset_id: '120210000000101',
    status: 'ACTIVE',
    creative: {
      id: '120210000000301',
      creative_id: '120210000000301',
    },
    tracking_specs: [{ action_type: ['offsite_conversion'], fb_pixel: ['200000000000001'] }],
    effective_status: 'ACTIVE',
  },

  WITH_URL_TAGS: {
    id: '120210000000202',
    name: 'Ad with URL Tags',
    adset_id: '120210000000102',
    status: 'ACTIVE',
    creative: {
      id: '120210000000302',
      creative_id: '120210000000302',
    },
    effective_status: 'ACTIVE',
  },

  MISSING_CREATIVE: {
    id: '120210000000203',
    name: 'Ad without Creative',
    adset_id: '120210000000103',
    status: 'ACTIVE',
    creative: {},
    effective_status: 'ACTIVE',
  },
};

// Budget mode variations for testing
export const BUDGET_VARIATIONS = {
  CBO_DAILY: { is_adset_budget_sharing_enabled: true, daily_budget: '5000' },
  CBO_LIFETIME: { is_adset_budget_sharing_enabled: true, lifetime_budget: '100000' },
  ADSET_DAILY: { is_adset_budget_sharing_enabled: false },
  ADSET_LIFETIME: { is_adset_budget_sharing_enabled: false },
};

export const BID_STRATEGY_VARIATIONS = [
  { bid_strategy: 'LOWEST_COST_WITHOUT_CAP' },
  { bid_strategy: 'LOWEST_COST_WITH_BID_CAP', bid_amount: '1500' },
  { bid_strategy: 'COST_CAP', bid_amount: '2000' },
  { bid_strategy: 'LOWEST_COST_WITH_MIN_ROAS', bid_amount: '300' },
];
