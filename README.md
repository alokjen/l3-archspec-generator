# L3 Architecture Spec Generator

A single-page tool that lets an enterprise architect enter domain context and generate an
L3 domain architecture specification by running the `l3-domain-architecture-spec` skill
one phase at a time.

## Folder structure

```
l3-archspec-generator/
├── index.html              Page shell: intake form, progress tracker, phase view, document view
├── css/styles.css          Styling (plain CSS, no build step)
├── js/phases.js            Phase 0–8 definitions, mirroring the skill's workflow
├── js/app.js               Phase engine, input gates, prompt building, Markdown/Mermaid rendering
├── skill/SKILL.md          The skill (source of truth)
├── skill/skill.js          SKILL.md wrapped as window.L3_SKILL (generated)
├── scripts/build-skill.js  Regenerates skill/skill.js from SKILL.md
├── scripts/build-sample.js Regenerates samples/claims-management/sample.js
├── samples/claims-management/  Test input: form values, source material, test notes, sample.js (generated)
└── vscode-extension/       The same page as a VS Code extension using Claude through GitHub Copilot
    └── l3-archspec-generator.vsix   Ready-to-install extension package
```

## How it works

1. **Architect context.** The architect fills in the L3 domain name (the domain being specified),
   its parent L4 domain, scope, business drivers,
   stakeholders and source material, and can attach text files (.txt, .md, .csv, .json, .mmd).
2. **Input gate.** If the L3 domain name, parent L4 domain, scope, drivers or source material is missing,
   generation stops before anything is sent to Claude and lists exactly what is needed.
3. **Phase-by-phase generation.** For each phase (0 Intake → 8 Validation) the page sends
   Claude the full skill text, a strict reply protocol, the architect's context and all
   previously approved sections. Claude answers with either:
   - `NEEDS_INPUT` and numbered questions. The phase pauses, **Approve** stays disabled,
     and the architect answers (or defers items as `[TBC]`). An empty answer is rejected.
   - `READY_FOR_REVIEW` and a section draft. The architect approves it or requests a revision.
4. **Progress tracker.** Each phase shows Not started / Generating / Needs your input /
   Ready for review / Approved. Approved phases can be reopened; reopening a body section
   resets the Executive Summary and Validation phases so they are rebuilt from the new content.
5. **Deliverable.** The approved sections are assembled in the skill's output order
   (Document Control, Executive Summary, sections 2–7, Appendices A–C), with tables and
   rendered Mermaid diagrams. The result can be copied or downloaded as Markdown.

## Running it inside VS Code with GitHub Copilot (no claude.ai access needed)

For networks that can't reach claude.ai, `vscode-extension/` packages the same page as a VS Code extension.
It opens the page in a VS Code tab and sends model requests to Claude models through GitHub Copilot
(VS Code's Language Model API). The libraries are bundled, so nothing loads from public CDNs.
Install `vscode-extension/l3-archspec-generator.vsix` with **Extensions → ... → Install from VSIX**, then run
**L3 Spec Generator: Open**. See `vscode-extension/README.md`.

## Running it

- **In Claude (recommended):** open the published artifact. The page calls Claude directly
  (it asks for consent on first use).
- **On a regular desktop:** open `index.html` in any modern browser. Without a Claude
  connection the page switches to **manual mode**: *Copy prompt* → paste into a Claude chat
  → paste the reply back → *Use this response*. The gates and tracker work the same way.
  An internet connection is needed for the Markdown and Mermaid libraries (loaded from CDNs).

Work in progress is kept in the browser's local storage. **Start over** clears it.

## Domain hierarchy

This tool follows the organisation's product structure:

- **L4 domain**: the parent domain (required on the form).
- **L3 domain**: the domain the specification covers.
- **L2 business capabilities**: the capabilities within the L3 domain. L2 is the lowest level, so
  capability maps are a single level of L2 capabilities under the L3 domain.

The skill's **Domain hierarchy** section defines this, and the page reminds Claude of it on every phase.

## Testing with sample data

`samples/claims-management/` holds a fictional Claims Management domain:
`form-values.md` lists what to type into each field, plus test notes describing what the finished
specification should contain. The sample is complete, so no phase should stop for missing input. `claims-source-material.md` is the file to attach as source material.

The quickest way to test is the **Load sample data** button at the top of the form. It fills every
field, including the source material box. While the sample is loaded unchanged, the form also shows **Auto-answer the skill's questions**
(on by default). With it on, whenever a phase pauses, the page asks Claude to answer the questions as the
fictional domain owner with specific values (never TBC) and continues the phase. Answers are shown in an
"Auto-answered for the sample" panel on each phase. In a sample test run the skill is also told to ask only
when a required fact is completely missing, and to settle edge cases itself using the simplest reading of the
source material. After 3 auto-answer rounds on one phase, a **Resolve automatically** button lets the skill
settle the remaining points. Auto-answer is never available for an architect's own data: editing any field turns it off.

The button reads `sample.js`, which is generated from the
two Markdown files: after editing either of them, run `node scripts/build-sample.js`.

## Updating the skill

Edit `skill/SKILL.md`, then run:

```
node scripts/build-skill.js
```

The page always uses the skill text in `skill/skill.js`. Keep the phase list in
`js/phases.js` aligned with the skill's workflow if the phases change.
