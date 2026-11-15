// Phase definitions — mirror the workflow in skill/SKILL.md.
window.L3_PHASES = [
  {
    id: 0, short: "Intake", title: "Phase 0 — Intake",
    heading: "Intake Summary", inDoc: false,
    needs: "Confirm the L3 domain, its parent L4 domain, scope, drivers, stakeholders, sources, additional conventions, output destination and document metadata.",
  },
  {
    id: 1, short: "Current capabilities", title: "Phase 1 — Current State Business Capability Map",
    heading: "2. Current State Business Capability Map", inDoc: true,
    needs: "The L2 business capabilities within the L3 domain, with WFCM IDs and names: descriptions, owners, maturity or pain points.",
  },
  {
    id: 2, short: "Target capabilities", title: "Phase 2 — Target State Business Capability Map",
    heading: "3. Target State Business Capability Map", inDoc: true,
    needs: "Target L2 capabilities (WFCM) and change type (Retained / Enhanced / New / Consolidated / Retired) with rationale.",
  },
  {
    id: 3, short: "Current applications", title: "Phase 3 — Current State Application Landscape",
    heading: "4. Current State Application Landscape", inDoc: true,
    needs: "Application inventory, supported capabilities, owner, platform, build type, lifecycle, data classification (from you or BAM), known issues, integrations.",
  },
  {
    id: 4, short: "Target applications", title: "Phase 4 — Target State Application Landscape",
    heading: "5. Target State Application Landscape", inDoc: true,
    needs: "Target application set, TIME disposition per current app, target capability mapping, transition plan if any.",
  },
  {
    id: 5, short: "Data strategy", title: "Phase 5 — Domain Data Strategy",
    heading: "6. Domain Data Strategy", inDoc: true,
    needs: "Data domains, key entities, systems of record, ownership, flows, quality, governance, privacy, retention, analytics.",
  },
  {
    id: 6, short: "NFRs", title: "Phase 6 — Non-Functional Requirements",
    heading: "7. Non-Functional Requirements", inDoc: true,
    needs: "Measurable NFR targets by category (availability, performance, security, compliance, observability, RPO/RTO…), from you or the enterprise NFR standards via MCP tools.",
  },
  {
    id: 7, short: "Executive summary", title: "Phase 7 — Executive Summary",
    heading: "1. Executive Summary", inDoc: true,
    needs: "Written last from the approved sections. No new facts.",
  },
  {
    id: 8, short: "Validation", title: "Phase 8 — Self-validation",
    heading: "Appendices", inDoc: true,
    needs: "Completeness, traceability, no-assumption, diagram and tone checks; glossary and open items.",
  },
];
