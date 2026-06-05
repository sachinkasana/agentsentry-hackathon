import { ApplicationInsights } from "@microsoft/applicationinsights-web";
import { ReactPlugin } from "@microsoft/applicationinsights-react-js";

let appInsights: ApplicationInsights | null = null;
let reactPlugin: ReactPlugin | null = null;
let initialized = false;

export function initTelemetry(): ReactPlugin | null {
  if (typeof window === "undefined" || initialized) {
    return reactPlugin;
  }

  const connectionString =
    process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    initialized = true;
    return null;
  }

  reactPlugin = new ReactPlugin();
  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      extensions: [reactPlugin],
      extensionConfig: {
        [reactPlugin.identifier]: {},
      },
      enableAutoRouteTracking: true,
      disableFetchTracking: false,
    },
  });

  appInsights.loadAppInsights();
  appInsights.trackPageView();
  initialized = true;
  return reactPlugin;
}

function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
): void {
  appInsights?.trackEvent({ name }, properties);
}

export function trackScanTriggered(
  agentId: string,
  attackCount: number,
): void {
  trackEvent("scan_triggered", { agentId, attackCount });
}

export function trackFindingViewed(
  findingId: string,
  severity: string,
  status: string,
): void {
  trackEvent("finding_viewed", { findingId, severity, status });
}

export function trackAgentRegistered(framework: string): void {
  trackEvent("agent_registered", { framework });
}

export function trackApiError(endpoint: string, statusCode: number): void {
  trackEvent("api_error", { endpoint, statusCode });
}

export function getAppInsightsPortalUrl(): string | null {
  const connectionString =
    process.env.NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!connectionString) return null;

  const match = connectionString.match(/InstrumentationKey=([^;]+)/);
  if (!match) return null;

  return `https://portal.azure.com/#blade/Microsoft_Azure_Monitoring_Logs/LogsBlade/resourceId/%2Fsubscriptions%2Fplaceholder%2Fproviders%2Fmicrosoft.insights%2Fcomponents%2F${match[1]}`;
}
