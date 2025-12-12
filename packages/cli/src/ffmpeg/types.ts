export interface VideoCodec {
  name: string
  description: string
}

export interface AudioCodec {
  name: string
  description: string
}

export interface OutputFormat {
  name: string
  extension: string
  description: string
}

export interface EncodingPreset {
  name: string
  description: string
  videoCodec?: string
  audioCodec?: string
  videoBitrate?: string
  audioBitrate?: string
  crf?: number
  preset?: string
}

export interface EncodingProgress {
  frame: number
  fps: number
  time: string
  bitrate: string
  speed: string
  percent?: number
}
