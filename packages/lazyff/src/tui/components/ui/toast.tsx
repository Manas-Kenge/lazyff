import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/react"
import { useTheme } from "../../context/theme"

/**
 * Toast variant types
 */
export type ToastVariant = "info" | "success" | "warning" | "error"

/**
 * Toast options
 */
export interface ToastOptions {
  message: string
  title?: string
  variant: ToastVariant
  duration?: number
}

/**
 * Current toast state
 */
interface ToastState {
  message: string
  title?: string
  variant: ToastVariant
}

/**
 * Toast context value
 */
interface ToastContextValue {
  show: (options: ToastOptions) => void
  error: (err: unknown) => void
  success: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
  currentToast: ToastState | null
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Toast display component
 */
function ToastDisplay() {
  const { currentToast } = useToast()
  const { theme } = useTheme()
  const { width } = useTerminalDimensions()

  if (!currentToast) return null

  // Get border color based on variant
  const borderColor = theme[currentToast.variant]

  return (
    <box
      position="absolute"
      justifyContent="center"
      alignItems="flex-start"
      top={2}
      right={2}
      maxWidth={Math.min(60, width - 6)}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      backgroundColor={theme.backgroundPanel}
      borderColor={borderColor}
      border={["left", "right"]}
    >
      {currentToast.title && (
        <text attributes={TextAttributes.BOLD} marginBottom={1} fg={theme.text}>
          {currentToast.title}
        </text>
      )}
      <text fg={theme.text} wrapMode="word" width="100%">
        {currentToast.message}
      </text>
    </box>
  )
}

/**
 * Toast provider component
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [currentToast, setCurrentToast] = useState<ToastState | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const show = useCallback((options: ToastOptions) => {
    const { duration = 3000, ...state } = options
    setCurrentToast(state)

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Auto-hide after duration
    timeoutRef.current = setTimeout(() => {
      setCurrentToast(null)
    }, duration)
  }, [])

  const error = useCallback(
    (err: unknown) => {
      const message = err instanceof Error ? err.message : "An unknown error occurred"
      show({ variant: "error", message })
    },
    [show]
  )

  const success = useCallback(
    (message: string) => {
      show({ variant: "success", message })
    },
    [show]
  )

  const info = useCallback(
    (message: string) => {
      show({ variant: "info", message })
    },
    [show]
  )

  const warning = useCallback(
    (message: string) => {
      show({ variant: "warning", message })
    },
    [show]
  )

  const value: ToastContextValue = {
    show,
    error,
    success,
    info,
    warning,
    currentToast,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastDisplay />
    </ToastContext.Provider>
  )
}

/**
 * Hook to access toast context
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}
