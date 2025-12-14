import React, { useState, useMemo, useEffect, useRef, useCallback, type ReactNode } from "react"
import { TextAttributes, RGBA, type InputRenderable, type ScrollBoxRenderable } from "@opentui/core"
import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import fuzzysort from "fuzzysort"
import { useTheme, selectedForeground } from "../../context/theme"
import { useDialog, type DialogContextValue } from "./dialog"

/**
 * Option for the select dialog
 */
export interface DialogSelectOption<T = any> {
  title: string
  value: T
  description?: string
  footer?: ReactNode | string
  category?: string
  disabled?: boolean
  bg?: RGBA
  gutter?: ReactNode
  onSelect?: (ctx: DialogContextValue) => void
}

/**
 * Props for DialogSelect
 */
export interface DialogSelectProps<T> {
  title: string
  placeholder?: string
  options: DialogSelectOption<T>[]
  onSelect?: (option: DialogSelectOption<T>) => void
  onMove?: (option: DialogSelectOption<T>) => void
  onFilter?: (query: string) => void
  current?: T
}

/**
 * Ref for DialogSelect
 */
export interface DialogSelectRef<T> {
  filter: string
  filtered: DialogSelectOption<T>[]
}

/**
 * Group options by category
 */
function groupByCategory<T>(
  options: DialogSelectOption<T>[]
): [string, DialogSelectOption<T>[]][] {
  const groups = new Map<string, DialogSelectOption<T>[]>()

  for (const option of options) {
    const category = option.category ?? ""
    const existing = groups.get(category) ?? []
    existing.push(option)
    groups.set(category, existing)
  }

  return Array.from(groups.entries())
}

/**
 * Flatten grouped options
 */
function flattenGroups<T>(groups: [string, DialogSelectOption<T>[]][]): DialogSelectOption<T>[] {
  return groups.flatMap(([_, options]) => options)
}

/**
 * Check if two values are deeply equal (simple version)
 */
function isEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Truncate string to max length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + "..."
}

/**
 * Option row component
 */
function Option<T>({
  option,
  active,
  current,
  onSelect,
  onMouseOver,
}: {
  option: DialogSelectOption<T>
  active: boolean
  current: boolean
  onSelect: () => void
  onMouseOver: () => void
}) {
  const { theme } = useTheme()
  const fg = selectedForeground(theme)

  return (
    <box
      flexDirection="row"
      onMouseUp={onSelect}
      onMouseOver={onMouseOver}
      backgroundColor={active ? (option.bg ?? theme.primary) : RGBA.fromInts(0, 0, 0, 0)}
      paddingLeft={current || option.gutter ? 1 : 3}
      paddingRight={3}
      gap={1}
    >
      {current && (
        <text flexShrink={0} fg={active ? fg : theme.primary} marginRight={0.5}>
          ●
        </text>
      )}
      {!current && option.gutter && (
        <box flexShrink={0} marginRight={0.5}>
          {option.gutter}
        </box>
      )}
      <text
        flexGrow={1}
        fg={active ? fg : current ? theme.primary : theme.text}
        attributes={active ? TextAttributes.BOLD : undefined}
        overflow="hidden"
        wrapMode="word"
        paddingLeft={3}
      >
        {truncate(option.title, 62)}
        {option.description && option.description !== option.category && (
          <span style={{ fg: active ? fg : theme.textMuted }}> {option.description}</span>
        )}
      </text>
      {option.footer && (
        <box flexShrink={0}>
          <text fg={active ? fg : theme.textMuted}>
            {typeof option.footer === "string" ? option.footer : option.footer}
          </text>
        </box>
      )}
    </box>
  )
}

