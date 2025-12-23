import React from "react"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme.tsx"
import type { ChatMessage } from "../context/app.tsx"
import { Spinner } from "./ui/spinner-component.tsx"

export interface ActivityMessageProps {
  message: ChatMessage
}

/**
 * Individual activity message component
 * User messages have lighter background (backgroundPanel)
 * Assistant messages have darker background (background)
 */
export function ActivityMessage({ message }: ActivityMessageProps) {
  const { theme } = useTheme()

  const isUser = message.type === "user"

  // User messages: lighter background, Assistant: darker
  const bgColor = isUser ? theme.backgroundPanel : theme.background

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
      {/* Content */}
      <box paddingLeft={2}>
        {message.status === "running" ? (
          <box flexDirection="column">
            <text fg={theme.textMuted} wrapMode="word">
              {message.content}
            </text>
            <box marginTop={1}>
              <Spinner width={8} interval={80} />
            </box>
          </box>
        ) : message.status === "error" ? (
          <text fg={theme.error} wrapMode="word">
            ✗ {message.content}
          </text>
        ) : message.status === "success" ? (
          <box flexDirection="column">
            <text fg={theme.success} wrapMode="word">
              ✓ {message.content}
            </text>
            {message.metadata && (
              <box marginTop={1}>
                {message.metadata.duration && (
                  <text fg={theme.textMuted} wrapMode="word">
                    {message.metadata.duration}
                    {message.metadata.resolution ? ` | ${message.metadata.resolution}` : ""}
                    {message.metadata.sizeChange ? ` | ${message.metadata.sizeChange}` : ""}
                  </text>
                )}
              </box>
            )}
          </box>
        ) : (
          <text fg={theme.text} wrapMode="word">
            {message.content}
          </text>
        )}
      </box>
    </box>
  )
}
