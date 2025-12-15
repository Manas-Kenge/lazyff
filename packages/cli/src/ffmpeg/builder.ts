import path from "path"
import {
  FORMAT_PRESETS,
  QUALITY_PRESETS,
  RESOLUTION_PRESETS,
  VIDEO_CODECS,
  AUDIO_CODECS,
  supportsCrf,
  type FormatPreset,
  type QualityPreset,
  type ResolutionPreset,
  type VideoCodec,
  type AudioCodec,
} from "./presets.ts"

/**
 * Options for the convert command
 */
export interface ConvertOptions {
  /** Input file path */
  input: string
  /** Output file path (optional - auto-generated if not provided) */
  output?: string
  /** Output format (mp4, webm, mkv, etc.) */
  format?: FormatPreset
  /** Quality preset (low, medium, high, lossless) */
  quality?: QualityPreset
  /** Video codec (h264, h265, vp9, av1, copy) */
  videoCodec?: VideoCodec | string
  /** Audio codec (aac, mp3, opus, flac, copy) */
  audioCodec?: AudioCodec | string
  /** Output resolution (480p, 720p, 1080p, 4k, or WxH) */
  resolution?: ResolutionPreset | string
  /** Frame rate */
  fps?: number
  /** Start time (e.g., "00:01:30" or "90") */
  startTime?: string
  /** End time (e.g., "00:02:00" or "120") */
  endTime?: string
  /** Duration from start (e.g., "30" for 30 seconds) */
  duration?: string
  /** Remove audio track */
  noAudio?: boolean
  /** Remove video track (audio only) */
  noVideo?: boolean
  /** Overwrite output file if it exists */
  overwrite?: boolean
}

/**
 * Result of building ffmpeg arguments
 */
export interface BuildResult {
  /** FFmpeg arguments array */
  args: string[]
  /** Final output file path */
  outputPath: string
}

/**
 * Build ffmpeg arguments from convert options
 */
export function buildConvertArgs(options: ConvertOptions): BuildResult {
  const args: string[] = []

  // Overwrite flag (must come before -i)
  if (options.overwrite) {
    args.push("-y")
  }

  // Hide banner for cleaner output
  args.push("-hide_banner")

  // Input file
  args.push("-i", options.input)

  // Time options (applied to input)
  if (options.startTime) {
    args.push("-ss", options.startTime)
  }
  if (options.endTime) {
    args.push("-to", options.endTime)
  }
  if (options.duration) {
    args.push("-t", options.duration)
  }

  // Determine output format
  const inputExt = path.extname(options.input).slice(1).toLowerCase()
  const outputFormat = options.format || inferFormatFromOutput(options.output) || inputExt
  const formatPreset = FORMAT_PRESETS[outputFormat as FormatPreset]

  // Calculate output path
  const outputPath = options.output || generateOutputPath(options.input, formatPreset?.extension || outputFormat)

  // Determine video codec
  let videoCodec: string | null = null
  if (options.noVideo) {
    args.push("-vn")
  } else if (formatPreset?.videoCodec !== null) {
    if (options.videoCodec) {
      // User specified codec
      videoCodec = VIDEO_CODECS[options.videoCodec as VideoCodec] || options.videoCodec
    } else if (formatPreset?.videoCodec) {
      // Use format preset codec
      videoCodec = formatPreset.videoCodec
    }

    if (videoCodec) {
      args.push("-c:v", videoCodec)

      // Quality settings (for supported codecs)
      if (videoCodec !== "copy" && supportsCrf(videoCodec)) {
        const quality = QUALITY_PRESETS[options.quality || "medium"]
        args.push("-crf", quality.crf.toString())
        args.push("-preset", quality.preset)
      }
    }
  }

  // Resolution scaling
  if (options.resolution && !options.noVideo) {
    const scaleFilter = buildScaleFilter(options.resolution)
    if (scaleFilter) {
      args.push("-vf", scaleFilter)
    }
  }

  // Frame rate
  if (options.fps && !options.noVideo) {
    args.push("-r", options.fps.toString())
  }

  // Determine audio codec
  let audioCodec: string | null = null
  if (options.noAudio) {
    args.push("-an")
  } else if (formatPreset?.audioCodec !== null) {
    if (options.audioCodec) {
      // User specified codec
      audioCodec = AUDIO_CODECS[options.audioCodec as AudioCodec] || options.audioCodec
    } else if (formatPreset?.audioCodec) {
      // Use format preset codec
      audioCodec = formatPreset.audioCodec
    }

    if (audioCodec) {
      args.push("-c:a", audioCodec)

      // Audio bitrate (for non-copy, non-lossless codecs)
      if (audioCodec !== "copy" && audioCodec !== "flac" && audioCodec !== "pcm_s16le") {
        const quality = QUALITY_PRESETS[options.quality || "medium"]
        args.push("-b:a", quality.audioBitrate)
      }
    }
  }

  // Output file
  args.push(outputPath)

  return { args, outputPath }
}

/**
 * Infer format from output file extension
 */
function inferFormatFromOutput(output?: string): FormatPreset | null {
  if (!output) return null
  const ext = path.extname(output).slice(1).toLowerCase()
  if (ext in FORMAT_PRESETS) {
    return ext as FormatPreset
  }
  return null
}

/**
 * Generate output path from input path with new extension
 */
function generateOutputPath(input: string, extension: string): string {
  const dir = path.dirname(input)
  const name = path.basename(input, path.extname(input))
  
  // If converting to same format, add suffix to avoid overwriting
  const inputExt = path.extname(input).slice(1).toLowerCase()
  if (inputExt === extension) {
    return path.join(dir, `${name}_converted.${extension}`)
  }
  
  return path.join(dir, `${name}.${extension}`)
}

/**
 * Build scale filter string from resolution option
 */
function buildScaleFilter(resolution: string): string | null {
  // Check if it's a preset
  const preset = RESOLUTION_PRESETS[resolution as ResolutionPreset]
  if (preset) {
    // Use -2 to maintain aspect ratio while ensuring divisibility by 2
    return `scale=${preset.width}:-2`
  }

  // Check if it's a custom resolution like "1920x1080"
  if (resolution.includes("x")) {
    const parts = resolution.split("x").map((n) => parseInt(n, 10))
    const width = parts[0]
    const height = parts[1]
    if (width !== undefined && height !== undefined && !isNaN(width) && !isNaN(height)) {
      return `scale=${width}:${height}`
    }
  }

  // Check if it's just a width (auto height)
  const widthOnly = parseInt(resolution, 10)
  if (!isNaN(widthOnly)) {
    return `scale=${widthOnly}:-2`
  }

  return null
}

/**
 * Format time string for display (seconds to HH:MM:SS)
 */
export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Format file size for display
 */
export function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"]
  let unitIndex = 0
  let size = bytes

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}
