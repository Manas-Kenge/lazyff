import type { CommandModule } from "yargs"
import fs from "fs"
import path from "path"
import { runFfmpeg, getMediaInfo } from "../ffmpeg/index.ts"
import { formatTime, formatSize } from "../ffmpeg/builder.ts"
import { formatError } from "../ffmpeg/errors.ts"

/**
 * Options for the gif command
 */
export interface GifOptions {
  /** Input file path */
  input: string
  /** Output file path (optional - auto-generated if not provided) */
  output?: string
  /** Start time (e.g., "00:01:30" or "90") */
  startTime?: string
  /** Duration (e.g., "5" for 5 seconds) */
  duration?: string
  /** Output width (height auto-calculated) */
  width?: number
  /** Frame rate */
  fps?: number
  /** Enable high quality mode with palette generation */
  highQuality?: boolean
  /** Overwrite output file if it exists */
  overwrite?: boolean
}

/**
 * Build ffmpeg arguments for GIF creation
 */
function buildGifArgs(options: GifOptions): { args: string[]; outputPath: string } {
  const args: string[] = []

  if (options.overwrite) {
    args.push("-y")
  }

  args.push("-hide_banner")

  // Time options
  if (options.startTime) {
    args.push("-ss", options.startTime)
  }

  args.push("-i", options.input)

  if (options.duration) {
    args.push("-t", options.duration)
  }

  // Build filter chain
  const filters: string[] = []

  // FPS filter
  const fps = options.fps || 15
  filters.push(`fps=${fps}`)

  // Scale filter
  const width = options.width || 480
  filters.push(`scale=${width}:-1:flags=lanczos`)

  if (options.highQuality) {
    // High quality mode: generate palette and use it
    // This requires a two-pass approach, but we'll use single-pass with palettegen
    filters.push(`split[s0][s1]`)
    filters.push(`[s0]palettegen=stats_mode=diff[p]`)
    filters.push(`[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`)
    args.push("-filter_complex", filters.join(","))
  } else {
    // Standard mode
    args.push("-vf", filters.join(","))
  }

  // GIF settings
  args.push("-loop", "0") // Infinite loop

  // Output path
  const dir = path.dirname(options.input)
  const name = path.basename(options.input, path.extname(options.input))
  const outputPath = options.output || path.join(dir, `${name}.gif`)

  args.push(outputPath)

  return { args, outputPath }
}

/**
 * GIF command - yargs command module
 */
export const gifCommand: CommandModule = {
  command: "gif <input> [output]",
  describe: "Convert video to animated GIF",
  builder: (yargs) => {
    return yargs
      .positional("input", {
        type: "string",
        describe: "Input video file",
        demandOption: true,
      })
      .positional("output", {
        type: "string",
        describe: "Output GIF path (optional - auto-generated if not provided)",
      })
      .option("start", {
        alias: "s",
        type: "string",
        describe: "Start time (e.g., 00:00:05 or 5)",
      })
      .option("duration", {
        alias: "t",
        type: "string",
        describe: "Duration (e.g., 3 for 3 seconds)",
      })
      .option("width", {
        alias: "w",
        type: "number",
        describe: "Output width in pixels (height auto-calculated)",
        default: 480,
      })
      .option("fps", {
        type: "number",
        describe: "Frame rate (lower = smaller file)",
        default: 15,
      })
      .option("high-quality", {
        alias: "hq",
        type: "boolean",
        describe: "Enable high quality mode with palette optimization",
        default: false,
      })
      .option("overwrite", {
        alias: "y",
        type: "boolean",
        describe: "Overwrite output file if it exists",
        default: false,
      })
      .example([
        ["$0 gif video.mp4", "Convert entire video to GIF"],
        ["$0 gif video.mp4 -s 5 -t 3", "Convert 3 seconds starting at 5s"],
        ["$0 gif video.mp4 --width 320 --fps 10", "Small GIF (320px wide, 10fps)"],
        ["$0 gif video.mp4 --high-quality", "High quality GIF with palette"],
        ["$0 gif video.mp4 -o reaction.gif", "Custom output name"],
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

    console.log(`Input:   ${path.basename(input)}`)
    if (mediaInfo) {
      const details: string[] = []
      if (mediaInfo.duration) {
        details.push(formatTime(mediaInfo.duration))
      }
      if (mediaInfo.width && mediaInfo.height) {
        details.push(`${mediaInfo.width}x${mediaInfo.height}`)
      }
      details.push(formatSize(inputStats.size))
      console.log(`         ${details.join(" | ")}`)
    }

    // Build options
    const options: GifOptions = {
      input,
      output: argv.output as string | undefined,
      startTime: argv.start as string | undefined,
      duration: argv.duration as string | undefined,
      width: argv.width as number,
      fps: argv.fps as number,
      highQuality: argv["high-quality"] as boolean,
      overwrite: argv.overwrite as boolean,
    }

    const { args, outputPath } = buildGifArgs(options)

    // Check if output file already exists
    if (fs.existsSync(outputPath) && !options.overwrite) {
      console.error(`\nError: Output file already exists: ${outputPath}`)
      console.error("  → Use --overwrite (-y) to replace it")
      process.exit(1)
    }

    // Show settings
    console.log(`\nSettings:`)
    console.log(`  Width:   ${options.width}px`)
    console.log(`  FPS:     ${options.fps}`)
    console.log(`  Quality: ${options.highQuality ? "High (palette optimized)" : "Standard"}`)
    if (options.startTime || options.duration) {
      const timing: string[] = []
      if (options.startTime) timing.push(`from ${options.startTime}`)
      if (options.duration) timing.push(`for ${options.duration}s`)
      console.log(`  Timing:  ${timing.join(" ")}`)
    }

    console.log(`\nOutput:  ${path.basename(outputPath)}`)
    console.log(`\nConverting to GIF...`)

    // Run ffmpeg
    const result = await runFfmpeg(args)

    if (result.exitCode === 0) {
      // Get output file info
      if (fs.existsSync(outputPath)) {
        const outputStats = fs.statSync(outputPath)

        console.log(`\n✓ Done: ${path.basename(outputPath)}`)
        console.log(`        ${formatSize(outputStats.size)}`)

        // Warning if GIF is large
        if (outputStats.size > 10 * 1024 * 1024) {
          console.log(`\n⚠ Large GIF (>10MB). Consider:`)
          console.log(`  - Reducing --width (current: ${options.width})`)
          console.log(`  - Reducing --fps (current: ${options.fps})`)
          console.log(`  - Shortening --duration`)
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
 * GIF function for programmatic use (TUI)
 */
export async function gif(options: GifOptions): Promise<{
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

  const { args, outputPath } = buildGifArgs(options)

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
