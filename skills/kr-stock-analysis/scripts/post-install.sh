#!/usr/bin/env sh
set -eu

SKILL_DIR=${1:-${SKILL_INSTALL_TARGET:-}}
if [ -z "$SKILL_DIR" ]; then
    SKILL_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
fi

FONT_PATH="$SKILL_DIR/assets/fonts/NotoSansKR-Regular.ttf"
HELPER_PATH="$SKILL_DIR/scripts/render-text-mask.py"

has_pillow() {
    command -v python3 >/dev/null 2>&1 && python3 -c 'from PIL import Image, ImageDraw, ImageFont' >/dev/null 2>&1
}

install_pillow_linux() {
    if [ "$(uname -s)" != "Linux" ] || [ "${SKILL_INSTALL_SKIP_LINUX_DEPS:-0}" = "1" ]; then
        return 1
    fi

    if command -v apt-get >/dev/null 2>&1; then
        if command -v sudo >/dev/null 2>&1; then
            if sudo -n true >/dev/null 2>&1; then
                sudo apt-get update && sudo apt-get install -y python3-pil && return 0
            fi
            if [ -t 0 ]; then
                echo "python3-pil is required for Korean chart text rendering." >&2
                echo "sudo may ask for your password to install it." >&2
                sudo apt-get update && sudo apt-get install -y python3-pil && return 0
            fi
        fi
        if [ "$(id -u)" = "0" ]; then
            apt-get update && apt-get install -y python3-pil && return 0
        fi
    fi

    if command -v python3 >/dev/null 2>&1 && python3 -m pip --version >/dev/null 2>&1; then
        python3 -m pip install --user Pillow && return 0
    fi

    return 1
}

if [ ! -f "$FONT_PATH" ]; then
    echo "[font] external=false path=$FONT_PATH reason=bundled-font-missing" >&2
    exit 1
fi

if ! has_pillow; then
    if ! install_pillow_linux || ! has_pillow; then
        echo "[font] external=false path=$FONT_PATH reason=pillow-missing" >&2
        echo "Manual recovery: install python3-pil or run python3 -m pip install --user Pillow" >&2
        exit 1
    fi
fi

if ! python3 "$HELPER_PATH" --font-path "$FONT_PATH" --font-size 18 --text "한국" >/dev/null; then
    echo "[font] external=false path=$FONT_PATH reason=font-found-but-helper-failed" >&2
    exit 1
fi

echo "[font] external=true path=$FONT_PATH"
