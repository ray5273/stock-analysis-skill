(function bootstrapClaudeDartExtractor() {
  const RETRY_LIMIT = 8;
  const RETRY_DELAY_MS = 1200;
  const MIN_TEXT_LENGTH = 1200;
  const MAX_SECTION_PREVIEW = 220;
  const STATE_VERSION = 1;

  const state = {
    version: STATE_VERSION,
    page: {
      url: window.location.href,
      title: document.title || "",
      supported: /\/dsaf001\/main\.do/i.test(window.location.pathname),
    },
    extraction: {
      status: "idle",
      attemptCount: 0,
      startedAt: null,
      completedAt: null,
      lastTrigger: null,
      errors: [],
      diagnostics: {},
      result: null,
    },
  };

  let retryTimer = null;
  let observer = null;
  let extractionInFlight = false;

  function normalizeWhitespace(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function headingLevelFromTitle(title) {
    if (/^【[^】]+】$/.test(title)) {
      return 1;
    }

    const romanMatch = title.match(/^([IVX]+)\.\s+/);
    if (romanMatch) {
      return 1;
    }

    const numericMatch = title.match(/^(\d+(?:-\d+)?(?:\.\d+)*)\.\s+/);
    if (numericMatch) {
      const token = numericMatch[1];
      const dotDepth = token.split(".").length - 1;
      const hyphenDepth = token.includes("-") ? 1 : 0;
      return Math.max(2, 2 + dotDepth + hyphenDepth);
    }

    return 2;
  }

  function isHeadingLine(line) {
    return /^(?:[IVX]+\.\s+.+|\d+(?:-\d+)?(?:\.\d+)*\.\s+.+|【[^】]+】)$/.test(line);
  }

  function normalizeLines(text) {
    return String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => normalizeWhitespace(line))
      .filter(Boolean);
  }

  function textSnippet(text) {
    return normalizeWhitespace(text).slice(0, MAX_SECTION_PREVIEW);
  }

  function extractSectionsFromText(text) {
    const lines = normalizeLines(text);
    const headingIndexes = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (isHeadingLine(lines[index])) {
        headingIndexes.push(index);
      }
    }

    const sections = [];
    for (let index = 0; index < headingIndexes.length; index += 1) {
      const startIndex = headingIndexes[index];
      const endIndex = headingIndexes[index + 1] || lines.length;
      const title = lines[startIndex];
      const content = normalizeWhitespace(lines.slice(startIndex + 1, endIndex).join("\n"));
      sections.push({
        title,
        level: headingLevelFromTitle(title),
        content,
        contentLength: content.length,
        preview: textSnippet(content),
      });
    }

    return sections.filter((section) => section.contentLength > 0);
  }

  function countTables(doc) {
    return doc.querySelectorAll("table").length;
  }

  function collectLinks(doc) {
    const links = [];
    for (const anchor of doc.querySelectorAll("a[href]")) {
      const href = anchor.href || anchor.getAttribute("href") || "";
      if (!href) {
        continue;
      }

      links.push({
        text: normalizeWhitespace(anchor.innerText || anchor.textContent || "").slice(0, 160),
        href,
      });
    }

    return links;
  }

  function getCompanyNameCandidate(text) {
    const companyMatch = text.match(/회사명\s*[:：]?\s*([^\n]{2,80})/i);
    if (companyMatch) {
      return normalizeWhitespace(companyMatch[1]);
    }

    const titleMatch = (document.title || "").match(/^([^\-|(]{2,80})/);
    return titleMatch ? normalizeWhitespace(titleMatch[1]) : null;
  }

  function getFilingDateCandidate(text) {
    const isoMatch = text.match(/(20\d{2}[.-]\d{2}[.-]\d{2})/);
    if (isoMatch) {
      return isoMatch[1].replace(/\./g, "-");
    }

    const krMatch = text.match(/(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (krMatch) {
      const year = krMatch[1];
      const month = krMatch[2].padStart(2, "0");
      const day = krMatch[3].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    return null;
  }

  function resolveFrameContexts() {
    const contexts = [{
      source: "top-document",
      doc: document,
      frameUrl: window.location.href,
    }];

    for (const frame of document.querySelectorAll("iframe")) {
      try {
        const frameDoc = frame.contentDocument;
        if (!frameDoc || !frameDoc.body) {
          continue;
        }

        contexts.push({
          source: "iframe",
          doc: frameDoc,
          frameUrl: frame.src || frameDoc.URL || window.location.href,
        });
      } catch (_error) {
        contexts.push({
          source: "iframe-inaccessible",
          doc: null,
          frameUrl: frame.src || null,
        });
      }
    }

    return contexts;
  }

  function buildCandidate(context) {
    if (!context.doc || !context.doc.body) {
      return null;
    }

    const text = normalizeWhitespace(context.doc.body.innerText || context.doc.body.textContent || "");
    if (!text) {
      return null;
    }

    const sections = extractSectionsFromText(text);
    const links = collectLinks(context.doc);
    const tables = countTables(context.doc);
    const headings = sections.map((section) => ({ title: section.title, level: section.level }));
    const score = text.length + sections.length * 600 + tables * 200;

    return {
      source: context.source,
      frameUrl: context.frameUrl,
      rawText: text,
      textLength: text.length,
      sections,
      headings,
      tableCount: tables,
      links,
      score,
    };
  }

  function summarizeContexts(contexts) {
    return contexts.map((context) => ({
      source: context.source,
      frameUrl: context.frameUrl,
      accessible: Boolean(context.doc),
    }));
  }

  function buildFailure(errors, diagnostics) {
    return {
      meta: {
        url: window.location.href,
        title: document.title || "",
        companyNameCandidate: null,
        filingDateCandidate: null,
        capturedAt: new Date().toISOString(),
      },
      extraction: {
        status: "failed",
        errors,
        diagnostics,
      },
      content: {
        rawText: "",
        headings: [],
        sections: [],
        links: [],
      },
    };
  }

  function buildSuccessPayload(candidate, diagnostics) {
    return {
      meta: {
        url: window.location.href,
        title: document.title || "",
        companyNameCandidate: getCompanyNameCandidate(candidate.rawText),
        filingDateCandidate: getFilingDateCandidate(candidate.rawText),
        capturedAt: new Date().toISOString(),
      },
      extraction: {
        status: "ready",
        errors: [],
        diagnostics,
      },
      content: {
        rawText: candidate.rawText,
        textLength: candidate.textLength,
        headings: candidate.headings,
        sections: candidate.sections,
        links: candidate.links,
        tableCount: candidate.tableCount,
        source: candidate.source,
        sourceUrl: candidate.frameUrl,
      },
    };
  }

  function setStateStatus(status, extra) {
    state.extraction.status = status;
    state.extraction.completedAt = status === "extracting" ? null : new Date().toISOString();
    Object.assign(state.extraction, extra || {});

    chrome.runtime.sendMessage({ type: "state-update", status }, () => {
      void chrome.runtime.lastError;
    });
  }

  function extractNow(trigger) {
    if (extractionInFlight || !state.page.supported) {
      return;
    }

    extractionInFlight = true;
    state.extraction.attemptCount += 1;
    state.extraction.startedAt = state.extraction.startedAt || new Date().toISOString();
    state.extraction.lastTrigger = trigger;
    setStateStatus("extracting", { errors: [], diagnostics: {}, result: null });

    try {
      const contexts = resolveFrameContexts();
      const diagnostics = {
        contexts: summarizeContexts(contexts),
        iframeCount: document.querySelectorAll("iframe").length,
      };
      const candidates = contexts.map(buildCandidate).filter(Boolean).sort((a, b) => b.score - a.score);
      const best = candidates[0] || null;

      diagnostics.candidateCount = candidates.length;
      diagnostics.bestCandidate = best
        ? {
            source: best.source,
            frameUrl: best.frameUrl,
            textLength: best.textLength,
            headingCount: best.headings.length,
            tableCount: best.tableCount,
          }
        : null;

      if (!best) {
        setStateStatus("failed", {
          errors: ["No readable DART viewer content was found in the page or accessible iframes."],
          diagnostics,
          result: buildFailure(["No readable DART viewer content was found in the page or accessible iframes."], diagnostics),
        });
        return;
      }

      if (best.textLength < MIN_TEXT_LENGTH) {
        setStateStatus("failed", {
          errors: [`Extracted text was too short (${best.textLength} chars).`],
          diagnostics,
          result: buildFailure([`Extracted text was too short (${best.textLength} chars).`], diagnostics),
        });
        return;
      }

      if (best.sections.length === 0) {
        setStateStatus("failed", {
          errors: ["No structured section headings were detected in the viewer text."],
          diagnostics,
          result: buildFailure(["No structured section headings were detected in the viewer text."], diagnostics),
        });
        return;
      }

      setStateStatus("ready", {
        diagnostics,
        errors: [],
        result: buildSuccessPayload(best, diagnostics),
      });
    } finally {
      extractionInFlight = false;
    }
  }

  function scheduleRetry(trigger) {
    if (state.extraction.status === "ready" || state.extraction.attemptCount >= RETRY_LIMIT) {
      return;
    }

    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => {
      extractNow(trigger);
    }, RETRY_DELAY_MS);
  }

  function startObserver() {
    if (observer) {
      return;
    }

    observer = new MutationObserver(() => {
      if (state.extraction.status !== "ready") {
        scheduleRetry("mutation");
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) {
      return false;
    }

    if (message.type === "get-state") {
      sendResponse(state);
      return false;
    }

    if (message.type === "retry-extraction") {
      state.extraction.startedAt = new Date().toISOString();
      state.extraction.completedAt = null;
      state.extraction.errors = [];
      state.extraction.diagnostics = {};
      state.extraction.result = null;
      extractNow("manual-retry");
      sendResponse({ ok: true });
      return false;
    }

    return false;
  });

  function initialize() {
    if (!state.page.supported) {
      setStateStatus("failed", {
        errors: ["This page is not a supported DART viewer URL."],
        diagnostics: { supportedPath: false },
        result: buildFailure(["This page is not a supported DART viewer URL."], { supportedPath: false }),
      });
      return;
    }

    startObserver();
    extractNow("auto-init");
    scheduleRetry("auto-retry");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
