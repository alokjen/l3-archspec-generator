#!/usr/bin/env node
// Regenerates skill/skill.js from skill/SKILL.md so the page always runs the current skill.
// Usage: node scripts/build-skill.js
// Run this whenever skill/SKILL.md is updated.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "skill", "SKILL.md");
const out = path.join(root, "skill", "skill.js");

const md = fs.readFileSync(src, "utf8");
const js =
  "// GENERATED from skill/SKILL.md by scripts/build-skill.js. Do not edit by hand.\n" +
  "window.L3_SKILL = " + JSON.stringify(md) + ";\n";
fs.writeFileSync(out, js);
console.log("Wrote " + path.relative(root, out) + " (" + md.length + " chars)");
