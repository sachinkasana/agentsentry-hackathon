"use client";

import {
  makeStyles,
  tokens,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Badge,
} from "@fluentui/react-components";
import {
  Shield20Regular,
  Home20Regular,
  Bot20Regular,
  Flash20Regular,
  Timeline20Regular,
  ShieldTask20Regular,
} from "@fluentui/react-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  header: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground2,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    textDecoration: "none",
    color: "inherit",
  },
  brandTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
  },
  brandSubtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  main: {
    padding: tokens.spacingHorizontalL,
    maxWidth: "1400px",
    margin: "0 auto",
  },
  navLink: {
    textDecoration: "none",
  },
});

const navItems = [
  { href: "/", label: "Fleet", icon: Home20Regular },
  { href: "/agents/", label: "Agents", icon: Bot20Regular },
  { href: "/attacks/", label: "Attack Pack", icon: ShieldTask20Regular },
  { href: "/runtime/", label: "Runtime", icon: Flash20Regular },
  { href: "/traces/", label: "Traces", icon: Timeline20Regular },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const pathname = usePathname();
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    getHealth()
      .then(() => setApiHealthy(true))
      .catch(() => setApiHealthy(false));
  }, []);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Shield20Regular />
          <div>
            <div className={styles.brandTitle}>AgentSentry</div>
            <div className={styles.brandSubtitle}>Mission Control</div>
          </div>
        </Link>

        <Toolbar aria-label="Main navigation">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/" || pathname === ""
                : pathname.startsWith(item.href.replace(/\/$/, ""));
            return (
              <Link key={item.href} href={item.href} className={styles.navLink}>
                <ToolbarButton
                  appearance={active ? "primary" : "subtle"}
                  icon={<item.icon />}
                >
                  {item.label}
                </ToolbarButton>
              </Link>
            );
          })}
          <ToolbarDivider />
          <Badge
            appearance="outline"
            color={apiHealthy === false ? "danger" : apiHealthy ? "success" : "informative"}
          >
            API {apiHealthy === null ? "…" : apiHealthy ? "Online" : "Offline"}
          </Badge>
        </Toolbar>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
