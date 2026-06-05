"use client";

import { Text, makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    textAlign: "center",
    padding: tokens.spacingVerticalXXL,
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  title: {
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: tokens.spacingVerticalS,
  },
});

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <Text block className={styles.title} size={500}>
        {title}
      </Text>
      <Text block size={300}>
        {description}
      </Text>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
