import type { CommandModule } from "yargs"
import fs from "fs"
import path from "path"
import { runFfmpeg, getMediaInfo } from "../ffmpeg/index.ts"
import { formatTime, formatSize } from "../ffmpeg/builder.ts"
import { formatError } from "../ffmpeg/errors.ts"

/**
 * Options for the thumbnail command
 */
export interface ThumbnailOptions {
  /** Input file path */
  input: string
  /** Output file path (optional - auto-generated if not provided) */
  output?: string
  /** Time to capture thumbnail (e.g., "00:01:30" or "90") */
  time?: string
  /** Number of thumbnails to generate (evenly spaced) */
  count?: number
  /** Grid layout (e.g., "3x3" for 9 thumbnails in a grid) */
  grid?: string
  /** Output width in pixels */
  width?: number
  /** Output format (png, jpg) */
  format?: string
  /** Overwrite output file if it exists */
  overwrite?: boolean
}

/**
 * Build ffmpeg arguments for single thumbnail
 */
function buildSingleThumbnailArgs(options: ThumbnailOptions): {
  args: string[]
  outputPath: string
} {
  const args: string[] = []

  if (options.overwrite) {
    args.push("-y")
  }

  args.push("-hide_banner")

  // Seek to time
  if (options.time) {
    args.push("-ss", options.time)
  }

  args.push("-i", options.input)
  args.push("-frames:v", "1")

  // Scale if width specified
  if (options.width) {
    args.push("-vf", `scale=${options.width}:-1`)
  }

  // Output path
  const ext = options.format || "png"
  const dir = path.dirname(options.input)
  const name = path.basename(options.input, path.extname(options.input))
  const outputPath = options.output || path.join(dir, `${name}_thumb.${ext}`)

  args.push(outputPath)

  return { args, outputPath }
}

/**
 * Build ffmpeg arguments for multiple thumbnails
 */
async function buildMultipleThumbnailArgs(
  options: ThumbnailOptions
): Promise<{ args: string[]; outputPath: string }> {
  const args: string[] = []

  if (options.overwrite) {
    args.push("-y")
  }

  args.push("-hide_banner")
  args.push("-i", options.input)

  // Get duration to calculate intervals
  const mediaInfo = await getMediaInfo(options.input)
  const duration = mediaInfo?.duration || 60
  const count = options.count || 5

  // Calculate FPS to get evenly spaced frames
  // fps = count / duration
  const fps = count / duration

  // Build filter
  const filters: string[] = [`fps=${fps}`]
  if (options.width) {
    filters.push(`scale=${options.width}:-1`)
  }
  args.push("-vf", filters.join(","))

  // Limit to count frames
  args.push("-frames:v", count.toString())

  // Output path pattern
  const ext = options.format || "png"
  const dir = path.dirname(options.input)
  const name = path.basename(options.input, path.extname(options.input))
  const outputPath = options.output || path.join(dir, `${name}_thumb_%02d.${ext}`)

  args.push(outputPath)

  return { args, outputPath }
}

/**
 * Build ffmpeg arguments for thumbnail grid
 */
async function buildGridThumbnailArgs(
  options: ThumbnailOptions
): Promise<{ args: string[]; outputPath: string }> {
  const args: string[] = []

  if (options.overwrite) {
    args.push("-y")
  }

  args.push("-hide_banner")
  args.push("-i", options.input)

  // Parse grid (e.g., "3x3")
  const gridParts = (options.grid || "3x3").split("x")
  const cols = parseInt(gridParts[0] || "3")
  const rows = parseInt(gridParts[1] || "3")
  const totalFrames = cols * rows

  // Get duration
  const mediaInfo = await getMediaInfo(options.input)
  const duration = mediaInfo?.duration || 60

  // Calculate FPS for evenly spaced frames
  const fps = totalFrames / duration

  // Tile width (for each cell)
  const tileWidth = options.width || 320

  // Build filter complex for tile
  // 1. Select frames at intervals
  // 2. Scale each frame
  // 3. Tile them into a grid
  const filterComplex = [`fps=${fps}`, `scale=${tileWidth}:-1`, `tile=${cols}x${rows}`].join(",")

  args.push("-vf", filterComplex)
  args.push("-frames:v", "1")

  // Output path
  const ext = options.format || "png"
  const dir = path.dirname(options.input)
  const name = path.basename(options.input, path.extname(options.input))
  const outputPath = options.output || path.join(dir, `${name}_grid.${ext}`)

  args.push(outputPath)

  return { args, outputPath }
}

/**
 * Thumbnail command - yargs command module
 */
