"use client";

import type { CSSProperties } from "react";
import {
  Badge,
  Card,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  CheckmarkCircle20Filled,
  DismissCircle20Filled,
  Warning20Filled,
} from "@fluentui/react-icons";
import Link from "next/link";
import { formatCategory, sortFindingsBySeverity } from "@/lib/attacks";
import type { Finding } from "@/types/api";

const useStyles = makeStyles({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: tokens.spacingHorizontalM,
  },
  card: {
    padding: tokens.spacingHorizontalM,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.spacingHorizontalS,
  },
  meta: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

function cardAccent(status: Finding["status"]): CSSProperties {
  switch (status) {
    case "vulnerable":
      return {
        borderColor: "#d13438",
        backgroundColor: "#fdf3f4",
      };
    case "defended":
      return {
        borderColor: "#107c10",
        backgroundColor: "#f1faf1",
      };
    default:
      return {
        borderColor: "#ca5010",
        backgroundColor: "#fff9f5",
      };
  }
}

function StatusIcon({ status }: { status: Finding["status"] }) {
  switch (status) {
    case "vulnerable":
      return <DismissCircle20Filled style={{ color: "#d13438" }} />;
    case "defended":
      return <CheckmarkCircle20Filled style={{ color: "#107c10" }} />;
    default:
      return <Warning20Filled style={{ color: "#ca5010" }} />;
  }
}

export function AttackCoverageChart({
  findings,
  scanId,
}: {
  findings: Finding[];
  scanId: string;
}) {
  const styles = useStyles();
  const sorted = sortFindingsBySeverity(findings);

  if (sorted.length === 0) {
    return <Text>No attack results to display.</Text>;
  }

  return (
    <div className={styles.grid}>
      {sorted.map((finding) => (
          <Card
            key={finding.id}
            className={styles.card}
            style={cardAccent(finding.status)}
          >
            <div className={styles.header}>
              <div>
                <Text weight="semibold">{finding.attack_name}</Text>
                <div className={styles.meta}>{finding.attack_id}</div>
              </div>
              <StatusIcon status={finding.status} />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Badge appearance="outline" color="danger">
                {finding.severity}
              </Badge>
              <Badge appearance="tint">{formatCategory(finding.category)}</Badge>
            </div>
            <Link
              href={`/findings/detail/?scanId=${encodeURIComponent(scanId)}&findingId=${encodeURIComponent(finding.id)}`}
              style={{ fontSize: 13, marginTop: 4 }}
            >
              View evidence trace →
            </Link>
          </Card>
      ))}
    </div>
  );
}
