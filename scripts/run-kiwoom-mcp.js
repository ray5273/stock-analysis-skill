#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const envFilePath = path.join(repoRoot, ".env.kiwoom");
const defaultEntry = "/tmp/kiwoom-mcp/dist/index.js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const text = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) {
      env[key] = value;
    }
  }

  return env;
}

function pickEnv(key, fileEnv, fallback) {
  const value = process.env[key] || fileEnv[key] || fallback || "";
  return String(value).trim();
}

function pickEnvAny(keys, fileEnv, fallback) {
  for (const key of keys) {
    const value = process.env[key] || fileEnv[key];
    if (String(value || "").trim()) {
      return String(value).trim();
    }
  }
  return String(fallback || "").trim();
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const fileEnv = loadEnvFile(envFilePath);
const entryPath = pickEnv("KIWOOM_MCP_ENTRY", fileEnv, defaultEntry);
const appKey = pickEnv("KIWOOM_APP_KEY", fileEnv);
const secretKey = pickEnvAny(["KIWOOM_APP_SECRET", "KIWOOM_SECRET_KEY"], fileEnv);
const baseUrl = pickEnvAny(["KIWOOM_API_BASE_URL", "KIWOOM_BASE_URL"], fileEnv, "https://api.kiwoom.com");

if (!fs.existsSync(entryPath)) {
  fail(
    `[run-kiwoom-mcp] MCP entry not found: ${entryPath}\n` +
      "Set KIWOOM_MCP_ENTRY in .env.kiwoom if kiwoom-mcp is installed elsewhere."
  );
}

if (!appKey || !secretKey) {
  fail(
    `[run-kiwoom-mcp] Missing KIWOOM_APP_KEY or KIWOOM_APP_SECRET.\n` +
      `Create ${envFilePath} from .env.kiwoom.example and fill in your credentials.`
  );
}

const child = spawn(process.execPath, [entryPath], {
  cwd: path.dirname(entryPath),
  stdio: "inherit",
  env: {
    ...process.env,
    KIWOOM_APP_KEY: appKey,
    KIWOOM_APP_SECRET: secretKey,
    KIWOOM_SECRET_KEY: secretKey,
    KIWOOM_BASE_URL: baseUrl,
    KIWOOM_API_BASE_URL: baseUrl,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  fail(`[run-kiwoom-mcp] Failed to start kiwoom-mcp: ${error.message}`);
});
