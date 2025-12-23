import React, { useEffect } from "react"
import { createCliRenderer, type CliRenderer, TextAttributes } from "@opentui/core"
import { createRoot, useKeyboard, useTerminalDimensions } from "@opentui/react"
import { AppProvider, useApp, BREAKPOINTS } from "./context/app"
import { ThemeProvider, useTheme, resetTerminalBackground } from "./context/theme"
import { DialogProvider, useDialog } from "./components/ui/dialog"
import { ToastProvider } from "./components/ui/toast"
import { FileTree } from "./components/file-tree"
import { Activity } from "./components/activity"
import { MediaInfo } from "./components/media-info"
import { DialogHelp } from "./components/ui/dialog-help"
import { useCommands } from "./hooks/use-commands"
import {
  ConvertDialog,
  CompressDialog,
  ExtractDialog,
  GifDialog,
  TrimDialog,
  ThumbnailDialog,
  MergeDialog,
  getAvailableCommands,
} from "./components/command-dialogs.tsx"
import { ThemeDialog } from "./components/theme-dialog.tsx"
import { readDirectory, filterMediaFiles } from "./utils/fs.ts"
import { VERSION } from "../version.ts"
import path from "path"

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
 * Main three-column layout view
 */
function MainView() {
  const { terminalWidth } = useApp()
  const { theme } = useTheme()

  // Hide media info column on small screens
  const showMediaInfo = terminalWidth >= BREAKPOINTS.MD

  return (
    <box flexDirection="row" flexGrow={1} gap={1} padding={1}>
      {/* Left column: File Tree */}
      <box flexDirection="column" width={40}>
        <FileTree focused={true} width={40} />
      </box>

      {/* Middle column: Activity/Logs */}
      <box flexDirection="column" flexGrow={1}>
        <Activity />
      </box>

      {/* Right column: Media Info/Preview (hidden on small screens) */}
      {showMediaInfo && (
        <box flexDirection="column" width={40}>
          <MediaInfo width={40} />
        </box>
      )}
    </box>
  )
}

