import React from "react"
import { TextAttributes } from "@opentui/core"
import { useApp } from "../context/app"
import { useTheme } from "../context/theme"

export function ProgressBar() {
  const { currentJob } = useApp()
  const { theme } = useTheme()

  if (!currentJob) {
    return null
  }

  const { status, progress, input, output, error } = currentJob

  // Progress bar characters
  const barWidth = 30
  const filled = Math.round((progress / 100) * barWidth)
  const empty = barWidth - filled
  const progressBar = "█".repeat(filled) + "░".repeat(empty)

  // Status colors
  const statusColor =
    status === "complete"
      ? theme.success
      : status === "error"
        ? theme.error
        : status === "converting"
          ? theme.primary
          : theme.textMuted

  // Status text
  const statusText =
    status === "complete"
      ? "✓ Complete"
      : status === "error"
        ? "✗ Error"
        : status === "converting"
          ? "Converting..."
          : "Pending"

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      borderColor={statusColor}
      padding={1}
      marginTop={1}
    >
      {/* Header */}
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text attributes={TextAttributes.BOLD} fg={statusColor}>
          {statusText}
        </text>
        <text fg={statusColor}>{progress}%</text>
      </box>

      {/* Progress bar */}
      <box marginBottom={1}>
        <text fg={statusColor}>{progressBar}</text>
      </box>

      {/* File info */}
      <box flexDirection="column">
        <box flexDirection="row" gap={1}>
          <text fg={theme.textMuted}>From:</text>
          <text fg={theme.text}>{input.length > 40 ? "..." + input.slice(-37) : input}</text>
        </box>
        <box flexDirection="row" gap={1}>
          <text fg={theme.textMuted}>To:</text>
          <text fg={theme.text}>{output.length > 40 ? "..." + output.slice(-37) : output}</text>
        </box>
      </box>

      {/* Error message */}
      {error && (
        <box marginTop={1}>
          <text fg={theme.error}>{error}</text>
        </box>
      )}
    </box>
  )
}
