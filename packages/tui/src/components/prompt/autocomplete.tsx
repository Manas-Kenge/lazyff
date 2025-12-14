import React, { useState, useMemo, useCallback, useEffect, useImperativeHandle, forwardRef } from "react"
import { TextAttributes, RGBA, type BoxRenderable } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/react"
import fuzzysort from "fuzzysort"
import { useTheme, selectedForeground } from "../../context/theme"
import { FORMAT_PRESETS, QUALITY_PRESETS } from "@ffwrap/cli"

/**
 * Autocomplete option
 */
export interface AutocompleteOption {
  display: string
  value: string
  description?: string
  aliases?: string[]
  disabled?: boolean
  onSelect?: () => void
}

/**
 * Autocomplete ref
 */
export interface AutocompleteRef {
  visible: false | "/" | "@"
  onInput: (value: string) => void
  onKeyDown: (key: string, ctrl?: boolean) => boolean
  show: (mode: "/" | "@") => void
  hide: () => void
}

/**
 * Props for Autocomplete component
 */
export interface AutocompleteProps {
  value: string
  cursorOffset: number
  anchorY: number
  anchorX: number
  anchorWidth: number
  onSelect: (option: AutocompleteOption) => void
}

/**
 * Available slash commands for ffwrap
 */
function getCommands(): AutocompleteOption[] {
  const commands: AutocompleteOption[] = [
    // Primary commands
    {
      display: "/convert",
      value: "/convert ",
      description: "convert to format",
    },
    {
      display: "/trim",
      value: "/trim ",
      description: "cut portion of video",
    },
    {
      display: "/compress",
      value: "/compress ",
      description: "reduce file size",
    },
    {
      display: "/extract",
      value: "/extract ",
      description: "extract audio/video/frames",
    },
    {
      display: "/merge",
      value: "/merge",
      description: "concatenate files",
    },
    {
      display: "/gif",
      value: "/gif ",
      description: "convert to animated gif",
    },
    {
      display: "/thumbnail",
      value: "/thumbnail ",
      description: "generate thumbnail",
    },
    {
      display: "/info",
      value: "/info",
      description: "show file info",
    },
    // Settings
    {
      display: "/quality",
      value: "/quality ",
      description: "set quality preset",
    },
    {
      display: "/theme",
      value: "/theme",
      description: "change theme",
    },
    {
      display: "/help",
      value: "/help",
      description: "show help",
    },
    {
      display: "/clear",
      value: "/clear",
      description: "clear chat, return to home",
    },
    {
      display: "/quit",
      value: "/quit",
      description: "exit ffwrap",
      aliases: ["/exit", "/q"],
    },
  ]

  // Add format shortcuts for /convert
  const formats = Object.keys(FORMAT_PRESETS)
  for (const format of formats) {
    commands.push({
      display: `/${format}`,
      value: `/convert ${format}`,
      description: `convert to ${format}`,
    })
  }

  // Add quality options
  const qualities = Object.keys(QUALITY_PRESETS)
  for (const quality of qualities) {
    commands.push({
      display: `/quality ${quality}`,
      value: `/quality ${quality}`,
      description: `set ${quality} quality`,
    })
  }

  // Add extract shortcuts
  commands.push({
    display: "/extract audio",
    value: "/extract audio",
    description: "extract audio track",
  })
  commands.push({
    display: "/extract video",
    value: "/extract video",
    description: "extract video (no audio)",
  })
  commands.push({
    display: "/extract frames",
    value: "/extract frames",
    description: "extract frames as images",
  })

  // Add thumbnail shortcuts
  commands.push({
    display: "/thumbnail grid",
    value: "/thumbnail grid",
    description: "create 3x3 thumbnail grid",
  })

  // Pad display for alignment
  const maxLen = Math.max(...commands.map((c) => c.display.length))
  return commands.map((c) => ({
    ...c,
    display: c.display.padEnd(maxLen + 2),
  }))
}

