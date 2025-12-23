import React, { useState, useEffect, useCallback, useRef } from "react"
import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core"
import { useApp, type FileNode } from "../context/app"
import { useTheme } from "../context/theme"
import { useDialog } from "./ui/dialog"
import {
  readDirectory,
  getFileIcon,
  getFileSize,
  getParentDir,
  isRootPath,
  filterMediaFiles,
  TREE_ICONS,
} from "../utils/fs"

interface FileTreeProps {
  focused: boolean
  width?: number
}

/**
 * Flat node representation for rendering
 */
interface FlatNode {
  node: FileNode
  depth: number
  isLast: boolean
  ancestorsAreLast: boolean[]
}

/**
 * Neo-tree style file browser component
 */
export function FileTree({ focused, width = 40 }: FileTreeProps) {
  const { cwd, setCwd, selectFile, selectedFile, setStatusMessage, setFocusedPanel } = useApp()
  const { theme } = useTheme()
  const dialog = useDialog()
  const { height: termHeight } = useTerminalDimensions()
  const [files, setFiles] = useState<FileNode[]>([])
  const [directoryCache, setDirectoryCache] = useState<Map<string, FileNode[]>>(new Map())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  // Calculate max height for file list
  // Reserve space for: border (2) + header (1) + path (2) + footer (2) + margin (1)
  const fileListHeight = Math.max(5, termHeight - 8)

  // Calculate number of visible items for scroll calculation
  // Account for padding inside scrollbox
  const visibleItemCount = Math.max(3, fileListHeight - 2)

  // Load directory contents
  useEffect(() => {
    const allFiles = readDirectory(cwd)
    const mediaFiles = filterMediaFiles(allFiles)
    setFiles(mediaFiles)
    setDirectoryCache(new Map()) // Clear cache when root changes
    setSelectedIndex(0)
  }, [cwd])

  // Cache sub-directories when expanded
  useEffect(() => {
    const newCache = new Map(directoryCache)
    let changed = false

    expandedPaths.forEach((path) => {
      if (!newCache.has(path)) {
        try {
          const subFiles = filterMediaFiles(readDirectory(path))
          newCache.set(path, subFiles)
          changed = true
        } catch (e) {
          // Ignore read errors
        }
      }
    })

    if (changed) {
      setDirectoryCache(newCache)
    }
  }, [expandedPaths, directoryCache])

  /**
   * Flatten tree structure for rendering with indent metadata
   */
  const flattenTree = useCallback((): FlatNode[] => {
    const result: FlatNode[] = []

    const traverse = (nodes: FileNode[], depth: number, ancestorsAreLast: boolean[]) => {
      nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1

        result.push({
          node,
          depth,
          isLast,
          ancestorsAreLast: [...ancestorsAreLast],
        })

        if (node.type === "directory" && expandedPaths.has(node.path)) {
          const children = directoryCache.get(node.path) || []
          traverse(children, depth + 1, [...ancestorsAreLast, isLast])
        }
      })
    }

    traverse(files, 0, [])
    return result
  }, [files, expandedPaths, directoryCache])

  const visibleNodes = flattenTree()

  /**
   * Build indent guides string for a node
   */
  const getIndentGuides = (flatNode: FlatNode): string => {
    const { depth, isLast, ancestorsAreLast } = flatNode
    let guides = ""

    for (let i = 0; i < depth; i++) {
      if (i === depth - 1) {
        // Current level - show branch
        guides += isLast ? TREE_ICONS.LAST_BRANCH : TREE_ICONS.BRANCH
      } else {
        // Ancestor levels - show vertical line or empty space
        guides += ancestorsAreLast[i] ? TREE_ICONS.EMPTY_INDENT : TREE_ICONS.INDENT
      }
    }

    return guides
  }

  /**
   * Get expander icon for a node
   */
  const getExpander = (node: FileNode): string => {
    if (node.type !== "directory") {
      return TREE_ICONS.NO_EXPANDER
    }
    return expandedPaths.has(node.path) ? TREE_ICONS.EXPANDED : TREE_ICONS.COLLAPSED
  }

  /**
   * Toggle directory expansion
   */
  const toggleExpand = (node: FileNode) => {
    if (node.type !== "directory") return

    setExpandedPaths((paths) => {
      const newPaths = new Set(paths)
      if (newPaths.has(node.path)) {
        newPaths.delete(node.path)
      } else {
        newPaths.add(node.path)
      }
      return newPaths
    })
  }

  /**
   * Expand a directory
   */
  const expandDir = (node: FileNode) => {
    if (node.type !== "directory") return
    setExpandedPaths((paths) => new Set([...paths, node.path]))
  }

  /**
   * Collapse a directory
   */
  const collapseDir = (node: FileNode) => {
    if (node.type !== "directory") return
    setExpandedPaths((paths) => {
      const newPaths = new Set(paths)
      newPaths.delete(node.path)
      return newPaths
    })
  }

  // Keyboard navigation
  useKeyboard((event) => {
    // Don't handle keyboard when dialog is open or not focused
    if (!focused || dialog.isOpen) return

    const { name } = event
    const currentNode = visibleNodes[selectedIndex]

    switch (name) {
      case "up":
      case "k":
        setSelectedIndex((i) => Math.max(0, i - 1))
        break

      case "down":
      case "j":
        setSelectedIndex((i) => Math.min(visibleNodes.length - 1, i + 1))
        break

      case "left":
      case "h":
        // Collapse directory or go to parent
        if (currentNode) {
          const { node } = currentNode
          if (node.type === "directory" && expandedPaths.has(node.path)) {
            collapseDir(node)
          } else if (!isRootPath(cwd)) {
            setCwd(getParentDir(cwd))
            setExpandedPaths(new Set())
          }
        }
        break

      case "right":
      case "l":
        // Expand directory or select file
        if (currentNode) {
          const { node } = currentNode
          if (node.type === "directory") {
            if (!expandedPaths.has(node.path)) {
              expandDir(node)
            }
          } else {
            selectFile(node)
            setStatusMessage(`Selected: ${node.name}`)
            setFocusedPanel("input")
          }
        }
        break

      case "return":
        // Toggle directory or select file
        if (currentNode) {
          const { node } = currentNode
          if (node.type === "directory") {
            toggleExpand(node)
          } else {
            selectFile(node)
            setStatusMessage(`Selected: ${node.name}`)
            setFocusedPanel("input")
          }
        }
        break

      case " ":
        // Toggle expand (space)
        if (currentNode && currentNode.node.type === "directory") {
          toggleExpand(currentNode.node)
        }
        break

      case "backspace":
        // Go to parent directory
        if (!isRootPath(cwd)) {
          setCwd(getParentDir(cwd))
          setExpandedPaths(new Set())
        }
        break

      case "home":
        // Go to first
        setSelectedIndex(0)
        break

      case "end":
        // Go to last
        setSelectedIndex(Math.max(0, visibleNodes.length - 1))
        break

      case ".":
        // Set selected directory as root
        if (currentNode && currentNode.node.type === "directory") {
          setCwd(currentNode.node.path)
          setExpandedPaths(new Set())
        }
        break
    }
  })

  // Update selected file when navigating - also clear when on directory
  useEffect(() => {
    const currentNode = visibleNodes[selectedIndex]
    if (currentNode) {
      if (currentNode.node.type === "file") {
        selectFile(currentNode.node)
      } else {
        // Clear selection when on directory
        selectFile(currentNode.node)
      }
    }
  }, [selectedIndex, visibleNodes, selectFile])

  // Track current scroll offset using ref to avoid state issues
  const scrollOffsetRef = useRef(0)

  // Keep the highlight in a fixed "safe zone" - scroll content instead of moving highlight
  // Highlight stays between row 4 and (visibleItemCount - 4)
  useEffect(() => {
    if (scrollRef.current && visibleNodes.length > 0 && visibleItemCount > 0) {
      const total = visibleNodes.length
      const limit = visibleItemCount
      const margin = 4 // Keep highlight at least 4 rows from top and bottom

      // Calculate where the highlight would appear relative to the viewport
      const relativePosition = selectedIndex - scrollOffsetRef.current

      let newOffset = scrollOffsetRef.current

      // If highlight would be above the safe zone (within 4 rows of top)
      if (relativePosition < margin) {
        // Scroll up: move content down so highlight is at row 4
        newOffset = Math.max(0, selectedIndex - margin)
      }
      // If highlight would be below the safe zone (within 4 rows of bottom)
      else if (relativePosition > limit - margin - 1) {
        // Scroll down: move content up so highlight is at row (limit - 4 - 1)
        newOffset = selectedIndex - (limit - margin - 1)
      }

      // Clamp to valid range
      newOffset = Math.max(0, Math.min(newOffset, Math.max(0, total - limit)))

      scrollOffsetRef.current = newOffset
      scrollRef.current.scrollTo(newOffset)
    }
  }, [selectedIndex, visibleItemCount, visibleNodes.length])

  // Truncate path for display
  const displayPath = cwd.length > width - 4 ? "..." + cwd.slice(-(width - 7)) : cwd

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      borderColor={theme.border}
      backgroundColor={theme.backgroundPanel}
      width={width}
    >
      {/* Header */}
      <box paddingLeft={1} paddingRight={1}>
        <text attributes={TextAttributes.BOLD} fg={theme.primary}>
          Files
        </text>
      </box>

      {/* Current path */}
      <box paddingLeft={1} paddingRight={1} marginBottom={1}>
        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
          {displayPath}
        </text>
      </box>

      {/* File list */}
      <scrollbox
        flexDirection="column"
        flexGrow={1}
        paddingLeft={1}
        paddingRight={1}
        maxHeight={fileListHeight}
        scrollbarOptions={{ visible: false }}
        ref={(r: ScrollBoxRenderable) => {
          scrollRef.current = r
        }}
      >
        {visibleNodes.length === 0 ? (
          <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
            No media files
          </text>
        ) : (
          visibleNodes.map((flatNode, index) => {
            const { node, depth } = flatNode
            const isSelected = index === selectedIndex
            const isCurrentFile = selectedFile?.path === node.path

            const indentGuides = getIndentGuides(flatNode)
            const expander = getExpander(node)
            const icon = getFileIcon({ ...node, expanded: expandedPaths.has(node.path) })
            const fileSize = node.type === "file" ? getFileSize(node.path) : ""

            // Determine text color
            let textColor = theme.text
            if (isSelected && focused) {
              textColor = theme.background
            } else if (isCurrentFile) {
              textColor = theme.success
            } else if (node.type === "directory") {
              textColor = theme.info
            } else if (node.mediaType === "video") {
              textColor = theme.secondary
            } else if (node.mediaType === "audio") {
              textColor = theme.warning
            }

            // Calculate available space for filename
            const prefixLen = indentGuides.length + expander.length + 2 // icon + space
            const sizeLen = fileSize ? fileSize.length + 1 : 0
            const availableWidth = width - 4 - prefixLen // -4 for padding/border
            const availableWidthWithSize = availableWidth - sizeLen

            // Truncate long file names instead of wrapping (ensures 1 item = 1 row for scroll)
            const truncateName = (text: string, maxWidth: number): string => {
              if (text.length <= maxWidth) return text
              if (maxWidth <= 3) return text.slice(0, maxWidth)
              return text.slice(0, maxWidth - 3) + "..."
            }

            const displayName = truncateName(node.name, availableWidthWithSize)

            // Pad name to align file sizes
            const namePadding = Math.max(0, availableWidthWithSize - displayName.length)

            return (
              <box
                key={node.path}
                flexDirection="row"
                backgroundColor={isSelected && focused ? theme.primary : undefined}
              >
                {/* Indent guides */}
                {depth > 0 && <text fg={theme.border}>{indentGuides}</text>}

                {/* Expander */}
                <text fg={isSelected && focused ? textColor : theme.textMuted}>{expander}</text>

                {/* Icon */}
                <text fg={textColor}>{icon} </text>

                {/* Filename */}
                <text
                  fg={textColor}
                  attributes={isSelected && focused ? TextAttributes.BOLD : undefined}
                >
                  {displayName}
                </text>

                {/* Padding + File size */}
                {fileSize && (
                  <>
                    <text fg={theme.textMuted}>{" ".repeat(namePadding)} </text>
                    <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
                      {fileSize}
                    </text>
                  </>
                )}
              </box>
            )
          })
        )}
      </scrollbox>
    </box>
  )
}
