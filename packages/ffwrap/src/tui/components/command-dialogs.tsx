import React, { useState } from "react"
import { TextAttributes } from "@opentui/core"
import { DialogSelect, type DialogSelectOption } from "./ui/dialog-select.tsx"
import { DialogPrompt } from "./ui/dialog-prompt.tsx"
import { useDialog } from "./ui/dialog.tsx"
import { useTheme } from "../context/theme.tsx"
import { FORMAT_PRESETS } from "../../ffmpeg/presets.ts"
import type { FileNode } from "../context/app.tsx"

/**
 * Format bytes to human-readable size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Parse size string to bytes (e.g., "10MB" -> 10485760)
 */
function parseSizeToBytes(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?$/i)
  if (!match) return 0

  const value = parseFloat(match[1] || "0")
  const unit = (match[2] || "B").toUpperCase()

  switch (unit) {
    case "KB": return value * 1024
    case "MB": return value * 1024 * 1024
    case "GB": return value * 1024 * 1024 * 1024
    default: return value
  }
}

interface DialogProps<T> {
  file: FileNode
  onSelect: (options: T) => void
}

/**
 * Convert command dialog - select output format
 * Only available for video and audio files
 */
export function ConvertDialog({ file, onSelect }: DialogProps<{ format: string; quality: string }>) {
  const dialog = useDialog()
  const [showCustom, setShowCustom] = useState(false)

  // Filter formats based on media type
  const formatOptions: DialogSelectOption<string>[] = Object.entries(FORMAT_PRESETS)
    .filter(([_, preset]) => {
      // Video files can convert to any format
      if (file.mediaType === "video") return true
      // Audio files can only convert to audio formats
      if (file.mediaType === "audio") return !preset.videoCodec
      return false
    })
    .map(([key, preset]) => ({
      title: key.toUpperCase(),
      value: key,
      description: preset.description,
      category: preset.videoCodec ? "Video" : "Audio",
    }))

  // Add custom option
  formatOptions.push({
    title: "Custom...",
    value: "__custom__",
    description: "Enter a custom format",
    category: "Other",
  })

  if (showCustom) {
    return (
      <DialogPrompt
        title="Enter format"
        placeholder="e.g., mkv, avi, flac"
        onConfirm={(value) => {
          dialog.close()
          onSelect({ format: value.trim().toLowerCase(), quality: "medium" })
        }}
        onCancel={() => setShowCustom(false)}
      />
    )
  }

  return (
    <DialogSelect
      title="Convert to format"
      placeholder="Search formats..."
      options={formatOptions}
      onSelect={(option) => {
        if (option.value === "__custom__") {
          setShowCustom(true)
        } else {
          dialog.close()
          onSelect({ format: option.value, quality: "medium" })
        }
      }}
    />
  )
}

/**
 * Compress command dialog - select compression target
 * Only available for video and audio files
 */
