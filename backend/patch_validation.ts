import * as fs from 'fs';

let content = fs.readFileSync('src/services/draft/DraftValidationEngine.ts', 'utf8');

// Add getEffectiveData helper
const helperStr = `
  private static getEffectiveData(item: { metaId?: string | null, data: any }, immutableFields: string[]) {
    const data = { ...item.data };
    if (item.metaId) {
      for (const field of immutableFields) {
        if (data[\`_original_\${field}\`] !== undefined) {
          data[field] = data[\`_original_\${field}\`];
        }
      }
    }
    return data;
  }

  static async validateCampaign(campaign: DraftCampaign): Promise<ValidationError[]> {
`;

content = content.replace('  static async validateCampaign(campaign: DraftCampaign): Promise<ValidationError[]> {', helperStr);

// In validateCampaign, change `data` to `effectiveData`
content = content.replace(
  'const data = campaign.data as any;',
  'const rawData = campaign.data as any;\n    const data = this.getEffectiveData(campaign, IMMUTABLE_CAMPAIGN_FIELDS);'
);

// In validateCampaign warning check
content = content.replace(
  /if \(data\[`_original_\${field}`\] !== undefined &&\s*JSON.stringify\(data\[field\]\) !== JSON.stringify\(data\[`_original_\${field}`\]\)\) \{/g,
  `if (rawData[\`_original_\${field}\`] !== undefined &&
            JSON.stringify(rawData[field]) !== JSON.stringify(rawData[\`_original_\${field}\`])) {`
);

// In validateAdSet
content = content.replace(
  'const data = adSet.data as any;',
  'const rawData = adSet.data as any;\n    const data = this.getEffectiveData(adSet, IMMUTABLE_ADSET_FIELDS);'
);

// In validateAdSet warning check
content = content.replace(
  /if \(data\[`_original_\${field}`\] !== undefined &&\s*JSON.stringify\(data\[field\]\) !== JSON.stringify\(data\[`_original_\${field}`\]\)\) \{/g,
  `if (rawData[\`_original_\${field}\`] !== undefined &&
            JSON.stringify(rawData[field]) !== JSON.stringify(rawData[\`_original_\${field}\`])) {`
);

// Remove the manual effectiveDestType check we added earlier in validateFullDraft because validateAdSet already handles it?
// Wait, we modified validateFullDraft earlier! Let's check validateFullDraft line 652.
content = content.replace(
  `const adSetData = adSet.data as any;
          const adSetDestType = adSet.metaId && adSetData._original_destination_type !== undefined
            ? adSetData._original_destination_type
            : adSetData?.destination_type;`,
  `const adSetData = this.getEffectiveData(adSet, IMMUTABLE_ADSET_FIELDS);
          const adSetDestType = adSetData?.destination_type;`
);

fs.writeFileSync('src/services/draft/DraftValidationEngine.ts', content);
