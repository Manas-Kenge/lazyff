#!/usr/bin/env bash
#
# lazyff installer script
# https://github.com/Manas-Kenge/lazyff
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Manas-Kenge/lazyff/main/install.sh | bash
#
# Options (via environment variables):
#   VERSION=x.x.x  - Install a specific version (default: latest)
#   INSTALL_DIR=   - Custom installation directory (default: ~/.lazyff/bin)
#
set -euo pipefail

APP="lazyff"
GITHUB_REPO="Manas-Kenge/lazyff"

# Colors
BOLD='\033[1m'
MUTED='\033[0;2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
ORANGE='\033[38;5;214m'
NC='\033[0m' # No Color

# User-configurable options
requested_version=${VERSION:-}
INSTALL_DIR=${INSTALL_DIR:-$HOME/.lazyff/bin}

# ============================================================================
# Helper Functions
# ============================================================================

print_banner() {
    echo -e ""
    echo -e "${CYAN} _                       __  __ ${NC}"
    echo -e "${CYAN}| | __ _  ____ _   _    / _|/ _|${NC}"
    echo -e "${CYAN}| |/ _\` ||_  /| | | |  | |_| |_ ${NC}"
    echo -e "${CYAN}| | (_| | / / | |_| |  |  _|  _|${NC}"
    echo -e "${CYAN}|_|\\__,_|/___| \\__, |  |_| |_|  ${NC}"
    echo -e "${CYAN}               |___/            ${NC}"
    echo -e ""
}

print_message() {
    local level=$1
    local message=$2
    local color=""

    case $level in
        info) color="${NC}" ;;
        success) color="${GREEN}" ;;
        warning) color="${YELLOW}" ;;
        error) color="${RED}" ;;
        muted) color="${MUTED}" ;;
    esac

    echo -e "${color}${message}${NC}"
}

print_step() {
    echo -e "${BLUE}==>${NC} ${BOLD}$1${NC}"
}

# ============================================================================
# Platform Detection
# ============================================================================

detect_platform() {
    local raw_os=$(uname -s)
    os=$(echo "$raw_os" | tr '[:upper:]' '[:lower:]')

    case "$raw_os" in
        Darwin*) os="darwin" ;;
        Linux*) os="linux" ;;
        MINGW*|MSYS*|CYGWIN*) os="windows" ;;
        *)
            print_message error "Unsupported operating system: $raw_os"
            exit 1
            ;;
    esac

    arch=$(uname -m)
    case "$arch" in
        aarch64|arm64) arch="arm64" ;;
        x86_64|amd64) arch="x64" ;;
        *)
            print_message error "Unsupported architecture: $arch"
            exit 1
            ;;
    esac

    # Detect Rosetta 2 on macOS - prefer native arm64
    if [ "$os" = "darwin" ] && [ "$arch" = "x64" ]; then
        rosetta_flag=$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)
        if [ "$rosetta_flag" = "1" ]; then
            print_message muted "Detected Rosetta 2, using native arm64 binary"
            arch="arm64"
        fi
    fi

    # Validate OS/arch combination
    combo="$os-$arch"
    case "$combo" in
        linux-x64|linux-arm64|darwin-x64|darwin-arm64|windows-x64)
            ;;
        *)
            print_message error "Unsupported OS/architecture combination: $os/$arch"
            print_message info "Supported combinations: linux-x64, linux-arm64, darwin-x64, darwin-arm64, windows-x64"
            exit 1
            ;;
    esac
}

detect_musl() {
    is_musl=false

    if [ "$os" != "linux" ]; then
        return
    fi

    # Check for Alpine Linux
    if [ -f /etc/alpine-release ]; then
        is_musl=true
        return
    fi

    # Check ldd version for musl
    if command -v ldd >/dev/null 2>&1; then
        if ldd --version 2>&1 | grep -qi musl; then
            is_musl=true
        fi
    fi
}

build_target() {
    target="$os-$arch"

    # musl suffix only applies to linux-x64
    if [ "$is_musl" = "true" ] && [ "$os" = "linux" ] && [ "$arch" = "x64" ]; then
        target="$target-musl"
    fi
}

# ============================================================================
# Dependency Checks
# ============================================================================

