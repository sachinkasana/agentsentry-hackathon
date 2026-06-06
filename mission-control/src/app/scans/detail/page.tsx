"use client";

import { Text, Card, Badge, Button } from "@fluentui/react-components";
import { ArrowLeft20Regular } from "@fluentui/react-icons";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { getAgent, getScan } from "@/lib/api";
import { PostureGauge } from "@/components/PostureGauge";
import { FindingsTable } from "@/components/FindingsTable";
import { AttackCoverageChart } from "@/components/AttackCoverageChart";
import { ThemeCoverageSummary } from "@/components/ThemeCoverageSummary";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import type { Agent, Scan } from "@/types/api";

function ScanDetailContent() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scanId");

  const [scan, setScan] = useState<Scan | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!scanId) return;
    setLoading(true);
    setError(null);
    try {
      const scanData = await getScan(scanId);
      setScan(scanData);
      try {
        const agentData = await getAgent(scanData.agent_id);
        setAgent(agentData);
      } catch {
        setAgent(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scan");
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!scanId) {
    return <ErrorState message="Missing scanId query parameter." />;
  }

  if (loading) return <LoadingState label="Loading scan results…" />;
  if (error || !scan) {
    return <ErrorState message={error ?? "Scan not found"} onRetry={load} />;
  }

  const vulnerable = scan.findings.filter((f) => f.status === "vulnerable").length;
  const defended = scan.findings.filter((f) => f.status === "defended").length;

  return (
    <div>
      {agent && (
        <Link href={`/agents/detail/?agentId=${encodeURIComponent(agent.id)}`}>
          <Button appearance="subtle" icon={<ArrowLeft20Regular />} style={{ marginBottom: 16 }}>
            Back to {agent.name}
          </Button>
        </Link>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 24 }}>
        <div>
          <Text as="h1" size={700} weight="semibold" block>
            Scan Results
          </Text>
          <Text size={200}>{scan.id}</Text>
          {agent && (
            <Text block style={{ marginTop: 8 }}>
              Agent: <strong>{agent.name}</strong>
            </Text>
          )}
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge appearance="outline">{scan.status}</Badge>
            {scan.defense_enabled && (
              <Badge appearance="filled" color="success">
                Runtime Guard ON
              </Badge>
            )}
            <Text size={200}>
              {new Date(scan.started_at).toLocaleString()}
            </Text>
          </div>
        </div>
        <PostureGauge score={scan.posture_score} />
      </div>

      {scan.defense_enabled && scan.posture_score != null && scan.posture_score >= 70 && (
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <Text weight="semibold">Scan + Guard demo</Text>
          <Text block size={300}>
            This scan ran with Runtime Guard enabled. Re-run the same attacks
            without guard to compare posture (typically 0 vs defended).
          </Text>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card style={{ padding: 16 }}>
          <Text size={200}>Findings</Text>
          <Text size={600} weight="semibold">{scan.findings.length}</Text>
        </Card>
        <Card style={{ padding: 16 }}>
          <Text size={200}>Vulnerable</Text>
          <Text size={600} weight="semibold" style={{ color: "#d13438" }}>{vulnerable}</Text>
        </Card>
        <Card style={{ padding: 16 }}>
          <Text size={200}>Defended</Text>
          <Text size={600} weight="semibold" style={{ color: "#107c10" }}>{defended}</Text>
        </Card>
      </div>

      {scan.error && (
        <Card style={{ padding: 16, marginBottom: 16, borderColor: "#d13438" }}>
          <Text weight="semibold">Scan error</Text>
          <Text>{scan.error}</Text>
        </Card>
      )}

      {scan.findings.length > 0 && (
        <>
          <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: 12 }}>
            Attack coverage
          </Text>
          <div style={{ marginBottom: 32 }}>
            <AttackCoverageChart findings={scan.findings} scanId={scan.id} />
          </div>

          <div style={{ marginBottom: 32 }}>
            <ThemeCoverageSummary findings={scan.findings} />
          </div>
        </>
      )}

      <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: 12 }}>
        Findings table
      </Text>
      {scan.findings.length === 0 ? (
        <Text>No findings recorded for this scan.</Text>
      ) : (
        <FindingsTable findings={scan.findings} scanId={scan.id} />
      )}
    </div>
  );
}

export default function ScanDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading scan…" />}>
      <ScanDetailContent />
    </Suspense>
  );
}
