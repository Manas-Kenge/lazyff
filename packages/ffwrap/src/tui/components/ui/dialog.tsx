import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type JSX,
} from "react"
import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import { RGBA } from "@opentui/core"
import { useTheme } from "../../context/theme"

/**
 * Dialog component - renders a modal dialog
 */
export function Dialog({
  children,
  size = "medium",
  onClose,
}: {
  children: ReactNode
  size?: "medium" | "large"
  onClose: () => void
}) {
  const { width, height } = useTerminalDimensions()
  const { theme } = useTheme()

  return (
    <box
      onMouseUp={() => onClose()}
      width={width}
      height={height}
      alignItems="center"
      justifyContent="center"
      position="absolute"
      left={0}
      top={0}
      backgroundColor={RGBA.fromInts(0, 0, 0, 150)}
    >
      <box
        onMouseUp={(e: any) => e.stopPropagation()}
        width={size === "large" ? 80 : 60}
        maxWidth={width - 2}
        backgroundColor={theme.backgroundPanel}
        paddingTop={1}
      >
        {children}
      </box>
    </box>
  )
}

/**
 * Dialog stack item
 */
interface DialogStackItem {
  id: string
  element: React.ReactNode
  onClose?: () => void
}

/**
 * Dialog context value
 */
export interface DialogContextValue {
  /**
   * Show a dialog, replacing any existing dialogs
   */
  replace: (element: React.ReactNode | (() => React.ReactNode), onClose?: () => void) => void

  /**
   * Push a dialog onto the stack
   */
  push: (element: React.ReactNode | (() => React.ReactNode), onClose?: () => void) => void

  /**
   * Close the current dialog
   */
  close: () => void

  /**
   * Clear all dialogs
   */
  clear: () => void

  /**
   * Current dialog size
   */
  size: "medium" | "large"

  /**
   * Set dialog size
   */
  setSize: (size: "medium" | "large") => void

  /**
   * Whether any dialog is open
   */
  isOpen: boolean
}

const DialogContext = createContext<DialogContextValue | null>(null)

/**
 * Dialog provider - manages dialog stack
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DialogStackItem[]>([])
  const [size, setSize] = useState<"medium" | "large">("medium")

  // Handle escape key to close dialogs
  useKeyboard((evt) => {
    if (evt.name === "escape" && stack.length > 0) {
      const current = stack[stack.length - 1]
      current?.onClose?.()
      setStack((s) => s.slice(0, -1))
    }
  })

  const replace = useCallback(
    (element: React.ReactNode | (() => React.ReactNode), onClose?: () => void) => {
      // Don't call onClose for existing dialogs - this is a programmatic replacement
      // onClose is only called on user cancellation (ESC, click outside)
      const resolvedElement = typeof element === "function" ? element() : element
      setStack([
        {
          id: Date.now().toString(),
          element: resolvedElement,
          onClose,
        },
      ])
      setSize("medium")
    },
    []
  )

  const push = useCallback(
    (element: React.ReactNode | (() => React.ReactNode), onClose?: () => void) => {
      const resolvedElement = typeof element === "function" ? element() : element
      setStack((s) => [
        ...s,
        {
          id: Date.now().toString(),
          element: resolvedElement,
          onClose,
        },
      ])
    },
    []
  )

  const close = useCallback(() => {
    const current = stack[stack.length - 1]
    current?.onClose?.()
    setStack((s) => s.slice(0, -1))
  }, [stack])

  const clear = useCallback(() => {
    // Don't call onClose here - clear() is for programmatic close after selection
    // onClose is only called on cancel (ESC, click outside) via close()
    setStack([])
    setSize("medium")
  }, [])

  const value: DialogContextValue = {
    replace,
    push,
    close,
    clear,
    size,
    setSize,
    isOpen: stack.length > 0,
  }

  const currentDialog = stack[stack.length - 1]

  return (
    <DialogContext.Provider value={value}>
      {children}
      {currentDialog && (
        <Dialog onClose={clear} size={size}>
          {currentDialog.element}
        </Dialog>
      )}
    </DialogContext.Provider>
  )
}

/**
 * Hook to access dialog context
 */
export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error("useDialog must be used within DialogProvider")
  }
  return context
}
