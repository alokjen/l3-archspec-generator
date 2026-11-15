#!/usr/bin/env node
// Regenerates samples/claims-management/sample.js from the sample's Markdown files,
// so the page's "Load sample data" button always matches them.
// Usage: node scripts/build-sample.js
// Run this whenever form-values.md or claims-source-material.md changes.
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "samples", "claims-management");
const formMd = fs.readFileSync(path.join(dir, "form-values.md"), "utf8");
const sourceName = "claims-source-material.md";
const sourceMd = fs.readFileSync(path.join(dir, sourceName), "utf8");

// Bold field label in form-values.md -> form field name on the page.
const LABELS = {
  "L3 domain name": "domainName",
  "Parent L4 domain": "parentL4",
  "Scope boundary (in scope / out of scope)": "scope",
  "Business drivers, strategic objectives, target-state horizon": "drivers",
  "Stakeholders": "stakeholders",
  "Additional conventions": "frameworks",
};
const META = { Version: "version", Author: "author", Status: "status", Reviewers: "reviewers" };

const fields = {};
// Only read the form section, never the test notes.
const formPart = formMd.split(/^## Test notes/m)[0];
for (const m of formPart.matchAll(/\*\*(.+?)\*\*\s*\n```\n([\s\S]*?)\n```/g)) {
  const key = LABELS[m[1].trim()];
  if (key) fields[key] = m[2].trim();
}
for (const m of formPart.matchAll(/^- (\w+): `([^`]*)`/gm)) {
  const key = META[m[1]];
  if (key) fields[key] = m[2];
}

const missing = Object.values(LABELS).filter((k) => !fields[k]);
if (missing.length) {
  console.error("form-values.md is missing values for: " + missing.join(", "));
  process.exit(1);
}

// The source material goes straight into the "Source material and domain knowledge" box
// so the architect can see and edit it, rather than as a hidden attachment.
fields.sources = sourceMd.trim();

const sample = {
  title: "Claims Management (fictional Harbor Point Insurance)",
  fields,
  files: [],
};
const out = path.join(dir, "sample.js");
fs.writeFileSync(
  out,
  "// GENERATED from form-values.md and " + sourceName + " by scripts/build-sample.js. Do not edit by hand.\n" +
    "window.L3_SAMPLE = " + JSON.stringify(sample, null, 2) + ";\n"
);
console.log("Wrote " + path.relative(path.join(__dirname, ".."), out) + " with fields: " + Object.keys(fields).join(", "));
