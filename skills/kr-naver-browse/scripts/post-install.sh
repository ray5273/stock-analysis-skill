#!/usr/bin/env sh
set -eu

SKILL_DIR=${1:-${SKILL_INSTALL_TARGET:-}}
if [ -z "$SKILL_DIR" ]; then
    SKILL_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
fi
CODEX_HOME_DIR=${CODEX_HOME:-$HOME/.codex}
BROWSE_DIST_DIR="$SKILL_DIR/vendor/gstack/browse/dist"
BROWSE_BIN="$BROWSE_DIST_DIR/browse"

find_bun() {
    export PATH="$HOME/.bun/bin:$PATH"
    command -v bun 2>/dev/null || true
}

compile_smoke_test() {
    bun_bin=$(find_bun)
    if [ -z "$bun_bin" ]; then
        return 1
    fi
    tmpdir=$(mktemp -d)
    printf 'console.log("ok")\n' > "$tmpdir/smoke.ts"
    if "$bun_bin" build --compile "$tmpdir/smoke.ts" --outfile "$tmpdir/smoke" >/dev/null 2>&1 &&
        "$tmpdir/smoke" >/dev/null 2>&1
    then
        rc=0
    else
        rc=1
    fi
    rm -rf "$tmpdir"
    return "$rc"
}

is_binary_runtime() {
    candidate=$1
    if [ -z "$candidate" ] || [ ! -x "$candidate" ]; then
        return 1
    fi
    "$candidate" --help 2>/dev/null | grep -Eqi 'gstack|browse'
}

run_binary_smoke() {
    candidate=$1
    state_root=$(mktemp -d)
    mkdir -p "$state_root/.gstack"
    if BROWSE_STATE_FILE="$state_root/.gstack/browse.json" "$candidate" goto "https://example.com" >/dev/null 2>&1; then
        BROWSE_STATE_FILE="$state_root/.gstack/browse.json" "$candidate" stop >/dev/null 2>&1 || true
        rm -rf "$state_root"
        return 0
    fi
    BROWSE_STATE_FILE="$state_root/.gstack/browse.json" "$candidate" restart >/dev/null 2>&1 || \
        BROWSE_STATE_FILE="$state_root/.gstack/browse.json" "$candidate" stop >/dev/null 2>&1 || true
    if BROWSE_STATE_FILE="$state_root/.gstack/browse.json" "$candidate" goto "https://example.com" >/dev/null 2>&1; then
        BROWSE_STATE_FILE="$state_root/.gstack/browse.json" "$candidate" stop >/dev/null 2>&1 || true
        rm -rf "$state_root"
        return 0
    fi
    rm -rf "$state_root"
    return 1
}

