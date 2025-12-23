import fs from "fs"
import path from "path"
import { getMediaType } from "../../ffmpeg/presets.ts"
import type { FileNode } from "../context/app.tsx"

/**
 * Detect if terminal supports emoji characters
 */
export function isEmojiSupported(): boolean {
  const { env } = process
  const { TERM, TERM_PROGRAM } = env

  // Non-Windows: Most modern terminals support emoji
  if (process.platform !== "win32") {
    // Linux console (kernel) and dumb terminals don't support emoji
    return TERM !== "linux" && TERM !== "dumb"
  }

  // Windows: check for modern terminal emulators
  return Boolean(
    env.WT_SESSION || // Windows Terminal
    env.TERMINUS_SUBLIME || // Terminus
    env.ConEmuTask === "{cmd::Cmder}" || // ConEmu/Cmder
    TERM_PROGRAM === "Terminus-Sublime" ||
    TERM_PROGRAM === "vscode" ||
    TERM === "xterm-256color" ||
    TERM === "alacritty" ||
    TERM === "rxvt-unicode" ||
    TERM === "rxvt-unicode-256color" ||
    env.TERMINAL_EMULATOR === "JetBrains-JediTerm"
  )
}

// Cache emoji support detection
let _emojiSupported: boolean | null = null
function getEmojiSupport(): boolean {
  if (_emojiSupported === null) {
    _emojiSupported = isEmojiSupported()
  }
  return _emojiSupported
}

/**
 * Emoji icons (for terminals that support them)
 */
const EMOJI_FILE_ICONS = {
  FOLDER: "📁",
  FOLDER_OPEN: "📂",
  VIDEO: "🎬",
  AUDIO: "🎵",
  IMAGE: "🖼",
  FILE: "📄",
} as const

/**
 * Unicode fallback icons (works in all terminals)
 */
const UNICODE_FILE_ICONS = {
  FOLDER: "□",
  FOLDER_OPEN: "■",
  VIDEO: "▶",
  AUDIO: "♪",
  IMAGE: "◐",
  FILE: "○",
} as const

/**
 * Tree structure icons (universal unicode - works in all terminals)
 */
export const TREE_ICONS = {
  // Tree structure
  INDENT: "│   ",
  BRANCH: "├── ",
  LAST_BRANCH: "└── ",
  EMPTY_INDENT: "    ",

  // Expanders
  EXPANDED: "▼ ",
  COLLAPSED: "▶ ",
  NO_EXPANDER: "  ",
} as const

/**
 * Get file type icon based on terminal emoji support
 */
export function getFileTypeIcon(
  type: "folder" | "folder_open" | "video" | "audio" | "image" | "file"
): string {
  const icons = getEmojiSupport() ? EMOJI_FILE_ICONS : UNICODE_FILE_ICONS
  const key = type.toUpperCase() as keyof typeof EMOJI_FILE_ICONS
  return icons[key]
}

/**
 * Read directory contents and return FileNode array
 */
export function readDirectory(dirPath: string): FileNode[] {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const nodes: FileNode[] = []

    for (const entry of entries) {
      // Skip hidden files
      if (entry.name.startsWith(".")) continue

      const fullPath = path.join(dirPath, entry.name)
      const isDirectory = entry.isDirectory()
      const extension = isDirectory ? undefined : path.extname(entry.name).slice(1).toLowerCase()
      const mediaType = extension ? getMediaType(extension) : null

      // Get file size for files
      let size: number | undefined
      if (!isDirectory) {
        try {
          const stats = fs.statSync(fullPath)
          size = stats.size
        } catch {
          // Ignore errors getting file size
        }
      }

      nodes.push({
        name: entry.name,
        path: fullPath,
        type: isDirectory ? "directory" : "file",
        extension,
        mediaType,
        size,
        expanded: false,
      })
    }

    // Sort: directories first, then files, alphabetically
    return nodes.sort((a, b) => {
      if (a.type === "directory" && b.type === "file") return -1
      if (a.type === "file" && b.type === "directory") return 1
      return a.name.localeCompare(b.name)
    })
  } catch (error) {
    return []
  }
}

/**
 * Get file icon based on type (with emoji support detection)
 */
export function getFileIcon(node: FileNode): string {
  if (node.type === "directory") {
    return node.expanded ? getFileTypeIcon("folder_open") : getFileTypeIcon("folder")
  }

  switch (node.mediaType) {
    case "video":
      return getFileTypeIcon("video")
    case "audio":
      return getFileTypeIcon("audio")
    case "image":
      return getFileTypeIcon("image")
    default:
      return getFileTypeIcon("file")
  }
}

/**
 * Get human-readable file size
 */
export function getFileSize(filePath: string): string {
  try {
    const stats = fs.statSync(filePath)
    const bytes = stats.size

    if (bytes === 0) return "0 B"

    const units = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const size = bytes / Math.pow(1024, i)

    return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
  } catch {
    return ""
  }
}

/**
 * Filter files to show only media files
 */
export function filterMediaFiles(nodes: FileNode[]): FileNode[] {
  return nodes.filter((node) => {
    if (node.type === "directory") return true
    return node.mediaType !== null
  })
}

/**
 * Get parent directory path
 */
export function getParentDir(dirPath: string): string {
  return path.dirname(dirPath)
}

/**
 * Check if path is root
 */
export function isRootPath(dirPath: string): boolean {
  return dirPath === "/" || dirPath === path.parse(dirPath).root
}

/**
 * Format path for display (truncate if too long)
 */
export function formatPath(filePath: string, maxLength: number = 40): string {
  if (filePath.length <= maxLength) return filePath

  const parts = filePath.split(path.sep)
  if (parts.length <= 2) return filePath

  // Show first and last parts with ... in between
  const first = parts[0] || path.sep
  const last = parts.slice(-2).join(path.sep)
  return `${first}/.../${last}`
}

/**
 * Recursively get all media files from a directory up to maxDepth levels
 * @param dirPath Starting directory path
 * @param maxDepth Maximum depth to recurse (default: 3)
 * @param basePath Base path for calculating relative paths (defaults to dirPath)
 * @returns Flat array of FileNode objects for all media files found
 */
export function getAllMediaFiles(
  dirPath: string,
  maxDepth: number = 3,
  basePath?: string
): FileNode[] {
  const base = basePath ?? dirPath
  const results: FileNode[] = []

  function recurse(currentPath: string, depth: number): void {
    if (depth > maxDepth) return

    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        // Skip hidden files
        if (entry.name.startsWith(".")) continue

        const fullPath = path.join(currentPath, entry.name)

        if (entry.isDirectory()) {
          // Recurse into subdirectory
          recurse(fullPath, depth + 1)
        } else {
          // Check if it's a media file
          const extension = path.extname(entry.name).slice(1).toLowerCase()
          const mediaType = getMediaType(extension)

          if (mediaType !== null) {
            results.push({
              name: entry.name,
              path: fullPath,
              type: "file",
              extension,
              mediaType,
            })
          }
        }
      }
    } catch {
      // Ignore permission errors or other issues
    }
  }

  recurse(dirPath, 1)

  // Sort alphabetically by name
  return results.sort((a, b) => a.name.localeCompare(b.name))
}
