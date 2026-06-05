"use client";

import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Checkbox,
  Text,
  Spinner,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { listAttacks, triggerScan } from "@/lib/api";
import { trackScanTriggered } from "@/lib/telemetry";
import type { AttackMetadata, Scan } from "@/types/api";

export function ScanTriggerDialog({
  open,
  agentId,
  agentName,
  onClose,
  onScanComplete,
}: {
  open: boolean;
  agentId: string;
  agentName: string;
  onClose: () => void;
  onScanComplete: (scan: Scan) => void;
}) {
  const [attacks, setAttacks] = useState<AttackMetadata[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingAttacks, setLoadingAttacks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingAttacks(true);
    listAttacks()
      .then((registry) => {
        setAttacks(registry);
        setSelected(new Set(registry.map((a) => a.id)));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingAttacks(false));
  }, [open]);

  const toggleAttack = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const attackIds = selected.size === attacks.length ? null : [...selected];
      trackScanTriggered(agentId, attackIds?.length ?? attacks.length);
      const scan = await triggerScan({
        agent_id: agentId,
        attacks: attackIds,
      });
      onScanComplete(scan);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Run security scan</DialogTitle>
          <DialogContent>
            <Text block style={{ marginBottom: 12 }}>
              Scan <strong>{agentName}</strong> with the Agentic Attack Pack.
              Scans run synchronously and may take a moment.
            </Text>

            {error && (
              <MessageBar intent="error" style={{ marginBottom: 12 }}>
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}

            {loadingAttacks ? (
              <Spinner label="Loading attack registry…" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {attacks.map((attack) => (
                  <Checkbox
                    key={attack.id}
                    checked={selected.has(attack.id)}
                    onChange={() => toggleAttack(attack.id)}
                    label={
                      <span>
                        {attack.name}{" "}
                        <Text size={200}>({attack.severity})</Text>
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={runScan}
              disabled={loading || selected.size === 0}
            >
              {loading ? "Scanning…" : "Run scan"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
