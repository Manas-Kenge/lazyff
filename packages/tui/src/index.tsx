import { createCliRenderer, TextAttributes } from "@opentui/core"
import { createRoot } from "@opentui/react"

function App() {
  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box justifyContent="center" alignItems="flex-end">
        <ascii-font font="tiny" text="ffwrap" />
        <text attributes={TextAttributes.DIM}>A simple ffmpeg wrapper</text>
      </box>
    </box>
  )
}

/**
 * Launch the ffwrap TUI
 */
export async function launch(): Promise<void> {
  const renderer = await createCliRenderer()
  createRoot(renderer).render(<App />)
}

// Allow direct execution
if (import.meta.main) {
  launch()
}
