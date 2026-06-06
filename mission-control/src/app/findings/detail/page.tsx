"use client";

import { Button, Text } from "@fluentui/react-components";
import { ArrowLeft20Regular } from "@fluentui/react-icons";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { getScan } from "@/lib/api";
import { trackFindingViewed } from "@/lib/telemetry";
import { EvidenceTrace } from "@/components/EvidenceTrace";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import type { Finding } from "@/types/api";

function FindingDetailContent() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scanId");
  const findingId = searchParams.get("findingId");

  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!scanId || !findingId) return;
    setLoading(true);
    setError(null);
    try {
      const scan = await getScan(scanId);
      const match = scan.findings.find((f) => f.id === findingId);
      if (!match) {
        setError("Finding not found in scan");
        return;
      }
      setFinding(match);
      trackFindingViewed(match.id, match.severity, match.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load finding");
    } finally {
      setLoading(false);
    }
  }, [scanId, findingId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!scanId || !findingId) {
    return <ErrorState message="Missing scanId or findingId query parameters." />;
  }

  if (loading) return <LoadingState label="Loading evidence trace…" />;
  if (error || !finding) {
    return <ErrorState message={error ?? "Finding not found"} onRetry={load} />;
  }

  return (
    <div>
      <Link href={`/scans/detail/?scanId=${encodeURIComponent(scanId)}`}>
        <Button appearance="subtle" icon={<ArrowLeft20Regular />} style={{ marginBottom: 16 }}>
          Back to scan
        </Button>
      </Link>

      <Text as="h1" size={700} weight="semibold" block style={{ marginBottom: 16 }}>
        Evidence Trace
      </Text>

      <EvidenceTrace finding={finding} />
    </div>
  );
}

export default function FindingDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading trace…" />}>
      <FindingDetailContent />
    </Suspense>
  );
}
