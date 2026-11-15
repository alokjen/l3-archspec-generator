/* L3 Architecture Spec Generator
 * Drives the l3-domain-architecture-spec skill (skill/skill.js -> window.L3_SKILL)
 * one phase at a time, with a hard stop whenever input is missing.
 */
(function () {
  "use strict";

  const PHASES = window.L3_PHASES;
  const SKILL = window.L3_SKILL || "";
  const STORE_KEY = "l3spec.state.v1";
  const $ = (id) => document.getElementById(id);

  // A host (e.g. the VS Code extension) can supply its own storage through window.L3_HOST_STORE.
  const HOST_STORE = window.L3_HOST_STORE || null;

  // ---------- State ----------
  const freshState = () => ({
    intake: {},
    files: [],               // [{name, text}]
    current: 0,              // furthest active phase
    viewing: null,           // phase shown in main pane (null = intake form)
    started: false,
    autoAnswer: false,       // sample testing: Claude answers the skill's questions
    phases: PHASES.map(() => ({ status: "not_started", base: "", turns: [], parsed: null, approved: "" })),
  });
  let state = load() || freshState();
  let sample = null, downloads = null, mode = "connecting"; // connecting | live | manual
  let busy = false, abortCtl = null;

  function load() {
    try {
      const s = HOST_STORE ? HOST_STORE.get() : JSON.parse(localStorage.getItem(STORE_KEY));
      return s && s.phases && s.phases.length === PHASES.length ? s : null;
    } catch (e) { return null; }
  }
  function save() {
    try { if (HOST_STORE) HOST_STORE.set(JSON.parse(JSON.stringify(state))); else localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { /* storage unavailable */ }
  }

  // ---------- Claude connection ----------
  async function connect() {
    for (let i = 0; i < 15 && !(window.claude && window.claude.use); i++) await sleep(200);
    if (window.claude && window.claude.use) {
      try { sample = await window.claude.use("sample"); } catch (e) { sample = null; }
      try { downloads = await window.claude.use("downloads"); } catch (e) { downloads = null; }
    }
    mode = sample ? "live" : "manual";
    const c = $("connStatus");
    c.className = "conn " + (sample ? "conn-ok" : "conn-manual");
    c.textContent = sample ? (window.L3_CONNECTED_LABEL || "Connected to Claude") : "Manual mode (copy / paste)";
    render();
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Local calendar date (YYYY-MM-DD) in the viewer's time zone.
  const localDate = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

  // ---------- Intake ----------
  const REQUIRED = [
    ["domainName", "L3 domain name"],
    ["parentL4", "Parent L4 domain"],
    ["scope", "Scope boundary"],
    ["drivers", "Business drivers"],
  ];
  const meaningful = (v) => (v || "").replace(/\s+/g, " ").trim().length >= 3;

  function readForm() {
    const fd = new FormData($("intakeForm"));
    const o = {}; for (const [k, v] of fd.entries()) o[k] = String(v).trim();
    return o;
  }
  function fillForm() {
    const f = $("intakeForm");
    Object.entries(state.intake).forEach(([k, v]) => { if (f.elements[k]) f.elements[k].value = v; });
    renderFiles();
  }
  function validateIntake(o) {
    const missing = [];
    document.querySelectorAll("#intakeForm .invalid").forEach((el) => el.classList.remove("invalid"));
    REQUIRED.forEach(([k, label]) => { if (!meaningful(o[k])) { missing.push(label); $("intakeForm").elements[k].classList.add("invalid"); } });
    const hasSource = meaningful(o.sources) || state.files.some((f) => meaningful(f.text));
    if (!hasSource) { missing.push("Source material or domain knowledge (paste text or attach a file)"); $("intakeForm").elements.sources.classList.add("invalid"); }
    return missing;
  }

  $("fileInput").addEventListener("change", async (e) => {
    for (const file of e.target.files) {
      try { state.files.push({ name: file.name, text: await file.text() }); }
      catch (err) { state.files.push({ name: file.name + " (could not be read)", text: "" }); }
    }
    e.target.value = ""; save(); renderFiles();
  });
  function renderFiles() {
    const ul = $("fileList"); ul.innerHTML = "";
    state.files.forEach((f, i) => {
      const li = document.createElement("li");
      li.textContent = f.name + " — " + f.text.length.toLocaleString() + " chars";
      const b = document.createElement("button"); b.type = "button"; b.textContent = "Remove";
      b.onclick = () => { state.files.splice(i, 1); save(); renderFiles(); };
      li.appendChild(b); ul.appendChild(li);
    });
  }

  // ---------- Sample data ----------
  const SAMPLE = window.L3_SAMPLE;
  let sampleArmed = false;
  function formHasInput() {
    const o = readForm();
    return Object.values(o).some((v) => v) || state.files.length > 0;
  }
  function loadSample() {
    const btn = $("loadSampleBtn");
    if (formHasInput() && !sampleArmed) {
      sampleArmed = true;
      btn.textContent = "Click again to replace";
      setTimeout(() => { sampleArmed = false; btn.textContent = "Load sample data"; }, 4000);
      return;
    }
    sampleArmed = false; btn.textContent = "Load sample data";
    const f = $("intakeForm");
    f.reset();
    Object.entries(SAMPLE.fields).forEach(([k, v]) => { if (f.elements[k]) f.elements[k].value = v; });
    state.files = SAMPLE.files.map((x) => ({ name: x.name, text: x.text }));
    state.intake = readForm();
    document.querySelectorAll("#intakeForm .invalid").forEach((el) => el.classList.remove("invalid"));
    $("intakeError").hidden = true;
    save(); renderFiles(); updateAutoToggle();
    const msg = $("sampleMsg");
    msg.hidden = false;
    msg.innerHTML = "<strong>Sample loaded:</strong> " + esc(SAMPLE.title) + ". All fields are filled, including the source material box. " +
      "If a phase still asks questions, the auto-answer option below answers them for you; you still approve each phase to continue. " +
      "Click <strong>Start generation</strong> to begin. Clear the Parent L4 domain first if you want to see the required-field check.";
  }
  // True only when the form holds the sample exactly as shipped, so auto-answers
  // can never be invented for an architect's real data.
  function isUnmodifiedSample(o) {
    if (!SAMPLE || !SAMPLE.fields || state.files.length) return false;
    const keys = new Set(Object.keys(SAMPLE.fields).concat(Object.keys(o)));
    for (const k of keys) if ((o[k] || "").trim() !== (SAMPLE.fields[k] || "").trim()) return false;
    return true;
  }
  function updateAutoToggle() { $("autoAnswerWrap").hidden = !isUnmodifiedSample(readForm()); }
  if (SAMPLE && SAMPLE.fields) { $("sampleBar").hidden = false; $("loadSampleBtn").onclick = loadSample; }

  $("intakeForm").addEventListener("input", () => { state.intake = readForm(); save(); updateAutoToggle(); });
  $("intakeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const o = readForm(); state.intake = o;
    const missing = validateIntake(o);
    const err = $("intakeError");
    if (missing.length) {
      err.hidden = false;
      err.innerHTML = "<strong>Generation stopped — required context is missing.</strong> The skill never assumes content, so please provide:<ul>" +
        missing.map((m) => "<li>" + esc(m) + "</li>").join("") + "</ul>";
      state.phases[0].status = state.started ? state.phases[0].status : "needs_input";
      save(); renderTracker(); err.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    err.hidden = true;
    // (Re)start from Phase 0 with the current context.
    const files = state.files;
    state = freshState(); state.intake = o; state.files = files; state.started = true;
    state.autoAnswer = $("autoAnswerChk").checked && isUnmodifiedSample(o);
    state.viewing = 0; save();
    startPhase(0);
  });

  // ---------- Prompt construction ----------
  function contextBlock() {
    const i = state.intake, L = [];
    const add = (label, v) => { if (meaningful(v)) L.push("### " + label + "\n" + v); };
    add("L3 domain name (the domain this specification covers)", i.domainName); add("Parent L4 domain", i.parentL4 || i.l1l2); add("Scope boundary", i.scope);
    add("Business drivers, objectives, horizon", i.drivers); add("Stakeholders", i.stakeholders);
    add("Frameworks / conventions", i.frameworks);
    const meta = ["version", "author", "status", "reviewers"].filter((k) => meaningful(i[k])).map((k) => k + ": " + i[k]);
    meta.push("date: " + localDate() + " (date of this generation run; use it as the Document Control date)");
    L.push("### Document metadata\n" + meta.join("\n"));
    L.push("### Output format\nMarkdown document with tables and embedded Mermaid diagrams, assembled by the tool.");
    add("Source material and domain knowledge", i.sources);
    state.files.forEach((f) => { if (meaningful(f.text)) L.push("### Attached file: " + f.name + "\n```\n" + f.text + "\n```"); });
    return L.join("\n\n");
  }

  function approvedBlock(upTo) {
    const parts = [];
    for (let k = 0; k < upTo; k++) if (state.phases[k].approved) parts.push(state.phases[k].approved);
    return parts.length ? parts.join("\n\n---\n\n") : "(none yet)";
  }

  function phaseRules(p) {
    const extra = {
      0: "This is the intake checkpoint. In SECTION write '## Intake Summary' covering the L3 domain, its parent L4 domain, scope, drivers, stakeholders, sources received, additional conventions, output destination and document metadata, strictly from the context. In QUESTIONS list what is missing or unclear for the intake (do not ask for anything already supplied).",
      7: "Write the Executive Summary ONLY from the approved sections. Introduce no new facts. Roughly one page.",
      8: "Run every Phase 8 check against the approved sections. SECTION must contain exactly three headings: '## Appendix A: Glossary', '## Appendix B: Open Items & Assumptions' (every [TBC] item with owner) and '## Appendix C: Validation Results' (table: Check | Result | Notes). If a check fails and an approved section needs correcting, use NEEDS_INPUT and state the exact correction in QUESTIONS so the architect can reopen that phase.",
    }[p.id] || "";
    return [
      "<tool_protocol>",
      "You are executing " + p.title + " ONLY. Do not draft any other phase.",
      "Address the architect directly; they cannot see this protocol.",
      "Organisation domain hierarchy: the domain being specified is an L3 domain, and its parent is an L4 domain. Follow the skill's Domain hierarchy section.",
      "Reply in EXACTLY this format, with nothing before the STATUS line:",
      "STATUS: NEEDS_INPUT or READY_FOR_REVIEW",
      "===QUESTIONS===",
      "<numbered clarifying questions grouped by topic, offering options where helpful; or the single word None>",
      "===SECTION===",
      "<Markdown for this section starting with the heading '## " + p.heading + "'>",
      "",
      "Use NEEDS_INPUT whenever information this phase requires is missing, ambiguous or contradictory, or when a proposal needs the architect's confirmation. Include any draft that the supplied facts support and leave gaps visible; if the context contains nothing relevant to this phase, leave SECTION empty and ask.",
      "Use READY_FOR_REVIEW only when no open questions remain apart from items the architect explicitly deferred, which must appear as [TBC: <what is needed> — owner: <name if given>].",
      "Put diagrams in ```mermaid fenced blocks that follow the skill's diagram conventions and are syntactically valid.",
      "If tools are available to you (for example MCP tools for BAM or the enterprise NFR standards), use them as the skill's Enterprise architecture standards require: look up what the architect has not supplied, and cite the tool as the source. Never call a tool to change or create anything. If no suitable tool is available, ask the architect.",
      extra,
      state.autoAnswer ? "TEST RUN with fictional sample data: use NEEDS_INPUT only when a fact the section requires is completely missing. For edge cases, timing nuances, cross-references between sections and wording choices, choose the simplest reading consistent with the source material and earlier answers, state it in the section as a confirmed decision, and do not ask about it." : "",
      "</tool_protocol>",
    ].join("\n");
  }

  function buildBase(i) {
    const p = PHASES[i];
    return [
      "You are running the skill below inside a web tool used by an enterprise architect. Follow it exactly, especially the core rules: never assume, separate facts from proposals, and stop to ask when information is missing.",
      "<skill>\n" + SKILL + "\n</skill>",
      phaseRules(p),
      "<architect_context>\n" + contextBlock() + "\n</architect_context>",
      "<approved_sections>\n" + approvedBlock(i) + "\n</approved_sections>",
      "Begin " + p.title + " now.",
    ].join("\n\n");
  }

  function messagesFor(i) {
    const ph = state.phases[i];
    return [{ role: "user", content: ph.base }].concat(ph.turns);
  }

  // ---------- Response parsing ----------
  function parse(raw) {
    const text = raw.replace(/^\s*```[a-z]*\n([\s\S]*?)\n```\s*$/i, "$1");
    const m = text.match(/STATUS:\s*\**\s*(NEEDS_INPUT|READY_FOR_REVIEW)/i);
    const qi = text.indexOf("===QUESTIONS==="), si = text.indexOf("===SECTION===");
    if (!m || si < 0) {
      return { status: "NEEDS_INPUT", malformed: true, section: "",
        questions: "The response did not follow the expected format, so it is shown as-is. Reply below to continue.\n\n" + raw };
    }
    let questions = qi >= 0 && qi < si ? text.slice(qi + 15, si).trim() : "";
    if (/^none\.?$/i.test(questions)) questions = "";
    return { status: m[1].toUpperCase(), questions, section: text.slice(si + 13).trim() };
  }

  // ---------- Phase engine ----------
  function startPhase(i) {
    const ph = state.phases[i];
    ph.base = buildBase(i); ph.turns = []; ph.parsed = null; ph.approved = "";
    ph.autoAnswers = []; ph.autoRounds = 0; ph.toolsUsed = [];
    state.current = Math.max(state.current, i); state.viewing = i;
    generate(i);
  }

  async function generate(i) {
    const ph = state.phases[i];
    $("errorBox").hidden = true;
    if (mode !== "live") { ph.status = ph.parsed ? ph.status : "needs_input"; save(); render(); showManual(i); return; }
    busy = true; ph.status = "generating"; save(); render();
    $("streamLabel").textContent = "Generating…";
    $("streamText").textContent = "";
    abortCtl = new AbortController();
    try {
      const res = await sample(messagesFor(i), {
        modelTier: "complex", cache: false, signal: abortCtl.signal,
        onText: ({ text }) => { $("streamText").textContent = text; const pre = $("streamText"); pre.scrollTop = pre.scrollHeight; },
      });
      if (res.toolsUsed && res.toolsUsed.length) ph.toolsUsed = (ph.toolsUsed || []).concat(res.toolsUsed);
      accept(i, res.text);
    } catch (err) {
      busy = false;
      if (err && err.code === "not_granted") { mode = "manual"; $("connStatus").className = "conn conn-manual"; $("connStatus").textContent = "Manual mode (copy / paste)"; }
      ph.status = ph.parsed ? (ph.parsed.status === "READY_FOR_REVIEW" ? "review" : "needs_input") : "not_started";
      // Drop the unanswered user turn so it can be resent.
      if (ph.turns.length && ph.turns[ph.turns.length - 1].role === "user") ph.pendingReply = ph.turns.pop().content;
      save(); render();
      const box = $("errorBox"); box.hidden = false;
      box.innerHTML = "<strong>Generation did not complete.</strong> " + esc((err && err.message) || String(err)) +
        (err && err.code === "rate_limited" ? " Please wait a minute before retrying." : "") +
        ' <button class="btn" type="button" id="retryBtn">Retry</button>';
      $("retryBtn").onclick = () => retry(i);
      if (mode === "manual") showManual(i);
    }
  }

  function retry(i) {
    const ph = state.phases[i];
    if (ph.pendingReply) { ph.turns.push({ role: "user", content: ph.pendingReply }); ph.pendingReply = null; }
    if (!ph.base) ph.base = buildBase(i);
    generate(i);
  }

  function accept(i, raw) {
    const ph = state.phases[i];
    busy = false;
    ph.turns.push({ role: "assistant", content: raw });
    ph.parsed = parse(raw);
    ph.status = ph.parsed.status === "READY_FOR_REVIEW" ? "review" : "needs_input";
    save(); render();
    if (ph.status === "needs_input" && state.autoAnswer && mode === "live" && !ph.parsed.malformed &&
        ph.parsed.questions && (ph.autoRounds || 0) < MAX_AUTO_ROUNDS) autoAnswer(i);
  }

  // ---------- Auto-answer (sample testing only) ----------
  const MAX_AUTO_ROUNDS = 3;
  const RESOLVE_NOTE = "Domain owner instruction for this test run: if these answers raise any further minor point, resolve it yourself with the simplest option consistent with the source material and earlier answers, record it in the section as a confirmed decision, and return READY_FOR_REVIEW instead of asking again.";
  const RESOLVE_ALL = "Domain owner instruction for this test run: resolve every open question above yourself, choosing the simplest option consistent with the source material and earlier answers. Record each choice in the section as a confirmed decision, do not mark anything [TBC], and return READY_FOR_REVIEW.";
  function resolveAutomatically(i) {
    const ph = state.phases[i];
    ph.autoAnswers = (ph.autoAnswers || []).concat([{ questions: ph.parsed.questions, answers: "(Resolved by the skill using the simplest option consistent with the source material.)" }]);
    ph.turns.push({ role: "user", content: RESOLVE_ALL });
    save(); generate(i);
  }
  async function autoAnswer(i) {
    const ph = state.phases[i];
    const earlier = [];
    state.phases.forEach((p, k) => (p.autoAnswers || []).forEach((a) => earlier.push("Phase " + k + ":\n" + a.answers)));
    const prompt = [
      "You are answering on behalf of Sarah Patel, domain owner of the FICTIONAL test organisation Harbor Point Insurance.",
      "An architecture-specification skill has paused on " + PHASES[i].title + " and asked the questions below. Answer every question so the specification can proceed.",
      "Rules:",
      "- Give a definite, specific, valid answer to every question. Never defer, never answer TBC, never say unknown or to be confirmed.",
      "- Choose what is simplest and most consistent with the source material and earlier answers. When options are offered, pick one by its letter and supply any value it asks for.",
      "- Never contradict facts already stated in the source material or earlier answers.",
      "- Prefer answers that close the question without adding new mechanisms, exceptions, jobs, phases, dates or dependencies. Never defer anything to a later date, run or phase.",
      "- If a question asks for a confirmation (for example by the L4 architecture board or the domain owner), state that it is confirmed.",
      "- Output only a numbered list whose numbers match the questions. No preamble.",
      "<source_material>\n" + (state.intake.sources || "") + "\n</source_material>",
      "<earlier_answers>\n" + (earlier.join("\n\n") || "(none)") + "\n</earlier_answers>",
      "<questions>\n" + ph.parsed.questions + "\n</questions>",
    ].join("\n");
    busy = true; ph.status = "generating"; ph.autoRounds = (ph.autoRounds || 0) + 1; save(); render();
    $("streamLabel").textContent = "Auto-answering the skill's questions for the sample (round " + ph.autoRounds + " of " + MAX_AUTO_ROUNDS + ")…";
    $("streamText").textContent = "";
    try {
      const res = await sample(prompt, { modelTier: "default", cache: false, hostTools: false,
        onText: ({ text }) => { $("streamText").textContent = text; } });
      const answers = res.text.trim();
      ph.autoAnswers.push({ questions: ph.parsed.questions, answers });
      ph.turns.push({ role: "user", content: "Answers from the domain owner:\n" + answers + "\n\n" + RESOLVE_NOTE });
      save();
      generate(i);
    } catch (err) {
      busy = false; ph.status = "needs_input"; save(); render();
      const box = $("errorBox"); box.hidden = false;
      box.innerHTML = "<strong>Auto-answer did not complete.</strong> " + esc((err && err.message) || String(err)) + " Answer the questions below yourself, or retry.";
    }
  }

  function sendReply() {
    const i = state.viewing, ph = state.phases[i];
    const txt = $("replyText").value.trim();
    const err = $("replyError");
    if (!txt) {
      err.hidden = false;
      err.textContent = ph.status === "needs_input"
        ? "Please answer the questions above (or say which items to defer as [TBC]) before the skill can continue."
        : "Describe the changes you want, or choose Approve & continue.";
      return;
    }
    err.hidden = true;
    ph.turns.push({ role: "user", content: txt });
    $("replyText").value = "";
    generate(i);
  }

  function approve() {
    const i = state.viewing, ph = state.phases[i];
    if (ph.status !== "review" || !ph.parsed) return;
    ph.approved = ph.parsed.section; ph.status = "approved";
    const next = PHASES.findIndex((p, k) => state.phases[k].status !== "approved");
    save();
    if (next === -1) { state.viewing = "doc"; save(); render(); return; }
    if (state.phases[next].status === "not_started") startPhase(next);
    else { state.viewing = next; save(); render(); }
  }

  function reopen(i) {
    const ph = state.phases[i];
    ph.status = "review"; ph.approved = "";
    // Executive summary and validation depend on every section — reset them.
    if (i < 7) [7, 8].forEach((k) => { if (k !== i) state.phases[k] = { status: "not_started", base: "", turns: [], parsed: null, approved: "" }; });
    state.current = Math.min(state.current, Math.max(i, 7));
    state.viewing = i; save(); render();
  }

  // ---------- Manual mode ----------
  function manualPrompt(i) {
    return messagesFor(i).map((m, k) => k === 0 ? m.content
      : (m.role === "assistant" ? "[Your previous reply]\n" : "[Architect's response]\n") + m.content).join("\n\n");
  }
  function showManual(i) {
    $("manualBox").hidden = false;
    $("copyPromptBtn").onclick = async () => {
      const ph = state.phases[i];
      if (!ph.base) ph.base = buildBase(i);
      const reply = $("replyText").value.trim();
      if (reply) { ph.turns.push({ role: "user", content: reply }); $("replyText").value = ""; save(); }
      try { await navigator.clipboard.writeText(manualPrompt(i)); $("copyPromptMsg").textContent = "Copied. Paste it into a Claude chat."; }
      catch (e) { $("manualResponse").value = manualPrompt(i); $("manualResponse").select(); $("copyPromptMsg").textContent = "Clipboard blocked — the prompt is in the box below; copy it, then replace it with Claude's reply."; }
    };
    $("useManualBtn").onclick = () => {
      const raw = $("manualResponse").value.trim();
      if (!/STATUS:/i.test(raw)) { $("copyPromptMsg").textContent = "Paste Claude's full reply (it starts with STATUS:)."; return; }
      $("manualResponse").value = ""; $("copyPromptMsg").textContent = "";
      if (!state.phases[i].base) state.phases[i].base = buildBase(i);
      accept(i, raw);
    };
  }

  // ---------- Rendering ----------
  const STATUS_LABEL = { not_started: "Not started", generating: "Generating", needs_input: "Needs your input", review: "Ready for review", approved: "Approved" };
  const STATUS_COLOR = { not_started: "var(--s-not)", generating: "var(--s-gen)", needs_input: "var(--s-input)", review: "var(--s-review)", approved: "var(--s-ok)" };

  function render() {
    renderTracker();
    const v = state.viewing;
    $("intakeView").hidden = !(v === null || v === "intake");
    $("phaseView").hidden = !(typeof v === "number");
    $("docView").hidden = v !== "doc";
    if (typeof v === "number") renderPhase(v);
    if (v === "doc") renderDoc();
  }

  function renderTracker() {
    const ol = $("trackerList"); ol.innerHTML = "";
    const intakeLi = document.createElement("li");
    if (state.viewing === null || state.viewing === "intake") intakeLi.className = "current";
    intakeLi.innerHTML = '<button type="button"><span class="num" style="background:var(--accent)">✎</span><span class="lbl">Architect context<small>Edit inputs</small></span></button>';
    intakeLi.firstChild.onclick = () => { if (busy) return; state.viewing = "intake"; save(); render(); };
    ol.appendChild(intakeLi);
    PHASES.forEach((p, i) => {
      const ph = state.phases[i];
      const li = document.createElement("li");
      if (state.viewing === i) li.className = "current";
      const b = document.createElement("button"); b.type = "button";
      b.disabled = ph.status === "not_started" || busy;
      b.innerHTML = '<span class="num s-' + ph.status + '">' + (ph.status === "approved" ? "✓" : i) + '</span><span class="lbl">' +
        esc(p.short) + "<small>" + STATUS_LABEL[ph.status] + "</small></span>";
      b.onclick = () => { state.viewing = i; save(); render(); };
      li.appendChild(b); ol.appendChild(li);
    });
    $("viewDocBtn").disabled = busy || !state.phases.some((p) => p.approved);
    $("viewDocBtn").onclick = () => { state.viewing = "doc"; save(); render(); };
  }

  function renderPhase(i) {
    const p = PHASES[i], ph = state.phases[i], parsed = ph.parsed;
    $("phaseEyebrow").textContent = "Phase " + i + " of " + (PHASES.length - 1);
    $("phaseTitle").textContent = p.title.replace(/^Phase \d+ — /, "");
    $("phaseNeeds").textContent = "Needs: " + p.needs;
    const badge = $("phaseBadge"); badge.textContent = STATUS_LABEL[ph.status]; badge.style.background = STATUS_COLOR[ph.status];

    const generating = ph.status === "generating";
    $("streamBox").hidden = !generating;
    $("phaseStop").hidden = ph.status !== "needs_input" || !parsed;
    const qs = parsed && parsed.questions;
    $("questionsBox").hidden = generating || !qs;
    if (qs && !generating) renderMd($("questionsBody"), qs);
    const autos = ph.autoAnswers || [];
    $("autoBox").hidden = generating || !autos.length;
    if (autos.length && !generating) {
      $("autoSummary").textContent = "Auto-answered for the sample: " + autos.length + " round" + (autos.length > 1 ? "s" : "") + " (click to see the questions and answers)";
      renderMd($("autoBody"), autos.map((a, n) => "**Round " + (n + 1) + " questions**\n\n" + a.questions + "\n\n**Answers**\n\n" + a.answers).join("\n\n---\n\n"));
    }
    if (ph.status === "needs_input" && state.autoAnswer && (ph.autoRounds || 0) >= MAX_AUTO_ROUNDS) {
      const box = $("errorBox"); box.hidden = false;
      box.innerHTML = "Auto-answer has already run " + MAX_AUTO_ROUNDS + " times on this phase. Answer the remaining questions yourself, or let the skill settle them using the simplest option consistent with the sample. " +
        '<button class="btn btn-primary" type="button" id="resolveAutoBtn">Resolve automatically</button>';
      $("resolveAutoBtn").onclick = () => resolveAutomatically(i);
    }
    const used = ph.toolsUsed || [];
    $("toolsNote").hidden = generating || !used.length;
    if (used.length) {
      const counts = {};
      used.forEach((n) => { counts[n] = (counts[n] || 0) + 1; });
      $("toolsNote").textContent = "Tools used in this phase: " + Object.entries(counts).map(([n, c]) => n + (c > 1 ? " ×" + c : "")).join(", ");
    }
    const sec = ph.status === "approved" ? ph.approved : parsed && parsed.section;
    $("sectionBox").hidden = generating || !sec;
    if (sec && !generating) renderMd($("sectionBody"), sec);
    $("manualBox").hidden = !(mode === "manual" && !generating && ph.status !== "approved");
    if (mode === "manual" && ph.status !== "approved") showManual(i);

    const interactive = !generating && ph.status !== "approved" && ph.status !== "not_started" && !!parsed;
    $("replyBox").hidden = !interactive;
    $("replyError").hidden = true;
    if (interactive) {
      const review = ph.status === "review";
      $("replyLabel").textContent = review ? "Requested changes (optional)" : "Your answers";
      $("replyText").placeholder = review ? "Describe any corrections, or approve to move on." : "Answer by number, e.g. 1. … 2. … — or write \"defer 3 as TBC, owner: …\"";
      $("sendReplyBtn").textContent = mode === "manual" ? "Add to prompt" : (review ? "Request revision" : "Submit answers");
      $("sendReplyBtn").hidden = mode === "manual";
      $("approveBtn").disabled = !review;
      $("approveBtn").title = review ? "" : "Answer the open questions first";
      $("approveBtn").textContent = i === PHASES.length - 1 ? "Approve & assemble specification" : "Approve & continue";
    }
    if (ph.status === "not_started" && mode === "live" && !busy) {
      const box = $("errorBox"); box.hidden = false;
      box.innerHTML = 'This phase has not produced a result yet. <button class="btn" type="button" id="retryBtn2">Generate</button>';
      $("retryBtn2").onclick = () => retry(i);
    }
    const note = $("readOnlyNote");
    note.hidden = ph.status !== "approved";
    if (ph.status === "approved") note.innerHTML = 'This phase is approved. <button class="btn" type="button" id="reopenBtn">Reopen for revision</button>';
    if (ph.status === "approved") $("reopenBtn").onclick = () => reopen(i);
  }

  function assembleDoc() {
    const i = state.intake;
    const title = "# " + (i.domainName || "Domain") + " — L3 Domain Architecture Specification";
    const today = localDate();
    const dc = "## Document Control\n\n| Field | Value |\n|---|---|\n" +
      [["L3 domain", i.domainName], ["Parent L4 domain", i.parentL4 || i.l1l2], ["Version", i.version], ["Author", i.author], ["Status", i.status], ["Reviewers", i.reviewers], ["Date", today]]
        .map(([k, v]) => "| " + k + " | " + (v || "[TBC]") + " |").join("\n");
    const order = [7, 1, 2, 3, 4, 5, 6, 8];
    const body = order.map((k) => state.phases[k].approved || ("## " + PHASES[k].heading + "\n\n_Not yet approved._"));
    return [title, dc].concat(body).join("\n\n");
  }
  function renderDoc() {
    const allDone = state.phases.every((p) => p.status === "approved");
    $("docMsg").textContent = allDone ? "All phases approved and validated." : "Draft — some phases are not yet approved.";
    renderMd($("docBody"), assembleDoc());
  }
  $("copyDocBtn").onclick = async () => {
    try { await navigator.clipboard.writeText(assembleDoc()); $("docMsg").textContent = "Markdown copied to clipboard."; }
    catch (e) { $("docMsg").textContent = "Clipboard is blocked here — use Download instead."; }
  };
  $("downloadDocBtn").onclick = async () => {
    const name = (state.intake.domainName || "domain").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-l3-spec.md";
    const md = assembleDoc();
    if (downloads) {
      try { await downloads.save({ filename: name, data: md }); $("docMsg").textContent = "Saved " + name + "."; }
      catch (e) { $("docMsg").textContent = "Download was not completed (" + ((e && e.message) || "declined") + ")."; }
      return;
    }
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" })); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { $("docMsg").textContent = "Download is not available here — use Copy Markdown."; }
  };

  // ---------- Markdown + Mermaid ----------
  let mermaidReady = false, mermaidSeq = 0;
  function initMermaid() {
    if (window.mermaid && !mermaidReady) { window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" }); mermaidReady = true; }
  }
  async function renderMd(el, md) {
    if (!window.marked) { el.innerHTML = "<pre></pre>"; el.firstChild.textContent = md; return; }
    let html = window.marked.parse(md, { gfm: true });
    if (window.DOMPurify) html = window.DOMPurify.sanitize(html);
    el.innerHTML = html;
    initMermaid();
    const blocks = el.querySelectorAll("pre > code.language-mermaid");
    for (const code of blocks) {
      const src = code.textContent, holder = document.createElement("div");
      holder.className = "mermaid";
      code.parentElement.replaceWith(holder);
      if (!mermaidReady) { holder.innerHTML = "<pre></pre>"; holder.firstChild.textContent = src; continue; }
      try {
        const { svg } = await window.mermaid.render("mmd" + ++mermaidSeq, src);
        holder.innerHTML = svg;
      } catch (e) {
        holder.innerHTML = '<p class="mermaid-error"></p><pre></pre>';
        holder.querySelector(".mermaid-error").textContent = "Diagram syntax error: " + ((e && e.message) || e) + " — ask for a revision.";
        holder.querySelector("pre").textContent = src;
      }
    }
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- Wiring ----------
  $("sendReplyBtn").onclick = sendReply;
  $("approveBtn").onclick = approve;
  let resetArmed = false;
  $("resetBtn").onclick = () => {
    if (!resetArmed) { resetArmed = true; $("resetBtn").textContent = "Click again to confirm"; setTimeout(() => { resetArmed = false; $("resetBtn").textContent = "Start over"; }, 3000); return; }
    if (abortCtl) abortCtl.abort();
    state = freshState(); busy = false; save(); $("intakeForm").reset(); fillForm(); render(); resetArmed = false; $("resetBtn").textContent = "Start over";
  };

  if (!SKILL) {
    document.body.insertAdjacentHTML("afterbegin", '<div class="alert alert-stop" style="margin:12px 24px">skill/skill.js is missing — run <code>node scripts/build-skill.js</code>.</div>');
  }
  // A generation interrupted by closing the page cannot resume; mark it for retry.
  state.phases.forEach((ph) => { if (ph.status === "generating") ph.status = ph.parsed ? (ph.parsed.status === "READY_FOR_REVIEW" ? "review" : "needs_input") : "not_started"; });
  if (state.viewing === null) state.viewing = "intake";
  fillForm(); updateAutoToggle(); render(); connect();
})();
