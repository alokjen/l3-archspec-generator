// Bridge between the generator page and the VS Code extension host.
// Provides the same window.claude.use(...) interface the page uses on claude.ai,
// but routes model calls to GitHub Copilot (VS Code Language Model API) via the extension.
(function () {
  "use strict";
  const vscodeApi = acquireVsCodeApi();
  const waiting = new Map();
  let seq = 0;

  window.addEventListener("message", (event) => {
    const m = event.data || {};
    const w = waiting.get(m.id);
    if (!w) return;
    if (m.type === "sampleDelta") {
      if (w.onText) { try { w.onText({ text: m.text, delta: m.delta || "" }); } catch (e) { /* page callback error */ } }
    } else if (m.type === "sampleDone") {
      waiting.delete(m.id); w.resolve({ text: m.text, truncated: false, modelApplied: m.model, toolsUsed: m.toolsUsed || [] });
    } else if (m.type === "sampleError") {
      waiting.delete(m.id);
      const err = new Error(m.message || "The model request failed."); err.code = m.code || "error"; w.reject(err);
    } else if (m.type === "saveDone") {
      waiting.delete(m.id);
      if (m.ok) w.resolve({ path: m.path });
      else { const err = new Error(m.message || "Save cancelled."); err.code = "declined"; w.reject(err); }
    }
  });

  function sample(input, opts) {
    opts = opts || {};
    const id = ++seq;
    return new Promise((resolve, reject) => {
      waiting.set(id, { resolve, reject, onText: opts.onText });
      if (opts.signal) {
        opts.signal.addEventListener("abort", () => {
          if (!waiting.has(id)) return;
          waiting.delete(id);
          vscodeApi.postMessage({ type: "abort", id });
          const err = new Error("Request cancelled."); err.code = "aborted"; reject(err);
        });
      }
      vscodeApi.postMessage({ type: "sample", id, input, useTools: opts.hostTools !== false });
    });
  }

  const downloads = {
    save({ filename, data }) {
      const id = ++seq;
      return new Promise((resolve, reject) => {
        waiting.set(id, { resolve, reject });
        vscodeApi.postMessage({ type: "save", id, filename, data: typeof data === "string" ? data : String(data) });
      });
    },
  };

  window.claude = {
    use: async (name) => (name === "sample" ? sample : name === "downloads" ? downloads : null),
  };

  // Persist the page's work in the extension (survives closing the tab and restarting VS Code).
  let timer = null;
  window.L3_HOST_STORE = {
    get: () => window.L3_INITIAL_STATE || null,
    set: (value) => {
      clearTimeout(timer);
      timer = setTimeout(() => vscodeApi.postMessage({ type: "store", value }), 300);
    },
  };

  window.L3_CONNECTED_LABEL = window.L3_HOST_LABEL || "Connected via GitHub Copilot";
})();
