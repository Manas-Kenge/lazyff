import React, { useState, useEffect, useCallback } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { useApp, type FileNode } from "../context/app"
import { useTheme } from "../context/theme"
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
  const [files, setFiles] = useState<FileNode[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  // Load directory contents
  useEffect(() => {
    const allFiles = readDirectory(cwd)
    const mediaFiles = filterMediaFiles(allFiles)
    setFiles(mediaFiles)
    setSelectedIndex(0)
  }, [cwd])

  /**
   * Flatten tree structure for rendering with indent metadata
   */
  const flattenTree = useCallback((): FlatNode[] => {
    const result: FlatNode[] = []

    const traverse = (
      nodes: FileNode[],
      depth: number,
      ancestorsAreLast: boolean[]
    ) => {
      nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1

        result.push({
          node,
          depth,
          isLast,
          ancestorsAreLast: [...ancestorsAreLast],
        })

        if (node.type === "directory" && expandedPaths.has(node.path)) {
          const children = filterMediaFiles(readDirectory(node.path))
          traverse(children, depth + 1, [...ancestorsAreLast, isLast])
        }
      })
    }

    traverse(files, 0, [])
    return result
  }, [files, expandedPaths])

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
    if (!focused) return

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

      case "g":
        // Go to first
        setSelectedIndex(0)
        break

      case "G":
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

      case "tab":
        // Switch to input panel
        setFocusedPanel("input")
        break
    }
  })

  // Update selected file when navigating to a file
  useEffect(() => {
    const currentNode = visibleNodes[selectedIndex]
    if (currentNode && currentNode.node.type === "file") {
      selectFile(currentNode.node)
    }
  }, [selectedIndex, visibleNodes, selectFile])

  // Truncate path for display
  const displayPath = cwd.length > width - 4 ? "..." + cwd.slice(-(width - 7)) : cwd

  return (
    <box
      flexDirection="column"
      borderStyle="rounded"
      borderColor={focused ? theme.primary : theme.border}
      backgroundColor={theme.backgroundElement}
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
      <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
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
            const availableWidth = width - 4 - prefixLen - sizeLen // -4 for padding/border
            const displayName =
              node.name.length > availableWidth
                ? node.name.slice(0, availableWidth - 2) + ".."
                : node.name

            // Pad name to align file sizes
            const namePadding = Math.max(0, availableWidth - displayName.length)

            return (
              <box
                key={node.path}
                flexDirection="row"
                backgroundColor={isSelected && focused ? theme.primary : undefined}
              >
                {/* Indent guides */}
                {depth > 0 && (
                  <text fg={theme.border}>{indentGuides}</text>
                )}

                {/* Expander */}
                <text fg={isSelected && focused ? textColor : theme.textMuted}>
                  {expander}
                </text>

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
      </box>

      {/* Footer with hints */}
      <box paddingLeft={1} paddingRight={1} marginTop={1}>
        <text attributes={TextAttributes.DIM} fg={theme.textMuted}>
          j/k nav  l/h open
        </text>
      </box>
    </box>
  )
}
