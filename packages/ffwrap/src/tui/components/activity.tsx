import React from "react";
import { TextAttributes } from "@opentui/core";
import { useApp } from "../context/app.tsx";
import { useTheme } from "../context/theme.tsx";
import { Logo } from "./logo.tsx";
import { ActivityMessage } from "./activity-message.tsx";

/**
 * Activity panel component to display operation history
 */
export function Activity() {
  const { messages } = useApp();
  const { theme } = useTheme();

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      borderColor={theme.border}
      backgroundColor={theme.background}
      flexGrow={1}
    >
      {/* Header */}
      <box paddingLeft={1} paddingRight={1}>
        <text attributes={TextAttributes.BOLD} fg={theme.primary}>
          Activity
        </text>
      </box>

      {/* Messages or Logo when empty */}
      {messages.length === 0 ? (
        <box
          flexDirection="column"
          flexGrow={1}
          justifyContent="center"
          alignItems="center"
          gap={1}
        >
          <Logo />
          <box flexDirection="column" alignItems="center" gap={0}>
            <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
              ↑/↓ or j/k - Move selection
            </text>
            <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
              ←/→ or h/l - Collapse/Expand
            </text>
            <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
              Enter - Select file
            </text>
          </box>
        </box>
      ) : (
        <scrollbox
          flexGrow={1}
          paddingLeft={1}
          paddingRight={1}
          scrollbarOptions={{ visible: false }}
          horizontalScrollbarOptions={{ visible: false }}
          scrollX={false}
        >
          {messages.map((msg) => (
            <ActivityMessage key={msg.id} message={msg} />
          ))}
        </scrollbox>
      )}
    </box>
  );
}
