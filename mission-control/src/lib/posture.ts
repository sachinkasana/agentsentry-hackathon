export type PostureLevel = "critical" | "warning" | "good" | "unknown";

export function getPostureLevel(score: number | null | undefined): PostureLevel {
  if (score == null) return "unknown";
  if (score < 40) return "critical";
  if (score < 70) return "warning";
  return "good";
}

export function getPostureColor(score: number | null | undefined): string {
  const level = getPostureLevel(score);
  switch (level) {
    case "critical":
      return "#d13438";
    case "warning":
      return "#ca5010";
    case "good":
      return "#107c10";
    default:
      return "#616161";
  }
}

export function formatPostureScore(score: number | null | undefined): string {
  if (score == null) return "—";
  return `${Math.round(score)}`;
}
