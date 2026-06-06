"use client";

import { FluentProvider, webDarkTheme } from "@fluentui/react-components";
import { useEffect } from "react";
import { initTelemetry } from "@/lib/telemetry";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initTelemetry();
  }, []);

  return <FluentProvider theme={webDarkTheme}>{children}</FluentProvider>;
}
