"use client";

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
import { getFindingStatusSurface } from "@/lib/statusSurfaces";
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
  title: {
    color: tokens.colorNeutralForeground1,
  },
  meta: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  badges: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
    flexWrap: "wrap",
  },
  traceLink: {
    color: tokens.colorBrandForegroundLink,
    fontSize: tokens.fontSizeBase300,
    marginTop: tokens.spacingVerticalXS,
    textDecoration: "none",
    ":hover": {
      color: tokens.colorBrandForegroundLinkHover,
      textDecoration: "underline",
    },
  },
});

function StatusIcon({
  status,
  color,
}: {
  status: Finding["status"];
  color: string;
}) {
  switch (status) {
    case "vulnerable":
      return <DismissCircle20Filled style={{ color }} />;
    case "defended":
      return <CheckmarkCircle20Filled style={{ color }} />;
    default:
      return <Warning20Filled style={{ color }} />;
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
      {sorted.map((finding) => {
        const surface = getFindingStatusSurface(finding.status);
        return (
          <Card
            key={finding.id}
            className={styles.card}
            style={{
              borderColor: surface.borderColor,
              backgroundColor: surface.backgroundColor,
            }}
          >
            <div className={styles.header}>
              <div>
                <Text weight="semibold" className={styles.title}>
                  {finding.attack_name}
                </Text>
                <div className={styles.meta}>{finding.attack_id}</div>
              </div>
              <StatusIcon status={finding.status} color={surface.iconColor} />
            </div>
            <div className={styles.badges}>
              <Badge appearance="outline" color="danger">
                {finding.severity}
              </Badge>
              <Badge appearance="tint">{formatCategory(finding.category)}</Badge>
            </div>
            <Link
              href={`/findings/detail/?scanId=${encodeURIComponent(scanId)}&findingId=${encodeURIComponent(finding.id)}`}
              className={styles.traceLink}
            >
              View evidence trace →
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
