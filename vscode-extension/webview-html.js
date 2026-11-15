// Turns the generator's index.html into a VS Code webview page:
// - local files and bundled libraries are loaded through webview URIs (no public CDNs),
// - a strict Content Security Policy is added,
// - the host bridge and the saved state are injected before the page's own scripts.
"use strict";

// Public CDN URLs used by the hosted page -> bundled copies shipped with the extension.
const CDN_TO_VENDOR = [
  [/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/marked\/[^"']+\/marked\.min\.js/, "vendor/marked.min.js"],
  [/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/dompurify\/[^"']+\/purify\.min\.js/, "vendor/purify.min.js"],
  [/https:\/\/cdn\.jsdelivr\.net\/npm\/mermaid@[^"']+\/dist\/mermaid\.min\.js/, "vendor/mermaid.min.js"],
];

function safeJson(value) {
  return JSON.stringify(value === undefined ? null : value)
    .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

/**
 * @param {object} o
 * @param {string} o.indexHtml   contents of web/index.html
 * @param {(rel: string) => string} o.toUri  maps a path relative to the media folder to a webview URI
 * @param {string} o.cspSource   webview.cspSource
 * @param {string} o.nonce       random nonce for the inline script
 * @param {any}    o.initialState saved page state (or null)
 * @param {string} o.label       connection label shown in the page header
 */
function buildWebviewHtml(o) {
  let html = o.indexHtml;

  // 1. CDN libraries -> bundled vendor files.
  for (const [re, rel] of CDN_TO_VENDOR) html = html.replace(re, o.toUri(rel));
  if (/https?:\/\/(cdnjs|cdn\.jsdelivr|unpkg)/.test(html)) {
    throw new Error("index.html references a CDN that is not bundled. Add it to CDN_TO_VENDOR in webview-html.js.");
  }

  // 2. Relative src/href -> webview URIs (pages files live under media/web/).
  html = html.replace(/\b(src|href)="(?!https?:|data:|#|vscode-)([^"]+)"/g, (m, attr, rel) => attr + '="' + o.toUri("web/" + rel) + '"');

  // 3. Content Security Policy.
  const csp = [
    "default-src 'none'",
    "img-src " + o.cspSource + " data: blob:",
    "style-src " + o.cspSource + " 'unsafe-inline'",
    "font-src " + o.cspSource + " data:",
    "script-src " + o.cspSource + " 'nonce-" + o.nonce + "'",
  ].join("; ");
  html = html.replace("<head>", '<head>\n<meta http-equiv="Content-Security-Policy" content="' + csp + '">');

  // 4. Saved state + host bridge, before any other script.
  const inject =
    '<script nonce="' + o.nonce + '">window.L3_INITIAL_STATE = ' + safeJson(o.initialState) +
    "; window.L3_HOST_LABEL = " + safeJson(o.label) + ";</script>\n" +
    '<script src="' + o.toUri("host-bridge.js") + '"></script>\n';
  const firstScript = html.indexOf("<script");
  html = html.slice(0, firstScript) + inject + html.slice(firstScript);
  return html;
}

module.exports = { buildWebviewHtml, CDN_TO_VENDOR };
