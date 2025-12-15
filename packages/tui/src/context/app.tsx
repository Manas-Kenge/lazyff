import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { MediaInfo } from "@ffwrap/cli"

/**
 * File node representation
 */
export interface FileNode {
  name: string
  path: string
  type: "file" | "directory"
  extension?: string
  mediaType?: "video" | "audio" | "image" | null
  children?: FileNode[]
  expanded?: boolean
}

/**
 * Conversion job status
 */
export interface ConversionJob {
  id: string
  input: string
  output: string
  status: "pending" | "converting" | "complete" | "error"
  progress: number
  error?: string
}

/**
 * Chat message in the conversation
 */
export interface ChatMessage {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: number
  status?: "pending" | "running" | "success" | "error"
  metadata?: {
    command?: string
    outputPath?: string
    duration?: string
    sizeChange?: string
    resolution?: string
  }
}

/**
 * View mode - initial (logo + prompt) or chat (messages + bottom prompt)
 */
export type ViewMode = "initial" | "chat"

/**
 * App state
 */
interface AppState {
  // Current working directory
  cwd: string
  // Selected file in file tree
  selectedFile: FileNode | null
  // Media info for selected file
  mediaInfo: MediaInfo | null
  // Currently focused panel
  focusedPanel: "sidebar" | "input"
  // Command input value
  commandInput: string
  // Current conversion job
  currentJob: ConversionJob | null
  // Show help overlay
  showHelp: boolean
  // Status message
  statusMessage: string
  // View mode
  viewMode: ViewMode
  // Chat messages
  messages: ChatMessage[]
}

/**
 * App context actions
 */
interface AppContextValue extends AppState {
  setCwd: (cwd: string) => void
  selectFile: (file: FileNode | null) => void
  setMediaInfo: (info: MediaInfo | null) => void
  setFocusedPanel: (panel: "sidebar" | "input") => void
  cycleFocus: () => void
  setCommandInput: (input: string) => void
  setCurrentJob: (job: ConversionJob | null) => void
  updateJobProgress: (progress: number) => void
  completeJob: (error?: string) => void
  toggleHelp: () => void
  setStatusMessage: (message: string) => void
  // New actions for chat
  setViewMode: (mode: ViewMode) => void
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp"> & { id?: string }) => string
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  clearMessages: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

/**
 * Generate unique ID for messages
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * App context provider
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    cwd: process.cwd(),
    selectedFile: null,
    mediaInfo: null,
    focusedPanel: "input",
    commandInput: "",
    currentJob: null,
    showHelp: false,
    statusMessage: "",
    viewMode: "initial",
    messages: [],
  })

  const setCwd = useCallback((cwd: string) => {
    setState((s: AppState) => ({ ...s, cwd }))
  }, [])

  const selectFile = useCallback((file: FileNode | null) => {
    setState((s: AppState) => ({ ...s, selectedFile: file, mediaInfo: null }))
  }, [])

  const setMediaInfo = useCallback((info: MediaInfo | null) => {
    setState((s: AppState) => ({ ...s, mediaInfo: info }))
  }, [])

  const setFocusedPanel = useCallback((panel: "sidebar" | "input") => {
    setState((s: AppState) => ({ ...s, focusedPanel: panel }))
  }, [])

  const cycleFocus = useCallback(() => {
    setState((s: AppState) => ({
      ...s,
      focusedPanel: s.focusedPanel === "sidebar" ? "input" : "sidebar",
    }))
  }, [])

  const setCommandInput = useCallback((input: string) => {
    setState((s: AppState) => ({ ...s, commandInput: input }))
  }, [])

  const setCurrentJob = useCallback((job: ConversionJob | null) => {
    setState((s: AppState) => ({ ...s, currentJob: job }))
  }, [])

  const updateJobProgress = useCallback((progress: number) => {
    setState((s: AppState) => {
      if (!s.currentJob) return s
      return {
        ...s,
        currentJob: { ...s.currentJob, progress },
      }
    })
  }, [])

  const completeJob = useCallback((error?: string) => {
    setState((s: AppState) => {
      if (!s.currentJob) return s
      return {
        ...s,
        currentJob: {
          ...s.currentJob,
          status: error ? "error" : "complete",
          progress: error ? s.currentJob.progress : 100,
          error,
        },
      }
    })
  }, [])

  const toggleHelp = useCallback(() => {
    setState((s: AppState) => ({ ...s, showHelp: !s.showHelp }))
  }, [])

  const setStatusMessage = useCallback((message: string) => {
    setState((s: AppState) => ({ ...s, statusMessage: message }))
  }, [])

  // New chat-related actions
  const setViewMode = useCallback((mode: ViewMode) => {
    setState((s: AppState) => ({ ...s, viewMode: mode }))
  }, [])

  const addMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp"> & { id?: string }) => {
    const newMessage: ChatMessage = {
      ...message,
      id: message.id || generateId(),
      timestamp: Date.now(),
    }
    setState((s: AppState) => ({
      ...s,
      messages: [...s.messages, newMessage],
    }))
    return newMessage.id
  }, [])

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setState((s: AppState) => ({
      ...s,
      messages: s.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }))
  }, [])

  const clearMessages = useCallback(() => {
    setState((s: AppState) => ({ ...s, messages: [], viewMode: "initial" }))
  }, [])

  const value: AppContextValue = {
    ...state,
    setCwd,
    selectFile,
    setMediaInfo,
    setFocusedPanel,
    cycleFocus,
    setCommandInput,
    setCurrentJob,
    updateJobProgress,
    completeJob,
    toggleHelp,
    setStatusMessage,
    setViewMode,
    addMessage,
    updateMessage,
    clearMessages,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/**
 * Hook to access app context
 */
export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}
