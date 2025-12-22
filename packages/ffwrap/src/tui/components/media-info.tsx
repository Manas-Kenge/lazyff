import React, { useEffect, useState } from "react";
import { TextAttributes } from "@opentui/core";
import { useApp } from "../context/app.tsx";
import { useTheme } from "../context/theme.tsx";
import {
  getDetailedMediaInfo,
  type DetailedMediaInfo,
} from "../../commands/info.ts";
import { formatTime, formatSize } from "../../ffmpeg/builder.ts";
import { getFileIcon } from "../utils/fs.ts";
import fs from "fs";

interface MediaInfoProps {
  width?: number;
}

/**
 * Format bitrate for display
 */
function formatBitrate(bps: number): string {
  if (bps >= 1000000) {
    return `${(bps / 1000000).toFixed(1)} Mbps`;
  }
  if (bps >= 1000) {
    return `${(bps / 1000).toFixed(0)} kbps`;
  }
  return `${bps} bps`;
}

/**
 * Get channel layout description
 */
function getChannelDescription(channels: number, layout?: string): string {
  if (layout) {
    return layout;
  }
  switch (channels) {
    case 1:
      return "mono";
    case 2:
      return "stereo";
    case 6:
      return "5.1";
    case 8:
      return "7.1";
    default:
      return `${channels}ch`;
  }
}