check_commands() {
    local missing=()

    if ! command -v curl >/dev/null 2>&1; then
        missing+=("curl")
    fi

    if [ "$os" = "linux" ]; then
        if ! command -v tar >/dev/null 2>&1; then
            missing+=("tar")
        fi
    else
        if ! command -v unzip >/dev/null 2>&1; then
            missing+=("unzip")
        fi
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        print_message error "Missing required commands: ${missing[*]}"
        print_message info "Please install them and try again."
        exit 1
    fi
}

check_ffmpeg() {
    print_step "Checking for ffmpeg..."

    if command -v ffmpeg >/dev/null 2>&1; then
        local version=$(ffmpeg -version 2>&1 | head -n1 | sed 's/ffmpeg version \([^ ]*\).*/\1/')
        print_message success "  Found ffmpeg $version"
        return 0
    fi

    print_message warning "  ffmpeg is not installed"
    echo ""
    print_message info "lazyff requires ffmpeg to function. Install it using:"
    echo ""

    case "$os" in
        darwin)
            echo "  ${BOLD}macOS (Homebrew):${NC}"
            echo "    brew install ffmpeg"
            ;;
        linux)
            echo "  ${BOLD}Ubuntu/Debian:${NC}"
            echo "    sudo apt update && sudo apt install ffmpeg"
            echo ""
            echo "  ${BOLD}Fedora:${NC}"
            echo "    sudo dnf install ffmpeg"
            echo ""
            echo "  ${BOLD}Arch Linux:${NC}"
            echo "    sudo pacman -S ffmpeg"
            echo ""
            echo "  ${BOLD}Alpine Linux:${NC}"
            echo "    apk add ffmpeg"
            ;;
        windows)
            echo "  ${BOLD}Windows (Chocolatey):${NC}"
            echo "    choco install ffmpeg"
            echo ""
            echo "  ${BOLD}Windows (Winget):${NC}"
            echo "    winget install ffmpeg"
            echo ""
            echo "  ${BOLD}Windows (Scoop):${NC}"
            echo "    scoop install ffmpeg"
            ;;
    esac

    echo ""
    print_message muted "For more information: https://ffmpeg.org/download.html"
    echo ""
    print_message info "Continuing with lazyff installation..."
    echo ""

    return 1
}

# ============================================================================
# Version Management
# ============================================================================

get_latest_version() {
    local version
    version=$(curl -s "https://api.github.com/repos/${GITHUB_REPO}/releases/latest" | \
        sed -n 's/.*"tag_name": *"v\([^"]*\)".*/\1/p')

    if [ -z "$version" ]; then
        print_message error "Failed to fetch latest version from GitHub"
        exit 1
    fi

    echo "$version"
}

check_installed_version() {
    if command -v lazyff >/dev/null 2>&1; then
        local lazyff_path=$(which lazyff)
        # Parse version from "lazyff: X.X.X" format
        local installed_version=$(lazyff version 2>/dev/null | head -n1 | sed 's/lazyff: *//')

        if [ -n "$installed_version" ]; then
            print_message muted "Installed version: $installed_version"

            if [ "$installed_version" = "$specific_version" ]; then
                print_message success "Version $specific_version is already installed"
                exit 0
            fi
        fi
    fi
}

# ============================================================================
# Download & Install
# ============================================================================

unbuffered_sed() {
    if echo | sed -u -e "" >/dev/null 2>&1; then
        sed -nu "$@"
    elif echo | sed -l -e "" >/dev/null 2>&1; then
        sed -nl "$@"
    else
        local pad="$(printf "\n%512s" "")"
        sed -ne "s/$/\\${pad}/" "$@"
    fi
}

