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
import { VERSION, GITHUB_REPO, checkForUpdate } from "./version.ts"

async function launchTui() {
  try {
    const { launch } = await import("./tui/index.tsx")
    await launch()
  } catch (error) {
    console.error("Failed to launch TUI:", error)
    console.log("\nRun 'lazyff --help' for CLI usage.")
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
    .scriptName("lazyff")
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
      "Show lazyff and ffmpeg versions",
      () => {},
      async () => {
        const ffmpegVersion = await getFfmpegVersion()
        console.log(`lazyff: ${VERSION}`)
        console.log(`ffmpeg: ${ffmpegVersion}`)
      }
    )
    .command(
      "update",
      "Update lazyff to the latest version",
      (yargs) => {
        return yargs.option("check", {
          alias: "c",
          type: "boolean",
          description: "Only check for updates without installing",
        })
      },
      async (argv) => {
        const { hasUpdate, currentVersion, latestVersion } = await checkForUpdate()

        if (argv.check) {
          if (hasUpdate) {
            console.log(`Update available: ${currentVersion} → ${latestVersion}`)
            console.log(`\nRun 'lazyff update' to install the latest version`)
          } else {
            console.log(`lazyff ${currentVersion} is up to date`)
          }
          return
        }

        if (!hasUpdate) {
          console.log(`lazyff ${currentVersion} is already the latest version`)
          return
        }

        console.log(`Updating lazyff: ${currentVersion} → ${latestVersion}`)
        console.log(`\nTo update, run:`)
        console.log(
          `  curl -fsSL https://raw.githubusercontent.com/${GITHUB_REPO}/main/install.sh | bash`
        )
      }
    )
    .command(
      "uninstall",
      "Uninstall lazyff from your system",
      () => {},
      async () => {
        const homeDir = process.env.HOME || process.env.USERPROFILE || "~"
        const installDir = `${homeDir}/.lazyff`

        console.log("To uninstall lazyff, run the following commands:\n")
        console.log(`  rm -rf ${installDir}`)
        console.log(
          `\nThen remove the PATH entry from your shell config (~/.bashrc, ~/.zshrc, etc.):`
        )
        console.log(`  export PATH=${installDir}/bin:$PATH`)
        console.log(`\nIf installed via npm/bun, run:`)
        console.log(`  npm uninstall -g lazyff`)
        console.log(`  # or`)
        console.log(`  bun remove -g lazyff`)
      }
    )
    .help()
    .alias("h", "help")
    .version(false) // Disable default version, we have our own
    .strict()

  await cli.parse()
}

main()
