"use client";

import { Text } from "@fluentui/react-components";
import { RuntimeEventFeed } from "@/components/RuntimeEventFeed";

export default function RuntimePage() {
  return (
    <div>
      <Text as="h1" size={700} weight="semibold" block>
        Runtime Guard Monitor
      </Text>
      <Text block size={300} style={{ marginBottom: 24 }}>
        Live defense events from Prompt Shields and capability policy. Streams
        via SSE when the guard layer is enabled by the API team.
      </Text>
      <RuntimeEventFeed />
    </div>
  );
}