export const thumbnailCommand: CommandModule = {
  command: "thumbnail <input> [output]",
  describe: "Generate thumbnail(s) from video",
  builder: (yargs) => {
    return yargs
      .positional("input", {
        type: "string",
        describe: "Input video file",
        demandOption: true,
      })
      .positional("output", {
        type: "string",
        describe: "Output file path (optional - auto-generated if not provided)",
      })
      .option("time", {
        alias: "t",
        type: "string",
        describe: "Time to capture (e.g., 00:00:30 or 30). Default: 50% of duration",
      })
      .option("count", {
        alias: "n",
        type: "number",
        describe: "Number of thumbnails (evenly spaced throughout video)",
      })
      .option("grid", {
        alias: "g",
        type: "string",
        describe: "Create thumbnail grid (e.g., 3x3 for 9 thumbnails)",
      })
      .option("width", {
        alias: "w",
        type: "number",
        describe: "Output width in pixels (height auto-calculated)",
      })
      .option("format", {
        alias: "f",
        type: "string",
        describe: "Output format (png, jpg)",
        choices: ["png", "jpg", "jpeg"],
        default: "png",
      })
      .option("overwrite", {
        alias: "y",
        type: "boolean",
        describe: "Overwrite output file if it exists",
        default: false,
      })
      .check((argv) => {
        // Can't use multiple modes
        const modes = [argv.time, argv.count, argv.grid].filter(Boolean)
        if (modes.length > 1) {
          throw new Error("Can only specify one of: --time, --count, or --grid")
        }
        return true
      })
      .example([
        ["$0 thumbnail video.mp4", "Generate single thumbnail at 50%"],
        ["$0 thumbnail video.mp4 --time 00:01:30", "Thumbnail at 1:30"],
        ["$0 thumbnail video.mp4 --count 5", "5 evenly spaced thumbnails"],
        ["$0 thumbnail video.mp4 --grid 3x3", "3x3 grid preview image"],
        ["$0 thumbnail video.mp4 --grid 4x4 --width 200", "4x4 grid with 200px tiles"],
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

    // Build options
    const options: ThumbnailOptions = {
      input,
      output: argv.output as string | undefined,
      time: argv.time as string | undefined,
      count: argv.count as number | undefined,
      grid: argv.grid as string | undefined,
      width: argv.width as number | undefined,
      format: argv.format as string,
      overwrite: argv.overwrite as boolean,
    }

    let args: string[]
    let outputPath: string
    let mode: string

    if (options.grid) {
      mode = `Grid (${options.grid})`
      const result = await buildGridThumbnailArgs(options)
      args = result.args
      outputPath = result.outputPath
    } else if (options.count) {
      mode = `Multiple (${options.count} thumbnails)`
      const result = await buildMultipleThumbnailArgs(options)
      args = result.args
      outputPath = result.outputPath
    } else {
      // Single thumbnail
      // Default to 50% of duration if no time specified
      if (!options.time && mediaInfo?.duration) {
        const midpoint = mediaInfo.duration / 2
        options.time = midpoint.toString()
      }
      mode = options.time ? `Single (at ${formatTime(parseFloat(options.time || "0"))})` : "Single"
      const result = buildSingleThumbnailArgs(options)
      args = result.args
      outputPath = result.outputPath
    }

    // Check if output file already exists (for non-sequence outputs)
    if (!options.count && fs.existsSync(outputPath) && !options.overwrite) {
      console.error(`\nError: Output file already exists: ${outputPath}`)
      console.error("  → Use --overwrite (-y) to replace it")
      process.exit(1)
    }

    console.log(`Mode:   ${mode}`)
    console.log(`Output: ${path.basename(outputPath)}`)
    console.log(`\nGenerating thumbnail(s)...`)

    // Run ffmpeg
    const result = await runFfmpeg(args)

    if (result.exitCode === 0) {
      if (options.count) {
        // Multiple thumbnails - count generated files
        const dir = path.dirname(outputPath)
        const baseName = path.basename(options.input, path.extname(options.input))
        const ext = options.format || "png"
        const thumbFiles = fs
          .readdirSync(dir)
          .filter((f) => f.startsWith(`${baseName}_thumb_`) && f.endsWith(`.${ext}`))

        console.log(`\n✓ Done: Generated ${thumbFiles.length} thumbnails`)
        console.log(`        Pattern: ${path.basename(outputPath)}`)
      } else {
        // Single thumbnail or grid
        if (fs.existsSync(outputPath)) {
          const outputStats = fs.statSync(outputPath)
          console.log(`\n✓ Done: ${path.basename(outputPath)}`)
          console.log(`        ${formatSize(outputStats.size)}`)
        } else {
          console.log(`\n✓ Done: ${outputPath}`)
        }
      }
    } else {
      console.error(`\n${formatError(result.stderr)}`)
      process.exit(1)
    }
  },
}

/**
 * Thumbnail function for programmatic use (TUI)
 */
export async function thumbnail(options: ThumbnailOptions): Promise<{
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

  let args: string[]
  let outputPath: string

  if (options.grid) {
    const result = await buildGridThumbnailArgs(options)
    args = result.args
    outputPath = result.outputPath
  } else if (options.count) {
    const result = await buildMultipleThumbnailArgs(options)
    args = result.args
    outputPath = result.outputPath
  } else {
    // Default to 50% if no time specified
    if (!options.time) {
      const mediaInfo = await getMediaInfo(options.input)
      if (mediaInfo?.duration) {
        options.time = (mediaInfo.duration / 2).toString()
      }
    }
    const result = buildSingleThumbnailArgs(options)
    args = result.args
    outputPath = result.outputPath
  }

  // Check if output exists and overwrite is not set
  if (!options.count && fs.existsSync(outputPath) && !options.overwrite) {
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
