import { tokens } from "@fluentui/react-components";

export type PostureLevel = "critical" | "warning" | "good" | "unknown";

export function getPostureLevel(score: number | null | undefined): PostureLevel {
  if (score == null) return "unknown";
  if (score < 40) return "critical";
  if (score < 70) return "warning";
  return "good";
}

/** Foreground colors tuned for webDarkTheme surfaces. */
export function getPostureColor(score: number | null | undefined): string {
  const level = getPostureLevel(score);
  switch (level) {
    case "critical":
      return tokens.colorPaletteRedForeground1;
    case "warning":
      return tokens.colorPaletteDarkOrangeForeground1;
    case "good":
      return tokens.colorPaletteGreenForeground1;
    default:
      return tokens.colorNeutralForeground3;
  }
}

export function formatPostureScore(score: number | null | undefined): string {
  if (score == null) return "—";
  return `${Math.round(score)}`;
}
