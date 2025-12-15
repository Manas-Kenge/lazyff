import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { checkFfmpeg, getFfmpegVersion } from "./ffmpeg/index.ts"
import {
  convertCommand,
  infoCommand,
  trimCommand,
  compressCommand,
  extractCommand,
  mergeCommand,
  gifCommand,
  thumbnailCommand,
} from "./commands/index.ts"

async function launchTui() {
  try {
    const { launch } = await import("@ffwrap/tui")
    await launch()
  } catch (error) {
    console.error("Failed to launch TUI:", error)
    console.log("\nRun 'ffwrap --help' for CLI usage.")
    process.exit(1)
  }
}

async function main() {
  // Check ffmpeg availability first
  const ffmpegAvailable = await checkFfmpeg()
  if (!ffmpegAvailable) {
    process.exit(1)
  }

  const cli = yargs(hideBin(process.argv))
    .scriptName("ffwrap")
    .usage("$0 [command]")
    .usage("\nA simple wrapper around ffmpeg with an interactive TUI")
    .command(
      "$0",
      "Launch interactive TUI (default)",
      () => {},
      async () => {
        await launchTui()
      }
    )
    // Media operations
    .command(convertCommand)
    .command(trimCommand)
    .command(compressCommand)
    .command(mergeCommand)
    .command(extractCommand)
    .command(gifCommand)
    .command(thumbnailCommand)
    // Info
    .command(infoCommand)
    .command(
      "version",
      "Show ffwrap and ffmpeg versions",
      () => {},
      async () => {
        const ffmpegVersion = await getFfmpegVersion()
        console.log(`ffwrap: 0.0.1`)
        console.log(`ffmpeg: ${ffmpegVersion}`)
      }
    )
    .help()
    .alias("h", "help")
    .version(false) // Disable default version, we have our own
    .strict()

  await cli.parse()
}

main()
