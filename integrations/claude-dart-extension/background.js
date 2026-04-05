const DEFAULT_BADGE = {
  text: "",
  color: "#5f6368",
};

function updateBadge(tabId, status) {
  if (!Number.isInteger(tabId)) {
    return;
  }

  let text = DEFAULT_BADGE.text;
  let color = DEFAULT_BADGE.color;

  if (status === "extracting") {
    text = "...";
    color = "#1a73e8";
  } else if (status === "ready") {
    text = "OK";
    color = "#188038";
  } else if (status === "failed") {
    text = "ERR";
    color = "#d93025";
  }

  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
}

function sanitizeFileName(value) {
  return String(value || "dart-browser-export")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "dart-browser-export";
}

function buildDownloadName(payload) {
  const meta = payload && payload.meta ? payload.meta : {};
  const company = sanitizeFileName(meta.companyNameCandidate || "company");
  const date = sanitizeFileName(meta.filingDateCandidate || meta.capturedAt || "undated");
  return `${company}-${date}-dart-browser-export.json`;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "state-update") {
    updateBadge(sender.tab ? sender.tab.id : undefined, message.status);
    sendResponse({ ok: true });
    return false;
  }

  if (message && message.type === "download-export") {
    const payload = message.payload;
    if (!payload) {
      sendResponse({ ok: false, error: "Missing payload" });
      return false;
    }

    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download(
      {
        url,
        filename: buildDownloadName(payload),
        saveAs: true,
      },
      (downloadId) => {
        const runtimeError = chrome.runtime.lastError;
        URL.revokeObjectURL(url);

        if (runtimeError) {
          sendResponse({ ok: false, error: runtimeError.message });
          return;
        }

        sendResponse({ ok: true, downloadId });
      },
    );

    return true;
  }

  return false;
});
