"use client";

import {
  Text,
  Card,
  makeStyles,
  tokens,
  Button,
  Badge,
} from "@fluentui/react-components";
import { ArrowRight20Regular } from "@fluentui/react-icons";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listAgents, listAttacks, listScans } from "@/lib/api";
import { PostureGauge } from "@/components/PostureGauge";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { getPostureColor } from "@/lib/posture";
import type { Agent, Scan } from "@/types/api";

const useStyles = makeStyles({
  header: {
    marginBottom: tokens.spacingVerticalXL,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalXL,
  },
  statCard: {
    padding: tokens.spacingHorizontalL,
  },
  statValue: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightBold,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: tokens.spacingHorizontalL,
  },
  agentCard: {
    padding: tokens.spacingHorizontalL,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  agentMeta: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

function latestScanForAgent(scans: Scan[], agentId: string): Scan | undefined {
  return scans
    .filter((s) => s.agent_id === agentId)
    .sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    )[0];
}

export default function FleetPage() {
  const styles = useStyles();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [attackCount, setAttackCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentList, scanList, attacks] = await Promise.all([
        listAgents(),
        listScans(),
        listAttacks().catch(() => []),
      ]);
      setAgents(agentList);
      setScans(scanList);
      setAttackCount(attacks.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fleet data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Loading fleet overview…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const latestScores = agents
    .map((a) => latestScanForAgent(scans, a.id)?.posture_score)
    .filter((s): s is number => s != null);
  const avgPosture =
    latestScores.length > 0
      ? latestScores.reduce((a, b) => a + b, 0) / latestScores.length
      : null;

  const criticalCount = scans
    .flatMap((s) => s.findings)
    .filter((f) => f.severity === "critical" && f.status === "vulnerable")
    .length;

  return (
    <div>
      <div className={styles.header}>
        <Text as="h1" size={700} weight="semibold" block>
          Fleet Overview
        </Text>
        <Text block size={300}>
          Scan + Guard + Audit — one pane of glass for your agent fleet.
          {attackCount != null && attackCount > 0 && (
            <> Run all {attackCount} agentic attacks from the{" "}
              <Link href="/attacks/">Attack Pack</Link>.</>
          )}
        </Text>
      </div>

      <div className={styles.stats}>
        <Card className={styles.statCard}>
          <Text size={200}>Registered Agents</Text>
          <Text className={styles.statValue}>{agents.length}</Text>
        </Card>
        <Card className={styles.statCard}>
          <Text size={200}>Fleet Posture (avg)</Text>
          <PostureGauge score={avgPosture} size="small" />
        </Card>
        <Card className={styles.statCard}>
          <Text size={200}>Critical Vulnerabilities</Text>
          <Text className={styles.statValue} style={{ color: "#d13438" }}>
            {criticalCount}
          </Text>
        </Card>
        <Card className={styles.statCard}>
          <Text size={200}>Attack Pack</Text>
          <Text className={styles.statValue}>{attackCount ?? "—"}</Text>
        </Card>
        <Card className={styles.statCard}>
          <Text size={200}>Total Scans</Text>
          <Text className={styles.statValue}>{scans.length}</Text>
        </Card>
      </div>

      {agents.length === 0 ? (
        <EmptyState
          title="No agents registered"
          description="Register your first agent to begin pre-deploy security scanning."
          action={
            <Link href="/agents/">
              <Button appearance="primary">Register agent</Button>
            </Link>
          }
        />
      ) : (
        <div className={styles.grid}>
          {agents.map((agent) => {
            const latest = latestScanForAgent(scans, agent.id);
            const score = latest?.posture_score;
            return (
              <Card key={agent.id} className={styles.agentCard}>
                <div>
                  <Text weight="semibold" size={400}>
                    {agent.name}
                  </Text>
                  <div className={styles.agentMeta}>{agent.endpoint}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Badge appearance="outline">{agent.framework}</Badge>
                    {agent.tools.map((t) => (
                      <Badge key={t} appearance="tint" color="informative">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <PostureGauge score={score} size="small" />
                  {latest && (
                    <Text size={200} style={{ color: getPostureColor(score) }}>
                      Last scan {new Date(latest.started_at).toLocaleDateString()}
                    </Text>
                  )}
                </div>
                <Link href={`/agents/detail/?agentId=${encodeURIComponent(agent.id)}`}>
                  <Button appearance="primary" icon={<ArrowRight20Regular />} iconPosition="after">
                    View agent
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
