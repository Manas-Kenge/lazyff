/**
 * Format presets - Maps output formats to optimal codec configurations
 */
export const FORMAT_PRESETS = {
  mp4: {
    container: "mp4",
    videoCodec: "libx264",
    audioCodec: "aac",
    extension: "mp4",
    description: "Most compatible format (H.264 + AAC)",
  },
  webm: {
    container: "webm",
    videoCodec: "libvpx-vp9",
    audioCodec: "libopus",
    extension: "webm",
    description: "Web-optimized format (VP9 + Opus)",
  },
  mkv: {
    container: "matroska",
    videoCodec: "libx264",
    audioCodec: "aac",
    extension: "mkv",
    description: "Flexible container (H.264 + AAC)",
  },
  mov: {
    container: "mov",
    videoCodec: "libx264",
    audioCodec: "aac",
    extension: "mov",
    description: "Apple QuickTime format",
  },
  gif: {
    container: "gif",
    videoCodec: "gif",
    audioCodec: null,
    extension: "gif",
    description: "Animated GIF (no audio)",
  },
  mp3: {
    container: "mp3",
    videoCodec: null,
    audioCodec: "libmp3lame",
    extension: "mp3",
    description: "MP3 audio",
  },
  wav: {
    container: "wav",
    videoCodec: null,
    audioCodec: "pcm_s16le",
    extension: "wav",
    description: "Uncompressed audio",
  },
  flac: {
    container: "flac",
    videoCodec: null,
    audioCodec: "flac",
    extension: "flac",
    description: "Lossless audio",
  },
  ogg: {
    container: "ogg",
    videoCodec: null,
    audioCodec: "libvorbis",
    extension: "ogg",
    description: "Ogg Vorbis audio",
  },
  avi: {
    container: "avi",
    videoCodec: "libx264",
    audioCodec: "libmp3lame",
    extension: "avi",
    description: "Legacy AVI format",
  },
  ts: {
    container: "mpegts",
    videoCodec: "libx264",
    audioCodec: "aac",
    extension: "ts",
    description: "MPEG Transport Stream",
  },
} as const

export type FormatPreset = keyof typeof FORMAT_PRESETS

/**
 * Quality presets - Human-readable quality levels
 */
export const QUALITY_PRESETS = {
  low: {
    crf: 28,
    preset: "fast",
    audioBitrate: "96k",
    description: "Smaller file, lower quality",
  },
  medium: {
    crf: 23,
    preset: "medium",
    audioBitrate: "128k",
    description: "Balanced quality and size",
  },
  high: {
    crf: 18,
    preset: "slow",
    audioBitrate: "192k",
    description: "Better quality, larger file",
  },
  lossless: {
    crf: 0,
    preset: "veryslow",
    audioBitrate: "320k",
    description: "Best quality, largest file",
  },
} as const

export type QualityPreset = keyof typeof QUALITY_PRESETS

/**
 * Resolution presets - Common video resolutions
 */
export const RESOLUTION_PRESETS = {
  "360p": { width: 640, height: 360, description: "Low (360p)" },
  "480p": { width: 854, height: 480, description: "SD (480p)" },
  "720p": { width: 1280, height: 720, description: "HD (720p)" },
  "1080p": { width: 1920, height: 1080, description: "Full HD (1080p)" },
  "1440p": { width: 2560, height: 1440, description: "2K (1440p)" },
  "4k": { width: 3840, height: 2160, description: "4K UHD" },
} as const

export type ResolutionPreset = keyof typeof RESOLUTION_PRESETS

/**
 * Video codec aliases - Human-readable names to ffmpeg codec names
 */
export const VIDEO_CODECS = {
  h264: "libx264",
  x264: "libx264",
  h265: "libx265",
  x265: "libx265",
  hevc: "libx265",
  vp8: "libvpx",
  vp9: "libvpx-vp9",
  av1: "libaom-av1",
  copy: "copy",
} as const

export type VideoCodec = keyof typeof VIDEO_CODECS

/**
 * Audio codec aliases - Human-readable names to ffmpeg codec names
 */
export const AUDIO_CODECS = {
  aac: "aac",
  mp3: "libmp3lame",
  opus: "libopus",
  vorbis: "libvorbis",
  flac: "flac",
  wav: "pcm_s16le",
  copy: "copy",
} as const

export type AudioCodec = keyof typeof AUDIO_CODECS

/**
 * Media file extensions categorized by type
 */
export const MEDIA_EXTENSIONS = {
  video: ["mp4", "mkv", "mov", "avi", "webm", "flv", "wmv", "m4v", "mpg", "mpeg", "ts", "3gp"],
  audio: ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "opus"],
  image: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff", "svg"],
} as const

/**
 * Get media type from file extension
 */
export function getMediaType(extension: string): "video" | "audio" | "image" | null {
  const ext = extension.toLowerCase().replace(".", "")
  if (MEDIA_EXTENSIONS.video.includes(ext as any)) return "video"
  if (MEDIA_EXTENSIONS.audio.includes(ext as any)) return "audio"
  if (MEDIA_EXTENSIONS.image.includes(ext as any)) return "image"
  return null
}

/**
 * Check if a codec supports CRF quality control
 */
export function supportsCrf(codec: string): boolean {
  return ["libx264", "libx265", "libvpx-vp9", "libaom-av1"].includes(codec)
}
