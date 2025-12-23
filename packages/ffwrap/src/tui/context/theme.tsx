import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { RGBA } from "@opentui/core"
import { loadConfig, setConfigValue } from "../utils/config"

// Import all theme files
import aura from "./theme/aura.json"
import ayu from "./theme/ayu.json"
import catppuccinMacchiato from "./theme/catppuccin-macchiato.json"
import catppuccin from "./theme/catppuccin.json"
import cobalt2 from "./theme/cobalt2.json"
import dracula from "./theme/dracula.json"
import everforest from "./theme/everforest.json"
import flexoki from "./theme/flexoki.json"
import github from "./theme/github.json"
import gruvbox from "./theme/gruvbox.json"
import kanagawa from "./theme/kanagawa.json"
import material from "./theme/material.json"
import matrix from "./theme/matrix.json"
import mercury from "./theme/mercury.json"
import monokai from "./theme/monokai.json"
import nightowl from "./theme/nightowl.json"
import nord from "./theme/nord.json"
import oneDark from "./theme/one-dark.json"
import opencode from "./theme/opencode.json"
import orng from "./theme/orng.json"
import palenight from "./theme/palenight.json"
import rosepine from "./theme/rosepine.json"
import solarized from "./theme/solarized.json"
import synthwave84 from "./theme/synthwave84.json"
import tokyonight from "./theme/tokyonight.json"
import vercel from "./theme/vercel.json"
import vesper from "./theme/vesper.json"
import zenburn from "./theme/zenburn.json"

/**
 * Theme definition from JSON files
 */
interface ThemeDefinition {
  $schema?: string
  defs: Record<string, string>
  theme: Record<string, { dark: string; light: string } | string>
}

/**
 * Resolved theme colors (RGBA values)
 */
export interface Theme {
  primary: RGBA
  secondary: RGBA
  accent: RGBA
  error: RGBA
  warning: RGBA
  success: RGBA
  info: RGBA
  text: RGBA
  textMuted: RGBA
  background: RGBA
  backgroundPanel: RGBA
  backgroundElement: RGBA
  backgroundMenu: RGBA
  border: RGBA
  borderActive: RGBA
  borderSubtle: RGBA
  selectedListItemText: RGBA
}

/**
 * Available theme names
 */
export const THEME_NAMES = [
  "aura",
  "ayu",
  "catppuccin-macchiato",
  "catppuccin",
  "cobalt2",
  "dracula",
  "everforest",
  "flexoki",
  "github",
  "gruvbox",
  "kanagawa",
  "material",
  "matrix",
  "mercury",
  "monokai",
  "nightowl",
  "nord",
  "one-dark",
  "opencode",
  "orng",
  "palenight",
  "rosepine",
  "solarized",
  "synthwave84",
  "tokyonight",
  "vercel",
  "vesper",
  "zenburn",
] as const

export type ThemeName = (typeof THEME_NAMES)[number]

/**
 * Map of theme names to their definitions
 */
const THEMES: Record<ThemeName, ThemeDefinition> = {
  aura,
  ayu,
  "catppuccin-macchiato": catppuccinMacchiato,
  catppuccin,
  cobalt2,
  dracula,
  everforest,
  flexoki,
  github,
  gruvbox,
  kanagawa,
  material,
  matrix,
  mercury,
  monokai,
  nightowl,
  nord,
  "one-dark": oneDark,
  opencode,
  orng,
  palenight,
  rosepine,
  solarized,
  synthwave84,
  tokyonight,
  vercel,
  vesper,
  zenburn,
} as Record<ThemeName, ThemeDefinition>

/**
 * Resolve a color value from theme definition
 */
function resolveColor(
  value: string | { dark: string; light: string },
  defs: Record<string, string>,
  mode: "dark" | "light"
): RGBA {
  // Get the color key based on mode
  const colorKey = typeof value === "string" ? value : value[mode]

  // Resolve from defs if it's a reference
  const hexColor = defs[colorKey] ?? colorKey

  // Convert hex to RGBA
  return RGBA.fromHex(hexColor)
}

/**
 * Build a resolved theme from a theme definition
 */
