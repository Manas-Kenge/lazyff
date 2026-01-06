# lazyff

A simple, powerful wrapper around ffmpeg for the terminal.

[![npm version](https://img.shields.io/npm/v/lazyff.svg)](https://www.npmjs.com/package/lazyff)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/Manas-Kenge/lazyff.svg)](https://github.com/Manas-Kenge/lazyff/stargazers)

<p align="center">
  <img src="public/demo.gif" alt="lazyff demo" width="800" />
</p>

## Why lazyff?

ffmpeg is powerful but complex. lazyff makes common operations simple:

| Task             | ffmpeg                                                                                             | lazyff                                    |
| ---------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Convert to MP4   | `ffmpeg -i input.mov -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output.mp4`            | `lazyff convert input.mov output.mp4`     |
| Compress to 25MB | `ffmpeg -i input.mp4 -c:v libx264 -b:v 1.5M -maxrate 2M -bufsize 3M -c:a aac -b:a 128k output.mp4` | `lazyff compress input.mp4 -s 25MB`       |
| Trim video       | `ffmpeg -ss 00:01:00 -i input.mp4 -t 30 -c:v libx264 -c:a aac output.mp4`                          | `lazyff trim input.mp4 -s 00:01:00 -t 30` |
| Create GIF       | `ffmpeg -ss 5 -t 3 -i input.mp4 -vf "fps=15,scale=480:-1" -loop 0 output.gif`                      | `lazyff gif input.mp4 -s 5 -t 3`          |

## Features

- **Simple CLI** - Intuitive commands with sensible defaults
- **Interactive TUI** - Guided terminal interface for media operations
- **Smart presets** - Quality, resolution, and format presets built-in
- **Helpful errors** - Clear messages with actionable suggestions

## Installation

### Prerequisites

- [ffmpeg](https://ffmpeg.org/download.html) - Required for all media operations

### Quick Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/Manas-Kenge/lazyff/main/install.sh | bash
```

### Package Managers

```bash
# Using Bun (recommended)
bun install -g lazyff

# Using npm
npm install -g lazyff

# Using pnpm
pnpm add -g lazyff

# Using yarn
yarn global add lazyff
```

### Verify installation

```bash
lazyff version
```

### Update & Uninstall

```bash
# Check for updates
lazyff update --check

# Update to latest version
lazyff update

# Uninstall
lazyff uninstall
```

## Quick Start

```bash
# Convert video
lazyff convert video.mov video.mp4

# Compress to target size
lazyff compress video.mp4 --target-size 25MB

# Trim video
lazyff trim video.mp4 --start 00:01:00 --duration 30

# Create GIF
lazyff gif video.mp4 --start 5 --duration 3

# Launch interactive TUI
lazyff
```

## Commands

| Command     | Description                                  |
| ----------- | -------------------------------------------- |
| `convert`   | Convert between formats, codecs, resolutions |
| `compress`  | Reduce file size with target size/bitrate    |
| `trim`      | Cut portions of media files                  |
| `merge`     | Concatenate multiple files                   |
| `extract`   | Extract audio, video, or frames              |
| `gif`       | Create animated GIFs                         |
| `thumbnail` | Generate thumbnails or grid previews         |
| `info`      | Display media file information               |

## Documentation

Full documentation available at: **[lazyff.dev](https://lazyff.dev)** _(coming soon)_

- [Quickstart Guide](./packages/docs/quickstart.mdx)
- [Installation](./packages/docs/installation.mdx)
- [Command Reference](./packages/docs/commands/index.mdx)
- [Troubleshooting](./packages/docs/troubleshooting.mdx)

## Development

```bash
# Clone the repository
git clone https://github.com/Manas-Kenge/lazyff.git
cd lazyff

# Install dependencies
bun install

# Run CLI in dev mode
bun run dev

# Run TUI in dev mode
bun run dev:tui

# Build all packages
bun run build
```

## Contributing

Contributions are welcome! See [Contributing Guide](./packages/docs/contributing.mdx) for details.

## License

MIT License - see [LICENSE](./LICENSE) for details.
