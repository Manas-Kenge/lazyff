// FFmpeg utilities
export {
  checkFfmpeg,
  checkFfprobe,
  getFfmpegVersion,
  getFfprobeVersion,
  runFfmpeg,
  runFfprobe,
  getMediaInfo,
  type FfmpegResult,
  type MediaInfo,
} from "./ffmpeg/index"

// FFmpeg presets and types
export {
  FORMAT_PRESETS,
  QUALITY_PRESETS,
  RESOLUTION_PRESETS,
  VIDEO_CODECS,
  AUDIO_CODECS,
  MEDIA_EXTENSIONS,
  getMediaType,
  supportsCrf,
  type FormatPreset,
  type QualityPreset,
  type ResolutionPreset,
  type VideoCodec,
  type AudioCodec,
} from "./ffmpeg/presets"

// FFmpeg argument builder
export {
  buildConvertArgs,
  formatTime,
  formatSize,
  type ConvertOptions,
  type BuildResult,
} from "./ffmpeg/builder"

// Error handling
export {
  formatError,
  parseError,
  isOverwriteError,
  isCodecError,
  isFileNotFoundError,
} from "./ffmpeg/errors"

// Types
export * from "./ffmpeg/types"

// Commands - programmatic functions for TUI usage
export { convert, info, trim, compress, extract, merge, gif, thumbnail } from "./commands/index.ts"

// Command types
export type {
  TrimOptions,
  CompressOptions,
  ExtractOptions,
  MergeOptions,
  GifOptions,
  ThumbnailOptions,
} from "./commands/index.ts"
