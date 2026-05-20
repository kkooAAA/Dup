import { DraftCampaign, DraftAdSet, DraftAd } from '@prisma/client';
import {
  VALID_OPTIMIZATION_GOALS,
  VALID_DESTINATION_TYPES,
  PROMOTED_OBJECT_REQUIREMENTS,
  ATTRIBUTION_SPEC_OBJECTIVES,
  BID_CAP_STRATEGIES,
  IMMUTABLE_CAMPAIGN_FIELDS,
  IMMUTABLE_ADSET_FIELDS,
} from './MetaFieldRegistry';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class DraftValidationEngine {
  static async validateCampaign(campaign: DraftCampaign): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const data = campaign.data as any;

    if (!campaign.name) {
      errors.push({ field: 'name', message: 'Campaign name is required', severity: 'error' });
    }

    const objective = data.objective || campaign.objective;
    if (!objective) {
      errors.push({ field: 'objective', message: 'Objective is required', severity: 'error' });
    }

    if (!VALID_OPTIMIZATION_GOALS[objective] && objective) {
      errors.push({ field: 'objective', message: `Unknown objective: ${objective}`, severity: 'error' });
    }

    const hasDailyBudget = data.daily_budget && Number(data.daily_budget) > 0;
    const hasLifetimeBudget = data.lifetime_budget && Number(data.lifetime_budget) > 0;
    if (hasDailyBudget && hasLifetimeBudget) {
      errors.push({
        field: 'budget',
        message: 'Cannot set both daily_budget and lifetime_budget on a campaign',
        severity: 'error',
      });
    }

    if (data.bid_strategy && BID_CAP_STRATEGIES.has(data.bid_strategy)) {
      if (!data.bid_amount && !data.bid_constraints) {
        errors.push({
          field: 'bid_strategy',
          message: `${data.bid_strategy} requires a bid amount. Set a bid amount or switch to Lowest Cost.`,
          severity: 'error',
        });
      }
    }

    // special_ad_categories: NONE must not coexist with real categories
    const cats: string[] = data.special_ad_categories || [];
    const realCats = cats.filter((c: string) => c !== 'NONE');
    if (realCats.length > 0 && cats.includes('NONE')) {
      errors.push({
        field: 'special_ad_categories',
        message: '"None" should be removed when real special ad categories are selected.',
        severity: 'warning',
      });
    }

    if (campaign.metaId) {
      for (const field of IMMUTABLE_CAMPAIGN_FIELDS) {
        if (data[`_original_${field}`] !== undefined &&
            JSON.stringify(data[field]) !== JSON.stringify(data[`_original_${field}`])) {
          errors.push({
            field,
            message: `${field} is immutable after publishing. Current Meta value will be kept. To change it, delete the Meta objects and re-publish.`,
            severity: 'warning',
          });
        }
      }
    }

    return errors;
  }

  static async validateAdSet(adSet: DraftAdSet, campaignObjective?: string, isCBO?: boolean): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const data = adSet.data as any;

    if (!adSet.name) {
      errors.push({ field: 'name', message: 'Ad Set name is required', severity: 'error' });
    }

    if (!data.billing_event) {
      errors.push({ field: 'billing_event', message: 'Billing event is required', severity: 'error' });
    }

    if (!data.optimization_goal) {
      errors.push({ field: 'optimization_goal', message: 'Optimization goal is required', severity: 'error' });
    }

    if (!data.targeting) {
      errors.push({ field: 'targeting', message: 'Targeting is required', severity: 'error' });
    }

    if (campaignObjective && data.optimization_goal) {
      const validGoals = VALID_OPTIMIZATION_GOALS[campaignObjective];
      if (validGoals && !validGoals.includes(data.optimization_goal)) {
        errors.push({
          field: 'optimization_goal',
          message: `${data.optimization_goal} is not valid for ${campaignObjective}. Valid options: ${validGoals.join(', ')}`,
          severity: 'error',
        });
      }
    }

    if (campaignObjective && data.destination_type) {
      const validDestinations = VALID_DESTINATION_TYPES[campaignObjective];
      if (validDestinations && !validDestinations.includes(data.destination_type)) {
        errors.push({
          field: 'destination_type',
          message: `${data.destination_type} is not valid for ${campaignObjective}. Valid options: ${validDestinations.join(', ')}`,
          severity: 'error',
        });
      }
    }

    if (campaignObjective) {
      const requiredFields = PROMOTED_OBJECT_REQUIREMENTS[campaignObjective] || [];
      if (requiredFields.length > 0) {
        if (!data.promoted_object) {
          errors.push({
            field: 'promoted_object',
            message: `promoted_object with ${requiredFields.join(' or ')} is required for ${campaignObjective}`,
            severity: 'error',
          });
        } else {
          const hasRequired = requiredFields.some((f: string) => data.promoted_object[f]);
          if (!hasRequired) {
            errors.push({
              field: 'promoted_object',
              message: `promoted_object must include ${requiredFields.join(' or ')} for ${campaignObjective}`,
              severity: 'error',
            });
          }
        }
      }
    }

    if (!isCBO && data.bid_strategy && BID_CAP_STRATEGIES.has(data.bid_strategy)) {
      if (!data.bid_amount && !data.bid_constraints) {
        errors.push({
          field: 'bid_amount',
          message: `${data.bid_strategy} requires bid_amount or bid_constraints`,
          severity: 'error',
        });
      }
    }

    if (campaignObjective && data.attribution_spec) {
      if (!ATTRIBUTION_SPEC_OBJECTIVES.has(campaignObjective)) {
        errors.push({
          field: 'attribution_spec',
          message: `attribution_spec is not supported for ${campaignObjective} and will be rejected by Meta`,
          severity: 'warning',
        });
      }
    }

    if (isCBO) {
      if (data.daily_budget || data.lifetime_budget) {
        errors.push({
          field: 'budget',
          message: 'Ad set budgets are not allowed under CBO campaigns. Budget is managed at campaign level.',
          severity: 'error',
        });
      }
    } else if (isCBO === false) {
      const hasDailyBudget = data.daily_budget && Number(data.daily_budget) > 0;
      const hasLifetimeBudget = data.lifetime_budget && Number(data.lifetime_budget) > 0;
      if (!hasDailyBudget && !hasLifetimeBudget) {
        errors.push({
          field: 'budget',
          message: 'Ad set budget (daily or lifetime) is required for non-CBO campaigns',
          severity: 'warning',
        });
      }
      if (hasDailyBudget && hasLifetimeBudget) {
        errors.push({
          field: 'budget',
          message: 'Cannot set both daily_budget and lifetime_budget on an ad set',
          severity: 'error',
        });
      }
    }

    // ─── Targeting conflict checks (mirrors DraftPublishService.resolveTargetingConflicts) ───
    const targeting = data.targeting || {};
    const advantageAudience = targeting.targeting_automation?.advantage_audience;

    if (advantageAudience === 1) {
      if (targeting.age_min > 25) {
        errors.push({
          field: 'targeting',
          message: 'Advantage+ Audience limits minimum age to 25. Lower the age or turn off Advantage Audience.',
          severity: 'warning',
        });
      }
      if (targeting.publisher_platforms?.length > 0) {
        errors.push({
          field: 'targeting',
          message: 'Advantage+ Audience does not support manual platform selection. Remove platforms or turn off Advantage Audience.',
          severity: 'warning',
        });
      }
      const genders: string[] = targeting.genders || [];
      if (genders.length > 0 && !(genders.length === 1 && String(genders[0]) === '0')) {
        errors.push({
          field: 'targeting',
          message: 'Advantage+ Audience does not support narrow gender targeting. Remove gender filter or turn off Advantage Audience.',
          severity: 'warning',
        });
      }
    }

    const platforms: string[] = targeting.publisher_platforms || [];
    if (platforms.length > 0 && !platforms.includes('facebook')) {
      if (platforms.includes('messenger') || platforms.includes('audience_network')) {
        errors.push({
          field: 'targeting',
          message: 'Messenger and Audience Network require Facebook to also be selected as a platform.',
          severity: 'warning',
        });
      }
    }

    const geoCountries: string[] = targeting.geo_locations?.countries || [];
    if (geoCountries.includes('TH') && targeting.age_min && targeting.age_min < 20) {
      errors.push({
        field: 'targeting',
        message: 'Thailand requires minimum age of 20.',
        severity: 'error',
      });
    }

    // lifetime_budget requires end_time
    if (!isCBO && data.lifetime_budget && Number(data.lifetime_budget) > 0 && !data.end_time) {
      errors.push({
        field: 'end_time',
        message: 'Lifetime budget requires an end time to be set.',
        severity: 'error',
      });
    }

    if (adSet.metaId) {
      for (const field of IMMUTABLE_ADSET_FIELDS) {
        if (field === 'campaign_id') continue;
        if (data[`_original_${field}`] !== undefined &&
            JSON.stringify(data[field]) !== JSON.stringify(data[`_original_${field}`])) {
          errors.push({
            field,
            message: `${field} is immutable after publishing and cannot be updated on Meta`,
            severity: 'warning',
          });
        }
      }
    }

    return errors;
  }

  static async validateAd(ad: DraftAd): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const data = ad.data as any;

    if (!ad.name) {
      errors.push({ field: 'name', message: 'Ad name is required', severity: 'error' });
    }

    if (!data.creative) {
      errors.push({ field: 'creative', message: 'Creative is required', severity: 'error' });
    } else if (!data.creative.id && !data.creative.creative_id && !data.creative.object_story_spec) {
      errors.push({ field: 'creative', message: 'Creative must have a creative_id or object_story_spec', severity: 'error' });
    }

    return errors;
  }

  static async validateFullDraft(campaign: any): Promise<{
    campaignErrors: ValidationError[];
    adSetErrors: Record<string, ValidationError[]>;
    adErrors: Record<string, ValidationError[]>;
    isValid: boolean;
  }> {
    const campaignErrors = await this.validateCampaign(campaign);
    const adSetErrors: Record<string, ValidationError[]> = {};
    const adErrors: Record<string, ValidationError[]> = {};

    let isValid = campaignErrors.every(e => e.severity !== 'error');

    if (campaign.adSets) {
      const campaignData = campaign.data as any;
      const campaignObjective = campaignData?.objective || campaign.objective;
      const isCBO = !!(campaignData.daily_budget || campaignData.lifetime_budget);

      // Cross-validate: special_ad_category_country must cover ad set targeting countries
      const cats: string[] = campaignData.special_ad_categories || [];
      const realCats = cats.filter((c: string) => c !== 'NONE');
      if (realCats.length > 0) {
        const sacCountries: string[] = campaignData.special_ad_category_country || [];
        for (const adSet of campaign.adSets) {
          const adSetTargeting = (adSet.data as any)?.targeting;
          const adSetCountries: string[] = adSetTargeting?.geo_locations?.countries || [];
          const missing = adSetCountries.filter((c: string) => sacCountries.length > 0 ? !sacCountries.includes(c) : true);
          if (missing.length > 0 && sacCountries.length === 0) {
            campaignErrors.push({
              field: 'special_ad_category_country',
              message: `Special Ad Categories require country selection. Ad set "${adSet.name}" targets ${missing.join(', ')} but no Special Ad Category countries are set.`,
              severity: 'warning',
            });
            break;
          }
        }
      }

      for (const adSet of campaign.adSets) {
        const errors = await this.validateAdSet(adSet, campaignObjective, isCBO);
        adSetErrors[adSet.id] = errors;
        if (errors.some(e => e.severity === 'error')) isValid = false;

        if (adSet.ads) {
          for (const ad of adSet.ads) {
            const errors = await this.validateAd(ad);
            adErrors[ad.id] = errors;
            if (errors.some(e => e.severity === 'error')) isValid = false;
          }
        }
      }
    }

    return { campaignErrors, adSetErrors, adErrors, isValid };
  }
}