export function CompressDialog({ file, onSelect }: DialogProps<{ percent?: number; targetSize?: string }>) {
  const dialog = useDialog()
  const [showCustom, setShowCustom] = useState(false)
  const [customType, setCustomType] = useState<"percent" | "size">("percent")

  const fileSize = file.size || 0
  const fileSizeFormatted = formatSize(fileSize)

  // Build compression options, filtering out target sizes larger than file
  const compressOptions: DialogSelectOption<{ percent?: number; targetSize?: string } | "__custom_percent__" | "__custom_size__">[] = [
    { title: "25%", value: { percent: 25 }, description: `Compress to ~${formatSize(fileSize * 0.25)}`, category: "Percentage" },
    { title: "50%", value: { percent: 50 }, description: `Compress to ~${formatSize(fileSize * 0.5)}`, category: "Percentage" },
    { title: "75%", value: { percent: 75 }, description: `Compress to ~${formatSize(fileSize * 0.75)}`, category: "Percentage" },
  ]

  // Only add target sizes smaller than current file
  const targetSizes = [
    { label: "5 MB", bytes: 5 * 1024 * 1024, value: "5MB" },
    { label: "10 MB", bytes: 10 * 1024 * 1024, value: "10MB" },
    { label: "25 MB", bytes: 25 * 1024 * 1024, value: "25MB" },
    { label: "50 MB", bytes: 50 * 1024 * 1024, value: "50MB" },
    { label: "100 MB", bytes: 100 * 1024 * 1024, value: "100MB" },
    { label: "500 MB", bytes: 500 * 1024 * 1024, value: "500MB" },
  ]

  for (const size of targetSizes) {
    if (fileSize > size.bytes) {
      compressOptions.push({
        title: size.label,
        value: { targetSize: size.value },
        description: `Target file size of ${size.label}`,
        category: "Target Size",
      })
    }
  }

  // Add custom options
  compressOptions.push(
    { title: "Custom %...", value: "__custom_percent__", description: "Enter a custom percentage", category: "Custom" },
    { title: "Custom size...", value: "__custom_size__", description: `Enter target size (current: ${fileSizeFormatted})`, category: "Custom" },
  )

  if (showCustom) {
    if (customType === "percent") {
      return (
        <DialogPrompt
          title="Enter compression percentage"
          placeholder="e.g., 30 (for 30%)"
          onConfirm={(value) => {
            const percent = parseInt(value, 10)
            if (percent > 0 && percent < 100) {
              dialog.close()
              onSelect({ percent })
            } else {
              setShowCustom(false)
            }
          }}
          onCancel={() => setShowCustom(false)}
        />
      )
    } else {
      return (
        <DialogPrompt
          title={`Enter target size (current: ${fileSizeFormatted})`}
          placeholder="e.g., 15MB, 200KB"
          onConfirm={(value) => {
            const targetBytes = parseSizeToBytes(value)
            if (targetBytes > 0 && targetBytes < fileSize) {
              dialog.close()
              onSelect({ targetSize: value.trim().toUpperCase() })
            } else {
              setShowCustom(false)
            }
          }}
          onCancel={() => setShowCustom(false)}
        />
      )
    }
  }

  return (
    <DialogSelect
      title={`Compress (current: ${fileSizeFormatted})`}
      placeholder="Search compression options..."
      options={compressOptions}
      onSelect={(option) => {
        if (option.value === "__custom_percent__") {
          setCustomType("percent")
          setShowCustom(true)
        } else if (option.value === "__custom_size__") {
          setCustomType("size")
          setShowCustom(true)
        } else {
          dialog.close()
          onSelect(option.value as { percent?: number; targetSize?: string })
        }
      }}
    />
  )
}

/**
 * Extract command dialog - select what to extract
 * Only available for video files (to extract audio) or audio files
 */
export function ExtractDialog({ file, onSelect }: DialogProps<{ audio?: boolean; video?: boolean; frames?: boolean; format?: string }>) {
  const dialog = useDialog()
  const [showCustom, setShowCustom] = useState(false)

  const extractOptions: DialogSelectOption<{ audio?: boolean; video?: boolean; frames?: boolean; format?: string } | "__custom__">[] = []

  // Audio extraction options (for video files)
  if (file.mediaType === "video") {
    extractOptions.push(
      { title: "Audio as MP3", value: { audio: true, format: "mp3" }, description: "Extract audio track as MP3", category: "Audio" },
      { title: "Audio as WAV", value: { audio: true, format: "wav" }, description: "Extract audio track as WAV (lossless)", category: "Audio" },
      { title: "Audio as FLAC", value: { audio: true, format: "flac" }, description: "Extract audio track as FLAC (lossless)", category: "Audio" },
      { title: "Audio as AAC", value: { audio: true, format: "aac" }, description: "Extract audio track as AAC", category: "Audio" },
      { title: "Video only", value: { video: true }, description: "Remove audio, keep video", category: "Video" },
      { title: "Single frame", value: { frames: true }, description: "Extract a single frame as image", category: "Frames" },
    )
  }

  // Audio file conversions
  if (file.mediaType === "audio") {
    extractOptions.push(
      { title: "Convert to MP3", value: { audio: true, format: "mp3" }, description: "Convert to MP3 format", category: "Convert" },
      { title: "Convert to WAV", value: { audio: true, format: "wav" }, description: "Convert to WAV (lossless)", category: "Convert" },
      { title: "Convert to FLAC", value: { audio: true, format: "flac" }, description: "Convert to FLAC (lossless)", category: "Convert" },
      { title: "Convert to AAC", value: { audio: true, format: "aac" }, description: "Convert to AAC format", category: "Convert" },
    )
  }

  // Add custom option
  extractOptions.push({
    title: "Custom format...",
    value: "__custom__",
    description: "Enter a custom audio format",
    category: "Other",
  })

  if (showCustom) {
    return (
      <DialogPrompt
        title="Enter audio format"
        placeholder="e.g., ogg, opus, m4a"
        onConfirm={(value) => {
          dialog.close()
          onSelect({ audio: true, format: value.trim().toLowerCase() })
        }}
        onCancel={() => setShowCustom(false)}
      />
    )
  }

  return (
    <DialogSelect
      title="Extract"
      placeholder="Search extraction options..."
      options={extractOptions}
      onSelect={(option) => {
        if (option.value === "__custom__") {
          setShowCustom(true)
        } else {
          dialog.close()
          onSelect(option.value as { audio?: boolean; video?: boolean; frames?: boolean; format?: string })
        }
      }}
    />
  )
}

