import React from "react"
import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useTheme, selectedForeground } from "../../context/theme"
import { useDialog } from "./dialog"

export function DialogHelp() {
  const dialog = useDialog()
  const { theme } = useTheme()

  useKeyboard((evt) => {
    if (evt.name === "escape") {
      dialog.clear()
    }
  })

  return (
    <box paddingLeft={3} paddingRight={3} paddingTop={1} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          Help
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box paddingBottom={1} gap={1}>
        <text fg={theme.secondary} attributes={TextAttributes.BOLD}>
          Commands
        </text>
        <box paddingLeft={2} gap={0} flexDirection="column">
          {[
            { label: "Convert to format", cmd: "/convert (v)" },
            { label: "Trim", cmd: "/trim (r)" },
            { label: "Compress", cmd: "/compress (c)" },
            { label: "Extract", cmd: "/extract (e)" },
            { label: "GIF", cmd: "/gif (g)" },
            { label: "Thumbnail", cmd: "/thumbnail (t)" },
            { label: "Merge", cmd: "/merge (m)" },
            { label: "Info", cmd: "/info (i)" },
            { label: "Theme", cmd: "/theme (ctrl+t)" },
            { label: "Help", cmd: "/help (h)" },
            { label: "Quit", cmd: "/quit (q)" },
          ].map((c) => (
            <box key={c.cmd} flexDirection="row" justifyContent="space-between">
              <text fg={theme.textMuted}>{c.label}</text>
              <text fg={theme.textMuted}>{c.cmd}</text>
            </box>
          ))}
        </box>
        <text fg={theme.secondary} attributes={TextAttributes.BOLD}>
          Keyboard Shortcuts
        </text>
        <box paddingLeft={2} gap={0} flexDirection="column">
          {[
            { label: "Show help", key: "Ctrl+P" },
            { label: "Navigate file tree", key: "↑/↓ or j/k" },
            { label: "Collapse/Expand directory", key: "←/→ or h/l" },
            { label: "Select file or Toggle directory", key: "Enter/Space" },
            { label: "Go to parent directory", key: "Backspace" },
            { label: "Set selected directory as root", key: "." },
            { label: "Go to top/bottom", key: "Home/End" },
            { label: "Quit", key: "Ctrl+C" },
          ].map((s) => (
            <box key={s.label} flexDirection="row" justifyContent="space-between">
              <text fg={theme.textMuted}>{s.label}</text>
              <text fg={theme.textMuted}>{s.key}</text>
            </box>
          ))}
        </box>
      </box>
    </box>
  )
}
