async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }
      resolve(response);
    });
  });
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }
      resolve(response);
    });
  });
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function setStatus(status, detail) {
  const line = document.getElementById("status-line");
  line.className = `status status-${status}`;

  if (status === "ready") {
    line.textContent = "Export ready";
  } else if (status === "failed") {
    line.textContent = "Extraction failed";
  } else if (status === "extracting") {
    line.textContent = "Extracting viewer content...";
  } else {
    line.textContent = "Checking page...";
  }

  setText("detail-line", detail || "");
}

function applyState(state) {
  const extraction = state && state.extraction ? state.extraction : {};
  const result = extraction.result || {};
  const meta = result.meta || {};
  const content = result.content || {};
  const errors = extraction.errors || [];

  setStatus(extraction.status || "idle", errors[0] || "");
  setText("company-name", meta.companyNameCandidate || "-");
  setText("filing-date", meta.filingDateCandidate || "-");
  setText("section-count", String((content.sections || []).length || 0));

  document.getElementById("save-button").disabled = extraction.status !== "ready";
  document.getElementById("retry-button").disabled = !state || state.page.supported !== true;
}

async function refreshState() {
  const tab = await getActiveTab();
  if (!tab || typeof tab.id !== "number") {
    setStatus("failed", "No active tab found.");
    return { tab: null, state: null };
  }

  try {
    const state = await sendMessageToTab(tab.id, { type: "get-state" });
    applyState(state);
    return { tab, state };
  } catch (error) {
    setStatus("failed", error.message);
    setText("company-name", "-");
    setText("filing-date", "-");
    setText("section-count", "-");
    document.getElementById("save-button").disabled = true;
    document.getElementById("retry-button").disabled = true;
    return { tab, state: null };
  }
}

document.getElementById("retry-button").addEventListener("click", async () => {
  const { tab } = await refreshState();
  if (!tab || typeof tab.id !== "number") {
    return;
  }

  await sendMessageToTab(tab.id, { type: "retry-extraction" });
  window.setTimeout(() => {
    refreshState();
  }, 250);
});

document.getElementById("save-button").addEventListener("click", async () => {
  const { state } = await refreshState();
  if (!state || !state.extraction || state.extraction.status !== "ready") {
    return;
  }

  const response = await sendRuntimeMessage({
    type: "download-export",
    payload: state.extraction.result,
  });

  if (!response || response.ok !== true) {
    setStatus("failed", response && response.error ? response.error : "Download failed.");
    return;
  }

  setStatus("ready", "Export saved. Attach the JSON file in Claude.ai.");
});

refreshState();
