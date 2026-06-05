"use client";

import { Spinner, Text, makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalXXL,
  },
});

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <Spinner size="large" label={label} />
      <Text size={300}>{label}</Text>
    </div>
  );
}
