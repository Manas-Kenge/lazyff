import type { CommandModule } from "yargs"
import fs from "fs"
import path from "path"
import { buildConvertArgs, formatTime, formatSize, type ConvertOptions } from "../ffmpeg/builder"
import { runFfmpeg, getMediaInfo } from "../ffmpeg/index"
import { formatError } from "../ffmpeg/errors"
import { FORMAT_PRESETS, QUALITY_PRESETS, RESOLUTION_PRESETS } from "../ffmpeg/presets"

/**
 * Convert command - yargs command module
 */
export const convertCommand: CommandModule = {
  command: "convert <input> [output]",
  describe: "Convert media files between formats",
  builder: (yargs) => {
    return yargs
      .positional("input", {
        type: "string",
        describe: "Input file path",
        demandOption: true,
      })
      .positional("output", {
        type: "string",
        describe: "Output file path (optional - auto-generated from input name)",
      })
      .option("format", {
        alias: "f",
        type: "string",
        describe: "Output format (mp4, webm, mkv, mov, gif, mp3, wav, flac)",
        choices: Object.keys(FORMAT_PRESETS),
      })
      .option("quality", {
        alias: "q",
        type: "string",
        describe: "Quality preset",
        choices: Object.keys(QUALITY_PRESETS),
        default: "medium",
      })
      .option("video-codec", {
        alias: "vc",
        type: "string",
        describe: "Video codec (h264, h265, vp9, av1, copy)",
      })
      .option("audio-codec", {
        alias: "ac",
        type: "string",
        describe: "Audio codec (aac, mp3, opus, flac, copy)",
      })
      .option("resolution", {
        alias: "r",
        type: "string",
        describe: "Output resolution (360p, 480p, 720p, 1080p, 1440p, 4k, or WxH)",
      })
      .option("fps", {
        type: "number",
        describe: "Frame rate (e.g., 24, 30, 60)",
      })
      .option("start", {
        alias: "ss",
        type: "string",
        describe: "Start time (e.g., 00:01:30 or 90)",
      })
      .option("end", {
        alias: "to",
        type: "string",
        describe: "End time (e.g., 00:02:00 or 120)",
      })
      .option("duration", {
        alias: "t",
        type: "string",
        describe: "Duration from start (e.g., 30 for 30 seconds)",
      })
      .option("strip-audio", {
        alias: "an",
        type: "boolean",
        describe: "Remove audio track",
        default: false,
      })
      .option("strip-video", {
        alias: "vn",
        type: "boolean",
        describe: "Remove video track (extract audio only)",
        default: false,
      })
      .option("overwrite", {
        alias: "y",
        type: "boolean",
        describe: "Overwrite output file if it exists",
        default: false,
      })
      .example([
        ["$0 convert video.mov video.mp4", "Convert MOV to MP4"],
        ["$0 convert video.mov -f webm", "Convert to WebM format"],
        ["$0 convert video.mp4 -q high", "Convert with high quality"],
        ["$0 convert video.mp4 -r 720p", "Convert and resize to 720p"],
        ["$0 convert video.mp4 --start 00:01:00 --duration 30", "Extract 30 seconds starting at 1 minute"],
        ["$0 convert video.mp4 audio.mp3 --strip-video", "Extract audio only"],
        ["$0 convert video.mp4 -f gif --fps 10", "Create GIF with 10 fps"],
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
      if (mediaInfo.codec) {
        details.push(mediaInfo.codec.toUpperCase())
      }
      details.push(formatSize(inputStats.size))
      console.log(`        ${details.join(" | ")}`)
    }

    // Build ffmpeg arguments
    const options: ConvertOptions = {
      input,
      output: argv.output as string | undefined,
      format: argv.format as any,
      quality: argv.quality as any,
      videoCodec: argv["video-codec"] as string | undefined,
      audioCodec: argv["audio-codec"] as string | undefined,
      resolution: argv.resolution as string | undefined,
      fps: argv.fps as number | undefined,
      startTime: argv.start as string | undefined,
      endTime: argv.end as string | undefined,
      duration: argv.duration as string | undefined,
      noAudio: argv["strip-audio"] as boolean,
      noVideo: argv["strip-video"] as boolean,
      overwrite: argv.overwrite as boolean,
    }

    const { args, outputPath } = buildConvertArgs(options)

    // Check if output file already exists
    if (fs.existsSync(outputPath) && !options.overwrite) {
      console.error(`\nError: Output file already exists: ${outputPath}`)
      console.error("  → Use --overwrite (-y) to replace it")
      process.exit(1)
    }

    console.log(`Output: ${path.basename(outputPath)}`)
    console.log(`\nConverting...`)

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
 * Convert function for programmatic use (TUI)
 */
export async function convert(options: ConvertOptions): Promise<{
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

  const { args, outputPath } = buildConvertArgs(options)

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
