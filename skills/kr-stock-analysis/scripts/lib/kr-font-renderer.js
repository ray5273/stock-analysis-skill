const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BUNDLED_FONT_PATH = path.resolve(__dirname, "../../assets/fonts/NotoSansKR-Regular.ttf");
const EXTERNAL_TEXT_HELPER_PY = path.resolve(__dirname, "../render-text-mask.py");
const EXTERNAL_TEXT_HELPER_PS1 = path.resolve(__dirname, "../render-text-mask.ps1");
const OS_FONT_CANDIDATES = [
  "C:\\Windows\\Fonts\\malgun.ttf",
  "C:\\Windows\\Fonts\\malgunbd.ttf",
  "C:\\Windows\\Fonts\\NanumGothic.ttf",
  "C:\\Windows\\Fonts\\NotoSansKR-VF.ttf",
  "C:\\Windows\\Fonts\\notosanskr-medium.ttf",
  "/mnt/c/Windows/Fonts/malgun.ttf",
  "/mnt/c/Windows/Fonts/malgunbd.ttf",
  "/mnt/c/Windows/Fonts/NanumGothic.ttf",
  "/mnt/c/Windows/Fonts/NotoSansKR-VF.ttf",
  "/mnt/c/Windows/Fonts/NotoSerifKR-VF.ttf",
  "/System/Library/Fonts/AppleSDGothicNeo.ttc",
  "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
  "/Library/Fonts/AppleGothic.ttf",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/opentype/noto/NotoSansCJKkr-Regular.otf",
  "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
  "/usr/share/fonts/truetype/nanum/NanumBarunGothic.ttf",
  "/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/google-noto-sans-cjk-vf/NotoSansCJK-VF.otf.ttc",
];
const KR_FONT_NAME_RE = /^(malgun|malgunbd|nanum|noto.*(kr|cjk))[^/\\]*\.(ttf|ttc|otf)$/i;

function createKrFontRenderer() {
  const state = {
    checked: false,
    available: false,
    fontPath: null,
    reason: null,
  };
  const cache = new Map();
  let renderOk = false;

  function findKrFontByDirScan(dirs) {
    for (const dir of dirs) {
      if (!dir || !fs.existsSync(dir)) {
        continue;
      }
      let entries;
      try {
        entries = fs.readdirSync(dir);
      } catch {
        continue;
      }
      const hit = entries.find((file) => KR_FONT_NAME_RE.test(file));
      if (hit) {
        return path.join(dir, hit);
      }
    }
    return null;
  }

  function discoverKrFontFallback() {
    if (process.platform === "win32") {
      return findKrFontByDirScan([
        "C:\\Windows\\Fonts",
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Microsoft\\Windows\\Fonts"),
      ]);
    }

    try {
      const out = execFileSync("fc-match", ["-f", "%{file}\n", ":lang=ko"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (out && fs.existsSync(out)) {
        return out;
      }
    } catch {
      // fc-match is optional; packaged fonts are the default path.
    }
    return null;
  }

  function resolveFontPath() {
    if (process.env.KR_STOCK_CHART_FONT) {
      if (fs.existsSync(process.env.KR_STOCK_CHART_FONT)) {
        return process.env.KR_STOCK_CHART_FONT;
      }
      state.reason = "env-font-missing";
      return null;
    }

    if (fs.existsSync(BUNDLED_FONT_PATH)) {
      return BUNDLED_FONT_PATH;
    }

    const osFont = OS_FONT_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || discoverKrFontFallback();
    if (osFont) {
      return osFont;
    }

    state.reason = "bundled-font-missing";
    return null;
  }

  function resolve() {
    if (state.checked) {
      return state;
    }

    state.checked = true;
    const helperPath = process.platform === "win32" ? EXTERNAL_TEXT_HELPER_PS1 : EXTERNAL_TEXT_HELPER_PY;
    if (!fs.existsSync(helperPath)) {
      state.reason = "helper-missing";
      return state;
    }

    const fontPath = resolveFontPath();
    if (!fontPath) {
      return state;
    }

    state.available = true;
    state.fontPath = fontPath;
    state.reason = null;
    return state;
  }

  function externalFontSize(scale) {
    return Math.max(12, Math.round(scale * 9));
  }

  function normalizePayload(payloadText) {
    const payload = JSON.parse(String(payloadText || "").trim());
    return {
      width: payload.width,
      height: payload.height,
      alpha: Buffer.from(payload.alpha || "", "base64"),
    };
  }

  function classifyRenderFailure(error) {
    const stderr = error && error.stderr ? String(error.stderr) : "";
    const message = error && error.message ? String(error.message) : "";
    if (/No module named ['"]?PIL|ModuleNotFoundError.*PIL|ImportError.*PIL/i.test(stderr) || /No module named ['"]?PIL/i.test(message)) {
      return "pillow-missing";
    }
    if (state.fontPath) {
      return "font-found-but-helper-failed";
    }
    return "helper-failed";
  }

  function noteRenderFailed(reason) {
    state.available = false;
    state.reason = reason || "helper-failed";
  }

  function loadMask(text, scale = 1) {
    const renderer = resolve();
    if (!renderer.available || !renderer.fontPath) {
      return null;
    }

    const normalized = String(text);
    const fontSize = externalFontSize(scale);
    const cacheKey = `${renderer.fontPath}|${fontSize}|${normalized}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    try {
      const stdout =
        process.platform === "win32"
          ? execFileSync("powershell", [
              "-ExecutionPolicy",
              "Bypass",
              "-File",
              EXTERNAL_TEXT_HELPER_PS1,
              "-FontPath",
              renderer.fontPath,
              "-FontSize",
              String(fontSize),
              "-Text",
              normalized,
            ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
          : execFileSync("python3", [
              EXTERNAL_TEXT_HELPER_PY,
              "--font-path",
              renderer.fontPath,
              "--font-size",
              String(fontSize),
              "--text",
              normalized,
            ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
      const mask = normalizePayload(stdout);
      cache.set(cacheKey, mask);
      renderOk = true;
      return mask;
    } catch (error) {
      if (error && error.stdout) {
        try {
          const mask = normalizePayload(error.stdout);
          cache.set(cacheKey, mask);
          renderOk = true;
          return mask;
        } catch {
          // Fall through to bitmap fallback.
        }
      }
      noteRenderFailed(classifyRenderFailure(error));
      return null;
    }
  }

  function report() {
    if (renderOk && state.fontPath) {
      process.stderr.write(`[font] external=true path=${state.fontPath}\n`);
      return;
    }
    if (!state.checked) {
      try {
        resolve();
      } catch {
        // Preserve original process result; font status is diagnostic only.
      }
    }
    if (state.fontPath && !state.reason) {
      process.stderr.write(`[font] external=available path=${state.fontPath}\n`);
      return;
    }
    process.stderr.write(`[font] external=false path=${state.fontPath || "none"} reason=${state.reason || "bundled-font-missing"}\n`);
  }

  return {
    loadMask,
    report,
    resolve,
    bundledFontPath: BUNDLED_FONT_PATH,
  };
}

module.exports = {
  BUNDLED_FONT_PATH,
  createKrFontRenderer,
};
