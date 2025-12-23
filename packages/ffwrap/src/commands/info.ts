import type { CommandModule } from "yargs"
import fs from "fs"
import path from "path"
import { runFfprobe } from "../ffmpeg/index.ts"
import { formatTime, formatSize } from "../ffmpeg/builder.ts"

/**
 * Detailed media information from ffprobe
 */
export interface DetailedMediaInfo {
  format: {
    name: string
    longName: string
    duration: number
    size: number
    bitrate: number
    nbStreams: number
  }
  video?: {
    codec: string
    codecLongName: string
    profile?: string
    width: number
    height: number
    aspectRatio?: string
    pixelFormat?: string
    frameRate: number
    bitrate?: number
  }
  audio?: {
    codec: string
    codecLongName: string
    sampleRate: number
    channels: number
    channelLayout?: string
    bitrate?: number
  }
  subtitle?: {
    codec: string
    language?: string
  }[]
}

/**
 * Get detailed media information using ffprobe
 */
export async function getDetailedMediaInfo(filePath: string): Promise<DetailedMediaInfo | null> {
  const result = await runFfprobe([
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ])

  if (result.exitCode !== 0) {
    return null
  }

  try {
    const data = JSON.parse(result.stdout)
    const format = data.format
    const streams = data.streams || []

    const videoStream = streams.find((s: any) => s.codec_type === "video")
    const audioStream = streams.find((s: any) => s.codec_type === "audio")
    const subtitleStreams = streams.filter((s: any) => s.codec_type === "subtitle")

    const info: DetailedMediaInfo = {
      format: {
        name: format?.format_name || "unknown",
        longName: format?.format_long_name || "Unknown",
        duration: format?.duration ? parseFloat(format.duration) : 0,
        size: format?.size ? parseInt(format.size) : 0,
        bitrate: format?.bit_rate ? parseInt(format.bit_rate) : 0,
        nbStreams: format?.nb_streams || 0,
      },
    }

    if (videoStream) {
      // Parse frame rate from "30/1" or "30000/1001" format
      let frameRate = 0
      if (videoStream.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split("/")
        const num = parseFloat(parts[0] || "0")
        const den = parseFloat(parts[1] || "1")
        frameRate = den > 0 ? num / den : 0
      }

      info.video = {
        codec: videoStream.codec_name || "unknown",
        codecLongName: videoStream.codec_long_name || "Unknown",
        profile: videoStream.profile,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        aspectRatio: videoStream.display_aspect_ratio,
        pixelFormat: videoStream.pix_fmt,
        frameRate: Math.round(frameRate * 100) / 100,
        bitrate: videoStream.bit_rate ? parseInt(videoStream.bit_rate) : undefined,
      }
    }

    if (audioStream) {
      info.audio = {
        codec: audioStream.codec_name || "unknown",
        codecLongName: audioStream.codec_long_name || "Unknown",
        sampleRate: audioStream.sample_rate ? parseInt(audioStream.sample_rate) : 0,
        channels: audioStream.channels || 0,
        channelLayout: audioStream.channel_layout,
        bitrate: audioStream.bit_rate ? parseInt(audioStream.bit_rate) : undefined,
      }
    }

    if (subtitleStreams.length > 0) {
      info.subtitle = subtitleStreams.map((s: any) => ({
        codec: s.codec_name || "unknown",
        language: s.tags?.language,
      }))
    }

    return info
  } catch {
    return null
  }
}

/**
 * Format bitrate for display
 */
function formatBitrate(bps: number): string {
  if (bps >= 1000000) {
    return `${(bps / 1000000).toFixed(1)} Mbps`
  }
  if (bps >= 1000) {
    return `${(bps / 1000).toFixed(0)} kbps`
  }
  return `${bps} bps`
}

/**
 * Get channel layout description
 */
function getChannelDescription(channels: number, layout?: string): string {
  if (layout) {
    return layout
  }
  switch (channels) {
    case 1:
      return "mono"
    case 2:
      return "stereo"
    case 6:
      return "5.1 surround"
    case 8:
      return "7.1 surround"
    default:
      return `${channels} channels`
  }
}

