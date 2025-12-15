import React from "react"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "../../context/theme"
import type { ChatMessage } from "../../context/app"

export interface ChatMessageProps {
  message: ChatMessage
}

/**
 * Individual chat message component
 * User messages have lighter background (backgroundPanel)
 * Assistant messages have darker background (background)
 */
export function ChatMessageItem({ message }: ChatMessageProps) {
  const { theme } = useTheme()

  const isUser = message.type === "user"

  // User messages: lighter background, Assistant: darker
  const bgColor = isUser ? theme.backgroundPanel : theme.background
  const labelColor = isUser ? theme.primary : theme.accent
  const label = isUser ? "You" : "ffwrap"

  return (
    <box
      flexDirection="column"
      backgroundColor={bgColor}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      marginBottom={1}
    >
      {/* Label */}
      <box marginBottom={1}>
        <text fg={labelColor} attributes={TextAttributes.BOLD}>
          {label}
        </text>
      </box>

      {/* Content */}
      <box paddingLeft={2}>
        {message.status === "running" ? (
          <box flexDirection="column">
            <text fg={theme.textMuted}>{message.content}</text>
            <box marginTop={1}>
              <text fg={theme.primary}>⬥◆⬩⬪···</text>
            </box>
          </box>
        ) : message.status === "error" ? (
          <text fg={theme.error}>✗ {message.content}</text>
        ) : message.status === "success" ? (
          <box flexDirection="column">
            <text fg={theme.success}>✓ {message.content}</text>
            {message.metadata && (
              <box marginTop={1}>
                {message.metadata.duration && (
                  <text fg={theme.textMuted}>
                    {message.metadata.duration}
                    {message.metadata.resolution ? ` | ${message.metadata.resolution}` : ""}
                    {message.metadata.sizeChange ? ` | ${message.metadata.sizeChange}` : ""}
                  </text>
                )}
              </box>
            )}
          </box>
        ) : (
          <text fg={theme.text}>{message.content}</text>
        )}
      </box>
    </box>
  )
}