function buildTheme(definition: ThemeDefinition, mode: "dark" | "light"): Theme {
  const { defs, theme } = definition

  const resolve = (key: string, fallback?: string): RGBA => {
    const value = theme[key]
    if (value) {
      return resolveColor(value, defs, mode)
    }
    if (fallback && theme[fallback]) {
      return resolveColor(theme[fallback], defs, mode)
    }
    // Return a default gray if not found
    return RGBA.fromHex("#888888")
  }

  return {
    primary: resolve("primary"),
    secondary: resolve("secondary"),
    accent: resolve("accent"),
    error: resolve("error"),
    warning: resolve("warning"),
    success: resolve("success"),
    info: resolve("info"),
    text: resolve("text"),
    textMuted: resolve("textMuted"),
    background: resolve("background"),
    backgroundPanel: resolve("backgroundPanel"),
    backgroundElement: resolve("backgroundElement"),
    backgroundMenu: resolve("backgroundMenu", "backgroundPanel"),
    border: resolve("border"),
    borderActive: resolve("borderActive"),
    borderSubtle: resolve("borderSubtle"),
    selectedListItemText: resolve("selectedListItemText", "background"),
  }
}

/**
 * Get contrasting foreground color for selected items
 */
export function selectedForeground(theme: Theme): RGBA {
  // Use selectedListItemText if available, otherwise calculate contrast
  if (theme.selectedListItemText) {
    return theme.selectedListItemText
  }
  // Default to background color (usually dark) for selected items
  return theme.background
}

/**
 * Convert RGBA to hex string for terminal escape sequences
 */
function rgbaToHex(color: RGBA): string {
  const r = Math.round(color.r * 255)
    .toString(16)
    .padStart(2, "0")
  const g = Math.round(color.g * 255)
    .toString(16)
    .padStart(2, "0")
  const b = Math.round(color.b * 255)
    .toString(16)
    .padStart(2, "0")
  return `${r}${g}${b}`
}

/**
 * Set terminal background color using OSC escape sequence
 * Works on most modern terminals (iTerm2, Kitty, Alacritty, etc.)
 */
function setTerminalBackground(color: RGBA): void {
  const hex = rgbaToHex(color)
  const r = hex.slice(0, 2)
  const g = hex.slice(2, 4)
  const b = hex.slice(4, 6)
  // OSC 11 sets the background color
  // Format: \x1b]11;rgb:RR/GG/BB\x07
  process.stdout.write(`\x1b]11;rgb:${r}/${g}/${b}\x07`)
}

/**
 * Reset terminal background to default
 */
export function resetTerminalBackground(): void {
  // OSC 111 resets the background color to default
  process.stdout.write(`\x1b]111\x07`)
}

/**
 * Theme context value
 */
interface ThemeContextValue {
  theme: Theme
  themeName: ThemeName
  mode: "dark" | "light"
  setTheme: (name: ThemeName) => void
  setThemePreview: (name: ThemeName) => void
  setMode: (mode: "dark" | "light") => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Validate theme name from config
 */
function isValidThemeName(name: string): name is ThemeName {
  return THEME_NAMES.includes(name as ThemeName)
}

/**
 * Load initial theme from config
 */
function getInitialTheme(): { theme: ThemeName; mode: "dark" | "light" } {
  const config = loadConfig()
  const theme = isValidThemeName(config.theme) ? config.theme : "tokyonight"
  const mode = config.mode === "light" ? "light" : "dark"
  return { theme, mode }
}

/**
 * Theme provider component
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Load initial values from config file
  const initial = getInitialTheme()
  const [themeName, setThemeNameState] = useState<ThemeName>(initial.theme)
  const [mode, setModeState] = useState<"dark" | "light">(initial.mode)

  const theme = useMemo(() => {
    const definition = THEMES[themeName]
    return buildTheme(definition, mode)
  }, [themeName, mode])

  // Set terminal background when theme changes
  useEffect(() => {
    setTerminalBackground(theme.background)

    // Cleanup: reset terminal background on unmount
    return () => {
      resetTerminalBackground()
    }
  }, [theme.background])

  // Wrapped setters that also persist to config
  const setTheme = useCallback((name: ThemeName) => {
    setThemeNameState(name)
    setConfigValue("theme", name)
  }, [])

  const setMode = useCallback((newMode: "dark" | "light") => {
    setModeState(newMode)
    setConfigValue("mode", newMode)
  }, [])

  const setThemePreview = useCallback((name: ThemeName) => {
    setThemeNameState(name)
  }, [])

  const value: ThemeContextValue = {
    theme,
    themeName,
    mode,
    setTheme,
    setThemePreview,
    setMode,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

/**
 * Get a theme by name (for preview purposes)
 */
export function getTheme(name: ThemeName, mode: "dark" | "light" = "dark"): Theme {
  const definition = THEMES[name]
  return buildTheme(definition, mode)
}
