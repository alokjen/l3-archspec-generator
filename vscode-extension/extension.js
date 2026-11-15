// L3 Architecture Spec Generator: VS Code extension host.
// Opens the generator page in a webview tab and answers its model requests with
// Claude models available through GitHub Copilot (VS Code Language Model API).
// No request goes to claude.ai; nothing is loaded from public CDNs.
"use strict";
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { buildWebviewHtml } = require("./webview-html");

const STATE_KEY = "l3spec.pageState";
const MAX_TOOL_ROUNDS = 8;
let output = null;
function log(line) { if (!output) output = vscode.window.createOutputChannel("L3 Spec Generator"); output.appendLine("[" + new Date().toISOString() + "] " + line); }
const MODEL_KEY = "l3spec.chosenModel";
let panel = null;

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("l3spec.open", () => openPanel(context)),
    vscode.commands.registerCommand("l3spec.selectModel", () => pickModel(context)),
    vscode.commands.registerCommand("l3spec.showTools", () => showTools())
  );
}

// ---------- Model selection ----------
function describe(m) { return m.name + " (" + m.family + ")"; }
function matches(m, pref) {
  const p = pref.toLowerCase();
  return [m.id, m.family, m.name].some((v) => (v || "").toLowerCase() === p);
}

async function resolveModel(context) {
  const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
  if (!models.length) {
    const e = new Error("No GitHub Copilot models are available. Install GitHub Copilot Chat, sign in, and try again.");
    e.code = "no_model"; throw e;
  }
  const pref = vscode.workspace.getConfiguration("l3spec").get("model") || context.globalState.get(MODEL_KEY) || "";
  let model = pref ? models.find((m) => matches(m, pref)) : null;
  if (!model) model = models.find((m) => /claude/i.test([m.id, m.family, m.name].join(" ")));
  if (!model) {
    const e = new Error("No Claude model is available through your GitHub Copilot plan. Ask your Copilot administrator to enable Anthropic Claude models, or run 'L3 Spec Generator: Choose model' to pick another model.");
    e.code = "no_claude"; throw e;
  }
  return model;
}

async function pickModel(context) {
  const models = await vscode.lm.selectChatModels({ vendor: "copilot" });
  if (!models.length) { vscode.window.showWarningMessage("No GitHub Copilot models are available. Sign in to GitHub Copilot and try again."); return; }
  const items = models
    .map((m) => ({ label: m.name, description: m.family, detail: "id: " + m.id + (m.maxInputTokens ? " · max input " + m.maxInputTokens + " tokens" : ""), model: m }))
    .sort((a, b) => Number(/claude/i.test(b.label + b.description)) - Number(/claude/i.test(a.label + a.description)));
  const choice = await vscode.window.showQuickPick(items, { placeHolder: "Model for the L3 Spec Generator (Claude models listed first)" });
  if (!choice) return;
  await context.globalState.update(MODEL_KEY, choice.model.id);
  vscode.window.showInformationMessage("L3 Spec Generator will use " + describe(choice.model) + ".");
  if (panel) panel.webview.html = await renderHtml(context, panel.webview);
}

// ---------- MCP tools ----------
// Only tools from MCP servers registered in VS Code are offered to the model (not VS Code's
// built-in tools, which can edit files or run commands). l3spec.tools.allow narrows the list further.
function isMcpTool(t) {
  return /^mcp_/i.test(t.name) || (t.tags || []).some((tag) => /mcp/i.test(String(tag)));
}
function selectTools() {
  const cfg = vscode.workspace.getConfiguration("l3spec");
  if (cfg.get("tools.enabled") === false) return [];
  const allow = (cfg.get("tools.allow") || []).filter(Boolean).map((p) => new RegExp(p, "i"));
  return (vscode.lm.tools || [])
    .filter(isMcpTool)
    .filter((t) => !allow.length || allow.some((re) => re.test(t.name)));
}
async function showTools() {
  const tools = selectTools();
  if (!tools.length) {
    vscode.window.showWarningMessage("No MCP tools are available to the L3 Spec Generator. Start your MCP servers (run 'MCP: List Servers'), then try again.");
    return;
  }
  await vscode.window.showQuickPick(tools.map((t) => ({ label: t.name, detail: t.description })), { placeHolder: tools.length + " MCP tools the model can use (read only list)" });
}
function truncate(s, n) { s = String(s); return s.length > n ? s.slice(0, n) + "…" : s; }
function resultText(result) {
  return (result && result.content || []).map((p) => (p && typeof p.value === "string" ? p.value : "")).join("");
}

