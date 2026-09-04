export function formatTime(epochms: number): string {
  if (!epochms) return "—";
  return new Date(epochms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const RULE_LABELS: Record<string, string> = {
  passed: "Passed",
  banned_account: "Banned account",
  score_bounds: "Score bounds",
  rate_limit: "Rate limit",
  replay_consistency: "Replay consistency",
};

export function ruleLabel(rule: string): string {
  return RULE_LABELS[rule] ?? rule;
}

const REGIONS = ["na", "eu", "apac"] as const;
export const REGION_OPTIONS = REGIONS;

export function regionLabel(region: string): string {
  const map: Record<string, string> = { na: "North America", eu: "Europe", apac: "Asia-Pacific" };
  return map[region] ?? region.toUpperCase();
}