print_progress() {
    local bytes="$1"
    local length="$2"
    [ "$length" -gt 0 ] || return 0

    local width=50
    local percent=$(( bytes * 100 / length ))
    [ "$percent" -gt 100 ] && percent=100
    local on=$(( percent * width / 100 ))
    local off=$(( width - on ))

    local filled=$(printf "%*s" "$on" "")
    filled=${filled// /#}
    local empty=$(printf "%*s" "$off" "")
    empty=${empty// /-}

    printf "\r  ${CYAN}[%s%s] %3d%%${NC}" "$filled" "$empty" "$percent" >&4
}

download_with_progress() {
    local url="$1"
    local output="$2"

    if [ -t 2 ]; then
        exec 4>&2
    else
        exec 4>/dev/null
    fi

    local tmp_dir=${TMPDIR:-/tmp}
    local basename="${tmp_dir}/${APP}_install_$$"
    local tracefile="${basename}.trace"

    rm -f "$tracefile"
    mkfifo "$tracefile"

    # Hide cursor
    printf "\033[?25l" >&4

    trap "trap - RETURN; rm -f \"$tracefile\"; printf '\033[?25h' >&4; exec 4>&-" RETURN

    (
        curl --trace-ascii "$tracefile" -s -L -o "$output" "$url"
    ) &
    local curl_pid=$!

    unbuffered_sed \
        -e 'y/ACDEGHLNORTV/acdeghlnortv/' \
        -e '/^0000: content-length:/p' \
        -e '/^<= recv data/p' \
        "$tracefile" | \
    {
        local length=0
        local bytes=0

        while IFS=" " read -r -a line; do
            [ "${#line[@]}" -lt 2 ] && continue
            local tag="${line[0]} ${line[1]}"

            if [ "$tag" = "0000: content-length:" ]; then
                length="${line[2]}"
                length=$(echo "$length" | tr -d '\r')
                bytes=0
            elif [ "$tag" = "<= recv" ]; then
                local size="${line[3]}"
                bytes=$(( bytes + size ))
                if [ "$length" -gt 0 ]; then
                    print_progress "$bytes" "$length"
                fi
            fi
        done
    }

    wait $curl_pid
    local ret=$?
    echo "" >&4
    return $ret
}

download_and_install() {
    local archive_ext=".zip"
    if [ "$os" = "linux" ]; then
        archive_ext=".tar.gz"
    fi

    local filename="${APP}-${target}${archive_ext}"
    local url

    if [ -z "$requested_version" ]; then
        url="https://github.com/${GITHUB_REPO}/releases/latest/download/${filename}"
    else
        url="https://github.com/${GITHUB_REPO}/releases/download/v${requested_version}/${filename}"
    fi

    print_step "Downloading lazyff ${specific_version} for ${target}..."

    local tmp_dir="${TMPDIR:-/tmp}/${APP}_install_$$"
    mkdir -p "$tmp_dir"

    # Try progress download, fall back to standard curl
    if [[ "$os" == "windows" ]] || ! [ -t 2 ] || ! download_with_progress "$url" "$tmp_dir/$filename"; then
        curl -# -L -o "$tmp_dir/$filename" "$url" || {
            print_message error "Failed to download lazyff"
            print_message info "URL: $url"
            rm -rf "$tmp_dir"
            exit 1
        }
    fi

    print_step "Installing to ${INSTALL_DIR}..."

    mkdir -p "$INSTALL_DIR"

    if [ "$os" = "linux" ]; then
        tar -xzf "$tmp_dir/$filename" -C "$tmp_dir"
    else
        unzip -q "$tmp_dir/$filename" -d "$tmp_dir"
    fi

    if [ "$os" = "windows" ]; then
        if [ -f "$tmp_dir/lazyff.exe" ]; then
            mv "$tmp_dir/lazyff.exe" "$INSTALL_DIR/"
            chmod 755 "${INSTALL_DIR}/lazyff.exe"
            print_message success "  Installed to ${INSTALL_DIR}/lazyff.exe"
        else
            print_message error "Binary not found in archive (expected lazyff.exe)"
            rm -rf "$tmp_dir"
            exit 1
        fi
    else
        # Unix binary (no extension)
        if [ -f "$tmp_dir/lazyff" ]; then
            mv "$tmp_dir/lazyff" "$INSTALL_DIR/"
        elif [ -f "$tmp_dir/${APP}" ]; then
            mv "$tmp_dir/${APP}" "$INSTALL_DIR/"
        else
            print_message error "Binary not found in archive"
            rm -rf "$tmp_dir"
            exit 1
        fi
        chmod 755 "${INSTALL_DIR}/lazyff"
        print_message success "  Installed to ${INSTALL_DIR}/lazyff"
    fi

    rm -rf "$tmp_dir"
}

# ============================================================================
# PATH Configuration
# ============================================================================

add_to_path() {
    local config_file=$1
    local command=$2

    if grep -Fxq "$command" "$config_file" 2>/dev/null; then
        print_message muted "  PATH already configured in $config_file"
        return
    fi

    if [[ -w $config_file ]]; then
        echo -e "\n# lazyff" >> "$config_file"
        echo "$command" >> "$config_file"
        print_message success "  Added to PATH in $config_file"
    else
        print_message warning "  Could not write to $config_file"
        print_message info "  Manually add: $command"
    fi
}

configure_path() {
    # Skip if already in PATH
    if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then
        print_message muted "  ${INSTALL_DIR} already in PATH"
        return
    fi

    print_step "Configuring PATH..."

    local XDG_CONFIG_HOME=${XDG_CONFIG_HOME:-$HOME/.config}
    local current_shell=$(basename "$SHELL")
    local config_files=""
    local config_file=""

    case $current_shell in
        fish)
            config_files="$HOME/.config/fish/config.fish"
            ;;
        zsh)
            config_files="$HOME/.zshrc $HOME/.zshenv $XDG_CONFIG_HOME/zsh/.zshrc"
            ;;
        bash)
            config_files="$HOME/.bashrc $HOME/.bash_profile $HOME/.profile"
            ;;
        ash|sh)
            config_files="$HOME/.profile /etc/profile"
            ;;
        *)
            config_files="$HOME/.bashrc $HOME/.bash_profile $HOME/.profile"
            ;;
    esac

    # Find existing config file
    for file in $config_files; do
        if [[ -f $file ]]; then
            config_file=$file
            break
        fi
    done

    if [[ -z $config_file ]]; then
        # Create default config file
        case $current_shell in
            fish) config_file="$HOME/.config/fish/config.fish" ;;
            zsh) config_file="$HOME/.zshrc" ;;
            *) config_file="$HOME/.bashrc" ;;
        esac
        touch "$config_file" 2>/dev/null || true
    fi

    # Add PATH export
    case $current_shell in
        fish)
            add_to_path "$config_file" "fish_add_path $INSTALL_DIR"
            ;;
        *)
            add_to_path "$config_file" "export PATH=\"$INSTALL_DIR:\$PATH\""
            ;;
    esac

    # Handle GitHub Actions
    if [ -n "${GITHUB_ACTIONS-}" ] && [ "${GITHUB_ACTIONS}" == "true" ]; then
        echo "$INSTALL_DIR" >> "$GITHUB_PATH"
        print_message info "  Added to \$GITHUB_PATH"
    fi
}

