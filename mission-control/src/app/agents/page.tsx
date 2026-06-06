"use client";

import {
  Text,
  Card,
  Button,
  Input,
  Textarea,
  Dropdown,
  Option,
  Field,
  makeStyles,
  tokens,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@fluentui/react-components";
import { Add20Regular, ArrowRight20Regular } from "@fluentui/react-icons";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listAgents, registerAgent } from "@/lib/api";
import { trackAgentRegistered } from "@/lib/telemetry";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import type { Agent, AgentCreate, AgentFramework } from "@/types/api";

const FRAMEWORKS: AgentFramework[] = [
  "microsoft-agent-framework",
  "semantic-kernel",
  "autogen",
  "mock",
  "custom",
];

const useStyles = makeStyles({
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 400px) 1fr",
    gap: tokens.spacingHorizontalXL,
    alignItems: "start",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
  },
  table: {
    width: "100%",
  },
  header: {
    marginBottom: tokens.spacingVerticalL,
  },
});

export default function AgentsPage() {
  const styles = useStyles();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("mock://vulnerable");
  const [framework, setFramework] = useState<AgentFramework>("mock");
  const [tools, setTools] = useState("fetch_url, send_email");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAgents(await listAgents());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRegister = async () => {
    setSubmitting(true);
    setFormError(null);
    const body: AgentCreate = {
      name: name.trim(),
      endpoint: endpoint.trim(),
      framework,
      tools: tools
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      description: description.trim() || null,
    };

    try {
      const agent = await registerAgent(body);
      trackAgentRegistered(framework);
      setAgents((prev) => [...prev, agent]);
      setName("");
      setDescription("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading agents…" />;

  return (
    <div>
      <div className={styles.header}>
        <Text as="h1" size={700} weight="semibold" block>
          Agent Fleet
        </Text>
        <Text block size={300}>
          Register target agents for pre-deploy scanning. Registration does not
          trigger scans automatically.
        </Text>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      <div className={styles.layout}>
        <Card>
          <div className={styles.form}>
            <Text weight="semibold" size={400}>
              Register agent
            </Text>

            <Field label="Name" required>
              <Input value={name} onChange={(_, d) => setName(d.value)} />
            </Field>
            <Field label="Endpoint" required>
              <Input value={endpoint} onChange={(_, d) => setEndpoint(d.value)} />
            </Field>
            <Field label="Framework">
              <Dropdown
                value={framework}
                selectedOptions={[framework]}
                onOptionSelect={(_, d) =>
                  setFramework((d.optionValue as AgentFramework) ?? "mock")
                }
              >
                {FRAMEWORKS.map((f) => (
                  <Option key={f} value={f}>
                    {f}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Tools (comma-separated)">
              <Input value={tools} onChange={(_, d) => setTools(d.value)} />
            </Field>
            <Field label="Description">
              <Textarea
                value={description}
                onChange={(_, d) => setDescription(d.value)}
                rows={3}
              />
            </Field>

            {formError && (
              <Text style={{ color: tokens.colorPaletteRedForeground1 }}>
                {formError}
              </Text>
            )}

            <Button
              appearance="primary"
              icon={<Add20Regular />}
              onClick={handleRegister}
              disabled={submitting || !name.trim() || !endpoint.trim()}
            >
              {submitting ? "Registering…" : "Register agent"}
            </Button>
          </div>
        </Card>

        <div>
          {agents.length === 0 ? (
            <EmptyState
              title="No agents yet"
              description="Use the form to register your first agent, then run a security scan."
            />
          ) : (
            <Table className={styles.table} aria-label="Registered agents">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Framework</TableHeaderCell>
                  <TableHeaderCell>Tools</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <strong>{agent.name}</strong>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {agent.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge appearance="outline">{agent.framework}</Badge>
                    </TableCell>
                    <TableCell>{agent.tools.join(", ") || "—"}</TableCell>
                    <TableCell>
                      <Link
                        href={`/agents/detail/?agentId=${encodeURIComponent(agent.id)}`}
                      >
                        <Button
                          appearance="subtle"
                          icon={<ArrowRight20Regular />}
                        >
                          Open
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
