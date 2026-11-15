# Test Input: Claims Management (fictional)

Use the **Load sample data** button on the page, which fills every field including the source material box. Or copy each value into the matching field and paste the contents of `claims-source-material.md` into **Source material and domain knowledge** (or attach it with **Attach text files**).

---

## Form fields

**L3 domain name**
```
Claims Management
```

**Parent L4 domain**
```
Policy & Claims Operations
```

**Scope boundary (in scope / out of scope)**
```
In scope: personal auto and homeowners claims from first notice of loss through assessment, settlement, payment and closure, including claims correspondence, fraud screening, customer claim self-service and claims reporting.
Out of scope: commercial lines claims; recoveries and subrogation (Recoveries & Subrogation L3 domain); policy administration (Policy Administration L3 domain); billing (Billing & Collections L3 domain); reinsurance.
```

**Business drivers, strategic objectives, target-state horizon**
```
D1. Reduce average claim cycle time from 18 days to 10 days by end of 2028.
D2. Reduce estimated fraud leakage from 6% to 3% of paid losses by end of 2028.
D3. Move all production claims off Guidewire ClaimCenter v8 by 31 August 2028, within the extended vendor support window (ends 30 September 2028), and complete its technical decommissioning by 31 December 2028.
D4. Improve claims Net Promoter Score from +12 to +30 by end of 2028.
Target-state horizon: 2026–2028.
```

**Stakeholders**
```
Domain owner: Sarah Patel, VP Claims Operations
Business sponsor: James Okafor, Chief Operating Officer
Key consumers: claims adjusters, call centre agents, customers and brokers, Finance, Actuarial, Special Investigations Unit (SIU)
```

**Source material and domain knowledge**
The full contents of `claims-source-material.md`.

**Additional conventions**
```
Application IDs use the APPnn references in the source material. Enterprise standards (TOGAF, TIME, WFCM, Markdown, BAM, MCP NFR standards) apply as defined in the skill.
```

**Document control**
- Version: `0.1`
- Author: `Enterprise Architecture (sample)`
- Status: `Draft`
- Reviewers: `Enterprise Architecture Review Board`

---

## Test notes (do not paste into the page)

This sample is complete: every fact, owner, disposition, date and NFR target the skill needs is supplied and marked as confirmed by the domain owner. Each phase should come back **Ready for review** without asking questions.

- You still approve each phase. The skill pauses at every checkpoint by design, so click **Approve & continue** to move on.
- The skill cross-checks everything and may still find new questions. Leave **Auto-answer the skill's questions** ticked on the form and the page answers them for you as the fictional domain owner, so the run continues; each phase shows what was auto-answered.
- If you turn auto-answer off and a phase stops with a question, it points to something the sample doesn't cover. Answer it on the page, and add the missing detail to `claims-source-material.md` so the next run doesn't stop. After editing, run `node scripts/build-sample.js` to update the **Load sample data** button.
- To test the required-field check, load the sample, clear **Parent L4 domain**, and click **Start generation**. The page should stop before anything is sent to Claude.

What the finished specification should show:
- 10 L2 capabilities: 9 current, plus CAP10 Customer Claim Self-Service as New. CAP08 is Consolidated.
- 6 current applications with TIME dispositions, 3 new target applications (APP07–APP09), migration paths APP01→APP07, APP02→APP08, APP03→APP04, APP06→APP09, and two interim integrations for the transition.
- PolicyCore, Salesforce CRM and SAP S/4HANA shown as external dependencies, not Claims Management applications.
- A three-phase transition roadmap (April 2027 – December 2028) as a Gantt chart.
- 20 NFRs, each with a measurable target and a verification method.
- Appendix B with no open [TBC] items.
- No capability breakdown below L2, and no facts that aren't in the input.