is_codex_mac_target() {
    case "$(uname -s)" in
        Darwin) ;;
        *)
            return 1
            ;;
    esac

    if [ "${SKILL_INSTALL_FORCE_CODEX_MAC:-0}" = "1" ]; then
        return 0
    fi

    case "$SKILL_DIR" in
        "$CODEX_HOME_DIR"/skills/*) return 0 ;;
    esac

    return 1
}

should_force_codex_mac_wrapper() {
    case "$(uname -s)" in
        Darwin) ;;
        *)
            return 1
            ;;
    esac

    [ "${SKILL_INSTALL_FORCE_CODEX_MAC:-0}" = "1" ]
}

install_codex_mac_wrapper() {
    bun_bin=$(find_bun)
    if [ -z "$bun_bin" ] || [ ! -x "$bun_bin" ]; then
        echo "Cannot create Codex macOS browse wrapper: bun executable not found." >&2
        return 1
    fi

    gstack_root="$SKILL_DIR/vendor/gstack"
    cli_path="$gstack_root/browse/src/cli.ts"
    if [ ! -f "$cli_path" ]; then
        echo "Cannot create Codex macOS browse wrapper: missing $cli_path" >&2
        return 1
    fi

    mkdir -p "$BROWSE_DIST_DIR"
    cat >"$BROWSE_BIN" <<EOF
#!/usr/bin/env sh
set -eu

BUN_BIN="$bun_bin"
CLI_PATH="$cli_path"

if [ ! -x "\$BUN_BIN" ]; then
    echo "gstack browse wrapper could not find Bun at \$BUN_BIN" >&2
    exit 1
fi

if [ ! -f "\$CLI_PATH" ]; then
    echo "gstack browse wrapper could not find CLI source at \$CLI_PATH" >&2
    exit 1
fi

exec "\$BUN_BIN" run "\$CLI_PATH" "\$@"
EOF
    chmod +x "$BROWSE_BIN"
}

prune_vendored_skill_docs() {
    root=$1
    if [ -z "$root" ] || [ ! -d "$root" ]; then
        return 0
    fi
    find "$root" -name SKILL.md -type f -delete
    rm -rf \
        "$root/.agents" \
        "$root/.factory" \
        "$root/.kiro" \
        "$root/.opencode" \
        "$root/.slate" \
        "$root/.cursor" \
        "$root/openclaw"
}

find_existing_browse() {
    if [ -n "${GSTACK_BROWSE_BIN:-}" ] && is_binary_runtime "$GSTACK_BROWSE_BIN" && run_binary_smoke "$GSTACK_BROWSE_BIN"; then
        printf '%s\n' "$GSTACK_BROWSE_BIN"
        return 0
    fi

    if should_force_codex_mac_wrapper; then
        return 1
    fi

    candidate="$SKILL_DIR/vendor/gstack/browse/dist/browse"
    if is_binary_runtime "$candidate" && run_binary_smoke "$candidate"; then
        printf '%s\n' "$candidate"
        return 0
    fi

    return 1
}

if existing=$(find_existing_browse); then
    prune_vendored_skill_docs "$SKILL_DIR/vendor/gstack"
    printf 'gstack browse binary already available: %s\n' "$existing"
    exit 0
fi

if ! command -v git >/dev/null 2>&1; then
    echo "git is required to install gstack browse for kr-naver-browse." >&2
    exit 1
fi

ensure_bun() {
    export PATH="$HOME/.bun/bin:$PATH"
    if command -v bun >/dev/null 2>&1 && compile_smoke_test; then
        return 0
    fi
    if [ "${SKILL_INSTALL_AUTO_BUN:-1}" = "0" ]; then
        echo "A Bun installation that can produce runnable compiled binaries is required to build gstack browse." >&2
        echo "Install Bun or provide GSTACK_BROWSE_BIN with an existing gstack browse binary." >&2
        return 1
    fi
    if command -v brew >/dev/null 2>&1; then
        echo "bun is missing; trying Homebrew formula oven-sh/bun/bun..."
        if brew install oven-sh/bun/bun; then
            command -v bun >/dev/null 2>&1 && compile_smoke_test && return 0
        fi
    fi
    if command -v npm >/dev/null 2>&1; then
        echo "bun is still missing; trying npm global package..."
        if npm install -g bun; then
            command -v bun >/dev/null 2>&1 && compile_smoke_test && return 0
        fi
    fi
    if command -v curl >/dev/null 2>&1; then
        echo "bun is still missing or cannot compile runnable binaries; trying official bun installer..."
        tmpfile=$(mktemp)
        BUN_VERSION_TAG="${BUN_VERSION_TAG:-bun-v1.3.10}"
        if curl -fsSL "https://bun.sh/install" -o "$tmpfile"; then
            BUN_INSTALL="$HOME/.bun" bash "$tmpfile" "$BUN_VERSION_TAG"
            rm -f "$tmpfile"
            export PATH="$HOME/.bun/bin:$PATH"
            command -v bun >/dev/null 2>&1 && compile_smoke_test && return 0
        fi
        rm -f "$tmpfile"
    fi
    echo "A Bun installation that can produce runnable compiled binaries is required to build gstack browse, and automatic install failed." >&2
    echo "Install Bun or provide GSTACK_BROWSE_BIN with an existing gstack browse binary." >&2
    return 1
}

VENDOR_ROOT="$SKILL_DIR/vendor"
GSTACK_DIR="$VENDOR_ROOT/gstack"
mkdir -p "$VENDOR_ROOT"

if [ ! -d "$GSTACK_DIR/.git" ]; then
    rm -rf "$GSTACK_DIR"
    git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git "$GSTACK_DIR"
else
    git -C "$GSTACK_DIR" pull --ff-only
fi

ensure_bun

# If we reached this point, the existing binary was missing or failed smoke.
# Force gstack setup/build to create a fresh compiled browser binary instead
# of reusing a stale artifact whose mtime still looks current.
rm -f "$GSTACK_DIR/browse/dist/browse" "$GSTACK_DIR/browse/dist/find-browse"

setup_ok=0
if (cd "$GSTACK_DIR" && bun install); then
    setup_ok=1
else
    echo "gstack bun install failed." >&2
fi

if [ "$setup_ok" -eq 1 ]; then
    if ! (cd "$GSTACK_DIR" && bun run build); then
        setup_ok=0
        echo "gstack compiled browse build failed." >&2
    fi
fi

if ! (cd "$GSTACK_DIR" && bunx playwright install chromium); then
    setup_ok=0
    echo "gstack playwright chromium install failed." >&2
fi

prune_vendored_skill_docs "$GSTACK_DIR"

if should_force_codex_mac_wrapper; then
    echo "Forcing Codex macOS wrapper fallback..."
elif [ "$setup_ok" -eq 1 ] && is_binary_runtime "$BROWSE_BIN" && run_binary_smoke "$BROWSE_BIN"; then
    printf 'Installed gstack browse binary: %s\n' "$BROWSE_BIN"
    exit 0
fi

if is_codex_mac_target; then
    if ! should_force_codex_mac_wrapper; then
        echo "Compiled gstack browse smoke failed; trying Codex macOS wrapper fallback..."
    fi
    install_codex_mac_wrapper
    if is_binary_runtime "$BROWSE_BIN" && run_binary_smoke "$BROWSE_BIN"; then
        printf 'Installed gstack browse wrapper for Codex macOS: %s\n' "$BROWSE_BIN"
        exit 0
    fi
fi

echo "gstack browse install finished, but no usable browse binary was found." >&2
echo "Expected: $SKILL_DIR/vendor/gstack/browse/dist/browse or GSTACK_BROWSE_BIN." >&2
exit 1
