import React, { useState, useCallback, useRef, useEffect } from "react"
import { TextAttributes, type InputRenderable, type BoxRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../../context/theme.tsx"
import { useApp } from "../../context/app.tsx"
import { useDialog } from "../ui/dialog.tsx"
import { useToast } from "../ui/toast.tsx"
import { DialogSelect, type DialogSelectOption } from "../ui/dialog-select.tsx"
import { DialogHelp } from "../ui/dialog-help.tsx"
import { usePromptHistory } from "./history.tsx"
import { Autocomplete, type AutocompleteRef, type AutocompleteOption } from "./autocomplete.tsx"
import {
  convert,
  trim,
  compress,
  extract,
  gif,
  thumbnail,
  info,
  merge,
  FORMAT_PRESETS,
  QUALITY_PRESETS,
} from "@ffwrap/cli"
import { THEME_NAMES, type ThemeName } from "../../context/theme.tsx"
import { exit } from "../../index.tsx"
import { getAllMediaFiles } from "../../utils/fs.ts"
import path from "path"
import fs from "fs"

export interface PromptProps {
  focused?: boolean
}

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"]
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Main command prompt component
 */
export function Prompt({ focused = true }: PromptProps) {
  const { theme, setTheme, themeName } = useTheme()
  const {
    cwd,
    commandInput,
    setCommandInput,
    selectedFile,
    selectFile,
    setCurrentJob,
    updateJobProgress,
    completeJob,
    setStatusMessage,
    viewMode,
    setViewMode,
    addMessage,
    updateMessage,
  } = useApp()
  const dialog = useDialog()
  const toast = useToast()
  const history = usePromptHistory()

  const [cursorPos, setCursorPos] = useState(0)
  const inputRef = useRef<InputRenderable>(null)
  const anchorRef = useRef<BoxRenderable>(null)
  const autocompleteRef = useRef<AutocompleteRef>(null)

  // Focus input when panel is focused
  useEffect(() => {
    if (focused) {
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [focused])

  /**
   * Generate unique ID for messages
   */
  const generateMessageId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }, [])

  /**
   * Execute a media command and handle chat flow
   */
  const executeMediaCommand = useCallback(
    async (
      userInput: string,
      operation: () => Promise<{ success: boolean; outputPath: string; error?: string }>,
      description: string
    ) => {
      // Switch to chat view
      setViewMode("chat")

      // Add user message
      addMessage({
        type: "user",
        content: userInput,
      })

      // Generate ID for assistant message before adding
      const assistantMsgId = generateMessageId()

      // Add assistant message with running status and our pre-generated ID
      addMessage({
        id: assistantMsgId,
        type: "assistant",
        content: description,
        status: "running",
      })

      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 50))

      try {
        const result = await operation()

        if (result.success) {
          // Get output file info
          let metadata: any = {}
          if (fs.existsSync(result.outputPath)) {
            const stats = fs.statSync(result.outputPath)
            metadata.sizeChange = formatSize(stats.size)
          }

          // Update the assistant message to success
          updateMessage(assistantMsgId, {
            content: `Done: ${path.basename(result.outputPath)}`,
            status: "success",
            metadata,
          })
          toast.success(`Done: ${path.basename(result.outputPath)}`)
        } else {
          updateMessage(assistantMsgId, {
            content: result.error || "Operation failed",
            status: "error",
          })
          toast.error(result.error || "Operation failed")
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        updateMessage(assistantMsgId, {
          content: errorMessage,
          status: "error",
        })
        toast.error(errorMessage)
      }
    },
    [setViewMode, addMessage, updateMessage, toast, generateMessageId]
  )

  // Execute a command
  const executeCommand = useCallback(
    async (input: string) => {
      const trimmed = input.trim()
      if (!trimmed) return

      // Save to history
      history.append({ input: trimmed })

      // Clear input
      setCommandInput("")
      setCursorPos(0)

      // Parse command
      const parts = trimmed.split(/\s+/)
      const cmd = (parts[0] ?? "").toLowerCase()
      const args = parts.slice(1)

      // Handle exit commands
      if (cmd === "/quit" || cmd === "/exit" || cmd === "/q" || cmd === "exit" || cmd === "quit") {
        exit()
        return
      }

      // Handle clear command - go back to initial view
      if (cmd === "/clear") {
        setViewMode("initial")
        return
      }

      // Handle help
      if (cmd === "/help") {
        dialog.replace(() => <DialogHelp />)
        return
      }

      // Handle theme command with live preview
      if (cmd === "/theme") {
        const originalTheme = themeName

        const options: DialogSelectOption<ThemeName>[] = THEME_NAMES.map((name) => ({
          title: name,
          value: name,
        }))

        const result = await DialogSelect.show(
          dialog,
          "Select Theme",
          options,
          themeName,
          {
            onMove: (option) => {
              // Live preview - apply theme immediately
              setTheme(option.value)
            },
            onCancel: () => {
              // Revert to original on cancel
              setTheme(originalTheme)
            },
          }
        )

        if (result) {
          setTheme(result.value)
          toast.success(`Theme changed to ${result.value}`)
        }
        return
      }

      // Handle quality command
      if (cmd === "/quality") {
        const quality = args[0]?.toLowerCase()
        if (quality && quality in QUALITY_PRESETS) {
          setStatusMessage(`Quality set to: ${quality}`)
          toast.info(`Quality preset: ${quality}`)
        } else {
          const options: DialogSelectOption<string>[] = Object.keys(QUALITY_PRESETS).map(
            (q) => ({
              title: q,
              value: q,
              description: q === "lossless" ? "highest quality" : undefined,
            })
          )

          const result = await DialogSelect.show(dialog, "Select Quality", options)
          if (result) {
            setStatusMessage(`Quality set to: ${result.value}`)
            toast.info(`Quality preset: ${result.value}`)
          }
        }
        return
      }

      // Handle info command
      if (cmd === "/info") {
        if (!selectedFile || selectedFile.type === "directory") {
          toast.error("Select a media file first")
          return
        }

        setViewMode("chat")
        addMessage({ type: "user", content: trimmed })

        // Generate ID before adding so we can track it for updates
        const msgId = generateMessageId()
        addMessage({
          id: msgId,
          type: "assistant",
          content: "Getting file info...",
          status: "running",
        })

        try {
          const result = await info(selectedFile.path)
          if (result.success && result.info) {
            const i = result.info
            const lines: string[] = [
              `Format: ${i.format.longName}`,
              `Duration: ${Math.floor(i.format.duration / 60)}:${Math.floor(i.format.duration % 60).toString().padStart(2, "0")}`,
              `Size: ${(i.format.size / 1024 / 1024).toFixed(1)} MB`,
            ]
            if (i.video) {
              lines.push(`Video: ${i.video.codec.toUpperCase()} ${i.video.width}x${i.video.height}`)
            }
            if (i.audio) {
              lines.push(`Audio: ${i.audio.codec.toUpperCase()} ${i.audio.sampleRate}Hz`)
            }
            updateMessage(msgId, {
              content: lines.join("\n"),
              status: "success",
            })
          } else {
            updateMessage(msgId, {
              content: result.error || "Failed to get info",
              status: "error",
            })
            toast.error(result.error || "Failed to get info")
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          updateMessage(msgId, { content: errorMessage, status: "error" })
          toast.error(errorMessage)
        }
        return
      }

      // Handle trim command
      if (cmd === "/trim") {
        if (!selectedFile || selectedFile.type === "directory") {
          toast.error("Select a media file first")
          return
        }

        // Require start time argument
        if (!args[0]) {
          toast.warning("Usage: /trim <start> [duration]  e.g., /trim 00:30 10")
          return
        }

        const start = args[0]
        const duration = args[1] || "10"  // Default to 10 seconds if not provided
        const outputPath = path.join(
          path.dirname(selectedFile.path),
          path.basename(selectedFile.path, path.extname(selectedFile.path)) + "_trimmed" + path.extname(selectedFile.path)
        )

        await executeMediaCommand(
          trimmed,
          () => trim({ input: selectedFile.path, output: outputPath, startTime: start, duration, overwrite: true }),
          `Trimming from ${start} for ${duration}s...`
        )
        return
      }

      // Handle compress command
      if (cmd === "/compress") {
        if (!selectedFile || selectedFile.type === "directory") {
          toast.error("Select a media file first")
          return
        }

        const target = args[0] || "50"
        const isPercent = !target.toLowerCase().includes("mb") && !target.toLowerCase().includes("kb")
        const outputPath = path.join(
          path.dirname(selectedFile.path),
          path.basename(selectedFile.path, path.extname(selectedFile.path)) + "_compressed" + path.extname(selectedFile.path)
        )

        const targetLabel = isPercent ? `${target}%` : target
        await executeMediaCommand(
          trimmed,
          () => compress({
            input: selectedFile.path,
            output: outputPath,
            percent: isPercent ? parseInt(target) : undefined,
            targetSize: !isPercent ? target : undefined,
            overwrite: true,
          }),
          `Compressing to ${targetLabel}...`
        )
        return
      }

      // Handle extract command
      if (cmd === "/extract") {
        if (!selectedFile || selectedFile.type === "directory") {
          toast.error("Select a media file first")
          return
        }

        const mode = args[0]?.toLowerCase() || "audio"
        const isAudio = mode === "audio"
        const isVideo = mode === "video"
        const isFrames = mode === "frames"

        if (!isAudio && !isVideo && !isFrames) {
          toast.error("Usage: /extract audio|video|frames")
          return
        }

        const ext = isAudio ? ".mp3" : isFrames ? "_frame_%04d.png" : path.extname(selectedFile.path)
        const outputPath = path.join(
          path.dirname(selectedFile.path),
          path.basename(selectedFile.path, path.extname(selectedFile.path)) + (isFrames ? "" : (isAudio ? "" : "_video")) + ext
        )

        await executeMediaCommand(
          trimmed,
          () => extract({ input: selectedFile.path, output: outputPath, audio: isAudio, video: isVideo, frames: isFrames, overwrite: true }),
          `Extracting ${mode}...`
        )
        return
      }

      // Handle gif command
      if (cmd === "/gif") {
        if (!selectedFile || selectedFile.type === "directory") {
          toast.error("Select a media file first")
          return
        }

        const width = args[0] ? parseInt(args[0]) : 480
        const fps = args[1] ? parseInt(args[1]) : 15
        const outputPath = path.join(
          path.dirname(selectedFile.path),
          path.basename(selectedFile.path, path.extname(selectedFile.path)) + ".gif"
        )

        await executeMediaCommand(
          trimmed,
          () => gif({ input: selectedFile.path, output: outputPath, width, fps, overwrite: true }),
          `Converting to GIF (${width}px, ${fps}fps)...`
        )
        return
      }

      // Handle thumbnail command
      if (cmd === "/thumbnail") {
        if (!selectedFile || selectedFile.type === "directory") {
          toast.error("Select a media file first")
          return
        }

        // Require time or grid argument
        if (!args[0]) {
          toast.warning("Usage: /thumbnail <time|grid>  e.g., /thumbnail 00:30 or /thumbnail grid")
          return
        }

        const arg = args[0]?.toLowerCase()
        const isGrid = arg === "grid"
        const time = !isGrid ? arg : undefined
        const suffix = isGrid ? "_grid.png" : "_thumb.png"
        const outputPath = path.join(
          path.dirname(selectedFile.path),
          path.basename(selectedFile.path, path.extname(selectedFile.path)) + suffix
        )

        const modeLabel = isGrid ? "3x3 grid" : `at ${time}`
        await executeMediaCommand(
          trimmed,
          () => thumbnail({ input: selectedFile.path, output: outputPath, grid: isGrid ? "3x3" : undefined, time, overwrite: true }),
          `Generating thumbnail ${modeLabel}...`
        )
        return
      }

      // Handle merge command
      if (cmd === "/merge") {
        // Require a file to be selected first (becomes first file in merge)
        if (!selectedFile || selectedFile.type === "directory") {
          toast.error("Select a media file first (this will be the first file to merge)")
          return
        }

        // Check if selected file is mergeable (video or audio)
        if (selectedFile.mediaType !== "video" && selectedFile.mediaType !== "audio") {
          toast.error("Selected file must be a video or audio file")
          return
        }

        // Get media files from selected file's directory (2 levels deep)
        const selectedDir = path.dirname(selectedFile.path)
        const mediaFiles = getAllMediaFiles(selectedDir, 2)
        
        // Filter to only video/audio files, excluding the already-selected file
        const otherFiles = mediaFiles.filter(
          (f) => (f.mediaType === "video" || f.mediaType === "audio") && f.path !== selectedFile.path
        )

        if (otherFiles.length === 0) {
          toast.error("No other video/audio files found to merge with")
          return
        }

        // Build list of files to merge, starting with selected file
        const filesToMerge: string[] = [selectedFile.path]
        const fileNames: string[] = [selectedFile.name]

        // Loop to add more files
        let addMore = true
        while (addMore) {
          // Filter out already selected files
          const availableFiles = otherFiles.filter((f) => !filesToMerge.includes(f.path))
          
          if (availableFiles.length === 0) {
            toast.info("No more files available to add")
            break
          }

          // Create options for single-select dialog
          const options: DialogSelectOption<string>[] = availableFiles.map((file) => {
            const relativePath = file.path.startsWith(selectedDir)
              ? file.path.slice(selectedDir.length + 1)
              : file.path
            return {
              title: file.name,
              value: file.path,
              description: relativePath !== file.name ? relativePath : undefined,
              category: file.mediaType === "video" ? "Video" : "Audio",
            }
          })

          // Show dialog to select next file
          const fileCount = filesToMerge.length
          const dialogTitle = fileCount === 1 
            ? `Select file to merge with "${selectedFile.name}"`
            : `Select file #${fileCount + 1} (${fileCount} selected)`
          
          const selected = await DialogSelect.show(dialog, dialogTitle, options)
          
          if (!selected) {
            // User cancelled - if we have at least 2 files, proceed; otherwise abort
            if (filesToMerge.length < 2) {
              return
            }
            break
          }

          // Add selected file
          filesToMerge.push(selected.value)
          const fileName = availableFiles.find((f) => f.path === selected.value)?.name || path.basename(selected.value)
          fileNames.push(fileName)

          // Ask if user wants to add more files
          if (availableFiles.length > 1) {
            const addMoreOptions: DialogSelectOption<boolean>[] = [
              { title: "Done - merge these files", value: false },
              { title: "Add another file", value: true },
            ]
            
            const addMoreResult = await DialogSelect.show(
              dialog,
              `${filesToMerge.length} files selected: ${fileNames.join(", ")}`,
              addMoreOptions,
              false
            )
            
            if (addMoreResult === null || !addMoreResult.value) {
              addMore = false
            }
          } else {
            // No more files available
            addMore = false
          }
        }

        // Need at least 2 files to merge
        if (filesToMerge.length < 2) {
          return
        }

        // Ask for re-encode option if files have different extensions
        const extensions = new Set(filesToMerge.map((f) => path.extname(f).toLowerCase()))
        let reencode = false
        
        if (extensions.size > 1) {
          const reencodeOptions: DialogSelectOption<boolean>[] = [
            { 
              title: "Re-encode (slower, handles different codecs)", 
              value: true,
              description: "recommended for mixed formats"
            },
            { 
              title: "Copy (fast, same codec required)", 
              value: false,
              description: "may fail if codecs differ"
            },
          ]
          
          const reencodeResult = await DialogSelect.show(
            dialog,
            "Files have different formats",
            reencodeOptions,
            true
          )
          
          if (reencodeResult === null) return
          reencode = reencodeResult.value
        }

        // Determine output path
        const outputExt = reencode ? ".mp4" : path.extname(selectedFile.path)
        const outputPath = path.join(
          selectedDir,
          "merged_" + Date.now() + outputExt
        )

        await executeMediaCommand(
          trimmed,
          () => merge({ inputs: filesToMerge, output: outputPath, reencode, overwrite: true }),
          `Merging ${filesToMerge.length} files: ${fileNames.join(", ")}...`
        )
        return
      }

      // Handle convert command
      if (cmd === "/convert" || cmd in FORMAT_PRESETS) {
        const format = cmd === "/convert" ? args[0] : cmd.replace("/", "")

        if (!selectedFile || selectedFile.type === "directory") {
          toast.error("Select a media file first")
          return
        }

        let targetFormat = format
        let quality = "medium"

        if (!targetFormat || !(targetFormat in FORMAT_PRESETS)) {
          const options: DialogSelectOption<string>[] = Object.keys(FORMAT_PRESETS).map(
            (f) => ({
              title: f,
              value: f,
              category: f === "gif" ? "Image" : ["mp3", "aac", "wav", "flac", "ogg"].includes(f) ? "Audio" : "Video",
            })
          )

          const result = await DialogSelect.show(dialog, "Select Output Format", options)
          if (!result) return
          targetFormat = result.value
        }

        for (const arg of args.slice(1)) {
          if (arg in QUALITY_PRESETS) {
            quality = arg
          }
        }

        const outputPath = path.join(
          path.dirname(selectedFile.path),
          path.basename(selectedFile.path, path.extname(selectedFile.path)) + "." + targetFormat
        )

        await executeMediaCommand(
          trimmed,
          () => convert({
            input: selectedFile.path,
            output: outputPath,
            format: targetFormat as keyof typeof FORMAT_PRESETS,
            quality: quality as keyof typeof QUALITY_PRESETS,
            overwrite: true,
          }),
          `Converting to ${targetFormat}...`
        )
        return
      }

      // Unknown command
      if (cmd.startsWith("/")) {
        toast.warning(`Unknown command: ${cmd}`)
        setStatusMessage(`Unknown command: ${cmd}. Type /help for available commands.`)
      } else {
        setStatusMessage(`Unknown command. Type /help for available commands.`)
      }
    },
    [
      selectedFile,
      setCommandInput,
      setCurrentJob,
      updateJobProgress,
      completeJob,
      setStatusMessage,
      setViewMode,
      addMessage,
      updateMessage,
      executeMediaCommand,
      generateMessageId,
      dialog,
      toast,
      history,
      themeName,
      setTheme,
    ]
  )

  // Handle autocomplete selection
  const handleAutocompleteSelect = useCallback(
    (option: AutocompleteOption) => {
      // Handle file selection from @ autocomplete
      if (option.type === "file" && option.fileNode) {
        // Select the file in app state
        selectFile(option.fileNode)
        setStatusMessage(`Selected: ${option.fileNode.name}`)
        toast.info(`Selected: ${option.fileNode.name}`)

        // Replace @query with the full file path
        // Find the @ trigger position in the current input
        const atIndex = commandInput.lastIndexOf("@")
        if (atIndex !== -1) {
          const newInput = commandInput.slice(0, atIndex) + option.value
          setCommandInput(newInput)
          setCursorPos(newInput.length)
        } else {
          // Fallback: just set the path
          setCommandInput(option.value)
          setCursorPos(option.value.length)
        }
        return
      }

      // Handle command selection
      setCommandInput(option.value)
      setCursorPos(option.value.length)

      // Auto-execute if it's a complete command (no trailing space)
      if (!option.value.endsWith(" ")) {
        executeCommand(option.value)
      }
    },
    [setCommandInput, executeCommand, selectFile, setStatusMessage, toast, commandInput]
  )

  // Keyboard handling
  useKeyboard((event) => {
    if (!focused) return

    const { name, ctrl } = event
    const char = (event as any).char || (event as any).sequence

    // Let autocomplete handle keys first
    if (autocompleteRef.current?.onKeyDown(name, ctrl)) {
      return
    }

    switch (name) {
      case "return":
        executeCommand(commandInput)
        break

      case "backspace":
        if (ctrl) {
          // ctrl+backspace: delete word backward
          if (cursorPos > 0) {
            const beforeCursor = commandInput.slice(0, cursorPos)
            // Find the start of the previous word (skip trailing spaces, then skip word chars)
            let wordStart = cursorPos
            // Skip any spaces before cursor
            while (wordStart > 0 && beforeCursor[wordStart - 1] === " ") {
              wordStart--
            }
            // Skip word characters
            while (wordStart > 0 && beforeCursor[wordStart - 1] !== " ") {
              wordStart--
            }
            setCommandInput(commandInput.slice(0, wordStart) + commandInput.slice(cursorPos))
            setCursorPos(wordStart)
          }
        } else if (cursorPos > 0) {
          setCommandInput(commandInput.slice(0, cursorPos - 1) + commandInput.slice(cursorPos))
          setCursorPos(cursorPos - 1)
        }
        break

      case "delete":
        if (cursorPos < commandInput.length) {
          setCommandInput(commandInput.slice(0, cursorPos) + commandInput.slice(cursorPos + 1))
        }
        break

      case "left":
        setCursorPos(Math.max(0, cursorPos - 1))
        break

      case "right":
        setCursorPos(Math.min(commandInput.length, cursorPos + 1))
        break

      case "home":
        setCursorPos(0)
        break

      case "end":
        setCursorPos(commandInput.length)
        break

      case "up":
        if (cursorPos === 0 || commandInput.length === 0) {
          const item = history.move(-1, commandInput)
          if (item) {
            setCommandInput(item.input)
            setCursorPos(0)
          }
        }
        break

      case "down":
        if (cursorPos === commandInput.length) {
          const item = history.move(1, commandInput)
          if (item) {
            setCommandInput(item.input)
            setCursorPos(item.input.length)
          }
        }
        break

      case "escape":
        setCommandInput("")
        setCursorPos(0)
        break

      case "tab":
        break

      default:
        // ctrl+u: clear entire line
        if (ctrl && name === "u") {
          setCommandInput("")
          setCursorPos(0)
          break
        }

        const inputChar = char || (name.length === 1 ? name : undefined)
        if (inputChar && inputChar.length === 1 && !ctrl) {
          const newValue =
            commandInput.slice(0, cursorPos) + inputChar + commandInput.slice(cursorPos)
          setCommandInput(newValue)
          setCursorPos(cursorPos + 1)

          // Trigger / autocomplete at start of input
          if (inputChar === "/" && cursorPos === 0) {
            autocompleteRef.current?.show("/")
          }

          // Trigger @ autocomplete for file selection
          if (inputChar === "@") {
            autocompleteRef.current?.show("@")
          }

          autocompleteRef.current?.onInput(newValue)
        }
    }
  })

  // Get anchor position for autocomplete
  const anchorY = anchorRef.current?.y ?? 0
  const anchorX = anchorRef.current?.x ?? 0
  const anchorWidth = anchorRef.current?.width ?? 60

  // Format selected file display
  const selectedFileDisplay = selectedFile
    ? selectedFile.name
    : "No file selected"

  // Calculate input height based on content (1-6 lines)
  const inputLines = commandInput.split("\n").length
  const displayLines = Math.min(6, Math.max(1, inputLines))

  return (
    <box flexDirection="column" ref={(r: BoxRenderable) => { (anchorRef as any).current = r }}>
      {/* Autocomplete popup */}
      <Autocomplete
        ref={autocompleteRef}
        value={commandInput}
        cursorOffset={cursorPos}
        anchorY={anchorY}
        anchorX={anchorX}
        anchorWidth={anchorWidth}
        cwd={cwd}
        onSelect={handleAutocompleteSelect}
      />

      {/* Input area */}
      <box flexDirection="column" flexGrow={1} minHeight={displayLines + 1}>
          {/* Input line */}
          <box flexDirection="row">
            {commandInput ? (
              <>
                <text fg={theme.text}>{commandInput.slice(0, cursorPos)}</text>
                {focused && <text fg={theme.primary} attributes={TextAttributes.BOLD}>█</text>}
                <text fg={theme.text}>{commandInput.slice(cursorPos)}</text>
              </>
            ) : (
              <>
                {focused && <text fg={theme.primary} attributes={TextAttributes.BOLD}>█</text>}
                <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
                  Type a command... "/convert mp4"
                </text>
              </>
            )}
          </box>

          {/* Selected file line */}
          <box flexDirection="row" marginTop={1}>
            <text fg={theme.info}>File  </text>
          <text fg={theme.textMuted}>{selectedFileDisplay}</text>
        </box>
      </box>


    </box>
  )
}

// Re-export for convenience
export { HistoryProvider, usePromptHistory } from "./history"
export { Autocomplete } from "./autocomplete"
export type { AutocompleteOption, AutocompleteRef } from "./autocomplete"
export type { PromptInfo } from "./history"
