/**
 * Version management for ffwrap CLI
 * Reads version from package.json at runtime for development
 * and uses embedded version for compiled binaries
 */

import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

/** Current ffwrap version */
export const VERSION = "0.1.0"

/** GitHub repository for releases */
export const GITHUB_REPO = "Manas-Kenge/ffwrap"

/** Install directory for curl-based installation */
export const INSTALL_DIR = ".ffwrap/bin"

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
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
    )
    if (!response.ok) return null
    const data = (await response.json()) as { tag_name?: string }
    const tagName = data.tag_name
    // Remove 'v' prefix if present
    return tagName?.startsWith("v") ? tagName.slice(1) : tagName ?? null
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
  const hasUpdate =
    latestVersion !== null && compareVersions(latestVersion, VERSION) > 0

  return {
    hasUpdate,
    currentVersion: VERSION,
    latestVersion,
  }
}
