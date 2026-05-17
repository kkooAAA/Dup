# Optimization Goals

The `optimization_goal` field on adsets tells Meta what to optimize for. Valid goals depend on the campaign objective.

## Valid Goals by Objective

| Objective | Valid Optimization Goals |
|-----------|------------------------|
| OUTCOME_AWARENESS | REACH, IMPRESSIONS, AD_RECALL_LIFT, THRUPLAY |
| OUTCOME_TRAFFIC | LINK_CLICKS, LANDING_PAGE_VIEWS, REACH, IMPRESSIONS, OFFSITE_CONVERSIONS |
| OUTCOME_ENGAGEMENT | POST_ENGAGEMENT, VIDEO_VIEWS, THRUPLAY, MESSAGES, REACH, IMPRESSIONS |
| OUTCOME_LEADS | LEAD_GENERATION, OFFSITE_CONVERSIONS, LINK_CLICKS, QUALITY_LEAD, QUALITY_CALL |
| OUTCOME_SALES | OFFSITE_CONVERSIONS, VALUE, LINK_CLICKS, CONVERSATIONS |
| OUTCOME_APP_PROMOTION | APP_INSTALLS, LINK_CLICKS, OFFSITE_CONVERSIONS, VALUE, APP_INSTALLS_AND_OFFSITE_CONVERSIONS |

## Migration Map

When converting between objectives, the current optimization_goal may not be valid for the target. The migration map provides the closest equivalent:

| Source Goal | Maps To |
|-------------|---------|
| LANDING_PAGE_VIEWS | LINK_CLICKS |
| AD_RECALL_LIFT | REACH |
| QUALITY_LEAD | LEAD_GENERATION |
| QUALITY_CALL | LEAD_GENERATION |
| CONVERSATIONS | OFFSITE_CONVERSIONS |
| APP_INSTALLS_AND_OFFSITE_CONVERSIONS | APP_INSTALLS |

Goals that map to themselves (LINK_CLICKS → LINK_CLICKS, REACH → REACH, etc.) are kept as-is if valid for the target objective. If neither the original nor the mapped goal is valid, the objective's default goal is used.

## Migration Logic

`migrateOptimizationGoal(currentGoal, targetObjective)` in [[meta-field-registry]]:
1. If `currentGoal` is valid for `targetObjective` → keep it
2. If `OPTIMIZATION_GOAL_MIGRATION[currentGoal]` is valid → use the mapped value
3. Else → fall back to `OBJECTIVE_DEFAULTS[targetObjective].optimization_goal`

## Bid Strategy Interaction

Certain bid strategies require `bid_amount` to be set:
- LOWEST_COST_WITH_BID_CAP (Bid Cap)
- COST_CAP (Cost Per Result Goal)
- LOWEST_COST_WITH_MIN_ROAS (ROAS Goal)

Defined in `BID_CAP_STRATEGIES` in [[meta-field-registry]].

## Labels

| Value | Display Label |
|-------|-------------|
| REACH | Reach |
| IMPRESSIONS | Impressions |
| AD_RECALL_LIFT | Ad Recall Lift |
| THRUPLAY | ThruPlay |
| LINK_CLICKS | Link Clicks |
| LANDING_PAGE_VIEWS | Landing Page Views |
| OFFSITE_CONVERSIONS | Conversions |
| POST_ENGAGEMENT | Post Engagement |
| VIDEO_VIEWS | Video Views |
| MESSAGES | Messages |
| LEAD_GENERATION | Lead Generation |
| QUALITY_LEAD | Quality Lead |
| QUALITY_CALL | Quality Call |
| VALUE | Value |
| CONVERSATIONS | Conversations |
| APP_INSTALLS | App Installs |
| APP_INSTALLS_AND_OFFSITE_CONVERSIONS | App Installs & Conversions |

## Related Pages

- [[objectives]] — which objectives support which goals
- [[destination-types]] — engagement objective infers destination from optimization goal
- [[meta-field-registry]] — VALID_OPTIMIZATION_GOALS and migration maps
