export function extractMetaError(error: any, context?: string): string {
  const errData = error.response?.data?.error;
  const detail = errData
    ? `${errData.message} (code ${errData.code}/${errData.error_subcode ?? '-'})${errData.error_user_msg ? ': ' + errData.error_user_msg : ''}`
    : error.message;
  return context ? `${context}: ${detail}` : detail;
}
