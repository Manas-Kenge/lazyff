import { useCallback } from "react"
import { useApp, type FileNode } from "../context/app.tsx"
import { info } from "../../commands/info.ts"
import { compress, type CompressOptions } from "../../commands/compress.ts"
import { convert } from "../../commands/convert.ts"
import { extract, type ExtractOptions } from "../../commands/extract.ts"
import { gif, type GifOptions } from "../../commands/gif.ts"
import { trim, type TrimOptions } from "../../commands/trim.ts"
import { thumbnail, type ThumbnailOptions } from "../../commands/thumbnail.ts"
import { merge, type MergeOptions } from "../../commands/merge.ts"
import { formatError } from "../../ffmpeg/errors.ts"

/**
 * Hook for executing commands on selected files
 */
export function useCommands() {
  const { selectedFile, addMessage, updateMessage } = useApp()

  /**
   * Execute info command on selected file
   */
  const executeInfo = useCallback(async () => {
    if (!selectedFile || selectedFile.type === "directory") {
      addMessage({ type: "assistant", content: "No file selected", status: "error" })
      return
    }

    const msgId = addMessage({
      type: "assistant",
      content: `Getting info for ${selectedFile.name}...`,
      status: "running",
    })

    try {
      const result = await info(selectedFile.path)

      if (result.success && result.info) {
        const lines = [
          `Format: ${result.info.format.name}`,
          result.info.format.duration
            ? `Duration: ${Math.round(result.info.format.duration)}s`
            : null,
          result.info.video?.codec ? `Codec: ${result.info.video.codec}` : null,
          result.info.video?.width && result.info.video?.height
            ? `Resolution: ${result.info.video.width}x${result.info.video.height}`
            : null,
        ].filter(Boolean)

        updateMessage(msgId, {
          content: lines.join(", "),
          status: "success",
        })
      } else {
        updateMessage(msgId, {
          content: result.error || "Failed to get info",
          status: "error",
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      updateMessage(msgId, {
        content: formatError(errorMsg),
        status: "error",
      })
    }
  }, [selectedFile, addMessage, updateMessage])

  /**
   * Execute compress command (requires dialog for options)
   */
  const executeCompress = useCallback(
    async (options: Omit<CompressOptions, "input">) => {
      if (!selectedFile || selectedFile.type === "directory") {
        addMessage({ type: "assistant", content: "No file selected", status: "error" })
        return
      }

      const msgId = addMessage({
        type: "assistant",
        content: `Compressing ${selectedFile.name}...`,
        status: "running",
      })

      try {
        const result = await compress({ input: selectedFile.path, ...options })

        if (result.success) {
          updateMessage(msgId, {
            content: `Compressed to ${result.outputPath}`,
            status: "success",
          })
        } else {
          updateMessage(msgId, {
            content: result.error || "Compression failed",
            status: "error",
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        updateMessage(msgId, {
          content: formatError(errorMsg),
          status: "error",
        })
      }
    },
    [selectedFile, addMessage, updateMessage]
  )

  /**
   * Execute convert command (requires dialog for options)
   */
  const executeConvert = useCallback(
    async (options: { format?: string; quality?: string }) => {
      if (!selectedFile || selectedFile.type === "directory") {
        addMessage({ type: "assistant", content: "No file selected", status: "error" })
        return
      }

      const msgId = addMessage({
        type: "assistant",
        content: `Converting ${selectedFile.name}...`,
        status: "running",
      })

      try {
        const result = await convert({
          input: selectedFile.path,
          format: options.format as any,
          quality: (options.quality || "medium") as any,
        })

        if (result.success) {
          updateMessage(msgId, {
            content: `Converted to ${result.outputPath}`,
            status: "success",
          })
        } else {
          updateMessage(msgId, {
            content: result.error || "Conversion failed",
            status: "error",
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        updateMessage(msgId, {
          content: formatError(errorMsg),
          status: "error",
        })
      }
    },
    [selectedFile, addMessage, updateMessage]
  )

  /**
   * Execute extract command (requires dialog for options)
   */
  const executeExtract = useCallback(
    async (options: Omit<ExtractOptions, "input">) => {
      if (!selectedFile || selectedFile.type === "directory") {
        addMessage({ type: "assistant", content: "No file selected", status: "error" })
        return
      }

      const type = options.audio ? "audio" : options.video ? "video" : "frames"
      const msgId = addMessage({
        type: "assistant",
        content: `Extracting ${type} from ${selectedFile.name}...`,
        status: "running",
      })

      try {
        const result = await extract({ input: selectedFile.path, ...options })

        if (result.success) {
          updateMessage(msgId, {
            content: `Extracted to ${result.outputPath}`,
            status: "success",
          })
        } else {
          updateMessage(msgId, {
            content: result.error || "Extraction failed",
            status: "error",
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        updateMessage(msgId, {
          content: formatError(errorMsg),
          status: "error",
        })
      }
    },
    [selectedFile, addMessage, updateMessage]
  )

  /**
   * Execute GIF command (requires dialog for options)
   */
  const executeGif = useCallback(
    async (options: Omit<GifOptions, "input">) => {
      if (!selectedFile || selectedFile.type === "directory") {
        addMessage({ type: "assistant", content: "No file selected", status: "error" })
        return
      }

      const msgId = addMessage({
        type: "assistant",
        content: `Creating GIF from ${selectedFile.name}...`,
        status: "running",
      })

      try {
        const result = await gif({ input: selectedFile.path, ...options })

        if (result.success) {
          updateMessage(msgId, {
            content: `GIF created: ${result.outputPath}`,
            status: "success",
          })
        } else {
          updateMessage(msgId, {
            content: result.error || "GIF creation failed",
            status: "error",
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        updateMessage(msgId, {
          content: formatError(errorMsg),
          status: "error",
        })
      }
    },
    [selectedFile, addMessage, updateMessage]
  )

  /**
   * Execute trim command (requires dialog for options)
   */
  const executeTrim = useCallback(
    async (options: Omit<TrimOptions, "input">) => {
      if (!selectedFile || selectedFile.type === "directory") {
        addMessage({ type: "assistant", content: "No file selected", status: "error" })
        return
      }

      const msgId = addMessage({
        type: "assistant",
        content: `Trimming ${selectedFile.name}...`,
        status: "running",
      })

      try {
        const result = await trim({ input: selectedFile.path, ...options })

        if (result.success) {
          updateMessage(msgId, {
            content: `Trimmed to ${result.outputPath}`,
            status: "success",
          })
        } else {
          updateMessage(msgId, {
            content: result.error || "Trim failed",
            status: "error",
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        updateMessage(msgId, {
          content: formatError(errorMsg),
          status: "error",
        })
      }
    },
    [selectedFile, addMessage, updateMessage]
  )

  /**
   * Execute thumbnail command (requires dialog for options)
   */
  const executeThumbnail = useCallback(
    async (options: Omit<ThumbnailOptions, "input">) => {
      if (!selectedFile || selectedFile.type === "directory") {
        addMessage({ type: "assistant", content: "No file selected", status: "error" })
        return
      }

      const msgId = addMessage({
        type: "assistant",
        content: `Creating thumbnail from ${selectedFile.name}...`,
        status: "running",
      })

      try {
        const result = await thumbnail({ input: selectedFile.path, ...options })

        if (result.success) {
          updateMessage(msgId, {
            content: `Thumbnail created: ${result.outputPath}`,
            status: "success",
          })
        } else {
          updateMessage(msgId, {
            content: result.error || "Thumbnail creation failed",
            status: "error",
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        updateMessage(msgId, {
          content: formatError(errorMsg),
          status: "error",
        })
      }
    },
    [selectedFile, addMessage, updateMessage]
  )

  /**
   * Execute merge command on multiple files
   */
  const executeMerge = useCallback(
    async (options: { files: FileNode[]; reencode?: boolean }) => {
      if (options.files.length < 2) {
        addMessage({
          type: "assistant",
          content: "Need at least 2 files to merge",
          status: "error",
        })
        return
      }

      const fileNames = options.files.map((f) => f.name).join(", ")
      const msgId = addMessage({
        type: "assistant",
        content: `Merging ${options.files.length} files...`,
        status: "running",
      })

      try {
        // Generate output filename based on first file
        const firstFile = options.files[0]
        if (!firstFile) {
          updateMessage(msgId, { content: "No files to merge", status: "error" })
          return
        }
        const ext = firstFile.extension || "mp4"
        const baseName = firstFile.name.replace(/\.[^/.]+$/, "")
        const outputPath = firstFile.path.replace(/[^/]+$/, `${baseName}_merged.${ext}`)

        const result = await merge({
          inputs: options.files.map((f) => f.path),
          output: outputPath,
          reencode: options.reencode,
          overwrite: true,
        })

        if (result.success) {
          updateMessage(msgId, {
            content: `Merged ${options.files.length} files → ${result.outputPath.split("/").pop()}`,
            status: "success",
          })
        } else {
          updateMessage(msgId, {
            content: result.error || "Merge failed",
            status: "error",
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        updateMessage(msgId, {
          content: formatError(errorMsg),
          status: "error",
        })
      }
    },
    [addMessage, updateMessage]
  )

  return {
    executeInfo,
    executeCompress,
    executeConvert,
    executeExtract,
    executeGif,
    executeTrim,
    executeThumbnail,
    executeMerge,
    selectedFile,
  }
}
