import React from "react"
import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useTheme, selectedForeground } from "../../context/theme"
import { useDialog, type DialogContextValue } from "./dialog"

export interface DialogAlertProps {
  title: string
  message: string
  onConfirm?: () => void
}

export function DialogAlert({ title, message, onConfirm }: DialogAlertProps) {
  const dialog = useDialog()
  const { theme } = useTheme()

  useKeyboard((evt) => {
    if (evt.name === "return") {
      onConfirm?.()
      dialog.clear()
    }
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {title}
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box paddingBottom={1}>
        <text fg={theme.textMuted}>{message}</text>
      </box>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1}>
        <box
          paddingLeft={3}
          paddingRight={3}
          backgroundColor={theme.primary}
          onMouseUp={() => {
            onConfirm?.()
            dialog.clear()
          }}
        >
          <text fg={selectedForeground(theme)}>ok</text>
        </box>
      </box>
    </box>
  )
}

/**
 * Static method to show an alert dialog
 */
DialogAlert.show = (dialog: DialogContextValue, title: string, message: string): Promise<void> => {
  return new Promise<void>((resolve) => {
    dialog.replace(
      () => <DialogAlert title={title} message={message} onConfirm={() => resolve()} />,
      () => resolve()
    )
  })
}