// ---------- Webview ----------
async function renderHtml(context, webview) {
  const media = vscode.Uri.joinPath(context.extensionUri, "media");
  const indexHtml = fs.readFileSync(path.join(context.extensionPath, "media", "web", "index.html"), "utf8");
  let label = "Connected via GitHub Copilot";
  try { label = "Copilot · " + (await resolveModel(context)).name; } catch (e) { label = "GitHub Copilot (no Claude model)"; }
  const toolCount = selectTools().length;
  label += " · " + toolCount + " MCP tool" + (toolCount === 1 ? "" : "s");
  return buildWebviewHtml({
    indexHtml,
    toUri: (rel) => webview.asWebviewUri(vscode.Uri.joinPath(media, ...rel.split("/"))).toString(),
    cspSource: webview.cspSource,
    nonce: crypto.randomBytes(16).toString("base64"),
    initialState: context.globalState.get(STATE_KEY) || null,
    label,
  });
}

async function openPanel(context) {
  if (panel) { panel.reveal(); return; }
  panel = vscode.window.createWebviewPanel("l3spec", "L3 Spec Generator", vscode.ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
  });
  panel.iconPath = new vscode.ThemeIcon("symbol-structure");
  const pending = new Map();
  panel.onDidDispose(() => { pending.forEach((c) => c.cancel()); panel = null; }, null, context.subscriptions);
  panel.webview.onDidReceiveMessage((msg) => handleMessage(context, msg, pending), null, context.subscriptions);
  panel.webview.html = await renderHtml(context, panel.webview);
}

function post(msg) { if (panel) panel.webview.postMessage(msg); }

async function handleMessage(context, msg, pending) {
  if (!msg || !msg.type) return;
  if (msg.type === "sample") return runModel(context, msg, pending);
  if (msg.type === "abort") { const c = pending.get(msg.id); if (c) c.cancel(); return; }
  if (msg.type === "store") { await context.globalState.update(STATE_KEY, msg.value); return; }
  if (msg.type === "save") return saveFile(msg);
}

function errorCode(e) {
  if (e && e.code === "no_model" || e && e.code === "no_claude") return e.code;
  if (e instanceof vscode.LanguageModelError) {
    // Not "not_granted": that would switch the page to copy/paste mode. Show the error with Retry instead.
    if (e.code === vscode.LanguageModelError.NoPermissions().code) return "permission_denied";
    if (e.code === vscode.LanguageModelError.Blocked().code) return "rate_limited";
    if (e.code === vscode.LanguageModelError.NotFound().code) return "no_model";
  }
  if (e instanceof vscode.CancellationError) return "aborted";
  return "error";
}

function maxToolRounds() {
  const n = Number(vscode.workspace.getConfiguration("l3spec").get("tools.maxRounds"));
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : MAX_TOOL_ROUNDS;
}

