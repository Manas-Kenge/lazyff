import fs from "fs"
import path from "path"
import os from "os"

/**
 * Config file structure
 */
export interface Config {
  theme: string
  mode: "dark" | "light"
}

/**
 * Default config values
 */
const DEFAULT_CONFIG: Config = {
  theme: "tokyonight",
  mode: "dark",
}

/**
 * Get the config directory path
 */
function getConfigDir(): string {
  const homeDir = os.homedir()
  return path.join(homeDir, ".config", "ffwrap")
}

/**
 * Get the config file path
 */
function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json")
}

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  const configDir = getConfigDir()
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }
}

/**
 * Load config from file
 * Returns default config if file doesn't exist or is invalid
 */
export function loadConfig(): Config {
  try {
    const configPath = getConfigPath()
    if (!fs.existsSync(configPath)) {
      return { ...DEFAULT_CONFIG }
    }

    const content = fs.readFileSync(configPath, "utf-8")
    const parsed = JSON.parse(content)

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * Save config to file
 */
export function saveConfig(config: Partial<Config>): void {
  try {
    ensureConfigDir()

    const currentConfig = loadConfig()
    const newConfig = { ...currentConfig, ...config }

    const configPath = getConfigPath()
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf-8")
  } catch (error) {
    // Silently fail - config persistence is not critical
    console.error("Failed to save config:", error)
  }
}

/**
 * Get a specific config value
 */
export function getConfigValue<K extends keyof Config>(key: K): Config[K] {
  const config = loadConfig()
  return config[key]
}

/**
 * Set a specific config value
 */
export function setConfigValue<K extends keyof Config>(key: K, value: Config[K]): void {
  saveConfig({ [key]: value })
}
