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
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          Commands
        </text>
        <box paddingLeft={2}>
          <text fg={theme.textMuted}>/convert [format]    - Convert to format</text>
          <text fg={theme.textMuted}>/trim [start] [dur]  - Cut portion of video</text>
          <text fg={theme.textMuted}>/compress [%|size]   - Reduce file size</text>
          <text fg={theme.textMuted}>/extract [mode]      - Extract audio/video/frames</text>
          <text fg={theme.textMuted}>/gif [width] [fps]   - Convert to animated GIF</text>
          <text fg={theme.textMuted}>/thumbnail [mode]    - Generate thumbnail</text>
          <text fg={theme.textMuted}>/info                - Show file information</text>
          <text fg={theme.textMuted}>/quality &lt;preset&gt;    - Set quality preset</text>
          <text fg={theme.textMuted}>/theme               - Change theme</text>
          <text fg={theme.textMuted}>/help                - Show this help</text>
          <text fg={theme.textMuted}>/quit                - Exit ffwrap</text>
        </box>
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          Keyboard Shortcuts
        </text>
        <box paddingLeft={2}>
          <text fg={theme.textMuted}>Ctrl+P - Show/hide help</text>
          <text fg={theme.textMuted}>Ctrl+B - Toggle file tree</text>
          <text fg={theme.textMuted}>Tab - Switch panel focus</text>
          <text fg={theme.textMuted}>↑/↓ - Navigate file tree</text>
          <text fg={theme.textMuted}>Enter - Select file</text>
          <text fg={theme.textMuted}>Ctrl+C - Quit</text>
        </box>
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          Formats
        </text>
        <box paddingLeft={2}>
          <text fg={theme.textMuted}>Video: mp4, webm, mkv, avi, mov, gif</text>
          <text fg={theme.textMuted}>Audio: mp3, aac, wav, flac, ogg</text>
        </box>
      </box>
    </box>
  )
}
