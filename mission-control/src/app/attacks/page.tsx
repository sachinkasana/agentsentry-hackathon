"use client";

import {
  Badge,
  Card,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { ShieldTask20Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useState } from "react";
import { listAttacks } from "@/lib/api";
import {
  formatCategory,
  getThemeColor,
  groupAttacksByCategory,
  severityRank,
} from "@/lib/attacks";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import type { AttackMetadata } from "@/types/api";

const useStyles = makeStyles({
  header: {
    marginBottom: tokens.spacingVerticalXL,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalXL,
  },
  statCard: {
    padding: tokens.spacingHorizontalM,
  },
  section: {
    marginBottom: tokens.spacingVerticalXL,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: tokens.spacingHorizontalM,
  },
  attackCard: {
    padding: tokens.spacingHorizontalM,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    height: "100%",
  },
  description: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    flex: 1,
  },
  meta: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
});

export default function AttackPackPage() {
  const styles = useStyles();
  const [attacks, setAttacks] = useState<AttackMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const registry = await listAttacks();
      setAttacks(
        [...registry].sort((a, b) => severityRank(b.severity) - severityRank(a.severity)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attack pack");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Loading attack pack…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const grouped = groupAttacksByCategory(attacks);
  const criticalCount = attacks.filter((a) => a.severity === "critical").length;

  return (
    <div>
      <div className={styles.header}>
        <Text as="h1" size={700} weight="semibold" block>
          Agentic Attack Pack
        </Text>
        <Text block size={300}>
          PyRIT-compatible red-team scenarios covering OWASP agentic threats —
          indirect injection, tool poisoning, exfiltration, identity spoofing,
          memory poisoning, and confused deputy.
        </Text>
      </div>

      <div className={styles.stats}>
        <Card className={styles.statCard}>
          <Text size={200}>Total attacks</Text>
          <Text size={600} weight="semibold">
            {attacks.length}
          </Text>
        </Card>
        <Card className={styles.statCard}>
          <Text size={200}>Critical severity</Text>
          <Text size={600} weight="semibold" style={{ color: "#d13438" }}>
            {criticalCount}
          </Text>
        </Card>
        <Card className={styles.statCard}>
          <Text size={200}>Theme areas</Text>
          <Text size={600} weight="semibold">
            {grouped.size}
          </Text>
        </Card>
      </div>

      {[...grouped.entries()].map(([category, categoryAttacks]) => (
        <div key={category} className={styles.section}>
          <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: 12 }}>
            {formatCategory(category)}
          </Text>
          <div className={styles.grid}>
            {categoryAttacks.map((attack) => (
              <Card key={attack.id} className={styles.attackCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ShieldTask20Regular />
                  <Text weight="semibold">{attack.name}</Text>
                </div>
                <div className={styles.meta}>{attack.id}</div>
                <Text className={styles.description}>{attack.description}</Text>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge
                    appearance="outline"
                    color={attack.severity === "critical" ? "danger" : "warning"}
                  >
                    {attack.severity}
                  </Badge>
                  <Badge appearance="tint" color={getThemeColor(attack.theme_mapping)}>
                    {attack.theme_mapping}
                  </Badge>
                  {attack.cwe && (
                    <Badge appearance="outline">{attack.cwe}</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
