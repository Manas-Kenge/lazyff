import React, { useEffect, useRef, type ReactNode } from "react"
import { TextAttributes, type TextareaRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../../context/theme"
import { useDialog, type DialogContextValue } from "./dialog"

export interface DialogPromptProps {
  title: string
  description?: ReactNode
  placeholder?: string
  value?: string
  onConfirm?: (value: string) => void
  onCancel?: () => void
}

export function DialogPrompt({
  title,
  description,
  placeholder = "Enter text",
  value = "",
  onConfirm,
  onCancel,
}: DialogPromptProps) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const textareaRef = useRef<TextareaRenderable>(null)

  useKeyboard((evt) => {
    if (evt.name === "return") {
      const text = textareaRef.current?.plainText ?? ""
      onConfirm?.(text)
    }
  })

  useEffect(() => {
    dialog.setSize("medium")
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.gotoLineEnd()
    }, 1)
  }, [dialog])

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {title}
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box gap={1}>
        {description}
        <textarea
          onSubmit={() => {
            const text = textareaRef.current?.plainText ?? ""
            onConfirm?.(text)
          }}
          height={3}
          keyBindings={[{ name: "return", action: "submit" }]}
          ref={(r: TextareaRenderable) => {
            // @ts-ignore - ref typing
            textareaRef.current = r
          }}
          initialValue={value}
          placeholder={placeholder}
          textColor={theme.text}
          focusedTextColor={theme.text}
          cursorColor={theme.text}
        />
      </box>
      <box paddingBottom={1} gap={1} flexDirection="row">
        <text fg={theme.text}>
          enter <span style={{ fg: theme.textMuted }}>submit</span>
        </text>
      </box>
    </box>
  )
}

/**
 * Static method to show a prompt dialog
 */
DialogPrompt.show = (
  dialog: DialogContextValue,
  title: string,
  options?: Omit<DialogPromptProps, "title">
): Promise<string | null> => {
  return new Promise((resolve) => {
    dialog.replace(
      () => (
        <DialogPrompt
          title={title}
          {...options}
          onConfirm={(value) => {
            dialog.clear()
            resolve(value)
          }}
          onCancel={() => resolve(null)}
        />
      ),
      () => resolve(null)
    )
  })
}
