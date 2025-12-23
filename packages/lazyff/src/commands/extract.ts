import type { CommandModule } from "yargs"
import fs from "fs"
import path from "path"
import { runFfmpeg, getMediaInfo } from "../ffmpeg/index.ts"
import { formatTime, formatSize } from "../ffmpeg/builder.ts"
import { formatError } from "../ffmpeg/errors.ts"

/**
 * Options for the extract command
 */
export interface ExtractOptions {
  /** Input file path */
  input: string
  /** Output file path (optional - auto-generated if not provided) */
  output?: string
  /** Extract audio track */
  audio?: boolean
  /** Extract video track (no audio) */
  video?: boolean
  /** Extract frames as images */
  frames?: boolean
  /** Time to extract single frame (for --frames) */
  time?: string
  /** Frame rate for frame extraction (e.g., 1 = 1 frame per second) */
  fps?: number
  /** Output format for audio (mp3, wav, flac, aac) */
  format?: string
  /** Overwrite output file if it exists */
  overwrite?: boolean
}

/**
 * Build ffmpeg arguments for audio extraction
 */
function buildAudioExtractArgs(options: ExtractOptions): { args: string[]; outputPath: string } {
  const args: string[] = []

  if (options.overwrite) {
    args.push("-y")
  }

  args.push("-hide_banner")
  args.push("-i", options.input)
  args.push("-vn") // No video

  // Audio codec based on format
  const format = options.format || "mp3"
  const codecMap: Record<string, string> = {
    mp3: "libmp3lame",
    wav: "pcm_s16le",
    flac: "flac",
    aac: "aac",
    ogg: "libvorbis",
    opus: "libopus",
  }

  const codec = codecMap[format]
  if (codec) {
    args.push("-c:a", codec)
  }

  // Quality settings
  if (format === "mp3") {
    args.push("-q:a", "2") // High quality VBR
  } else if (format === "aac") {
    args.push("-b:a", "192k")
  }

  // Output path
  const dir = path.dirname(options.input)
  const name = path.basename(options.input, path.extname(options.input))
  const outputPath = options.output || path.join(dir, `${name}.${format}`)

  args.push(outputPath)

  return { args, outputPath }
}

/**
 * Build ffmpeg arguments for video extraction (no audio)
 */
function buildVideoExtractArgs(options: ExtractOptions): { args: string[]; outputPath: string } {
  const args: string[] = []

  if (options.overwrite) {
    args.push("-y")
  }

  args.push("-hide_banner")
  args.push("-i", options.input)
  args.push("-an") // No audio
  args.push("-c:v", "copy") // Copy video stream

  // Output path (same container, different name)
  const ext = path.extname(options.input)
  const dir = path.dirname(options.input)
  const name = path.basename(options.input, ext)
  const outputPath = options.output || path.join(dir, `${name}_video${ext}`)

  args.push(outputPath)

  return { args, outputPath }
}

/**
 * Build ffmpeg arguments for frame extraction
 */
function buildFrameExtractArgs(options: ExtractOptions): { args: string[]; outputPath: string } {
  const args: string[] = []

  if (options.overwrite) {
    args.push("-y")
  }

  args.push("-hide_banner")

  // Single frame at specific time
  if (options.time) {
    args.push("-ss", options.time)
    args.push("-i", options.input)
    args.push("-frames:v", "1")

    const dir = path.dirname(options.input)
    const name = path.basename(options.input, path.extname(options.input))
    const outputPath = options.output || path.join(dir, `${name}_frame.png`)

    args.push(outputPath)

    return { args, outputPath }
  }

  // Multiple frames at specified fps
  args.push("-i", options.input)

  const fps = options.fps || 1
  args.push("-vf", `fps=${fps}`)

  // Output path pattern
  const dir = path.dirname(options.input)
  const name = path.basename(options.input, path.extname(options.input))
  const outputPattern = options.output || path.join(dir, `${name}_frame_%04d.png`)

  args.push(outputPattern)

  return { args, outputPath: outputPattern }
}

/**
 * Extract command - yargs command module
 */
