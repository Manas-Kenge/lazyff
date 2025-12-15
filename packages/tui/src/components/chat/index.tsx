import React from "react"
import { type ScrollBoxRenderable } from "@opentui/core"
import { useApp } from "../../context/app"
import { useTheme } from "../../context/theme"
import { ChatMessageItem } from "./message"
import { Prompt } from "../prompt"

/**
 * Chat view component - shows messages list with input at bottom
 */
export function ChatView() {
  const { messages, focusedPanel } = useApp()
  const { theme } = useTheme()

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Messages area - scrollable */}
      <scrollbox
        flexGrow={1}
        paddingLeft={1}
        paddingRight={1}
        paddingTop={1}
        scrollbarOptions={{ visible: true }}
      >
        {messages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} />
        ))}
      </scrollbox>

      {/* Bottom input */}
      <box
        backgroundColor={theme.backgroundPanel}
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        borderStyle="rounded"
        borderColor={focusedPanel === "input" ? theme.primary : theme.border}
        marginLeft={1}
        marginRight={1}
        marginBottom={1}
      >
        <Prompt focused={focusedPanel === "input"} />
      </box>
    </box>
  )
}

export { ChatMessageItem } from "./message"
