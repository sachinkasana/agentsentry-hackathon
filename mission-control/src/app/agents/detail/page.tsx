"use client";

import {
  Text,
  Card,
  Button,
  Badge,
  makeStyles,
  tokens,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@fluentui/react-components";
import { Play20Regular } from "@fluentui/react-icons";
import Link from "next/link";
import { ShieldTask20Regular } from "@fluentui/react-icons";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { getAgent, listScans } from "@/lib/api";
import { PostureGauge } from "@/components/PostureGauge";
import { ScanTriggerDialog } from "@/components/ScanTriggerDialog";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { getPostureColor } from "@/lib/posture";
import type { Agent, Scan } from "@/types/api";

const useStyles = makeStyles({
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalXL,
    flexWrap: "wrap",
  },
  meta: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  trend: {
    display: "flex",
    alignItems: "flex-end",
    gap: tokens.spacingHorizontalXS,
    height: "80px",
    marginTop: tokens.spacingVerticalM,
  },
  bar: {
    width: "24px",
    borderRadius: tokens.borderRadiusSmall,
    minHeight: "4px",
  },
  section: {
    marginTop: tokens.spacingVerticalXL,
  },
});

function AgentDetailContent() {
  const styles = useStyles();
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId");

  const [agent, setAgent] = useState<Agent | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const load = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    try {
      const [agentData, scanList] = await Promise.all([
        getAgent(agentId),
        listScans(agentId),
      ]);
      setAgent(agentData);
      setScans(
        scanList.sort(
          (a, b) =>
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!agentId) {
    return <ErrorState message="Missing agentId query parameter." />;
  }

  if (loading) return <LoadingState label="Loading agent…" />;
  if (error || !agent) {
    return <ErrorState message={error ?? "Agent not found"} onRetry={load} />;
  }

  const latestScore = scans[0]?.posture_score;
  const trendScans = [...scans].reverse().slice(-10);

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.meta}>
          <Text as="h1" size={700} weight="semibold">
            {agent.name}
          </Text>
          <Text size={200}>{agent.id}</Text>
          <Text>{agent.endpoint}</Text>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge appearance="outline">{agent.framework}</Badge>
            {agent.tools.map((t) => (
              <Badge key={t} appearance="tint">
                {t}
              </Badge>
            ))}
          </div>
          {agent.description && <Text size={300}>{agent.description}</Text>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
          <PostureGauge score={latestScore} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/attacks/">
              <Button appearance="subtle" icon={<ShieldTask20Regular />}>
                Attack Pack
              </Button>
            </Link>
            <Button
              appearance="primary"
              icon={<Play20Regular />}
              onClick={() => setScanOpen(true)}
            >
              Run scan
            </Button>
          </div>
        </div>
      </div>

      {trendScans.length > 0 && (
        <Card style={{ padding: 16 }}>
          <Text weight="semibold">Posture trend (last {trendScans.length} scans)</Text>
          <div className={styles.trend}>
            {trendScans.map((scan) => {
              const score = scan.posture_score ?? 0;
              return (
                <div
                  key={scan.id}
                  className={styles.bar}
                  title={`${score} — ${new Date(scan.started_at).toLocaleDateString()}`}
                  style={{
                    height: `${Math.max(score, 4)}%`,
                    backgroundColor: getPostureColor(score),
                  }}
                />
              );
            })}
          </div>
        </Card>
      )}

      <div className={styles.section}>
        <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: 12 }}>
          Scan history
        </Text>
        {scans.length === 0 ? (
          <Text>No scans yet. Run your first scan to assess posture.</Text>
        ) : (
          <Table aria-label="Scan history">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Scan ID</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Posture</TableHeaderCell>
                <TableHeaderCell>Findings</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.map((scan) => (
                <TableRow key={scan.id}>
                  <TableCell>
                    <Link href={`/scans/detail/?scanId=${encodeURIComponent(scan.id)}`}>
                      {scan.id}
                    </Link>
                  </TableCell>
                  <TableCell>{scan.status}</TableCell>
                  <TableCell>{scan.posture_score ?? "—"}</TableCell>
                  <TableCell>{scan.findings.length}</TableCell>
                  <TableCell>
                    {new Date(scan.started_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ScanTriggerDialog
        open={scanOpen}
        agentId={agent.id}
        agentName={agent.name}
        onClose={() => setScanOpen(false)}
        onScanComplete={(scan) => {
          router.push(`/scans/detail/?scanId=${encodeURIComponent(scan.id)}`);
        }}
      />
    </div>
  );
}

export default function AgentDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading agent…" />}>
      <AgentDetailContent />
    </Suspense>
  );
}