/**
 * GIF command dialog - select GIF settings
 * Only available for video files
 */
export function GifDialog({ file, onSelect }: DialogProps<{ duration?: string; width?: number; fps?: number; highQuality?: boolean; startTime?: string }>) {
  const dialog = useDialog()
  const [showCustom, setShowCustom] = useState(false)

  const gifOptions: DialogSelectOption<{ duration?: string; width?: number; fps?: number; highQuality?: boolean; startTime?: string } | "__custom__">[] = [
    { title: "Quick (3s, 320px)", value: { duration: "3", width: 320, fps: 10 }, description: "Small 3-second GIF", category: "Presets" },
    { title: "Standard (5s, 480px)", value: { duration: "5", width: 480, fps: 15 }, description: "Standard 5-second GIF", category: "Presets" },
    { title: "Large (10s, 640px)", value: { duration: "10", width: 640, fps: 15 }, description: "Larger 10-second GIF", category: "Presets" },
    { title: "High Quality (5s, 480px)", value: { duration: "5", width: 480, fps: 15, highQuality: true }, description: "Better colors, larger file", category: "Quality" },
    { title: "Full video (480px)", value: { width: 480, fps: 15 }, description: "Convert entire video to GIF", category: "Full" },
    { title: "Custom...", value: "__custom__", description: "Specify duration and start time", category: "Other" },
  ]

  if (showCustom) {
    return (
      <DialogPrompt
        title="Enter GIF options"
        placeholder="duration,width,fps,start (e.g., 5,480,15,10)"
        onConfirm={(value) => {
          const parts = value.split(",").map(s => s.trim())
          dialog.close()
          onSelect({
            duration: parts[0] || "5",
            width: parseInt(parts[1] || "480", 10) || 480,
            fps: parseInt(parts[2] || "15", 10) || 15,
            startTime: parts[3] || undefined,
          })
        }}
        onCancel={() => setShowCustom(false)}
      />
    )
  }

  return (
    <DialogSelect
      title="Create GIF"
      placeholder="Search GIF options..."
      options={gifOptions}
      onSelect={(option) => {
        if (option.value === "__custom__") {
          setShowCustom(true)
        } else {
          dialog.close()
          onSelect(option.value as { duration?: string; width?: number; fps?: number; highQuality?: boolean })
        }
      }}
    />
  )
}

/**
 * Trim command dialog - select trim duration
 * Only available for video and audio files
 */
