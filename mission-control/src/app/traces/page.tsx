"use client";

import {
  Text,
  Tab,
  TabList,
  Card,
  Button,
  makeStyles,
  tokens,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
} from "@fluentui/react-components";
import { Open20Regular, Eye20Regular } from "@fluentui/react-icons";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listScans } from "@/lib/api";
import { getAppInsightsPortalUrl } from "@/lib/telemetry";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import type { Scan } from "@/types/api";

const useStyles = makeStyles({
  section: {
    marginTop: tokens.spacingVerticalL,
  },
});

export default function TracesPage() {
  const styles = useStyles();
  const [tab, setTab] = useState<"scan" | "telemetry">("scan");
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const portalUrl = getAppInsightsPortalUrl();
  const hasAppInsights = Boolean(
    process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listScans();
      setScans(
        data.sort(
          (a, b) =>
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load traces");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const findings = scans.flatMap((scan) =>
    scan.findings.map((f) => ({ scan, finding: f })),
  );

  return (
    <div>
      <Text as="h1" size={700} weight="semibold" block>
        Trace Explorer
      </Text>
      <Text block size={300} style={{ marginBottom: 16 }}>
        Scan decision traces from attack evidence and Application Insights
        telemetry for Mission Control UX events.
      </Text>

      <TabList
        selectedValue={tab}
        onTabSelect={(_, d) => setTab(d.value as "scan" | "telemetry")}
      >
        <Tab value="scan">Scan Traces</Tab>
        <Tab value="telemetry">Telemetry</Tab>
      </TabList>

      {loading && <LoadingState label="Loading traces…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && tab === "scan" && (
        <div className={styles.section}>
          {findings.length === 0 ? (
            <Text>No scan traces yet. Run a scan to generate evidence.</Text>
          ) : (
            <Table aria-label="Scan traces">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Attack</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Scan</TableHeaderCell>
                  <TableHeaderCell>Action</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map(({ scan, finding }) => (
                  <TableRow key={finding.id}>
                    <TableCell>{finding.attack_name}</TableCell>
                    <TableCell>
                      <Badge
                        color={
                          finding.status === "vulnerable" ? "danger" : "success"
                        }
                      >
                        {finding.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{scan.id}</TableCell>
                    <TableCell>
                      <Link
                        href={`/findings/detail/?scanId=${encodeURIComponent(scan.id)}&findingId=${encodeURIComponent(finding.id)}`}
                      >
                        <Button appearance="subtle" icon={<Eye20Regular />}>
                          View trace
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {!loading && tab === "telemetry" && (
        <div className={styles.section}>
          <Card style={{ padding: 24 }}>
            <Text weight="semibold" block style={{ marginBottom: 8 }}>
              Application Insights
            </Text>
            {hasAppInsights ? (
              <>
                <Text block style={{ marginBottom: 16 }}>
                  Mission Control emits custom events:{" "}
                  <code>scan_triggered</code>, <code>finding_viewed</code>,{" "}
                  <code>agent_registered</code>, and <code>api_error</code>.
                  View them in Azure Portal Transaction search.
                </Text>
                {portalUrl && (
                  <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                    <Button appearance="primary" icon={<Open20Regular />}>
                      Open Azure Portal
                    </Button>
                  </a>
                )}
              </>
            ) : (
              <Text>
                Set <code>NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING</code>{" "}
                at build time to enable client telemetry. The connection string is
                provisioned by the infrastructure deployment.
              </Text>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
