import React from "react"
import { TextAttributes } from "@opentui/core"
import { useApp } from "../context/app.tsx"
import { useTheme } from "../context/theme.tsx"
import { Logo } from "./logo.tsx"
import { ChatMessageItem } from "./chat/message.tsx"

/**
 * Logs panel component to display operation history
 * Uses chat message display but without prompt
 */
export function Logs() {
  const { messages } = useApp()
  const { theme } = useTheme()

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      borderColor={theme.border}
      backgroundColor={theme.background}
      padding={1}
      flexGrow={1}
    >
      {/* Header */}
      <box marginBottom={1} paddingLeft={1}>
        <text attributes={TextAttributes.BOLD} fg={theme.primary}>
          Activity
        </text>
      </box>

      {/* Messages or Logo when empty */}
      {messages.length === 0 ? (
        <box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
          <Logo />
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
            <ChatMessageItem key={msg.id} message={msg} />
          ))}
        </scrollbox>
      )}
    </box>
  )
}