/**
 * Info command - yargs command module
 */
export const infoCommand: CommandModule = {
  command: "info <input>",
  describe: "Show detailed media file information",
  builder: (yargs) => {
    return yargs
      .positional("input", {
        type: "string",
        describe: "Input file path",
        demandOption: true,
      })
      .option("json", {
        alias: "j",
        type: "boolean",
        describe: "Output as JSON",
        default: false,
      })
      .example([
        ["$0 info video.mp4", "Show video information"],
        ["$0 info audio.mp3", "Show audio information"],
        ["$0 info video.mp4 --json", "Output as JSON"],
      ])
  },
  handler: async (argv) => {
    const input = argv.input as string
    const asJson = argv.json as boolean

    // Validate input file exists
    if (!fs.existsSync(input)) {
      console.error(`\nError: File not found: ${input}`)
      console.error("  → Check if the file path is correct")
      process.exit(1)
    }

    const info = await getDetailedMediaInfo(input)
    if (!info) {
      console.error(`\nError: Could not read media information from: ${input}`)
      console.error("  → The file may be corrupted or not a valid media file")
      process.exit(1)
    }

    // JSON output
    if (asJson) {
      console.log(JSON.stringify(info, null, 2))
      return
    }

    // Pretty print
    const fileName = path.basename(input)
    console.log("")
    console.log(`File:      ${fileName}`)
    console.log(`Format:    ${info.format.longName}`)
    console.log(`Duration:  ${formatTime(info.format.duration)}`)
    console.log(`Size:      ${formatSize(info.format.size)}`)
    if (info.format.bitrate > 0) {
      console.log(`Bitrate:   ${formatBitrate(info.format.bitrate)}`)
    }
    console.log(`Streams:   ${info.format.nbStreams}`)

    if (info.video) {
      console.log("")
      console.log("Video:")
      const codecInfo = info.video.profile
        ? `${info.video.codec.toUpperCase()} (${info.video.profile})`
        : info.video.codec.toUpperCase()
      console.log(`  Codec:      ${codecInfo}`)
      console.log(`  Resolution: ${info.video.width}x${info.video.height}`)
      if (info.video.aspectRatio) {
        console.log(`  Aspect:     ${info.video.aspectRatio}`)
      }
      console.log(`  Frame rate: ${info.video.frameRate} fps`)
      if (info.video.pixelFormat) {
        console.log(`  Pixel fmt:  ${info.video.pixelFormat}`)
      }
      if (info.video.bitrate) {
        console.log(`  Bitrate:    ${formatBitrate(info.video.bitrate)}`)
      }
    }

    if (info.audio) {
      console.log("")
      console.log("Audio:")
      console.log(`  Codec:      ${info.audio.codec.toUpperCase()}`)
      console.log(`  Sample:     ${info.audio.sampleRate} Hz`)
      console.log(
        `  Channels:   ${getChannelDescription(info.audio.channels, info.audio.channelLayout)}`
      )
      if (info.audio.bitrate) {
        console.log(`  Bitrate:    ${formatBitrate(info.audio.bitrate)}`)
      }
    }

    if (info.subtitle && info.subtitle.length > 0) {
      console.log("")
      console.log("Subtitles:")
      info.subtitle.forEach((sub, i) => {
        const lang = sub.language ? ` (${sub.language})` : ""
        console.log(`  [${i}] ${sub.codec}${lang}`)
      })
    }

    console.log("")
  },
}

/**
 * Info function for programmatic use (TUI)
 */
export async function info(filePath: string): Promise<{
  success: boolean
  info?: DetailedMediaInfo
  error?: string
}> {
  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      error: `File not found: ${filePath}`,
    }
  }

  const mediaInfo = await getDetailedMediaInfo(filePath)
  if (!mediaInfo) {
    return {
      success: false,
      error: "Could not read media information",
    }
  }

  return {
    success: true,
    info: mediaInfo,
  }
}
