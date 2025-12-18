# ffwrap

A simple, powerful wrapper around ffmpeg for the terminal.

[![npm version](https://img.shields.io/npm/v/@ffwrap/cli.svg)](https://www.npmjs.com/package/@ffwrap/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/Manas-Kenge/ffwrap.svg)](https://github.com/Manas-Kenge/ffwrap/stargazers)

<p align="center">
  <img src="docs/images/demo.gif" alt="ffwrap demo" width="600">
</p>

## Why ffwrap?

ffmpeg is powerful but complex. ffwrap makes common operations simple:

| Task | ffmpeg | ffwrap |
|------|--------|--------|
| Convert to MP4 | `ffmpeg -i input.mov -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output.mp4` | `ffwrap convert input.mov output.mp4` |
| Compress to 25MB | `ffmpeg -i input.mp4 -c:v libx264 -b:v 1.5M -maxrate 2M -bufsize 3M -c:a aac -b:a 128k output.mp4` | `ffwrap compress input.mp4 -s 25MB` |
| Trim video | `ffmpeg -ss 00:01:00 -i input.mp4 -t 30 -c:v libx264 -c:a aac output.mp4` | `ffwrap trim input.mp4 -s 00:01:00 -t 30` |
| Create GIF | `ffmpeg -ss 5 -t 3 -i input.mp4 -vf "fps=15,scale=480:-1" -loop 0 output.gif` | `ffwrap gif input.mp4 -s 5 -t 3` |

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
curl -fsSL https://raw.githubusercontent.com/Manas-Kenge/ffwrap/main/install.sh | bash
```

### Package Managers

```bash
# Using Bun (recommended)
bun install -g @ffwrap/cli

# Using npm
npm install -g @ffwrap/cli

# Using pnpm
pnpm add -g @ffwrap/cli

# Using yarn
yarn global add @ffwrap/cli
```

### Verify installation

```bash
ffwrap version
```

### Update & Uninstall

```bash
# Check for updates
ffwrap update --check

# Update to latest version
ffwrap update

# Uninstall
ffwrap uninstall
```

## Quick Start

```bash
# Convert video
ffwrap convert video.mov video.mp4

# Compress to target size
ffwrap compress video.mp4 --target-size 25MB

# Trim video
ffwrap trim video.mp4 --start 00:01:00 --duration 30

# Create GIF
ffwrap gif video.mp4 --start 5 --duration 3

# Launch interactive TUI
ffwrap
```

## Commands

| Command | Description |
|---------|-------------|
| `convert` | Convert between formats, codecs, resolutions |
| `compress` | Reduce file size with target size/bitrate |
| `trim` | Cut portions of media files |
| `merge` | Concatenate multiple files |
| `extract` | Extract audio, video, or frames |
| `gif` | Create animated GIFs |
| `thumbnail` | Generate thumbnails or grid previews |
| `info` | Display media file information |

## Documentation

Full documentation available at: **[ffwrap.dev](https://ffwrap.dev)** *(coming soon)*

- [Quickstart Guide](./packages/docs/quickstart.mdx)
- [Installation](./packages/docs/installation.mdx)
- [Command Reference](./packages/docs/commands/index.mdx)
- [Troubleshooting](./packages/docs/troubleshooting.mdx)

## Development

```bash
# Clone the repository
git clone https://github.com/Manas-Kenge/ffwrap.git
cd ffwrap

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
