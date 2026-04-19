/**
 * Shared classifier for guideline / consensus / standards documents by
 * source-of-publication. Used by both the disease viewer and the admin
 * editor so the bucket assignment is guaranteed to be consistent.
 *
 * Three buckets:
 *   - who: WHO / IARC publications (international classification)
 *   - us:  Western professional bodies (NCCN / CAP / AJCC / ASCO / ESMO / NCI / UICC / USCAP)
 *   - cn:  Chinese authorities (CSCO / CACA / 中华医学会 / 国家卫健委 / 中国医师协会 / 临床肿瘤学会 / 抗癌协会)
 *
 * The classifier inspects organization first, falling back to title text.
 * Items without recognizable markers default to `cn` to avoid silently
 * landing in WHO/US buckets, since unknown items are most often Chinese
 * org names that fell outside our regex.
 */

export type ConsensusSource = 'who' | 'us' | 'cn';

export function classifyConsensusSource(
  organization?: string,
  title?: string,
): ConsensusSource {
  const blob = `${organization || ''} ${title || ''}`;
  if (/中华|中国|CSCO|CACA|卫健委|国家卫生健康|中国医师协会|临床肿瘤学会|抗癌协会/.test(blob)) return 'cn';
  if (/\bWHO\b|\bIARC\b|World Health Organization/i.test(blob)) return 'who';
  if (/\bNCCN\b|\bASCO\b|\bCAP\b|\bAJCC\b|\bUICC\b|\bUSCAP\b|\bNCI\b|\bESMO\b/i.test(blob)) return 'us';
  // Last resort: pure-ASCII organization → US-style; otherwise CN
  if (organization && !/[\u4e00-\u9fff]/.test(organization)) return 'us';
  return 'cn';
}

/**
 * Map an organization name fragment → its canonical official-site URL.
 * Used as a fallback `sourceUrl` for items that don't carry an explicit
 * URL (e.g. references parsed from `[国内指南]` text strings).
 */
export const KNOWN_ORG_URLS: Array<[RegExp, string]> = [
  [/CSCO|临床肿瘤学会/i, 'https://www.csco.org.cn/'],
  [/CACA|中国抗癌协会/i, 'http://www.caca.org.cn/'],
  [/卫健委|国家卫生健康委|卫生部/, 'http://www.nhc.gov.cn/'],
  [/中华医学会|CMA(?![-A-Z])/, 'https://www.cma.org.cn/'],
  [/中国医师协会|CMDA/i, 'http://www.cmda.net/'],
  [/中华病理学会|病理学分会/, 'https://www.cma.org.cn/'],
  [/\bWHO\b|IARC|World Health/i, 'https://tumourclassification.iarc.who.int/'],
  [/\bNCCN\b/i, 'https://www.nccn.org/guidelines/'],
  [/\bCAP\b|College of American Pathologists/i, 'https://www.cap.org/'],
  [/\bAJCC\b|cancerstaging/i, 'https://cancerstaging.org/'],
  [/\bASCO\b/i, 'https://www.asco.org/'],
  [/\bESMO\b/i, 'https://www.esmo.org/guidelines'],
  [/\bUICC\b/i, 'https://www.uicc.org/'],
];

export function lookupOrgUrl(org: string | undefined): string | undefined {
  if (!org) return undefined;
  for (const [re, url] of KNOWN_ORG_URLS) {
    if (re.test(org)) return url;
  }
  return undefined;
}
