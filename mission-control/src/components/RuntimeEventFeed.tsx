"use client";

import {
  Card,
  Text,
  Badge,
  MessageBar,
  MessageBarBody,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useEffect, useState } from "react";
import type { RuntimeEvent } from "@/types/api";

const useStyles = makeStyles({
  feed: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  event: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },
  meta: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    alignItems: "center",
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

const DEMO_EVENTS: RuntimeEvent[] = [
  {
    id: "evt_demo_1",
    timestamp: new Date().toISOString(),
    agent_id: "agt_demo",
    event_type: "blocked",
    summary: "Prompt Shields blocked indirect injection in tool output",
    details: { shield: "prompt_shields", category: "prompt_injection" },
  },
  {
    id: "evt_demo_2",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    agent_id: "agt_demo",
    event_type: "policy_violation",
    summary: "Capability policy blocked fetch_url → send_email chain",
    details: { policy: "no_web_to_email" },
  },
];

function eventColor(type: RuntimeEvent["event_type"]): "danger" | "success" | "warning" {
  switch (type) {
    case "blocked":
      return "danger";
    case "policy_violation":
      return "warning";
    default:
      return "success";
  }
}

export function RuntimeEventFeed() {
  const styles = useStyles();
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [sseAvailable, setSseAvailable] = useState(false);
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    if (demoMode) {
      setEvents(DEMO_EVENTS);
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
    const url = `${apiBase}/v1/runtime/events`;

    let source: EventSource | null = null;

    try {
      source = new EventSource(url);
      source.onopen = () => {
        setConnected(true);
        setSseAvailable(true);
      };
      source.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as RuntimeEvent;
          setEvents((prev) => [parsed, ...prev].slice(0, 50));
        } catch {
          // ignore malformed events
        }
      };
      source.onerror = () => {
        setConnected(false);
        source?.close();
      };
    } catch {
      setConnected(false);
    }

    return () => source?.close();
  }, [demoMode]);

  return (
    <div>
      {!sseAvailable && !demoMode && (
        <MessageBar intent="info" style={{ marginBottom: 16 }}>
          <MessageBarBody>
            Runtime Guard SSE endpoint (<code>GET /v1/runtime/events</code>) is
            not available yet. The API team will enable live guard events on Day
            3. Set <code>NEXT_PUBLIC_DEMO_MODE=true</code> to preview mock
            events.
          </MessageBarBody>
        </MessageBar>
      )}

      {demoMode && (
        <MessageBar intent="warning" style={{ marginBottom: 16 }}>
          <MessageBarBody>Demo mode — showing mock runtime events.</MessageBarBody>
        </MessageBar>
      )}

      {connected && (
        <Text size={200} style={{ marginBottom: 12, display: "block" }}>
          Live stream connected
        </Text>
      )}

      <div className={styles.feed}>
        {events.length === 0 ? (
          <Text>No runtime events yet. Guard events will appear here when live.</Text>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <div className={styles.event}>
                <div className={styles.meta}>
                  <Badge color={eventColor(event.event_type)} appearance="filled">
                    {event.event_type}
                  </Badge>
                  <span>{new Date(event.timestamp).toLocaleString()}</span>
                  <span>{event.agent_id}</span>
                </div>
                <Text weight="semibold">{event.summary}</Text>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
