/**
 * FFmpeg error patterns and their human-readable explanations
 */
interface ErrorPattern {
  pattern: RegExp
  message: string
  suggestion: string
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /No such file or directory/i,
    message: "File not found",
    suggestion: "Check if the input file path is correct",
  },
  {
    pattern: /Invalid data found when processing input/i,
    message: "Corrupted or unsupported file",
    suggestion: "The input file may be corrupted or in an unsupported format",
  },
  {
    pattern: /Permission denied/i,
    message: "Permission denied",
    suggestion: "Check if you have read/write permissions for the file",
  },
  {
    pattern: /already exists\. Overwrite/i,
    message: "Output file already exists",
    suggestion: "Use --overwrite (-y) to replace the existing file",
  },
  {
    pattern: /Unknown encoder '([^']+)'/i,
    message: "Codec not available",
    suggestion:
      "The requested codec is not installed. Try a different codec or install ffmpeg with full codec support",
  },
  {
    pattern: /Encoder ([^ ]+) not found/i,
    message: "Encoder not found",
    suggestion: "The requested encoder is not available. Try a different codec",
  },
  {
    pattern: /Decoder ([^ ]+) not found/i,
    message: "Decoder not found",
    suggestion: "Cannot decode the input file format. The codec may not be supported",
  },
  {
    pattern: /Could not write header/i,
    message: "Cannot write to output",
    suggestion: "Check if you have write permission and enough disk space",
  },
  {
    pattern: /Could not open file/i,
    message: "Cannot open file",
    suggestion: "Check file permissions and ensure the path is valid",
  },
  {
    pattern: /height not divisible by 2/i,
    message: "Invalid resolution",
    suggestion:
      "Video dimensions must be divisible by 2. Try a standard resolution like 720p or 1080p",
  },
  {
    pattern: /width not divisible by 2/i,
    message: "Invalid resolution",
    suggestion:
      "Video dimensions must be divisible by 2. Try a standard resolution like 720p or 1080p",
  },
  {
    pattern: /No space left on device/i,
    message: "Disk full",
    suggestion: "Free up disk space and try again",
  },
  {
    pattern: /Invalid argument/i,
    message: "Invalid option value",
    suggestion: "Check if all option values are correct",
  },
  {
    pattern: /Option ([^ ]+) not found/i,
    message: "Invalid option",
    suggestion: "The specified option is not recognized",
  },
  {
    pattern: /Avi timescale is invalid/i,
    message: "Invalid video timing",
    suggestion: "Try setting a fixed frame rate with --fps 30",
  },
  {
    pattern: /Avi duration is invalid/i,
    message: "Invalid video duration",
    suggestion: "The input file may have timing issues. Try re-encoding with a fixed frame rate",
  },
  {
    pattern: /moov atom not found/i,
    message: "Incomplete MP4 file",
    suggestion:
      "The MP4 file appears to be incomplete or corrupted. It may have been interrupted during recording",
  },
  {
    pattern: /Stream map '([^']+)' matches no streams/i,
    message: "Stream not found",
    suggestion: "The specified stream doesn't exist in the input file",
  },
  {
    pattern: /Output file is empty/i,
    message: "Empty output",
    suggestion: "No data was written. Check if the input has valid media streams",
  },
  {
    pattern: /At least one output file must be specified/i,
    message: "Missing output file",
    suggestion: "Please specify an output file path",
  },
  {
    pattern: /Avi format does not support/i,
    message: "Format incompatibility",
    suggestion: "The AVI format doesn't support this feature. Try using MP4 or MKV instead",
  },
  {
    pattern: /Could not find codec parameters/i,
    message: "Cannot read media info",
    suggestion: "The input file's codec information cannot be read. The file may be corrupted",
  },
  {
    pattern: /Too many packets buffered/i,
    message: "Memory overflow",
    suggestion: "The input file has sync issues. Try adding -max_muxing_queue_size 1024",
  },
]

/**
 * Parse ffmpeg error output and return human-readable message
 */
export function parseError(stderr: string): { message: string; suggestion: string } | null {
  for (const { pattern, message, suggestion } of ERROR_PATTERNS) {
    if (pattern.test(stderr)) {
      return { message, suggestion }
    }
  }
  return null
}

/**
 * Format ffmpeg error for display
 */
export function formatError(stderr: string): string {
  const parsed = parseError(stderr)

  if (parsed) {
    return `Error: ${parsed.message}\n  → ${parsed.suggestion}`
  }

  // Fallback: try to extract meaningful error from ffmpeg output
  const lines = stderr.split("\n")

  // Look for lines that look like errors
  const errorLine = lines.find(
    (line) =>
      line.includes("Error") ||
      line.includes("error") ||
      line.includes("Invalid") ||
      line.includes("Cannot") ||
      line.includes("Could not") ||
      line.includes("No such") ||
      line.includes("not found")
  )

  if (errorLine) {
    // Clean up the error line
    const cleaned = errorLine
      .replace(/^\[.*?\]\s*/, "") // Remove [component] prefix
      .replace(/^\s+/, "") // Remove leading whitespace
      .trim()

    if (cleaned) {
      return `Error: ${cleaned}`
    }
  }

  // Last resort: generic message
  return "Error: Conversion failed. Run with --verbose for more details"
}

/**
 * Check if the error indicates the file already exists
 */
export function isOverwriteError(stderr: string): boolean {
  return /already exists\. Overwrite/i.test(stderr)
}

/**
 * Check if the error indicates a codec issue
 */
export function isCodecError(stderr: string): boolean {
  return /Unknown encoder|Encoder.*not found|Decoder.*not found/i.test(stderr)
}

/**
 * Check if the error indicates a file not found issue
 */
export function isFileNotFoundError(stderr: string): boolean {
  return /No such file or directory/i.test(stderr)
}