export const extractCommand: CommandModule = {
  command: "extract <input> [output]",
  describe: "Extract audio, video, or frames from a media file",
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
      .option("audio", {
        alias: "a",
        type: "boolean",
        describe: "Extract audio track",
      })
      .option("video", {
        alias: "v",
        type: "boolean",
        describe: "Extract video track (remove audio)",
      })
      .option("frames", {
        type: "boolean",
        describe: "Extract frames as images",
      })
      .option("time", {
        alias: "t",
        type: "string",
        describe: "Time to extract single frame (e.g., 00:00:05)",
      })
      .option("fps", {
        type: "number",
        describe: "Frame rate for extraction (e.g., 1 = 1 frame/sec)",
        default: 1,
      })
      .option("format", {
        alias: "f",
        type: "string",
        describe: "Output format for audio (mp3, wav, flac, aac, ogg)",
        choices: ["mp3", "wav", "flac", "aac", "ogg", "opus"],
        default: "mp3",
      })
      .option("overwrite", {
        alias: "y",
        type: "boolean",
        describe: "Overwrite output file if it exists",
        default: false,
      })
      .check((argv) => {
        // Require exactly one extraction mode
        const modes = [argv.audio, argv.video, argv.frames].filter(Boolean)
        if (modes.length === 0) {
          throw new Error("Must specify one of: --audio, --video, or --frames")
        }
        if (modes.length > 1) {
          throw new Error("Can only specify one of: --audio, --video, or --frames")
        }
        return true
      })
      .example([
        ["$0 extract video.mp4 --audio", "Extract audio as MP3"],
        ["$0 extract video.mp4 --audio -f wav", "Extract audio as WAV"],
        ["$0 extract video.mp4 --audio -o soundtrack.mp3", "Extract audio with custom name"],
        ["$0 extract video.mp4 --video", "Remove audio from video"],
        ["$0 extract video.mp4 --frames --time 00:00:05", "Extract single frame at 5 seconds"],
        ["$0 extract video.mp4 --frames --fps 0.5", "Extract 1 frame every 2 seconds"],
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
    const options: ExtractOptions = {
      input,
      output: argv.output as string | undefined,
      audio: argv.audio as boolean | undefined,
      video: argv.video as boolean | undefined,
      frames: argv.frames as boolean | undefined,
      time: argv.time as string | undefined,
      fps: argv.fps as number,
      format: argv.format as string,
      overwrite: argv.overwrite as boolean,
    }

    let args: string[]
    let outputPath: string
    let mode: string

    if (options.audio) {
      mode = "Audio"
      const result = buildAudioExtractArgs(options)
      args = result.args
      outputPath = result.outputPath
    } else if (options.video) {
      mode = "Video"
      const result = buildVideoExtractArgs(options)
      args = result.args
      outputPath = result.outputPath
    } else if (options.frames) {
      mode = options.time ? "Frame" : "Frames"
      const result = buildFrameExtractArgs(options)
      args = result.args
      outputPath = result.outputPath
    } else {
      console.error("\nError: Must specify --audio, --video, or --frames")
      process.exit(1)
    }

    // Check if output file already exists (not for frame sequences)
    if (!options.frames && fs.existsSync(outputPath) && !options.overwrite) {
      console.error(`\nError: Output file already exists: ${outputPath}`)
      console.error("  → Use --overwrite (-y) to replace it")
      process.exit(1)
    }

    console.log(`Mode:   ${mode}`)
    console.log(`Output: ${path.basename(outputPath)}`)
    console.log(`\nExtracting...`)

    // Run ffmpeg
    const result = await runFfmpeg(args)

    if (result.exitCode === 0) {
      // Get output file info (for single file outputs)
      if (!options.frames || options.time) {
        if (fs.existsSync(outputPath)) {
          const outputStats = fs.statSync(outputPath)

          const details: string[] = []
          details.push(formatSize(outputStats.size))

          console.log(`\n✓ Done: ${path.basename(outputPath)}`)
          console.log(`        ${details.join(" | ")}`)
        } else {
          console.log(`\n✓ Done: ${outputPath}`)
        }
      } else {
        // Frame sequence - count generated files
        const dir = path.dirname(outputPath)
        const baseName = path.basename(options.input, path.extname(options.input))
        const frameFiles = fs
          .readdirSync(dir)
          .filter((f) => f.startsWith(`${baseName}_frame_`) && f.endsWith(".png"))

        console.log(`\n✓ Done: Extracted ${frameFiles.length} frames`)
        console.log(`        Pattern: ${path.basename(outputPath)}`)
      }
    } else {
      console.error(`\n${formatError(result.stderr)}`)
      process.exit(1)
    }
  },
}

/**
 * Extract function for programmatic use (TUI)
 */
export async function extract(options: ExtractOptions): Promise<{
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

  // Validate mode
  const modes = [options.audio, options.video, options.frames].filter(Boolean)
  if (modes.length === 0) {
    return {
      success: false,
      outputPath: "",
      error: "Must specify audio, video, or frames",
    }
  }

  let args: string[]
  let outputPath: string

  if (options.audio) {
    const result = buildAudioExtractArgs(options)
    args = result.args
    outputPath = result.outputPath
  } else if (options.video) {
    const result = buildVideoExtractArgs(options)
    args = result.args
    outputPath = result.outputPath
  } else if (options.frames) {
    const result = buildFrameExtractArgs(options)
    args = result.args
    outputPath = result.outputPath
  } else {
    return {
      success: false,
      outputPath: "",
      error: "Invalid extraction mode",
    }
  }

  // Check if output exists and overwrite is not set
  if (!options.frames && fs.existsSync(outputPath) && !options.overwrite) {
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