export function TrimDialog({ file, onSelect }: DialogProps<{ startTime?: string; duration?: string; endTime?: string }>) {
  const dialog = useDialog()
  const [showCustom, setShowCustom] = useState(false)

  const trimOptions: DialogSelectOption<{ startTime?: string; duration?: string; endTime?: string } | "__custom__">[] = [
    { title: "First 10 seconds", value: { startTime: "0", duration: "10" }, description: "Keep first 10 seconds", category: "Beginning" },
    { title: "First 30 seconds", value: { startTime: "0", duration: "30" }, description: "Keep first 30 seconds", category: "Beginning" },
    { title: "First minute", value: { startTime: "0", duration: "60" }, description: "Keep first minute", category: "Beginning" },
    { title: "Skip first 10s", value: { startTime: "10" }, description: "Remove first 10 seconds", category: "Skip" },
    { title: "Skip first 30s", value: { startTime: "30" }, description: "Remove first 30 seconds", category: "Skip" },
    { title: "10s to 30s", value: { startTime: "10", endTime: "30" }, description: "Extract from 10s to 30s", category: "Range" },
    { title: "30s to 1min", value: { startTime: "30", endTime: "60" }, description: "Extract from 30s to 1 minute", category: "Range" },
    { title: "Custom...", value: "__custom__", description: "Enter custom start/end times", category: "Other" },
  ]

  if (showCustom) {
    return (
      <DialogPrompt
        title="Enter trim range"
        placeholder="start,end or start,+duration (e.g., 10,30 or 5,+15)"
        onConfirm={(value) => {
          const parts = value.split(",").map(s => s.trim())
          const start = parts[0] || "0"
          const end = parts[1] || ""

          dialog.close()
          if (end.startsWith("+")) {
            onSelect({ startTime: start, duration: end.slice(1) })
          } else if (end) {
            onSelect({ startTime: start, endTime: end })
          } else {
            onSelect({ startTime: start })
          }
        }}
        onCancel={() => setShowCustom(false)}
      />
    )
  }

  return (
    <DialogSelect
      title="Trim video"
      placeholder="Search trim options..."
      options={trimOptions}
      onSelect={(option) => {
        if (option.value === "__custom__") {
          setShowCustom(true)
        } else {
          dialog.close()
          onSelect(option.value as { startTime?: string; duration?: string; endTime?: string })
        }
      }}
    />
  )
}

/**
 * Thumbnail command dialog - select thumbnail settings
 * Available for video files only
 */
export function ThumbnailDialog({ file, onSelect }: DialogProps<{ time?: string; count?: number; grid?: string; width?: number }>) {
  const dialog = useDialog()
  const [showCustom, setShowCustom] = useState(false)

  const thumbnailOptions: DialogSelectOption<{ time?: string; count?: number; grid?: string; width?: number } | "__custom__">[] = [
    { title: "At 1 second", value: { time: "1" }, description: "Capture at 1 second", category: "Single" },
    { title: "At 5 seconds", value: { time: "5" }, description: "Capture at 5 seconds", category: "Single" },
    { title: "At 10 seconds", value: { time: "10" }, description: "Capture at 10 seconds", category: "Single" },
    { title: "At 30 seconds", value: { time: "30" }, description: "Capture at 30 seconds", category: "Single" },
    { title: "Grid 3x3", value: { count: 9, grid: "3x3" }, description: "9 thumbnails in a 3x3 grid", category: "Grid" },
    { title: "Grid 4x4", value: { count: 16, grid: "4x4" }, description: "16 thumbnails in a 4x4 grid", category: "Grid" },
    { title: "5 thumbnails", value: { count: 5 }, description: "5 evenly spaced thumbnails", category: "Multiple" },
    { title: "10 thumbnails", value: { count: 10 }, description: "10 evenly spaced thumbnails", category: "Multiple" },
    { title: "Custom time...", value: "__custom__", description: "Enter custom timestamp", category: "Other" },
  ]

  if (showCustom) {
    return (
      <DialogPrompt
        title="Enter timestamp"
        placeholder="e.g., 00:01:30 or 90 (seconds)"
        onConfirm={(value) => {
          dialog.close()
          onSelect({ time: value.trim() })
        }}
        onCancel={() => setShowCustom(false)}
      />
    )
  }

  return (
    <DialogSelect
      title="Create thumbnail"
      placeholder="Search thumbnail options..."
      options={thumbnailOptions}
      onSelect={(option) => {
        if (option.value === "__custom__") {
          setShowCustom(true)
        } else {
          dialog.close()
          onSelect(option.value as { time?: string; count?: number; grid?: string; width?: number })
        }
      }}
    />
  )
}

