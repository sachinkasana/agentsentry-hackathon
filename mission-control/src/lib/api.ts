import type {
  Agent,
  AgentCreate,
  AttackMetadata,
  HealthResponse,
  RuntimeEvent,
  Scan,
  ScanCreate,
  ServiceInfo,
} from "@/types/api";
import { trackApiError } from "@/lib/telemetry";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const endpoint = `${API_BASE}${path}`;
  let response: Response;

  try {
    response = await fetch(endpoint, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed";
    trackApiError(path, 0);
    throw new ApiError(message, 0, path);
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // ignore parse errors
    }
    trackApiError(path, response.status);
    throw new ApiError(detail, response.status, path);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getApiBaseUrl(): string {
  return API_BASE || "(same origin)";
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/healthz");
}

export async function getServiceInfo(): Promise<ServiceInfo> {
  return request<ServiceInfo>("/");
}

export async function listAgents(): Promise<Agent[]> {
  return request<Agent[]>("/v1/agents");
}

export async function getAgent(agentId: string): Promise<Agent> {
  return request<Agent>(`/v1/agents/${agentId}`);
}

export async function registerAgent(body: AgentCreate): Promise<Agent> {
  return request<Agent>("/v1/agents", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listScans(agentId?: string): Promise<Scan[]> {
  const query = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : "";
  return request<Scan[]>(`/v1/scans${query}`);
}

export async function getScan(scanId: string): Promise<Scan> {
  return request<Scan>(`/v1/scans/${scanId}`);
}

export async function triggerScan(body: ScanCreate): Promise<Scan> {
  return request<Scan>("/v1/scans", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listAttacks(): Promise<AttackMetadata[]> {
  return request<AttackMetadata[]>("/v1/scans/_attacks/registry");
}

export async function listRecentRuntimeEvents(): Promise<RuntimeEvent[]> {
  return request<RuntimeEvent[]>("/v1/runtime/events/recent");
}

export { ApiError };
