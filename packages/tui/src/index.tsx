import React from "react"
import { createCliRenderer, TextAttributes, type CliRenderer } from "@opentui/core"
import { createRoot, useKeyboard } from "@opentui/react"
import { AppProvider, useApp } from "./context/app"
import { ThemeProvider, useTheme, resetTerminalBackground } from "./context/theme"
import { DialogProvider, useDialog } from "./components/ui/dialog"
import { ToastProvider } from "./components/ui/toast"
import { HistoryProvider } from "./components/prompt/history"
import { FileTree } from "./components/file-tree"
import { Prompt } from "./components/prompt"
import { Logo } from "./components/logo"
import { ChatView } from "./components/chat"
import { DialogHelp } from "./components/ui/dialog-help"

const VERSION = "0.0.1"

/** Global renderer instance for cleanup */
let rendererInstance: CliRenderer | null = null

/**
 * Properly exit the TUI with cleanup
 * Call this instead of process.exit() to ensure terminal is restored
 */
export function exit(): void {
  if (rendererInstance) {
    rendererInstance.destroy() // This triggers onDestroy callback
  } else {
    resetTerminalBackground()
    process.exit(0)
  }
}

/**
 * Initial view - Logo centered with prompt below
 */
function InitialView() {
  const { focusedPanel } = useApp()
  const { theme } = useTheme()

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      justifyContent="center"
      alignItems="center"
    >
      {/* Logo */}
      <Logo />

      {/* Command Input - with background and padding */}
      <box
        marginTop={2}
        width={80}
        backgroundColor={theme.backgroundPanel}
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        borderStyle="rounded"
        borderColor={focusedPanel === "input" ? theme.primary : theme.border}
      >
        <Prompt focused={focusedPanel === "input"} />
      </box>
    </box>
  )
}

function MainApp() {
  const { cwd, focusedPanel, cycleFocus, viewMode } = useApp()
  const { theme } = useTheme()
  const dialog = useDialog()

  // Global keyboard shortcuts
  // Note: Ctrl+C is handled by the renderer's built-in exitOnCtrlC (default: true)
  useKeyboard((event) => {
    const { name } = event

    // Don't handle shortcuts when dialog is open
    if (dialog.isOpen) return

    // ? to toggle help (only when not in input)
    if (name === "?" && focusedPanel !== "input") {
      dialog.replace(() => <DialogHelp />)
      return
    }

    // Tab to cycle focus
    if (name === "tab") {
      cycleFocus()
      return
    }
  })

  return (
    <box flexDirection="column" flexGrow={1} padding={1}>
      {/* Main container with background */}
      <box
        flexDirection="column"
        flexGrow={1}
        backgroundColor={theme.background}
        // borderStyle="rounded"
        // borderColor={theme.border}
      >
        {/* Main content row */}
        <box flexDirection="row" flexGrow={1}>
          {/* Sidebar - File Tree */}
          <FileTree focused={focusedPanel === "sidebar"} width={40} />

          {/* Main Panel - Initial or Chat view */}
          {viewMode === "initial" ? (
            <InitialView />
          ) : (
            <ChatView />
          )}
        </box>

        {/* Footer */}
        <box flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1}>
          <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
            {cwd}
          </text>
          <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
            {VERSION}
          </text>
        </box>
      </box>
    </box>
  )
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <DialogProvider>
          <HistoryProvider>
            <AppProvider>
              <MainApp />
            </AppProvider>
          </HistoryProvider>
        </DialogProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

/**
 * Launch the ffwrap TUI
 */
export async function launch(): Promise<void> {
  try {
    const renderer = await createCliRenderer({
      // Let the renderer handle Ctrl+C with proper cleanup
      exitOnCtrlC: true,
      // Cleanup callback when renderer is destroyed
      onDestroy: () => {
        resetTerminalBackground()
        process.exit(0)
      },
    })

    // Store for global access (used by exit())
    rendererInstance = renderer

    // Set terminal title
    renderer.setTerminalTitle("ffwrap")

    createRoot(renderer).render(<App />)

    // Keep the process alive until renderer.destroy() is called
    await new Promise<void>(() => {})
  } catch (error) {
    console.error("Failed to launch TUI:", error)
    process.exit(1)
  }
}

// Allow direct execution
if (import.meta.main) {
  // Improve crash diagnostics
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err)
  })
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason)
  })
  launch().catch((error) => {
    console.error("Unhandled error:", error)
    process.exit(1)
  })
}
