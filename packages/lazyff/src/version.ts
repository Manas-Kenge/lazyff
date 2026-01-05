/**
 * Version management for lazyff CLI
 *
 * Version resolution priority:
 * 1. LAZYFF_VERSION env var (injected at build time for compiled binaries)
 * 2. package.json version (for development)
 * 3. Fallback "0.0.0-dev"
 */

import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { readFileSync } from "fs"

/**
 * Get version from package.json (for development and npm package)
 */
function getPackageVersion(): string | null {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const packagePath = resolve(__dirname, "../package.json")
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8")) as { version?: string }
    return packageJson.version ?? null
  } catch {
    return null
  }
}

/**
 * Get version with priority:
 * 1. LAZYFF_VERSION env (set at compile time via --define)
 * 2. package.json (development)
 * 3. Fallback
 */
function resolveVersion(): string {
  // Check for build-time injected version
  if (typeof process !== "undefined" && process.env.LAZYFF_VERSION) {
    return process.env.LAZYFF_VERSION
  }

  // Try package.json for development
  const pkgVersion = getPackageVersion()
  if (pkgVersion) {
    return pkgVersion
  }

  return "0.0.0-dev"
}

/** Current lazyff version */
export const VERSION = resolveVersion()

/** GitHub repository for releases */
export const GITHUB_REPO = "Manas-Kenge/lazyff"

/** Install directory for curl-based installation */
export const INSTALL_DIR = ".lazyff/bin"

/**
 * Get version information for display
 */
export function getVersionInfo(): { version: string; repo: string } {
  return {
    version: VERSION,
    repo: GITHUB_REPO,
  }
}

/**
 * Get the latest release version from GitHub
 */
export async function getLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
    if (!response.ok) return null
    const data = (await response.json()) as { tag_name?: string }
    const tagName = data.tag_name
    // Remove 'v' prefix if present
    return tagName?.startsWith("v") ? tagName.slice(1) : (tagName ?? null)
  } catch {
    return null
  }
}

/**
 * Compare two semver versions
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number)
  const partsB = b.split(".").map(Number)

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    if (numA > numB) return 1
    if (numA < numB) return -1
  }
  return 0
}

/**
 * Check if an update is available
 */
export async function checkForUpdate(): Promise<{
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string | null
}> {
  const latestVersion = await getLatestVersion()
  const hasUpdate = latestVersion !== null && compareVersions(latestVersion, VERSION) > 0

  return {
    hasUpdate,
    currentVersion: VERSION,
    latestVersion,
  }
}