async function runModel(context, msg, pending) {
  const cts = new vscode.CancellationTokenSource();
  pending.set(msg.id, cts);
  const toolsUsed = [];   // reported back to the page, shown on the phase
  try {
    const model = await resolveModel(context);
    const input = typeof msg.input === "string" ? [{ role: "user", content: msg.input }] : msg.input;
    const messages = input.map((m) => (m.role === "assistant"
      ? vscode.LanguageModelChatMessage.Assistant(String(m.content))
      : vscode.LanguageModelChatMessage.User(String(m.content))));
    // The page sets useTools=false for auto-answers on the fictional sample, so no real system is queried for it.
    const tools = msg.useTools === false ? [] : selectTools();
    const offered = new Set(tools.map((t) => t.name));
    const chatTools = tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
    const rounds = maxToolRounds();
    const activity = [];   // shown in the page while generating
    let text = "";
    let last = 0;
    for (let round = 0; round < rounds; round++) {
      // On the last round, offer no tools so the model must produce its answer.
      const offerTools = chatTools.length > 0 && round < rounds - 1;
      const options = {
        justification: "The L3 Spec Generator uses a Claude model, and the MCP tools registered in VS Code, to draft an L3 domain architecture specification from the context you entered.",
      };
      if (offerTools) {
        options.tools = chatTools;
        if (vscode.LanguageModelChatToolMode) options.toolMode = vscode.LanguageModelChatToolMode.Auto;
      } else if (chatTools.length && round > 0) {
        messages.push(vscode.LanguageModelChatMessage.User("Tool-call limit reached. Do not call any more tools; finish your reply now with the information you have."));
      }
      const response = await model.sendRequest(messages, options, cts.token);
      const calls = [];
      text = "";
      for await (const part of response.stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
          text += part.value;
          const now = Date.now();
          if (now - last > 120) { post({ type: "sampleDelta", id: msg.id, text: activity.concat(text ? [text] : []).join("\n"), delta: part.value }); last = now; }
        } else if (part instanceof vscode.LanguageModelToolCallPart) {
          calls.push(part);
        }
      }
      if (!calls.length) break;

      // Run the requested MCP tools and send their results back to the model.
      messages.push(vscode.LanguageModelChatMessage.Assistant((text ? [new vscode.LanguageModelTextPart(text)] : []).concat(calls)));
      const results = [];
      for (const call of calls) {
        activity.push("Querying " + call.name + "…");
        post({ type: "sampleDelta", id: msg.id, text: activity.join("\n"), delta: "" });
        log("Tool call " + call.name + " input=" + truncate(JSON.stringify(call.input), 2000));
        try {
          if (!offered.has(call.name)) throw new Error("Tool " + call.name + " is not available to the L3 Spec Generator.");
          const result = await vscode.lm.invokeTool(call.name, { input: call.input, toolInvocationToken: undefined }, cts.token);
          log("Tool result " + call.name + ": " + truncate(resultText(result), 4000));
          activity[activity.length - 1] = "Queried " + call.name + ".";
          toolsUsed.push(call.name);
          results.push(new vscode.LanguageModelToolResultPart(call.callId, result.content));
        } catch (err) {
          if (err instanceof vscode.CancellationError) throw err;
          const why = (err && err.message) || String(err);
          log("Tool error " + call.name + ": " + why);
          activity[activity.length - 1] = "Could not query " + call.name + ": " + why;
          toolsUsed.push(call.name + " (failed)");
          results.push(new vscode.LanguageModelToolResultPart(call.callId, [new vscode.LanguageModelTextPart("Tool error: " + why)]));
        }
      }
      messages.push(vscode.LanguageModelChatMessage.User(results));
    }
    post({ type: "sampleDone", id: msg.id, text, model: model.id, toolsUsed });
  } catch (e) {
    const code = errorCode(e);
    let message = (e && e.message) || String(e);
    if (code === "permission_denied") message = "Permission to use GitHub Copilot models was not granted to the L3 Spec Generator. Click Retry and choose Allow when VS Code asks.";
    post({ type: "sampleError", id: msg.id, code, message });
  } finally {
    pending.delete(msg.id);
    cts.dispose();
  }
}

async function saveFile(msg) {
  const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  const defaultUri = folder ? vscode.Uri.joinPath(folder.uri, msg.filename) : vscode.Uri.file(path.join(require("os").homedir(), msg.filename));
  const uri = await vscode.window.showSaveDialog({ defaultUri, filters: { Markdown: ["md"] }, saveLabel: "Save specification" });
  if (!uri) { post({ type: "saveDone", id: msg.id, ok: false, message: "Save cancelled." }); return; }
  await vscode.workspace.fs.writeFile(uri, Buffer.from(msg.data, "utf8"));
  post({ type: "saveDone", id: msg.id, ok: true, path: uri.fsPath });
  const open = await vscode.window.showInformationMessage("Specification saved to " + uri.fsPath, "Open");
  if (open) vscode.window.showTextDocument(uri);
}

function deactivate() {}

module.exports = { activate, deactivate };
