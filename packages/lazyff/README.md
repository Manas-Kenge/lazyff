# lazyff

A simple, powerful wrapper around ffmpeg for the terminal.

[![npm version](https://img.shields.io/npm/v/lazyff.svg)](https://www.npmjs.com/package/lazyff)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## Why lazyff?

ffmpeg is powerful but complex. lazyff makes common operations simple:

| Task           | lazyff Command                            |
| :------------- | :---------------------------------------- |
| **Convert**    | `lazyff convert input.mov output.mp4`     |
| **Compress**   | `lazyff compress input.mp4 -s 25MB`       |
| **Trim**       | `lazyff trim input.mp4 -s 00:01:00 -t 30` |
| **Create GIF** | `lazyff gif input.mp4 -s 5 -t 3`          |

## Features

- **Simple CLI** - Intuitive commands with sensible defaults.
- **Interactive TUI** - Guided terminal interface for media operations.
- **Smart presets** - Quality, resolution, and format presets built-in.
- **Cross-platform** - Supports Linux, macOS, and Windows.

## Installation

### Prerequisites

- [ffmpeg](https://ffmpeg.org/download.html) - Required for all media operations.

### Install via npm

```bash
npm install -g lazyff
```

### Install via Bun

```bash
bun install -g lazyff
```

## Quick Start

```bash
# Launch interactive TUI
lazyff

# Convert video
lazyff convert video.mov video.mp4

# Compress to target size
lazyff compress video.mp4 --target-size 25MB
```

## License

MIT License - see [LICENSE](https://github.com/Manas-Kenge/lazyff) for details.
