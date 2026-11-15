#!/usr/bin/env node
// Copies the generator page into media/web/ and the rendering libraries into media/vendor/,
// so the extension works with no internet access beyond GitHub Copilot.
// Usage (from vscode-extension/): npm install && npm run package
"use strict";
const fs = require("fs");
const path = require("path");

const ext = __dirname;
const root = path.join(ext, "..");
const web = path.join(ext, "media", "web");
const vendor = path.join(ext, "media", "vendor");

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

fs.rmSync(web, { recursive: true, force: true });
fs.rmSync(vendor, { recursive: true, force: true });

// The page (same files as the hosted version).
for (const rel of [
  "index.html",
  "css/styles.css",
  "js/app.js",
  "js/phases.js",
  "skill/skill.js",
  "samples/claims-management/sample.js",
]) copy(path.join(root, rel), path.join(web, rel));

// Bundled libraries (replace the public CDNs).
const libs = {
  "marked.min.js": "node_modules/marked/marked.min.js",
  "purify.min.js": "node_modules/dompurify/dist/purify.min.js",
  "mermaid.min.js": "node_modules/mermaid/dist/mermaid.min.js",
};
for (const [name, rel] of Object.entries(libs)) {
  const src = path.join(ext, rel);
  if (!fs.existsSync(src)) { console.error("Missing " + rel + ". Run npm install in vscode-extension/ first."); process.exit(1); }
  copy(src, path.join(vendor, name));
}
console.log("Copied page to media/web and libraries to media/vendor.");