export function DialogSelect<T>({
  title,
  placeholder = "Search",
  options,
  onSelect,
  onMove,
  onFilter,
  current,
}: DialogSelectProps<T>) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const { height: termHeight } = useTerminalDimensions()

  const [selected, setSelected] = useState(0)
  const [filter, setFilter] = useState("")

  const inputRef = useRef<InputRenderable>(null)
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  // Filter options based on search
  const filtered = useMemo(() => {
    const enabledOptions = options.filter((x) => x.disabled !== true)
    if (!filter) return enabledOptions

    const result = fuzzysort.go(filter, enabledOptions, {
      keys: ["title", "category"],
    })
    return result.map((x) => x.obj)
  }, [options, filter])

  // Group filtered options by category
  const grouped = useMemo(() => groupByCategory(filtered), [filtered])

  // Flatten for navigation
  const flat = useMemo(() => flattenGroups(grouped), [grouped])

  // Calculate max height for scrollbox
  const height = useMemo(() => {
    const itemCount = flat.length + grouped.length * 2 - 1
    return Math.min(itemCount, Math.floor(termHeight / 2) - 6)
  }, [flat.length, grouped.length, termHeight])

  // Currently selected option
  const selectedOption = flat[selected]

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 1)
  }, [])

  // Reset selection when filter changes
  useEffect(() => {
    if (filter.length > 0) {
      setSelected(0)
    } else if (current !== undefined) {
      const currentIndex = flat.findIndex((opt) => isEqual(opt.value, current))
      if (currentIndex >= 0) {
        setSelected(currentIndex)
      }
    }
    scrollRef.current?.scrollTo(0)
  }, [filter, current, flat])

  // Set initial selection to current value
  useEffect(() => {
    if (current !== undefined) {
      const currentIndex = flat.findIndex((opt) => isEqual(opt.value, current))
      if (currentIndex >= 0) {
        setSelected(currentIndex)
      }
    }
  }, [current, flat])

  // Move selection
  const move = useCallback(
    (direction: number) => {
      let next = selected + direction
      if (next < 0) next = flat.length - 1
      if (next >= flat.length) next = 0
      setSelected(next)

      const nextOption = flat[next]
      if (nextOption) {
        onMove?.(nextOption)
      }
    },
    [selected, flat, onMove]
  )

  // Handle keyboard navigation
  useKeyboard((evt) => {
    if (evt.name === "up" || (evt.ctrl && evt.name === "p")) {
      move(-1)
    }
    if (evt.name === "down" || (evt.ctrl && evt.name === "n")) {
      move(1)
    }
    if (evt.name === "pageup") {
      move(-10)
    }
    if (evt.name === "pagedown") {
      move(10)
    }
    if (evt.name === "return") {
      if (selectedOption) {
        if (selectedOption.onSelect) {
          selectedOption.onSelect(dialog)
        }
        onSelect?.(selectedOption)
      }
    }
  })

  // Keep the active option in view by adjusting scroll position
  useEffect(() => {
    const half = Math.max(0, Math.floor(height / 2) - 1)
    const target = Math.max(0, selected - half)
    scrollRef.current?.scrollTo(target)
  }, [selected, height])

  // Handle filter input
  const handleInput = useCallback(
    (value: string) => {
      setFilter(value)
      onFilter?.(value)
    },
    [onFilter]
  )

  return (
    <box gap={1} paddingBottom={0}>
      <box paddingLeft={4} paddingRight={4}>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.text} attributes={TextAttributes.BOLD}>
            {title}
          </text>
          <text fg={theme.textMuted}>esc</text>
        </box>
        <box paddingTop={1} paddingBottom={1}>
          <input
            onInput={handleInput}
            focusedBackgroundColor={theme.backgroundPanel}
            cursorColor={theme.primary}
            focusedTextColor={theme.textMuted}
            ref={(r: InputRenderable) => {
              // @ts-ignore - ref typing
              inputRef.current = r
            }}
            placeholder={placeholder}
          />
        </box>
      </box>
      <scrollbox
        paddingLeft={1}
        paddingRight={1}
        scrollbarOptions={{ visible: false }}
        ref={(r: ScrollBoxRenderable) => {
          // @ts-ignore - ref typing
          scrollRef.current = r
        }}
        maxHeight={height}
      >
        {grouped.map(([category, categoryOptions], groupIndex) => (
          <React.Fragment key={category || `group-${groupIndex}`}>
            {category && (
              <box paddingTop={groupIndex > 0 ? 1 : 0} paddingLeft={3}>
                <text fg={theme.accent} attributes={TextAttributes.BOLD}>
                  {category}
                </text>
              </box>
            )}
            {categoryOptions.map((option) => {
              const flatIndex = flat.findIndex((o) => isEqual(o.value, option.value))
              const isActive = flatIndex === selected
              const isCurrent = current !== undefined && isEqual(option.value, current)

              return (
                <Option
                  key={JSON.stringify(option.value)}
                  option={option}
                  active={isActive}
                  current={isCurrent}
                  onSelect={() => {
                    if (option.onSelect) {
                      option.onSelect(dialog)
                    }
                    onSelect?.(option)
                  }}
                  onMouseOver={() => {
                    if (flatIndex >= 0) {
                      setSelected(flatIndex)
                    }
                  }}
                />
              )
            })}
          </React.Fragment>
        ))}
      </scrollbox>
    </box>
  )
}

/**
 * Options for showing a select dialog
 */
interface DialogSelectShowOptions<T> {
  onMove?: (option: DialogSelectOption<T>) => void
  onCancel?: () => void
}

/**
 * Static method to show a select dialog
 */
DialogSelect.show = <T,>(
  dialog: DialogContextValue,
  title: string,
  options: DialogSelectOption<T>[],
  current?: T,
  showOptions?: DialogSelectShowOptions<T>
): Promise<DialogSelectOption<T> | null> => {
  return new Promise((resolve) => {
    dialog.replace(
      () => (
        <DialogSelect
          title={title}
          options={options}
          current={current}
          onMove={showOptions?.onMove}
          onSelect={(option) => {
            dialog.clear()
            resolve(option)
          }}
        />
      ),
      () => {
        showOptions?.onCancel?.()
        resolve(null)
      }
    )
  })
}