/**
 * Merge command dialog - select files to merge
 * Shows all compatible files in the same directory
 */
export function MergeDialog({
  file,
  siblingFiles,
  onSelect
}: {
  file: FileNode
  siblingFiles: FileNode[]
  onSelect: (options: { files: FileNode[]; reencode?: boolean }) => void
}) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set([file.path]))
  const [step, setStep] = useState<"select" | "options">("select")

  // Filter to only show compatible files (same media type)
  const compatibleFiles = siblingFiles.filter(f =>
    f.type === "file" &&
    f.mediaType === file.mediaType &&
    (f.mediaType === "video" || f.mediaType === "audio")
  )

  // Toggle file selection
  const toggleFile = (path: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        // Don't allow deselecting if it's the last file
        if (next.size > 1) {
          next.delete(path)
        }
      } else {
        next.add(path)
      }
      return next
    })
  }

  if (step === "options") {
    const mergeOptions: DialogSelectOption<{ reencode?: boolean }>[] = [
      {
        title: "Fast (Copy)",
        value: { reencode: false },
        description: "Quick merge - requires same codec in all files",
        category: "Mode"
      },
      {
        title: "Re-encode",
        value: { reencode: true },
        description: "Slower but works with different codecs/formats",
        category: "Mode"
      },
    ]

    const filesToMerge = compatibleFiles.filter(f => selectedFiles.has(f.path))

    return (
      <DialogSelect
        title={`Merge ${filesToMerge.length} files`}
        placeholder="Select merge mode..."
        options={mergeOptions}
        onSelect={(option) => {
          dialog.close()
          onSelect({ files: filesToMerge, reencode: option.value.reencode })
        }}
      />
    )
  }

  // File selection step
  const fileOptions: DialogSelectOption<string>[] = compatibleFiles.map(f => ({
    title: f.name,
    value: f.path,
    description: formatSize(f.size || 0),
    gutter: (
      <text fg={selectedFiles.has(f.path) ? theme.success : theme.textMuted}>
        {selectedFiles.has(f.path) ? "●" : "○"}
      </text>
    ),
  }))

  // Add "Done" option
  fileOptions.push({
    title: `✓ Merge ${selectedFiles.size} files`,
    value: "__done__",
    description: selectedFiles.size >= 2 ? "Proceed to merge options" : "Select at least 2 files",
    category: "Action",
  })

  return (
    <DialogSelect
      title="Select files to merge"
      placeholder="Toggle files with Enter..."
      options={fileOptions}
      onSelect={(option) => {
        if (option.value === "__done__") {
          if (selectedFiles.size >= 2) {
            setStep("options")
          }
        } else {
          toggleFile(option.value)
        }
      }}
    />
  )
}

/**
 * Get available commands based on file type
 */
export function getAvailableCommands(file: FileNode): {
  info: boolean
  compress: boolean
  convert: boolean
  extract: boolean
  gif: boolean
  trim: boolean
  thumbnail: boolean
  merge: boolean
} {
  const mediaType = file.mediaType

  return {
    // Info available for all media files
    info: mediaType === "video" || mediaType === "audio" || mediaType === "image",
    // Compress available for video and audio
    compress: mediaType === "video" || mediaType === "audio",
    // Convert available for video and audio
    convert: mediaType === "video" || mediaType === "audio",
    // Extract available for video and audio
    extract: mediaType === "video" || mediaType === "audio",
    // GIF only for video
    gif: mediaType === "video",
    // Trim available for video and audio
    trim: mediaType === "video" || mediaType === "audio",
    // Thumbnail only for video
    thumbnail: mediaType === "video",
    // Merge available for video and audio
    merge: mediaType === "video" || mediaType === "audio",
  }
}
