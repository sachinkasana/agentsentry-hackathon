import type { AttackMetadata, Finding, FindingStatus } from "@/types/api";

export const THEME_KEYWORDS = [
  "prompt injection",
  "identity spoofing",
  "unauthorized access",
  "adversarial misuse",
] as const;

export type ThemeKeyword = (typeof THEME_KEYWORDS)[number];

const CATEGORY_LABELS: Record<string, string> = {
  prompt_injection: "Prompt Injection",
  identity_spoofing: "Identity Spoofing",
  unauthorized_access: "Unauthorized Access",
  adversarial_misuse: "Adversarial Misuse",
};

const THEME_COLORS: Record<string, "brand" | "danger" | "warning" | "informative" | "success"> = {
  "prompt injection": "danger",
  "identity spoofing": "warning",
  "unauthorized access": "danger",
  "adversarial misuse": "informative",
};

export function formatCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

export function getThemeColor(
  theme: string,
): "brand" | "danger" | "warning" | "informative" | "success" {
  return THEME_COLORS[theme.toLowerCase()] ?? "informative";
}

export function groupAttacksByCategory(
  attacks: AttackMetadata[],
): Map<string, AttackMetadata[]> {
  const groups = new Map<string, AttackMetadata[]>();
  for (const attack of attacks) {
    const key = attack.category;
    const list = groups.get(key) ?? [];
    list.push(attack);
    groups.set(key, list);
  }
  return groups;
}

export function summarizeThemeCoverage(findings: Finding[]): {
  theme: string;
  total: number;
  vulnerable: number;
  defended: number;
  error: number;
}[] {
  const byTheme = new Map<
    string,
    { total: number; vulnerable: number; defended: number; error: number }
  >();

  for (const finding of findings) {
    const theme = finding.category;
    const bucket = byTheme.get(theme) ?? {
      total: 0,
      vulnerable: 0,
      defended: 0,
      error: 0,
    };
    bucket.total += 1;
    if (finding.status === "vulnerable") bucket.vulnerable += 1;
    else if (finding.status === "defended") bucket.defended += 1;
    else bucket.error += 1;
    byTheme.set(theme, bucket);
  }

  return [...byTheme.entries()].map(([theme, counts]) => ({
    theme: formatCategory(theme),
    ...counts,
  }));
}

export function statusLabel(status: FindingStatus): string {
  switch (status) {
    case "vulnerable":
      return "Vulnerable";
    case "defended":
      return "Defended";
    default:
      return "Error";
  }
}

export function severityRank(severity: string): number {
  switch (severity.toLowerCase()) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

export function sortFindingsBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity),
  );
}
