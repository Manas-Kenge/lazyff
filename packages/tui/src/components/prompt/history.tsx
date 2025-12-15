import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import path from "path"
import { readFile, writeFile, appendFile, mkdir } from "fs/promises"
import os from "os"

/**
 * Prompt history entry
 */
export interface PromptInfo {
  input: string
  timestamp?: number
}

const MAX_HISTORY_ENTRIES = 50

/**
 * Get the history file path
 */
function getHistoryFilePath(): string {
  const stateDir = path.join(os.homedir(), ".ffwrap")
  return path.join(stateDir, "prompt-history.jsonl")
}

/**
 * History context value
 */
interface HistoryContextValue {
  /**
   * Move through history
   * @param direction -1 for previous, 1 for next
   * @param currentInput Current input value (to save before navigating)
   * @returns The history entry at the new position, or undefined
   */
  move: (direction: -1 | 1, currentInput: string) => PromptInfo | undefined

  /**
   * Append a new entry to history
   */
  append: (item: PromptInfo) => void

  /**
   * Get all history entries
   */
  history: PromptInfo[]
}

const HistoryContext = createContext<HistoryContextValue | null>(null)

/**
 * History provider component
 */
export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<PromptInfo[]>([])
  const [index, setIndex] = useState(0)

  // Load history from file on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyFile = getHistoryFilePath()
        const text = await readFile(historyFile, "utf-8").catch(() => "")
        const lines = text
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            try {
              return JSON.parse(line) as PromptInfo
            } catch {
              return null
            }
          })
          .filter((line): line is PromptInfo => line !== null)
          .slice(-MAX_HISTORY_ENTRIES)

        setHistory(lines)

        // Rewrite file with only valid entries to self-heal corruption
        if (lines.length > 0) {
          const content = lines.map((line) => JSON.stringify(line)).join("\n") + "\n"
          await mkdir(path.dirname(historyFile), { recursive: true })
          await writeFile(historyFile, content).catch(() => {})
        }
      } catch {
        // Ignore errors loading history
      }
    }

    loadHistory()
  }, [])

  const move = useCallback(
    (direction: -1 | 1, currentInput: string): PromptInfo | undefined => {
      if (history.length === 0) return undefined

      const current = history.at(index)
      if (!current) return undefined

      // Don't navigate if user has modified the input
      if (current.input !== currentInput && currentInput.length > 0) {
        return undefined
      }

      const next = index + direction
      if (Math.abs(next) > history.length) return undefined
      if (next > 0) return undefined

      setIndex(next)

      // At index 0, return empty (current input)
      if (next === 0) {
        return { input: "" }
      }

      return history.at(next)
    },
    [history, index]
  )

  const append = useCallback(
    (item: PromptInfo) => {
      const entry: PromptInfo = {
        ...item,
        timestamp: Date.now(),
      }

      setHistory((prev) => {
        const next = [...prev, entry]
        if (next.length > MAX_HISTORY_ENTRIES) {
          return next.slice(-MAX_HISTORY_ENTRIES)
        }
        return next
      })
      setIndex(0)

      // Persist to file
      const historyFile = getHistoryFilePath()
      mkdir(path.dirname(historyFile), { recursive: true })
        .then(() => appendFile(historyFile, JSON.stringify(entry) + "\n"))
        .catch(() => {})
    },
    []
  )

  const value: HistoryContextValue = {
    move,
    append,
    history,
  }

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
}

/**
 * Hook to access history context
 */
export function usePromptHistory(): HistoryContextValue {
  const context = useContext(HistoryContext)
  if (!context) {
    throw new Error("usePromptHistory must be used within HistoryProvider")
  }
  return context
}
