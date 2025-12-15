import type { CommandModule } from "yargs"
import fs from "fs"
import path from "path"
import { runFfmpeg, getMediaInfo } from "../ffmpeg/index.ts"
import { formatTime, formatSize } from "../ffmpeg/builder.ts"
import { formatError } from "../ffmpeg/errors.ts"

/**
 * Options for the trim command
 */
export interface TrimOptions {
  /** Input file path */
  input: string
  /** Output file path (optional - auto-generated if not provided) */
  output?: string
  /** Start time (e.g., "00:01:30" or "90") */
  startTime?: string
  /** End time (e.g., "00:02:00" or "120") */
  endTime?: string
  /** Duration from start (e.g., "30" for 30 seconds) */
  duration?: string
  /** Copy streams without re-encoding (faster but less precise) */
  copy?: boolean
  /** Overwrite output file if it exists */
  overwrite?: boolean
}

/**
 * Build ffmpeg arguments for trimming
 */
function buildTrimArgs(options: TrimOptions): { args: string[]; outputPath: string } {
  const args: string[] = []

  // Overwrite flag (must come before -i)
  if (options.overwrite) {
    args.push("-y")
  }

  // Hide banner for cleaner output
  args.push("-hide_banner")

  // Start time (before input for faster seeking when using -ss)
  if (options.startTime) {
    args.push("-ss", options.startTime)
  }

  // Input file
  args.push("-i", options.input)

  // End time or duration (after input)
  if (options.endTime) {
    args.push("-to", options.endTime)
  }
  if (options.duration) {
    args.push("-t", options.duration)
  }

  // Copy mode (no re-encoding) or default to same format
  if (options.copy) {
    args.push("-c", "copy")
  } else {
    // Re-encode with reasonable defaults for precise cuts
    args.push("-c:v", "libx264", "-crf", "18", "-preset", "medium")
    args.push("-c:a", "aac", "-b:a", "192k")
  }

  // Avoid negative timestamps
  args.push("-avoid_negative_ts", "make_zero")

  // Calculate output path
  const ext = path.extname(options.input)
  const dir = path.dirname(options.input)
  const name = path.basename(options.input, ext)
  const outputPath = options.output || path.join(dir, `${name}_trimmed${ext}`)

  args.push(outputPath)

  return { args, outputPath }
}

/**
 * Trim command - yargs command module
 */
export const trimCommand: CommandModule = {
  command: "trim <input> [output]",
  describe: "Cut a portion of a media file",
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
      .option("start", {
        alias: "s",
        type: "string",
        describe: "Start time (e.g., 00:01:30 or 90)",
      })
      .option("end", {
        alias: "e",
        type: "string",
        describe: "End time (e.g., 00:02:00 or 120)",
      })
      .option("duration", {
        alias: "t",
        type: "string",
        describe: "Duration from start (e.g., 30 for 30 seconds)",
      })
      .option("copy", {
        alias: "c",
        type: "boolean",
        describe: "Copy streams without re-encoding (faster but less precise)",
        default: false,
      })
      .option("overwrite", {
        alias: "y",
        type: "boolean",
        describe: "Overwrite output file if it exists",
        default: false,
      })
      .check((argv) => {
        // Require at least one time option
        if (!argv.start && !argv.end && !argv.duration) {
          throw new Error("At least one of --start, --end, or --duration is required")
        }
        // Can't use both --end and --duration
        if (argv.end && argv.duration) {
          throw new Error("Cannot use both --end and --duration together")
        }
        return true
      })
      .example([
        ["$0 trim video.mp4 --start 00:01:00 --end 00:02:00", "Cut from 1:00 to 2:00"],
        ["$0 trim video.mp4 -s 00:01:00 -t 30", "Cut 30 seconds starting at 1:00"],
        ["$0 trim video.mp4 --end 00:00:30", "Keep first 30 seconds"],
        ["$0 trim video.mp4 -s 00:05:00", "Remove first 5 minutes"],
        ["$0 trim video.mp4 -s 10 -t 5 --copy", "Fast trim (copy mode)"],
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
    const options: TrimOptions = {
      input,
      output: argv.output as string | undefined,
      startTime: argv.start as string | undefined,
      endTime: argv.end as string | undefined,
      duration: argv.duration as string | undefined,
      copy: argv.copy as boolean,
      overwrite: argv.overwrite as boolean,
    }

    const { args, outputPath } = buildTrimArgs(options)

    // Check if output file already exists
    if (fs.existsSync(outputPath) && !options.overwrite) {
      console.error(`\nError: Output file already exists: ${outputPath}`)
      console.error("  → Use --overwrite (-y) to replace it")
      process.exit(1)
    }

    // Show trim info
    const trimInfo: string[] = []
    if (options.startTime) trimInfo.push(`from ${options.startTime}`)
    if (options.endTime) trimInfo.push(`to ${options.endTime}`)
    if (options.duration) trimInfo.push(`for ${options.duration}s`)

    console.log(`Trim:   ${trimInfo.join(" ")}`)
    console.log(`Mode:   ${options.copy ? "Copy (fast, may be imprecise)" : "Re-encode (precise)"}`)
    console.log(`Output: ${path.basename(outputPath)}`)
    console.log(`\nTrimming...`)

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
        const sizeChangeStr = sizeChange >= 0
          ? `+${sizeChange.toFixed(1)}%`
          : `${sizeChange.toFixed(1)}%`
        details.push(`(${sizeChangeStr})`)

        console.log(`\n✓ Done: ${path.basename(outputPath)}`)
        console.log(`        ${details.join(" | ")}`)
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
 * Trim function for programmatic use (TUI)
 */
export async function trim(options: TrimOptions): Promise<{
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

  // Validate time options
  if (!options.startTime && !options.endTime && !options.duration) {
    return {
      success: false,
      outputPath: "",
      error: "At least one of startTime, endTime, or duration is required",
    }
  }

  const { args, outputPath } = buildTrimArgs(options)

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
