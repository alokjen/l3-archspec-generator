# L3 Architecture Spec Generator for VS Code

Runs the L3 Architecture Spec Generator page inside VS Code, using **Claude models through GitHub Copilot**.
The page, the form, the phase-by-phase generation, the progress tracker, **Load sample data**, auto-answer
and **Download .md** all work as on the hosted version.

- No request goes to claude.ai. Model calls go through VS Code's Language Model API to GitHub Copilot.
- No public CDN is used. The Markdown, sanitising and Mermaid libraries are bundled.
- Your work is saved inside VS Code and survives closing the tab or restarting VS Code.

## Requirements

- VS Code 1.95 or later (1.102 or later to use MCP servers).
- GitHub Copilot Chat installed and signed in.
- A Claude model enabled in your Copilot plan (your Copilot administrator controls this policy).

## Install

1. In VS Code, open the Extensions view.
2. Open the `...` menu and choose **Install from VSIX...**.
3. Select `l3-archspec-generator.vsix`.

## Use

1. Run **L3 Spec Generator: Open** from the Command Palette (Ctrl+Shift+P / Cmd+Shift+P).
2. The first time the page calls a model, VS Code asks you to allow the extension to use GitHub Copilot's
   language models. Choose **Allow**.
3. Fill in the form (or click **Load sample data**) and click **Start generation**.

The header shows which Copilot model is in use. To change it, run **L3 Spec Generator: Choose model**
(Claude models are listed first), or set `l3spec.model` in Settings.

**Download .md** opens a Save dialog and writes the specification to the folder you choose.

## MCP tools (BAM, enterprise NFR standards and others)

The model automatically finds the MCP tools registered in VS Code and runs them when the skill needs
them. For example, it looks up an application's data classification in BAM, or an NFR target in the
enterprise NFR standards, when you haven't supplied it. It cites the tool as the source in the specification.

- Only tools from MCP servers are offered to the model. VS Code's built-in tools (which can edit files or
  run terminal commands) are not, and a request for any tool that wasn't offered is refused.
- While a phase is generating, the page shows each tool being queried. Afterwards, the phase lists the
  tools it used.
- Every tool call and its result is logged in **View → Output → L3 Spec Generator**.
- **L3 Spec Generator: Show available MCP tools** lists the tools the model can use. The page header shows
  how many there are.
- If a tool you expect is missing, start its server first: run **MCP: List Servers** and start it.
- VS Code may ask you to approve a tool call before it runs, depending on your tool approval settings.
- When you test with the fictional sample, auto-answers never call tools, so no real system is queried
  for sample data.

Settings:

| Setting | Default | Purpose |
|---|---|---|
| `l3spec.tools.enabled` | `true` | Set to `false` to stop the model from using tools. |
| `l3spec.tools.allow` | `[]` | Optional list of regular expressions; only matching MCP tools are offered (for example `^mcp_bam_` and `nfr`). Empty offers all MCP tools. |
| `l3spec.tools.maxRounds` | `8` | Maximum rounds of tool calls in one generation step before the model must finish its reply. |

The tools run with the access your MCP servers already have. If a server has tools that change data,
use `l3spec.tools.allow` to offer only the read-only lookups the skill needs.

## Rebuild after changing the page or the skill

From the `vscode-extension` folder (needs Node.js and access to an npm registry):

```
npm install
npm run package
```

This copies the page from the parent folder into `media/web/`, copies the libraries into `media/vendor/`,
and produces `l3-archspec-generator.vsix`.
