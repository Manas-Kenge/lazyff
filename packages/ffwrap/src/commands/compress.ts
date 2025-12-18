import type { CommandModule } from "yargs"
import fs from "fs"
import path from "path"
import { runFfmpeg, getMediaInfo } from "../ffmpeg/index.ts"
import { formatTime, formatSize } from "../ffmpeg/builder.ts"
import { formatError } from "../ffmpeg/errors.ts"

/**
 * Options for the compress command
 */
export interface CompressOptions {
  /** Input file path */
  input: string
  /** Output file path (optional - auto-generated if not provided) */
  output?: string
  /** Target file size (e.g., "25MB", "100MB") */
  targetSize?: string
  /** Target video bitrate (e.g., "2M", "500k") */
  bitrate?: string
  /** Target percentage of original size (e.g., 50 for 50%) */
  percent?: number
  /** Audio bitrate (e.g., "128k") */
  audioBitrate?: string
  /** Overwrite output file if it exists */
  overwrite?: boolean
}

/**
 * Parse size string to bytes (e.g., "25MB" -> 26214400)
 */
function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i)
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`)
  }

  const value = parseFloat(match[1] || "0")
  const unit = (match[2] || "B").toUpperCase()

  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  }

  return Math.floor(value * (multipliers[unit] || 1))
}

/**
 * Calculate video bitrate to achieve target file size
 * Formula: video_bitrate = (target_size * 8 / duration) - audio_bitrate
 */
function calculateBitrate(
  targetBytes: number,
  durationSeconds: number,
  audioBitrate: number = 128000
): number {
  // Total bitrate needed
  const totalBitrate = (targetBytes * 8) / durationSeconds

  // Subtract audio bitrate to get video bitrate
  // Add 5% buffer for container overhead
  const videoBitrate = totalBitrate * 0.95 - audioBitrate

  return Math.max(videoBitrate, 100000) // Minimum 100kbps
}

/**
 * Parse bitrate string to bps (e.g., "2M" -> 2000000)
 */
function parseBitrate(bitrateStr: string): number {
  const match = bitrateStr.match(/^([\d.]+)\s*(k|m)?$/i)
  if (!match) {
    throw new Error(`Invalid bitrate format: ${bitrateStr}`)
  }

  const value = parseFloat(match[1] || "0")
  const unit = (match[2] || "").toLowerCase()

  if (unit === "m") return value * 1000000
  if (unit === "k") return value * 1000
  return value
}

/**
 * Format bitrate to human readable string
 */
function formatBitrate(bps: number): string {
  if (bps >= 1000000) {
    return `${(bps / 1000000).toFixed(1)}M`
  }
  return `${(bps / 1000).toFixed(0)}k`
}

/**
 * Build ffmpeg arguments for compression
 */
async function buildCompressArgs(options: CompressOptions): Promise<{ args: string[]; outputPath: string; targetBitrate: number }> {
  const args: string[] = []

  // Get media info for duration
  const mediaInfo = await getMediaInfo(options.input)
  if (!mediaInfo?.duration) {
    throw new Error("Could not determine video duration")
  }

  // Calculate target bitrate
  let targetBitrate: number
  const audioBitrate = options.audioBitrate ? parseBitrate(options.audioBitrate) : 128000

  if (options.targetSize) {
    const targetBytes = parseSize(options.targetSize)
    targetBitrate = calculateBitrate(targetBytes, mediaInfo.duration, audioBitrate)
  } else if (options.bitrate) {
    targetBitrate = parseBitrate(options.bitrate)
  } else if (options.percent) {
    // Calculate current bitrate and reduce
    const inputStats = fs.statSync(options.input)
    const currentBitrate = (inputStats.size * 8) / mediaInfo.duration
    targetBitrate = currentBitrate * (options.percent / 100)
  } else {
    throw new Error("Must specify --target-size, --bitrate, or --percent")
  }

  // Overwrite flag
  if (options.overwrite) {
    args.push("-y")
  }

  args.push("-hide_banner")
  args.push("-i", options.input)

  // Two-pass encoding for better quality at target bitrate
  // For simplicity, we'll use single-pass with constrained quality
  args.push("-c:v", "libx264")
  args.push("-b:v", formatBitrate(targetBitrate))
  args.push("-maxrate", formatBitrate(targetBitrate * 1.5))
  args.push("-bufsize", formatBitrate(targetBitrate * 2))
  args.push("-preset", "medium")

  // Audio
  args.push("-c:a", "aac")
  args.push("-b:a", options.audioBitrate || "128k")

  // Calculate output path
  const ext = path.extname(options.input)
  const dir = path.dirname(options.input)
  const name = path.basename(options.input, ext)
  const outputPath = options.output || path.join(dir, `${name}_compressed${ext}`)

  args.push(outputPath)

  return { args, outputPath, targetBitrate }
}

/**
 * Compress command - yargs command module
 */
export const compressCommand: CommandModule = {
  command: "compress <input> [output]",
  describe: "Reduce file size with target size or bitrate",
  builder: (yargs) => {
    return yargs
      .positional("input", {
        type: "string",
        describe: "Input file path",
        demandOption: true,
      })
      .positional("output", {
        type: "string",
        describe: "Output file path (optional - auto-generated if not provided)",
      })
      .option("target-size", {
        alias: "s",
        type: "string",
        describe: "Target file size (e.g., 25MB, 100MB)",
      })
      .option("bitrate", {
        alias: "b",
        type: "string",
        describe: "Target video bitrate (e.g., 2M, 500k)",
      })
      .option("percent", {
        alias: "p",
        type: "number",
        describe: "Target percentage of original size (e.g., 50 for 50%)",
      })
      .option("audio-bitrate", {
        alias: "ab",
        type: "string",
        describe: "Audio bitrate (default: 128k)",
        default: "128k",
      })
      .option("overwrite", {
        alias: "y",
        type: "boolean",
        describe: "Overwrite output file if it exists",
        default: false,
      })
      .check((argv) => {
        // Require exactly one target option
        const targets = [argv["target-size"], argv.bitrate, argv.percent].filter(Boolean)
        if (targets.length === 0) {
          throw new Error("Must specify one of: --target-size, --bitrate, or --percent")
        }
        if (targets.length > 1) {
          throw new Error("Can only specify one of: --target-size, --bitrate, or --percent")
        }
        // Validate percent range
        if (argv.percent !== undefined && (argv.percent <= 0 || argv.percent > 100)) {
          throw new Error("Percent must be between 1 and 100")
        }
        return true
      })
      .example([
        ["$0 compress video.mp4 --target-size 25MB", "Compress to ~25MB"],
        ["$0 compress video.mp4 -s 50MB -o small.mp4", "Compress to ~50MB with custom output"],
        ["$0 compress video.mp4 --bitrate 2M", "Compress with 2Mbps video bitrate"],
        ["$0 compress video.mp4 --percent 50", "Reduce to 50% of original size"],
        ["$0 compress video.mp4 -s 10MB --audio-bitrate 64k", "Compress with lower audio quality"],
      ])
  },
  handler: async (argv) => {
    const input = argv.input as string

    // Validate input file exists
    if (!fs.existsSync(input)) {
      console.error(`\nError: File not found: ${input}`)
      console.error("  → Check if the file path is correct")
      process.exit(1)
    }

    // Get input file info
    console.log("")
    const mediaInfo = await getMediaInfo(input)
    const inputStats = fs.statSync(input)

    console.log(`Input:  ${path.basename(input)}`)
    if (mediaInfo) {
      const details: string[] = []
      if (mediaInfo.duration) {
        details.push(formatTime(mediaInfo.duration))
      }
      if (mediaInfo.width && mediaInfo.height) {
        details.push(`${mediaInfo.width}x${mediaInfo.height}`)
      }
      details.push(formatSize(inputStats.size))
      console.log(`        ${details.join(" | ")}`)
    }

    // Build ffmpeg arguments
    const options: CompressOptions = {
      input,
      output: argv.output as string | undefined,
      targetSize: argv["target-size"] as string | undefined,
      bitrate: argv.bitrate as string | undefined,
      percent: argv.percent as number | undefined,
      audioBitrate: argv["audio-bitrate"] as string,
      overwrite: argv.overwrite as boolean,
    }

    let buildResult
    try {
      buildResult = await buildCompressArgs(options)
    } catch (error: any) {
      console.error(`\nError: ${error.message}`)
      process.exit(1)
    }

    const { args, outputPath, targetBitrate } = buildResult

    // Check if output file already exists
    if (fs.existsSync(outputPath) && !options.overwrite) {
      console.error(`\nError: Output file already exists: ${outputPath}`)
      console.error("  → Use --overwrite (-y) to replace it")
      process.exit(1)
    }

    // Show compression info
    console.log(`Target: ${formatBitrate(targetBitrate)} video bitrate`)
    if (options.targetSize) {
      console.log(`        ~${options.targetSize} target size`)
    } else if (options.percent) {
      console.log(`        ~${options.percent}% of original`)
    }
    console.log(`Output: ${path.basename(outputPath)}`)
    console.log(`\nCompressing...`)

    // Run ffmpeg
    const result = await runFfmpeg(args)

    if (result.exitCode === 0) {
      // Get output file info
      if (fs.existsSync(outputPath)) {
        const outputStats = fs.statSync(outputPath)
        const outputInfo = await getMediaInfo(outputPath)

        const details: string[] = []
        if (outputInfo?.duration) {
          details.push(formatTime(outputInfo.duration))
        }
        if (outputInfo?.width && outputInfo?.height) {
          details.push(`${outputInfo.width}x${outputInfo.height}`)
        }
        details.push(formatSize(outputStats.size))

        // Calculate size change
        const sizeChange = ((outputStats.size - inputStats.size) / inputStats.size) * 100
        const sizeChangeStr = `${sizeChange.toFixed(1)}%`
        details.push(`(${sizeChangeStr})`)

        console.log(`\n✓ Done: ${path.basename(outputPath)}`)
        console.log(`        ${details.join(" | ")}`)

        // Show actual reduction percentage
        const reductionPercent = ((inputStats.size - outputStats.size) / inputStats.size) * 100
        if (reductionPercent > 0) {
          console.log(`        Reduced by ${reductionPercent.toFixed(1)}%`)
        }
      } else {
        console.log(`\n✓ Done: ${outputPath}`)
      }
    } else {
      console.error(`\n${formatError(result.stderr)}`)
      process.exit(1)
    }
  },
}

/**
 * Compress function for programmatic use (TUI)
 */
export async function compress(options: CompressOptions): Promise<{
  success: boolean
  outputPath: string
  error?: string
}> {
  // Validate input
  if (!fs.existsSync(options.input)) {
    return {
      success: false,
      outputPath: "",
      error: `File not found: ${options.input}`,
    }
  }

  // Validate options
  const targets = [options.targetSize, options.bitrate, options.percent].filter(Boolean)
  if (targets.length === 0) {
    return {
      success: false,
      outputPath: "",
      error: "Must specify targetSize, bitrate, or percent",
    }
  }

  let buildResult
  try {
    buildResult = await buildCompressArgs(options)
  } catch (error: any) {
    return {
      success: false,
      outputPath: "",
      error: error.message,
    }
  }

  const { args, outputPath } = buildResult

  // Check if output exists and overwrite is not set
  if (fs.existsSync(outputPath) && !options.overwrite) {
    return {
      success: false,
      outputPath,
      error: "Output file already exists. Set overwrite: true to replace it.",
    }
  }

  const result = await runFfmpeg(args)

  if (result.exitCode === 0) {
    return { success: true, outputPath }
  } else {
    return {
      success: false,
      outputPath,
      error: formatError(result.stderr),
    }
  }
}
