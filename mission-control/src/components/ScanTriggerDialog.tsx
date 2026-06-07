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
  Switch,
  Text,
  Spinner,
  MessageBar,
  MessageBarBody,
  Badge,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { listAttacks, triggerScan } from "@/lib/api";
import { formatCategory, groupAttacksByCategory } from "@/lib/attacks";
import { trackScanTriggered } from "@/lib/telemetry";
import type { AttackMetadata, Scan } from "@/types/api";

const useStyles = makeStyles({
  attackDescription: {
    marginLeft: "28px",
    marginTop: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground2,
  },
});

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
  const styles = useStyles();
  const [attacks, setAttacks] = useState<AttackMetadata[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingAttacks, setLoadingAttacks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defenseEnabled, setDefenseEnabled] = useState(false);

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

  const toggleCategory = (ids: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
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
        defense_enabled: defenseEnabled,
      });
      onScanComplete(scan);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const grouped = groupAttacksByCategory(attacks);

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface style={{ maxWidth: 560 }}>
        <DialogBody>
          <DialogTitle>Run security scan</DialogTitle>
          <DialogContent>
            <Text block style={{ marginBottom: 12 }}>
              Scan <strong>{agentName}</strong> with the Agentic Attack Pack (
              {attacks.length} scenarios). Scans run synchronously and may take
              a moment.
            </Text>

            {error && (
              <MessageBar intent="error" style={{ marginBottom: 12 }}>
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}

            <Switch
              checked={defenseEnabled}
              onChange={(_, data) => setDefenseEnabled(Boolean(data.checked))}
              label={
                <span>
                  Enable Runtime Guard{" "}
                  <Text size={200}>(capability policy + Prompt Shields)</Text>
                </span>
              }
              style={{ marginBottom: 16 }}
            />

            {loadingAttacks ? (
              <Spinner label="Loading attack registry…" />
            ) : (
              <Accordion multiple collapsible defaultOpenItems={[...grouped.keys()]}>
                {[...grouped.entries()].map(([category, categoryAttacks]) => {
                  const ids = categoryAttacks.map((a) => a.id);
                  const allSelected = ids.every((id) => selected.has(id));
                  const someSelected = ids.some((id) => selected.has(id));

                  return (
                    <AccordionItem key={category} value={category}>
                      <AccordionHeader>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={
                              allSelected
                                ? true
                                : someSelected
                                  ? "mixed"
                                  : false
                            }
                            onChange={(_, data) =>
                              toggleCategory(ids, Boolean(data.checked))
                            }
                          />
                          <Text weight="semibold">{formatCategory(category)}</Text>
                          <Badge appearance="outline">{categoryAttacks.length}</Badge>
                        </div>
                      </AccordionHeader>
                      <AccordionPanel>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            paddingLeft: 8,
                          }}
                        >
                          {categoryAttacks.map((attack) => (
                            <div key={attack.id}>
                              <Checkbox
                                checked={selected.has(attack.id)}
                                onChange={() => toggleAttack(attack.id)}
                                label={
                                  <span>
                                    {attack.name}{" "}
                                    <Badge
                                      appearance="outline"
                                      color={
                                        attack.severity === "critical"
                                          ? "danger"
                                          : "warning"
                                      }
                                      style={{ marginLeft: 4 }}
                                    >
                                      {attack.severity}
                                    </Badge>
                                  </span>
                                }
                              />
                              <Text size={200} block className={styles.attackDescription}>
                                {attack.description}
                              </Text>
                            </div>
                          ))}
                        </div>
                      </AccordionPanel>
                    </AccordionItem>
                  );
                })}
              </Accordion>
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
              {loading
                ? "Scanning…"
                : `Run scan (${selected.size} attack${selected.size === 1 ? "" : "s"})`}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
