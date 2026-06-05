export type AgentFramework =
  | "microsoft-agent-framework"
  | "semantic-kernel"
  | "autogen"
  | "mock"
  | "custom";

export interface AgentCreate {
  name: string;
  endpoint: string;
  framework: AgentFramework;
  tools: string[];
  description?: string | null;
}

export interface Agent extends AgentCreate {
  id: string;
  created_at: string;
}

export type ScanStatus = "pending" | "running" | "completed" | "failed";

export type FindingStatus = "vulnerable" | "defended" | "error";

export interface ScanCreate {
  agent_id: string;
  attacks?: string[] | null;
}

export interface Finding {
  id: string;
  scan_id: string;
  attack_id: string;
  attack_name: string;
  severity: string;
  category: string;
  status: FindingStatus;
  evidence: Record<string, unknown>;
  remediation: string | null;
  created_at: string;
}

export interface Scan {
  id: string;
  agent_id: string;
  status: ScanStatus;
  findings: Finding[];
  posture_score: number | null;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface AttackMetadata {
  id: string;
  name: string;
  description: string;
  severity: string;
  category: string;
  theme_mapping: string;
  cwe: string;
  references: string[];
}

export interface HealthResponse {
  status: string;
}

export interface ServiceInfo {
  service: string;
  version: string;
  env: string;
  storage: string;
}

export interface RuntimeEvent {
  id: string;
  timestamp: string;
  agent_id: string;
  event_type: "blocked" | "allowed" | "policy_violation";
  summary: string;
  details?: Record<string, unknown>;
}
