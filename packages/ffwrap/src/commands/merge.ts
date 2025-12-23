import type { CommandModule } from "yargs"
import fs from "fs"
import path from "path"
import os from "os"
import { runFfmpeg, getMediaInfo } from "../ffmpeg/index.ts"
import { formatTime, formatSize } from "../ffmpeg/builder.ts"
import { formatError } from "../ffmpeg/errors.ts"

/**
 * Options for the merge command
 */
export interface MergeOptions {
  /** Input file paths */
  inputs: string[]
  /** Output file path */
  output: string
  /** Re-encode files (slower but handles different codecs) */
  reencode?: boolean
  /** Overwrite output file if it exists */
  overwrite?: boolean
}

/**
 * Build ffmpeg arguments for concatenation using concat demuxer (fast, same codec)
 */
function buildConcatDemuxerArgs(
  inputs: string[],
  output: string,
  listFile: string,
  overwrite: boolean
): string[] {
  const args: string[] = []

  if (overwrite) {
    args.push("-y")
  }

  args.push("-hide_banner")
  args.push("-f", "concat")
  args.push("-safe", "0")
  args.push("-i", listFile)
  args.push("-c", "copy")
  args.push(output)

  return args
}

/**
 * Build ffmpeg arguments for concatenation using concat filter (slow, re-encode)
 */
function buildConcatFilterArgs(inputs: string[], output: string, overwrite: boolean): string[] {
  const args: string[] = []

  if (overwrite) {
    args.push("-y")
  }

  args.push("-hide_banner")

  // Add all inputs
  for (const input of inputs) {
    args.push("-i", input)
  }

  // Build filter complex
  const filterParts: string[] = []
  for (let i = 0; i < inputs.length; i++) {
    filterParts.push(`[${i}:v][${i}:a]`)
  }
  filterParts.push(`concat=n=${inputs.length}:v=1:a=1[outv][outa]`)

  args.push("-filter_complex", filterParts.join(""))
  args.push("-map", "[outv]")
  args.push("-map", "[outa]")

  // Output settings
  args.push("-c:v", "libx264", "-crf", "18", "-preset", "medium")
  args.push("-c:a", "aac", "-b:a", "192k")

  args.push(output)

  return args
}

/**
 * Create a temporary file list for concat demuxer
 */
function createFileList(inputs: string[]): string {
  const lines = inputs.map((f) => `file '${path.resolve(f)}'`)
  const content = lines.join("\n")

  const tempFile = path.join(os.tmpdir(), `ffwrap_concat_${Date.now()}.txt`)
  fs.writeFileSync(tempFile, content)

  return tempFile
}

/**
 * Merge command - yargs command module
 */