export const Autocomplete = forwardRef<AutocompleteRef, AutocompleteProps>(
  function Autocomplete(
    { value, cursorOffset, anchorY, anchorX, anchorWidth, onSelect },
    ref
  ) {
    const { theme } = useTheme()
    const { height: termHeight } = useTerminalDimensions()

    const [visible, setVisible] = useState<false | "/" | "@">(false)
    const [selected, setSelected] = useState(0)
    const [triggerIndex, setTriggerIndex] = useState(0)

    // Get filter text from trigger position to cursor
    const filter = useMemo(() => {
      if (!visible) return ""
      return value.slice(triggerIndex + 1, cursorOffset)
    }, [visible, value, triggerIndex, cursorOffset])

    // Get available options based on mode
    const allOptions = useMemo(() => {
      if (visible === "/") {
        return getCommands()
      }
      // For "@" mode, we could add file completion in the future
      return []
    }, [visible])

    // Filter options based on input
    const options = useMemo(() => {
      if (!filter) return allOptions.slice(0, 10)

      const result = fuzzysort.go(filter, allOptions, {
        keys: ["display", "description", (obj) => obj.aliases?.join(" ") ?? ""],
        limit: 10,
      })
      return result.map((r) => r.obj)
    }, [allOptions, filter])

    // Reset selection when filter changes
    useEffect(() => {
      setSelected(0)
    }, [filter])

    // Navigation
    const move = useCallback(
      (direction: -1 | 1) => {
        if (!visible || options.length === 0) return
        let next = selected + direction
        if (next < 0) next = options.length - 1
        if (next >= options.length) next = 0
        setSelected(next)
      },
      [visible, options.length, selected]
    )

    // Select current option
    const select = useCallback(() => {
      const option = options[selected]
      if (option) {
        setVisible(false)
        onSelect(option)
      }
    }, [options, selected, onSelect])

    // Show autocomplete
    const show = useCallback(
      (mode: "/" | "@") => {
        setVisible(mode)
        setTriggerIndex(cursorOffset)
        setSelected(0)
      },
      [cursorOffset]
    )

    // Hide autocomplete
    const hide = useCallback(() => {
      setVisible(false)
    }, [])

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        visible,
        onInput: (newValue: string) => {
          if (visible) {
            // Hide if cursor moved before trigger or there's whitespace
            if (
              cursorOffset <= triggerIndex ||
              newValue.slice(triggerIndex, cursorOffset).includes(" ")
            ) {
              hide()
            }
          }
        },
        onKeyDown: (key: string, ctrl?: boolean): boolean => {
          if (visible) {
            if (key === "up" || (ctrl && key === "p")) {
              move(-1)
              return true
            }
            if (key === "down" || (ctrl && key === "n")) {
              move(1)
              return true
            }
            if (key === "escape") {
              hide()
              return true
            }
            if (key === "return" || key === "tab") {
              select()
              return true
            }
          }
          return false
        },
        show,
        hide,
      }),
      [visible, cursorOffset, triggerIndex, move, select, show, hide]
    )

    if (!visible || options.length === 0) {
      return null
    }

    const height = Math.min(10, options.length)

    return (
      <box
        position="absolute"
        top={anchorY - height - 1}
        left={anchorX}
        width={anchorWidth}
        zIndex={100}
        borderStyle="rounded"
        borderColor={theme.border}
      >
        <box backgroundColor={theme.backgroundPanel} height={height}>
          {options.length === 0 ? (
            <box paddingLeft={1} paddingRight={1}>
              <text fg={theme.textMuted}>No matching items</text>
            </box>
          ) : (
            options.map((option, index) => {
              const isSelected = index === selected
              return (
                <box
                  key={option.value}
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={isSelected ? theme.primary : undefined}
                  flexDirection="row"
                >
                  <text
                    fg={isSelected ? selectedForeground(theme) : theme.text}
                    flexShrink={0}
                  >
                    {option.display}
                  </text>
                  {option.description && (
                    <text
                      fg={isSelected ? selectedForeground(theme) : theme.textMuted}
                      wrapMode="none"
                    >
                      {option.description}
                    </text>
                  )}
                </box>
              )
            })
          )}
        </box>
      </box>
    )
  }
)
