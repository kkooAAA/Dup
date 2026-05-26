export interface MetaErrorInfo {
  message: string;
  userMessage: string;
  detail: string;
}

export function extractMetaError(error: any, context?: string): string {
  const info = extractMetaErrorInfo(error, context);
  return info.detail;
}

export function extractMetaErrorInfo(error: any, context?: string): MetaErrorInfo {
  const errData = error.response?.data?.error;

  if (!errData) {
    const msg = error.message || 'Unknown error';
    return { message: msg, userMessage: msg, detail: msg };
  }

  const detail = `${errData.message} (code ${errData.code}/${errData.error_subcode ?? '-'})${errData.error_user_msg ? ': ' + errData.error_user_msg : ''}`;
  const fullDetail = context ? `${context}: ${detail}` : detail;

  const userMessage = errData.error_user_msg
    || errData.error_user_title
    || humanizeMetaError(errData)
    || errData.message;

  return {
    message: fullDetail,
    userMessage,
    detail: fullDetail,
  };
}

const ERROR_PATTERNS: [RegExp | number, string][] = [
  [2909035, 'Special Ad Category countries must match your ad set targeting locations. Update the countries in campaign settings or change the ad set targeting.'],
  [1870227, 'Please set Advantage Audience to on or off in targeting settings.'],
  [1870188, 'Advantage+ Audience limits minimum age to 25. Lower the minimum age or turn off Advantage Audience.'],
  [1815985, 'Messenger or Audience Network placements require Facebook to also be selected. Add Facebook to your platforms or remove Messenger/Audience Network.'],
  [/promoted_object.*required/i, 'This objective requires a promoted object (e.g. Pixel, Page, or App). Please configure it in the ad set.'],
  [/bid_amount.*required/i, 'Your bid strategy requires a bid amount. Set a bid amount or switch to Lowest Cost.'],
  [/instagram_actor_id.*valid Instagram account id/i, 'Invalid Instagram ID. Please provide the "Instagram Business Account ID" (found in Business Settings > Instagram Accounts) instead of the standard Instagram User ID.'],
];

function humanizeMetaError(errData: any): string | undefined {
  const subcode = errData.error_subcode;
  const msg = errData.message || '';

  for (const [pattern, friendly] of ERROR_PATTERNS) {
    if (typeof pattern === 'number' && subcode === pattern) return friendly;
    if (pattern instanceof RegExp && pattern.test(msg)) return friendly;
  }
  return undefined;
}