export const mergeCommand: CommandModule = {
  command: "merge <inputs..>",
  describe: "Concatenate multiple media files into one",
  builder: (yargs) => {
    return yargs
      .positional("inputs", {
        type: "string",
        array: true,
        describe: "Input files to concatenate",
        demandOption: true,
      })
      .option("output", {
        alias: "o",
        type: "string",
        describe: "Output file path",
        demandOption: true,
      })
      .option("reencode", {
        alias: "r",
        type: "boolean",
        describe: "Re-encode files (slower, handles different codecs)",
        default: false,
      })
      .option("overwrite", {
        alias: "y",
        type: "boolean",
        describe: "Overwrite output file if it exists",
        default: false,
      })
      .check((argv) => {
        const inputs = argv.inputs as string[]
        if (inputs.length < 2) {
          throw new Error("At least 2 input files are required")
        }
        return true
      })
      .example([
        ["$0 merge part1.mp4 part2.mp4 -o full.mp4", "Concatenate two videos (fast, copy mode)"],
        ["$0 merge clip1.mp4 clip2.mp4 clip3.mp4 -o final.mp4", "Concatenate multiple videos"],
        ["$0 merge a.mp4 b.webm -o out.mp4 --reencode", "Merge different formats (re-encode)"],
      ])
  },
  handler: async (argv) => {
    const inputs = argv.inputs as string[]
    const output = argv.output as string
    const reencode = argv.reencode as boolean
    const overwrite = argv.overwrite as boolean

    // Validate all input files exist
    for (const input of inputs) {
      if (!fs.existsSync(input)) {
        console.error(`\nError: File not found: ${input}`)
        console.error("  → Check if the file path is correct")
        process.exit(1)
      }
    }

    // Get input files info
    console.log("")
    console.log("Input files:")

    let totalDuration = 0
    let totalSize = 0

    for (const input of inputs) {
      const mediaInfo = await getMediaInfo(input)
      const stats = fs.statSync(input)

      const details: string[] = []
      if (mediaInfo?.duration) {
        details.push(formatTime(mediaInfo.duration))
        totalDuration += mediaInfo.duration
      }
      if (mediaInfo?.width && mediaInfo?.height) {
        details.push(`${mediaInfo.width}x${mediaInfo.height}`)
      }
      details.push(formatSize(stats.size))
      totalSize += stats.size

      console.log(`  ${path.basename(input)}`)
      console.log(`    ${details.join(" | ")}`)
    }

    console.log("")
    console.log(`Total:  ${formatTime(totalDuration)} | ${formatSize(totalSize)}`)

    // Check if output file already exists
    if (fs.existsSync(output) && !overwrite) {
      console.error(`\nError: Output file already exists: ${output}`)
      console.error("  → Use --overwrite (-y) to replace it")
      process.exit(1)
    }

    console.log(
      `Mode:   ${reencode ? "Re-encode (slower, flexible)" : "Copy (fast, same codec required)"}`
    )
    console.log(`Output: ${path.basename(output)}`)
    console.log(`\nMerging...`)

    let args: string[]
    let listFile: string | null = null

    if (reencode) {
      args = buildConcatFilterArgs(inputs, output, overwrite)
    } else {
      listFile = createFileList(inputs)
      args = buildConcatDemuxerArgs(inputs, output, listFile, overwrite)
    }

    // Run ffmpeg
    const result = await runFfmpeg(args)

    // Clean up temp file
    if (listFile && fs.existsSync(listFile)) {
      fs.unlinkSync(listFile)
    }

    if (result.exitCode === 0) {
      // Get output file info
      if (fs.existsSync(output)) {
        const outputStats = fs.statSync(output)
        const outputInfo = await getMediaInfo(output)

        const details: string[] = []
        if (outputInfo?.duration) {
          details.push(formatTime(outputInfo.duration))
        }
        if (outputInfo?.width && outputInfo?.height) {
          details.push(`${outputInfo.width}x${outputInfo.height}`)
        }
        details.push(formatSize(outputStats.size))

        console.log(`\n✓ Done: ${path.basename(output)}`)
        console.log(`        ${details.join(" | ")}`)
      } else {
        console.log(`\n✓ Done: ${output}`)
      }
    } else {
      console.error(`\n${formatError(result.stderr)}`)

      // Suggest re-encode mode if copy failed
      if (!reencode && result.stderr.includes("codec")) {
        console.error("\nTip: Try --reencode if the files have different codecs")
      }

      process.exit(1)
    }
  },
}

/**
 * Merge function for programmatic use (TUI)
 */
export async function merge(options: MergeOptions): Promise<{
  success: boolean
  outputPath: string
  error?: string
}> {
  // Validate inputs
  if (options.inputs.length < 2) {
    return {
      success: false,
      outputPath: "",
      error: "At least 2 input files are required",
    }
  }

  for (const input of options.inputs) {
    if (!fs.existsSync(input)) {
      return {
        success: false,
        outputPath: "",
        error: `File not found: ${input}`,
      }
    }
  }

  // Check if output exists
  if (fs.existsSync(options.output) && !options.overwrite) {
    return {
      success: false,
      outputPath: options.output,
      error: "Output file already exists. Set overwrite: true to replace it.",
    }
  }

  let args: string[]
  let listFile: string | null = null

  if (options.reencode) {
    args = buildConcatFilterArgs(options.inputs, options.output, options.overwrite || false)
  } else {
    listFile = createFileList(options.inputs)
    args = buildConcatDemuxerArgs(
      options.inputs,
      options.output,
      listFile,
      options.overwrite || false
    )
  }

  const result = await runFfmpeg(args)

  // Clean up temp file
  if (listFile && fs.existsSync(listFile)) {
    fs.unlinkSync(listFile)
  }

  if (result.exitCode === 0) {
    return { success: true, outputPath: options.output }
  } else {
    return {
      success: false,
      outputPath: options.output,
      error: formatError(result.stderr),
    }
  }
}
