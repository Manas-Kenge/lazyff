import { $ } from "bun"

const INSTALL_INSTRUCTIONS = `
ffmpeg is not installed or not found in PATH.

Install ffmpeg using one of the following commands:

  macOS (Homebrew):
    brew install ffmpeg

  Ubuntu/Debian:
    sudo apt update && sudo apt install ffmpeg

  Fedora:
    sudo dnf install ffmpeg

  Arch Linux:
    sudo pacman -S ffmpeg

  Windows (Chocolatey):
    choco install ffmpeg

  Windows (Winget):
    winget install ffmpeg

  Windows (Scoop):
    scoop install ffmpeg

After installation, restart your terminal and try again.
For more information, visit: https://ffmpeg.org/download.html
`

/**
 * Check if ffmpeg is available in the system PATH
 */
export async function checkFfmpeg(): Promise<boolean> {
  try {
    const result = await $`ffmpeg -version`.quiet()
    return result.exitCode === 0
  } catch {
    console.error(INSTALL_INSTRUCTIONS)
    return false
  }
}

/**
 * Check if ffprobe is available in the system PATH
 */
export async function checkFfprobe(): Promise<boolean> {
  try {
    const result = await $`ffprobe -version`.quiet()
    return result.exitCode === 0
  } catch {
    return false
  }
}

/**
 * Get the installed ffmpeg version
 */
export async function getFfmpegVersion(): Promise<string> {
  try {
    const result = await $`ffmpeg -version`.quiet()
    const output = result.stdout.toString()
    // Extract version from first line: "ffmpeg version X.X.X ..."
    const match = output.match(/ffmpeg version (\S+)/)
    return match ? match[1] : "unknown"
  } catch {
    return "not installed"
  }
}

/**
 * Get the installed ffprobe version
 */
export async function getFfprobeVersion(): Promise<string> {
  try {
    const result = await $`ffprobe -version`.quiet()
    const output = result.stdout.toString()
    const match = output.match(/ffprobe version (\S+)/)
    return match ? match[1] : "unknown"
  } catch {
    return "not installed"
  }
}

export interface FfmpegResult {
  exitCode: number
  stdout: string
  stderr: string
}

/**
 * Run ffmpeg with the given arguments
 */
export async function runFfmpeg(args: string[]): Promise<FfmpegResult> {
  try {
    const result = await $`ffmpeg ${args}`.quiet()
    return {
      exitCode: result.exitCode,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    }
  } catch (error: any) {
    return {
      exitCode: error.exitCode ?? 1,
      stdout: error.stdout?.toString() ?? "",
      stderr: error.stderr?.toString() ?? "",
    }
  }
}

/**
 * Run ffprobe with the given arguments
 */
export async function runFfprobe(args: string[]): Promise<FfmpegResult> {
  try {
    const result = await $`ffprobe ${args}`.quiet()
    return {
      exitCode: result.exitCode,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    }
  } catch (error: any) {
    return {
      exitCode: error.exitCode ?? 1,
      stdout: error.stdout?.toString() ?? "",
      stderr: error.stderr?.toString() ?? "",
    }
  }
}

export interface MediaInfo {
  duration?: number
  width?: number
  height?: number
  codec?: string
  bitrate?: number
  format?: string
}

/**
 * Get media file information using ffprobe
 */
export async function getMediaInfo(filePath: string): Promise<MediaInfo | null> {
  const result = await runFfprobe([
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    filePath,
  ])

  if (result.exitCode !== 0) {
    return null
  }

  try {
    const data = JSON.parse(result.stdout)
    const videoStream = data.streams?.find((s: any) => s.codec_type === "video")
    const format = data.format

    return {
      duration: format?.duration ? parseFloat(format.duration) : undefined,
      width: videoStream?.width,
      height: videoStream?.height,
      codec: videoStream?.codec_name,
      bitrate: format?.bit_rate ? parseInt(format.bit_rate) : undefined,
      format: format?.format_name,
    }
  } catch {
    return null
  }
}
