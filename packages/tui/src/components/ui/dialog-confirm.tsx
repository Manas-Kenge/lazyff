import React, { useState } from "react"
import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useTheme, selectedForeground } from "../../context/theme"
import { useDialog, type DialogContextValue } from "./dialog"

export interface DialogConfirmProps {
  title: string
  message: string
  onConfirm?: () => void
  onCancel?: () => void
}

export function DialogConfirm({ title, message, onConfirm, onCancel }: DialogConfirmProps) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [active, setActive] = useState<"confirm" | "cancel">("confirm")

  useKeyboard((evt) => {
    if (evt.name === "return") {
      if (active === "confirm") {
        onConfirm?.()
      } else {
        onCancel?.()
      }
      dialog.clear()
    }

    if (evt.name === "left" || evt.name === "right" || evt.name === "tab") {
      setActive((current) => (current === "confirm" ? "cancel" : "confirm"))
    }
  })

  const buttons = ["cancel", "confirm"] as const

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
        {buttons.map((key) => (
          <box
            key={key}
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={key === active ? theme.primary : undefined}
            onMouseUp={() => {
              if (key === "confirm") {
                onConfirm?.()
              } else {
                onCancel?.()
              }
              dialog.clear()
            }}
          >
            <text fg={key === active ? selectedForeground(theme) : theme.textMuted}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </text>
          </box>
        ))}
      </box>
    </box>
  )
}

/**
 * Static method to show a confirm dialog
 */
DialogConfirm.show = (
  dialog: DialogContextValue,
  title: string,
  message: string
): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    dialog.replace(
      () => (
        <DialogConfirm
          title={title}
          message={message}
          onConfirm={() => resolve(true)}
          onCancel={() => resolve(false)}
        />
      ),
      () => resolve(false)
    )
  })
}
