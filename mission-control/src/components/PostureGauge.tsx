"use client";

import {
  Text,
  makeStyles,
  tokens,
  ProgressBar,
} from "@fluentui/react-components";
import {
  formatPostureScore,
  getPostureColor,
  getPostureLevel,
} from "@/lib/posture";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    minWidth: "120px",
  },
  score: {
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightBold,
    lineHeight: 1,
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

export function PostureGauge({
  score,
  label = "Posture Score",
  size = "large",
}: {
  score: number | null | undefined;
  label?: string;
  size?: "large" | "small";
}) {
  const styles = useStyles();
  const color = getPostureColor(score);
  const level = getPostureLevel(score);
  const value = score ?? 0;

  if (size === "small") {
    return (
      <div className={styles.root}>
        <Text className={styles.score} style={{ color, fontSize: tokens.fontSizeBase500 }}>
          {formatPostureScore(score)}
        </Text>
        <ProgressBar value={value / 100} max={1} />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Text className={styles.label}>{label}</Text>
      <Text className={styles.score} style={{ color }}>
        {formatPostureScore(score)}
      </Text>
      <ProgressBar value={value / 100} max={1} />
      <Text size={200} style={{ color }}>
        {level === "unknown" ? "No scans yet" : level}
      </Text>
    </div>
  );
}