# ============================================================================
# Success Message
# ============================================================================

print_success() {
    echo ""
    print_banner
    print_message success "lazyff ${specific_version} installed successfully!"
    echo ""

    local ffmpeg_missing=false
    if ! command -v ffmpeg >/dev/null 2>&1; then
        ffmpeg_missing=true
    fi

    if [ "$ffmpeg_missing" = "true" ]; then
        print_message warning "Remember to install ffmpeg before using lazyff"
        echo ""
    fi

    echo -e "${MUTED}To get started:${NC}"
    echo ""

    # Check if we need to reload shell
    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        local current_shell=$(basename "$SHELL")
        case $current_shell in
            fish)
                echo -e "  source ~/.config/fish/config.fish  ${MUTED}# Reload shell config${NC}"
                ;;
            zsh)
                echo -e "  source ~/.zshrc  ${MUTED}# Reload shell config${NC}"
                ;;
            *)
                echo -e "  source ~/.bashrc  ${MUTED}# Reload shell config${NC}"
                ;;
        esac
    fi

    echo -e "  cd <project>     ${MUTED}# Navigate to your project${NC}"
    echo -e "  lazyff           ${MUTED}# Launch interactive TUI${NC}"
    echo ""
    echo -e "${MUTED}Or use CLI commands directly:${NC}"
    echo ""
    echo -e "  lazyff convert video.mov video.mp4"
    echo -e "  lazyff compress video.mp4 --target-size 25MB"
    echo -e "  lazyff --help"
    echo ""
    echo -e "${MUTED}Documentation: https://github.com/${GITHUB_REPO}${NC}"
    echo ""
}

# ============================================================================
# Main
# ============================================================================

main() {
    print_banner

    # Detect platform
    print_step "Detecting platform..."
    detect_platform
    detect_musl
    build_target
    print_message success "  Detected: ${target}"

    # Check dependencies
    check_commands

    # Check ffmpeg (warn but don't fail)
    check_ffmpeg || true

    # Determine version
    print_step "Fetching version info..."
    if [ -z "$requested_version" ]; then
        specific_version=$(get_latest_version)
        print_message success "  Latest version: ${specific_version}"
    else
        specific_version=$requested_version
        print_message success "  Requested version: ${specific_version}"
    fi

    # Check if already installed
    check_installed_version

    # Download and install
    download_and_install

    # Configure PATH
    configure_path

    # Done!
    print_success
}

main "$@"
