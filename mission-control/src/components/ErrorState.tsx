"use client";

import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Button,
} from "@fluentui/react-components";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <MessageBar intent="error">
      <MessageBarBody>
        <MessageBarTitle>{title}</MessageBarTitle>
        {message}
        {onRetry && (
          <div style={{ marginTop: 8 }}>
            <Button appearance="primary" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}
      </MessageBarBody>
    </MessageBar>
  );
}