function MainApp() {
  const { setTerminalDimensions, terminalWidth, cwd } = useApp()
  const { theme } = useTheme()
  const dialog = useDialog()
  const { width, height } = useTerminalDimensions()
  const {
    executeInfo,
    executeCompress,
    executeConvert,
    executeExtract,
    executeGif,
    executeTrim,
    executeThumbnail,
    executeMerge,
    selectedFile,
  } = useCommands()

  // Update terminal dimensions in app state when they change
  useEffect(() => {
    setTerminalDimensions(width, height)
  }, [width, height, setTerminalDimensions])

  // Global keyboard shortcuts
  // Note: Ctrl+C is handled by the renderer's built-in exitOnCtrlC (default: true)
  useKeyboard((event) => {
    const { name, ctrl } = event

    // Don't handle shortcuts when dialog is open
    if (dialog.isOpen) return

    // Ctrl+P to toggle help
    if (ctrl && name === "p") {
      dialog.replace(() => <DialogHelp />)
      return
    }

    // Ctrl+T to open theme selection
    if (ctrl && name === "t") {
      dialog.replace(() => <ThemeDialog />)
      return
    }

    // Command keybindings (only when file is selected)
    if (!selectedFile || selectedFile.type === "directory") {
      return
    }

    // Get available commands for this file type
    const available = getAvailableCommands(selectedFile)

    switch (name) {
      case "i":
        // Info command - runs directly, no options needed
        if (available.info) {
          executeInfo()
        }
        break

      case "c":
        // Compress command - open dialog to select compression target
        if (available.compress) {
          dialog.replace(() => (
            <CompressDialog file={selectedFile} onSelect={(options) => executeCompress(options)} />
          ))
        }
        break

      case "v":
        // Convert command - open dialog to select output format
        if (available.convert) {
          dialog.replace(() => (
            <ConvertDialog file={selectedFile} onSelect={(options) => executeConvert(options)} />
          ))
        }
        break

      case "e":
        // Extract command - open dialog to select what to extract
        if (available.extract) {
          dialog.replace(() => (
            <ExtractDialog file={selectedFile} onSelect={(options) => executeExtract(options)} />
          ))
        }
        break

      case "g":
        // GIF command - open dialog to select GIF settings
        if (available.gif) {
          dialog.replace(() => (
            <GifDialog file={selectedFile} onSelect={(options) => executeGif(options)} />
          ))
        }
        break

      case "r":
        // tRim command - open dialog to select trim options
        if (available.trim) {
          dialog.replace(() => (
            <TrimDialog file={selectedFile} onSelect={(options) => executeTrim(options)} />
          ))
        }
        break

      case "t":
        // Thumbnail command - open dialog to select thumbnail settings
        if (available.thumbnail) {
          dialog.replace(() => (
            <ThumbnailDialog
              file={selectedFile}
              onSelect={(options) => executeThumbnail(options)}
            />
          ))
        }
        break

      case "m":
        // Merge command - open dialog to select files to merge
        if (available.merge) {
          // Get sibling files from the same directory
          const fileDir = path.dirname(selectedFile.path)
          const siblingFiles = filterMediaFiles(readDirectory(fileDir))
          dialog.replace(() => (
            <MergeDialog
              file={selectedFile}
              siblingFiles={siblingFiles}
              onSelect={(options) => executeMerge(options)}
            />
          ))
        }
        break
    }
  })

  return (
    <box flexDirection="column" height={height} padding={0}>
      {/* Main container with background */}
      <box flexDirection="column" flexGrow={1} backgroundColor={theme.background}>
        {/* Main three-column layout */}
        <MainView />

        {/* Footer with shortcuts - show contextually based on file type */}
        <box
          flexDirection="row"
          justifyContent="space-between"
          paddingLeft={1}
          paddingRight={1}
          paddingBottom={1}
        >
          <box flexDirection="row" gap={1}>
            <text attributes={TextAttributes.BOLD} fg={theme.text}>
              ctrl+p
            </text>
            <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
              help
            </text>
            {selectedFile &&
              selectedFile.type === "file" &&
              (() => {
                const available = getAvailableCommands(selectedFile)
                return (
                  <>
                    {available.compress && (
                      <>
                        <text attributes={TextAttributes.BOLD} fg={theme.text}>
                          c
                        </text>
                        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
                          compress
                        </text>
                      </>
                    )}
                    {available.convert && (
                      <>
                        <text attributes={TextAttributes.BOLD} fg={theme.text}>
                          v
                        </text>
                        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
                          convert
                        </text>
                      </>
                    )}
                    {available.extract && (
                      <>
                        <text attributes={TextAttributes.BOLD} fg={theme.text}>
                          e
                        </text>
                        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
                          extract
                        </text>
                      </>
                    )}
                    {available.gif && (
                      <>
                        <text attributes={TextAttributes.BOLD} fg={theme.text}>
                          g
                        </text>
                        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
                          gif
                        </text>
                      </>
                    )}
                    {available.trim && (
                      <>
                        <text attributes={TextAttributes.BOLD} fg={theme.text}>
                          r
                        </text>
                        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
                          trim
                        </text>
                      </>
                    )}
                    {available.thumbnail && (
                      <>
                        <text attributes={TextAttributes.BOLD} fg={theme.text}>
                          t
                        </text>
                        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
                          thumbnail
                        </text>
                      </>
                    )}
                    {available.merge && (
                      <>
                        <text attributes={TextAttributes.BOLD} fg={theme.text}>
                          m
                        </text>
                        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
                          merge
                        </text>
                      </>
                    )}
                  </>
                )
              })()}
          </box>
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
          <AppProvider>
            <MainApp />
          </AppProvider>
        </DialogProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

/**
 * Launch the lazyff TUI
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
    renderer.setTerminalTitle("lazyff")

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