export function MediaInfo({ width = 40 }: MediaInfoProps) {
  const { selectedFile } = useApp();
  const { theme } = useTheme();
  const [detailedInfo, setDetailedInfo] = useState<DetailedMediaInfo | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  // Load detailed media info when file is selected
  useEffect(() => {
    setDetailedInfo(null);

    if (!selectedFile || selectedFile.type === "directory") {
      return;
    }

    let cancelled = false;
    setLoading(true);

    const loadInfo = async () => {
      const info = await getDetailedMediaInfo(selectedFile.path);
      if (!cancelled) {
        setDetailedInfo(info);
        setLoading(false);
      }
    };

    loadInfo();

    return () => {
      cancelled = true;
    };
  }, [selectedFile?.path, selectedFile?.type]);

  if (!selectedFile) {
    return (
      <box
        flexDirection="column"
        borderStyle="rounded"
        borderColor={theme.border}
        backgroundColor={theme.background}
        width={width}
        flexGrow={1}
      >
        {/* Header */}
        <box paddingLeft={1} paddingRight={1}>
          <text attributes={TextAttributes.BOLD} fg={theme.primary}>
            Media Info
          </text>
        </box>

        <box paddingLeft={1} paddingRight={1}>
          <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
            Select a file to view details
          </text>
        </box>
      </box>
    );
  }

  if (selectedFile.type === "directory") {
    return (
      <box
        flexDirection="column"
        borderStyle="rounded"
        borderColor={theme.border}
        backgroundColor={theme.background}
        width={width}
        flexGrow={1}
      >
        {/* Header */}
        <box paddingLeft={1} paddingRight={1}>
          <text attributes={TextAttributes.BOLD} fg={theme.primary}>
            Media Info
          </text>
        </box>

        <box flexDirection="row" gap={1} paddingLeft={1} paddingRight={1}>
          <text fg={theme.info}>{getFileIcon(selectedFile)}</text>
          <text attributes={TextAttributes.BOLD} fg={theme.text}>
            {selectedFile.name}
          </text>
        </box>
      </box>
    );
  }

  // Get file stats
  let fileSize = 0;
  try {
    const stats = fs.statSync(selectedFile.path);
    fileSize = stats.size;
  } catch {
    // Ignore errors
  }

  const icon = getFileIcon(selectedFile);
  const typeColor =
    selectedFile.mediaType === "video"
      ? theme.secondary
      : selectedFile.mediaType === "audio"
      ? theme.warning
      : selectedFile.mediaType === "image"
      ? theme.success
      : theme.text;

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      borderColor={theme.border}
      backgroundColor={theme.background}
      width={width}
      flexGrow={1}
    >
      {/* Header */}
      <box paddingLeft={1} paddingRight={1} marginBottom={1}>
        <text attributes={TextAttributes.BOLD} fg={theme.primary}>
          Media Info
        </text>
      </box>

      {/* File name */}
      <box flexDirection="row" gap={1} paddingLeft={1} paddingRight={1}>
        <text fg={typeColor}>{icon}</text>
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {selectedFile.name}
        </text>
      </box>

      {loading ? (
        <box paddingLeft={1} paddingRight={1}>
          <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
            Loading...
          </text>
        </box>
      ) : detailedInfo ? (
        <box flexDirection="column" gap={0} paddingLeft={1} paddingRight={1}>
          {/* Format info */}
          <SectionHeader label="Format" theme={theme} />
          <InfoRow
            label="Container"
            value={detailedInfo.format.name.toUpperCase()}
          />
          <InfoRow
            label="Duration"
            value={formatTime(detailedInfo.format.duration)}
          />
          <InfoRow label="Size" value={formatSize(detailedInfo.format.size)} />
          {detailedInfo.format.bitrate > 0 && (
            <InfoRow
              label="Bitrate"
              value={formatBitrate(detailedInfo.format.bitrate)}
            />
          )}
          <InfoRow
            label="Streams"
            value={String(detailedInfo.format.nbStreams)}
          />

          {/* Video info */}
          {detailedInfo.video && (
            <>
              <SectionHeader label="Video" theme={theme} />
              <InfoRow
                label="Codec"
                value={
                  detailedInfo.video.profile
                    ? `${detailedInfo.video.codec.toUpperCase()} (${
                        detailedInfo.video.profile
                      })`
                    : detailedInfo.video.codec.toUpperCase()
                }
              />
              <InfoRow
                label="Resolution"
                value={`${detailedInfo.video.width}×${detailedInfo.video.height}`}
              />
              {detailedInfo.video.aspectRatio && (
                <InfoRow
                  label="Aspect"
                  value={detailedInfo.video.aspectRatio}
                />
              )}
              <InfoRow label="FPS" value={`${detailedInfo.video.frameRate}`} />
              {detailedInfo.video.pixelFormat && (
                <InfoRow
                  label="Pixel fmt"
                  value={detailedInfo.video.pixelFormat}
                />
              )}
              {detailedInfo.video.bitrate && (
                <InfoRow
                  label="Bitrate"
                  value={formatBitrate(detailedInfo.video.bitrate)}
                />
              )}
            </>
          )}

          {/* Audio info */}
          {detailedInfo.audio && (
            <>
              <SectionHeader label="Audio" theme={theme} />
              <InfoRow
                label="Codec"
                value={detailedInfo.audio.codec.toUpperCase()}
              />
              <InfoRow
                label="Sample"
                value={`${detailedInfo.audio.sampleRate} Hz`}
              />
              <InfoRow
                label="Channels"
                value={getChannelDescription(
                  detailedInfo.audio.channels,
                  detailedInfo.audio.channelLayout
                )}
              />
              {detailedInfo.audio.bitrate && (
                <InfoRow
                  label="Bitrate"
                  value={formatBitrate(detailedInfo.audio.bitrate)}
                />
              )}
            </>
          )}

          {/* Subtitles */}
          {detailedInfo.subtitle && detailedInfo.subtitle.length > 0 && (
            <>
              <SectionHeader label="Subtitles" theme={theme} />
              {detailedInfo.subtitle.map((sub, i) => (
                <InfoRow
                  key={i}
                  label={`[${i}]`}
                  value={
                    sub.language ? `${sub.codec} (${sub.language})` : sub.codec
                  }
                />
              ))}
            </>
          )}
        </box>
      ) : (
        <box flexDirection="column" gap={0} paddingLeft={1} paddingRight={1}>
          <InfoRow
            label="Type"
            value={
              selectedFile.mediaType || selectedFile.extension || "Unknown"
            }
          />
          <InfoRow label="Size" value={formatSize(fileSize)} />
        </box>
      )}

      {/* Path */}
      <box marginTop={1} paddingLeft={1} paddingRight={1}>
        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
          {selectedFile.path.length > width - 4
            ? "..." + selectedFile.path.slice(-(width - 7))
            : selectedFile.path}
        </text>
      </box>
    </box>
  );
}

function SectionHeader({ label, theme }: { label: string; theme: any }) {
  return (
    <box marginTop={1} marginBottom={0}>
      <text fg={theme.secondary} attributes={TextAttributes.BOLD}>
        {label}
      </text>
    </box>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();

  return (
    <box flexDirection="row" gap={1}>
      <text fg={theme.textMuted}>{label}:</text>
      <text fg={theme.text}>{value}</text>
    </box>
  );
}
