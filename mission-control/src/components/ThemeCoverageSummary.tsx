"use client";

import { Badge, Card, Text, makeStyles, tokens } from "@fluentui/react-components";
import { summarizeThemeCoverage } from "@/lib/attacks";
import type { Finding } from "@/types/api";

const useStyles = makeStyles({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: tokens.spacingHorizontalM,
  },
  card: {
    padding: tokens.spacingHorizontalM,
  },
  counts: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
    flexWrap: "wrap",
  },
});

export function ThemeCoverageSummary({ findings }: { findings: Finding[] }) {
  const styles = useStyles();
  const themes = summarizeThemeCoverage(findings);

  if (themes.length === 0) return null;

  return (
    <div>
      <Text as="h2" size={500} weight="semibold" block style={{ marginBottom: 12 }}>
        Theme coverage
      </Text>
      <div className={styles.grid}>
        {themes.map((theme) => (
          <Card key={theme.theme} className={styles.card}>
            <Text weight="semibold">{theme.theme}</Text>
            <Text size={200}>{theme.total} attack{theme.total === 1 ? "" : "s"} tested</Text>
            <div className={styles.counts}>
              {theme.vulnerable > 0 && (
                <Badge color="danger" appearance="filled">
                  {theme.vulnerable} vulnerable
                </Badge>
              )}
              {theme.defended > 0 && (
                <Badge color="success" appearance="filled">
                  {theme.defended} defended
                </Badge>
              )}
              {theme.error > 0 && (
                <Badge color="warning" appearance="outline">
                  {theme.error} error
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
