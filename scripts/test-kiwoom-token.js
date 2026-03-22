#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const result = {
    baseUrl: null,
    envFile: ".env.kiwoom",
    timeoutMs: 15000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--app-key") {
      result.appKey = argv[index + 1];
      index += 1;
    } else if (arg === "--secret-key") {
      result.secretKey = argv[index + 1];
      index += 1;
    } else if (arg === "--base-url") {
      result.baseUrl = argv[index + 1];
      index += 1;
    } else if (arg === "--env-file") {
      result.envFile = argv[index + 1];
      index += 1;
    } else if (arg === "--mock") {
      result.baseUrl = "https://mockapi.kiwoom.com";
    } else if (arg === "--show-token") {
      result.showToken = true;
    } else if (arg === "--output") {
      result.output = argv[index + 1];
      index += 1;
    } else if (arg === "--timeout-ms") {
      result.timeoutMs = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return result;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/test-kiwoom-token.js [--app-key APP_KEY] [--secret-key SECRET_KEY] [--env-file .env.kiwoom] [--mock] [--show-token] [--output response.json]",
    "",
    "Environment variables:",
    "  KIWOOM_APP_KEY       Kiwoom REST API app key",
    "  KIWOOM_APP_SECRET    Kiwoom REST API secret key (preferred)",
    "  KIWOOM_SECRET_KEY    Legacy alias for the secret key",
    "  KIWOOM_API_BASE_URL  Override base URL (preferred)",
    "  KIWOOM_BASE_URL      Legacy alias for the base URL",
    "",
    "Env file format (.env.kiwoom):",
    "  KIWOOM_APP_KEY=...",
    "  KIWOOM_APP_SECRET=...",
    "  KIWOOM_API_BASE_URL=https://api.kiwoom.com",
    "",
    "Notes:",
    "  - Official Kiwoom OAuth token endpoint: POST /oauth2/token",
    "  - Request body: grant_type=client_credentials, appkey, secretkey",
    "  - By default the script masks the token in stdout. Use --show-token to print it.",
    "  - Live Kiwoom REST API calls require the API service to be approved and your public IP to be registered.",
    "  - In this repository, Kiwoom live coverage is documented for domestic KRX endpoints only.",
  ].join("\n");
}

function requireCredential(value, name, flagName, envName) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`Missing ${name}. Pass ${flagName} or set ${envName}.`);
  }
  return normalized;
}

function loadEnvFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    return {};
  }

  const text = fs.readFileSync(absolutePath, "utf8");
  const entries = {};

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
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key) {
      entries[key] = value;
    }
  }

  return entries;
}

function maskToken(token) {
  if (!token) {
    return null;
  }
  if (token.length <= 12) {
    return `${token.slice(0, 4)}...`;
  }
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function pickFirst(...values) {
  for (const value of values) {
    if (String(value || "").trim()) {
      return String(value).trim();
    }
  }
  return "";
}

async function requestToken({ appKey, secretKey, baseUrl, timeoutMs }) {
  const url = new URL("/oauth2/token", baseUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: appKey,
        secretkey: secretKey,
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let body = null;
    try {
      body = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
      throw new Error(`Kiwoom returned non-JSON response (HTTP ${response.status}): ${responseText.slice(0, 300)}`);
    }

    if (!response.ok) {
      const message = body?.return_msg || body?.message || response.statusText;
      throw new Error(`Kiwoom token request failed (HTTP ${response.status}): ${message}`);
    }

    return {
      status: response.status,
      body,
    };
  } catch (error) {
    const detail = error?.cause?.message || error.message;
    throw new Error(`Kiwoom token request failed: ${detail}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    process.exit(0);
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    throw new Error("timeoutMs must be a positive number.");
  }

  const fileEnv = loadEnvFile(args.envFile);
  args.baseUrl = pickFirst(
    args.baseUrl,
    process.env.KIWOOM_API_BASE_URL,
    process.env.KIWOOM_BASE_URL,
    fileEnv.KIWOOM_API_BASE_URL,
    fileEnv.KIWOOM_BASE_URL,
    "https://api.kiwoom.com",
  );
  const appKey = requireCredential(
    pickFirst(args.appKey, process.env.KIWOOM_APP_KEY, fileEnv.KIWOOM_APP_KEY),
    "appKey",
    "--app-key",
    "KIWOOM_APP_KEY",
  );
  const secretKey = requireCredential(
    pickFirst(
      args.secretKey,
      process.env.KIWOOM_APP_SECRET,
      process.env.KIWOOM_SECRET_KEY,
      fileEnv.KIWOOM_APP_SECRET,
      fileEnv.KIWOOM_SECRET_KEY,
    ),
    "secretKey",
    "--secret-key",
    "KIWOOM_APP_SECRET",
  );

  const result = await requestToken({
    appKey,
    secretKey,
    baseUrl: args.baseUrl,
    timeoutMs: args.timeoutMs,
  });

  const output = {
    ok: true,
    baseUrl: args.baseUrl,
    fetchedAt: new Date().toISOString(),
    expiresDt: result.body?.expires_dt || null,
    tokenType: result.body?.token_type || null,
    returnCode: result.body?.return_code ?? null,
    returnMsg: result.body?.return_msg || null,
    token: args.showToken ? result.body?.token || null : undefined,
    tokenPreview: args.showToken ? undefined : maskToken(result.body?.token || null),
    raw: result.body,
  };

  const serialized = `${JSON.stringify(output, null, 2)}\n`;

  if (args.output) {
    const outputPath = path.resolve(args.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, serialized, "utf8");
  }

  process.stdout.write(serialized);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
