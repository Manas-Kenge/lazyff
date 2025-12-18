import React, { useEffect } from "react"
import { TextAttributes } from "@opentui/core"
import { useApp } from "../context/app.tsx"
import { useTheme } from "../context/theme.tsx"
import { getMediaInfo } from "../../ffmpeg/index.ts"
import { formatTime, formatSize } from "../../ffmpeg/builder.ts"
import { getFileIcon } from "../utils/fs.ts"
import fs from "fs"

export function MediaInfo() {
  const { selectedFile, mediaInfo, setMediaInfo } = useApp()
  const { theme } = useTheme()

  // Load media info when file is selected
  useEffect(() => {
    if (!selectedFile || selectedFile.type === "directory") {
      setMediaInfo(null)
      return
    }

    const loadInfo = async () => {
      const info = await getMediaInfo(selectedFile.path)
      setMediaInfo(info)
    }

    loadInfo()
  }, [selectedFile, setMediaInfo])

  if (!selectedFile) {
    return (
      <box
        flexDirection="column"
        borderStyle="rounded"
        borderColor={theme.border}
        padding={1}
        flexGrow={1}
      >
        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
          Select a file to view details
        </text>
      </box>
    )
  }

  if (selectedFile.type === "directory") {
    return (
      <box
        flexDirection="column"
        borderStyle="rounded"
        borderColor={theme.border}
        padding={1}
        flexGrow={1}
      >
        <box flexDirection="row" gap={1}>
          <text fg={theme.info}>{getFileIcon(selectedFile)}</text>
          <text attributes={TextAttributes.BOLD} fg={theme.text}>
            {selectedFile.name}
          </text>
        </box>
        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
          Directory
        </text>
      </box>
    )
  }

  // Get file stats
  let fileSize = 0
  try {
    const stats = fs.statSync(selectedFile.path)
    fileSize = stats.size
  } catch {
    // Ignore errors
  }

  const icon = getFileIcon(selectedFile)
  const typeColor =
    selectedFile.mediaType === "video"
      ? theme.secondary
      : selectedFile.mediaType === "audio"
        ? theme.warning
        : selectedFile.mediaType === "image"
          ? theme.success
          : theme.text

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      borderColor={theme.border}
      padding={1}
      flexGrow={1}
    >
      {/* File name */}
      <box flexDirection="row" gap={1} marginBottom={1}>
        <text fg={typeColor}>{icon}</text>
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {selectedFile.name}
        </text>
      </box>

      {/* File info */}
      <box flexDirection="column" gap={0}>
        <InfoRow label="Type" value={selectedFile.mediaType || selectedFile.extension || "Unknown"} />
        <InfoRow label="Size" value={formatSize(fileSize)} />

        {mediaInfo && (
          <>
            {mediaInfo.duration !== undefined && (
              <InfoRow label="Duration" value={formatTime(mediaInfo.duration)} />
            )}
            {mediaInfo.width && mediaInfo.height && (
              <InfoRow label="Resolution" value={`${mediaInfo.width}x${mediaInfo.height}`} />
            )}
            {mediaInfo.codec && <InfoRow label="Codec" value={mediaInfo.codec.toUpperCase()} />}
            {mediaInfo.bitrate && (
              <InfoRow label="Bitrate" value={`${Math.round(mediaInfo.bitrate / 1000)} kbps`} />
            )}
            {mediaInfo.format && <InfoRow label="Format" value={mediaInfo.format} />}
          </>
        )}
      </box>

      {/* Path */}
      <box marginTop={1}>
        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
          {selectedFile.path.length > 50
            ? "..." + selectedFile.path.slice(-47)
            : selectedFile.path}
        </text>
      </box>
    </box>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme()

  return (
    <box flexDirection="row" gap={1}>
      <text fg={theme.primary} attributes={TextAttributes.DIM}>
        {label}:
      </text>
      <text fg={theme.text}>{value}</text>
    </box>
  )
}
