# Source Material: Claims Management (L3 Domain)

Organisation: Harbor Point Insurance (fictional, for testing only)
Prepared by: Enterprise Architecture, Policy & Claims Operations
Status of content: all facts, decisions and targets below are confirmed by the domain owner (Sarah Patel, VP Claims Operations) and may be written into the specification as decisions.

---

## 1. Parent L4 domain context: Policy & Claims Operations

- Sibling L3 domains under the same L4 domain: Policy Administration, Billing & Collections, Recoveries & Subrogation. These are referenced as neighbouring domains and are not specified here.
- L4 architecture principles that apply to all L3 domains:
  - P1 Cloud-first: new workloads are hosted on Microsoft Azure or delivered as SaaS.
  - P2 Buy before build: prefer configurable vendor products over custom builds.
  - P3 API-first integration: all cross-system integration goes through the enterprise integration platform (MuleSoft Anypoint). No new point-to-point file transfers.
  - P4 Single source of truth: Policy Administration (PolicyCore) is the system of record for policy data. Salesforce CRM is the system of record for customer master data.
- Shared platforms provided by the L4 domain: MuleSoft Anypoint, Microsoft Entra ID (SSO), Splunk (logging and monitoring), Salesforce Experience Cloud.

---

## 2. Current L2 business capabilities

Capabilities in this L3 domain are L2 business capabilities. There are no lower levels. Each is a Wells Fargo Capability Model (WFCM) capability; the WFCM IDs in this sample are fictional test IDs (WFCM-S-nnn). CAP01–CAP10 are short references used in this document only; use the WFCM ID and name in the specification.

| ID | WFCM ID | L2 capability (WFCM name) | Description | Owner | Maturity (1–5) | Pain points |
|---|---|---|---|---|---|---|
| CAP01 | WFCM-S-101 | First Notice of Loss | Capture of a new loss reported by a customer or broker | Maria Lopez, Head of Claims Intake | 2 | Phone and email only. Call agents re-key FNOL data into ClaimCenter. Average 22 minutes per FNOL. |
| CAP02 | WFCM-S-102 | Coverage Verification | Confirm the policy was in force and the loss is covered | Maria Lopez, Head of Claims Intake | 3 | Adjusters look up policy details manually in PolicyCore. |
| CAP03 | WFCM-S-103 | Claim Triage & Assignment | Segment claims by complexity and assign to adjusters | Kevin Brooks, Claims Operations Manager | 2 | Triage rules are kept in spreadsheets and applied by hand. |
| CAP04 | WFCM-S-104 | Damage Assessment | Assess the loss through field, desk or third-party appraisal | Kevin Brooks, Claims Operations Manager | 3 | Photos arrive by email and are attached to claims manually. |
| CAP05 | WFCM-S-105 | Fraud Screening | Detect and refer suspicious claims to the Special Investigations Unit (SIU) | Tom Reyes, Head of SIU | 2 | Daily batch scoring only; referrals are manual. Estimated fraud leakage 6% of paid losses. |
| CAP06 | WFCM-S-106 | Reserve Management | Set and adjust case reserves | Linda Park, Claims Finance Lead | 3 | No significant pain points reported. |
| CAP07 | WFCM-S-107 | Claims Settlement & Payment | Agree settlement and issue payment | Linda Park, Claims Finance Lead | 3 | 40% of payments are still by cheque. Payment files go to SAP once a day. |
| CAP08 | WFCM-S-108 | Claims Correspondence | Letters, emails and SMS to claimants and brokers | Kevin Brooks, Claims Operations Manager | 2 | Two overlapping document tools with inconsistent templates. |
| CAP09 | WFCM-S-109 | Claims Reporting | Operational and management reporting on claims | David Chen, Head of Claims Data | 2 | Reports built on a nightly data mart; no intraday view. |

Strengths: experienced adjuster workforce; stable reserving process (CAP06); established SIU function.

---

## 3. Target-state capability changes

| ID | WFCM ID | L2 capability (WFCM name) | Change type | Rationale | Linked driver |
|---|---|---|---|---|---|
| CAP01 | WFCM-S-101 | First Notice of Loss | Enhanced | Digital FNOL via customer portal and mobile, removing re-keying | D1, D4 |
| CAP02 | WFCM-S-102 | Coverage Verification | Enhanced | Automated policy lookup through PolicyCore APIs | D1 |
| CAP03 | WFCM-S-103 | Claim Triage & Assignment | Enhanced | Rules-based automated triage in the core claims platform | D1 |
| CAP04 | WFCM-S-104 | Damage Assessment | Retained | Process works; photo upload moves to the portal | D1 |
| CAP05 | WFCM-S-105 | Fraud Screening | Enhanced | Real-time fraud scoring at FNOL and before payment | D2 |
| CAP06 | WFCM-S-106 | Reserve Management | Retained | No change required; moves with the core platform | D3 |
| CAP07 | WFCM-S-107 | Claims Settlement & Payment | Enhanced | Electronic payments by default; cheques by exception only (target under 5% of payments) | D1, D4 |
| CAP08 | WFCM-S-108 | Claims Correspondence | Consolidated | Single correspondence platform and template set | D1 |
| CAP09 | WFCM-S-109 | Claims Reporting | Enhanced | Intraday reporting on the enterprise lakehouse | D1, D2 |
| CAP10 | WFCM-S-110 | Customer Claim Self-Service | New | Customers track claim status, upload documents and message adjusters online. Owner: Maria Lopez, Head of Claims Intake | D4 |

No capabilities are retired. CAP08 is consolidated in place (two tools become one); the capability itself remains.

Driver references (from the form): D1 cycle time, D2 fraud leakage, D3 ClaimCenter v8 replacement, D4 claims NPS.

---

## 4. Current application inventory

| ID | Application | Supported capabilities | Owner | Platform / hosting | Build type | Lifecycle status | Data classification | Known issues |
|---|---|---|---|---|---|---|---|---|
| APP01 | Guidewire ClaimCenter v8 | CAP02, CAP03, CAP04, CAP06, CAP07 | Raj Mehta, Claims IT Manager | On-premises, Oracle DB | Vendor | Standard vendor support ends December 2027; extended support purchased to 30 September 2028 | Restricted | Heavily customised; upgrades are slow |
| APP02 | FNOL Call Centre Desktop | CAP01 | Raj Mehta, Claims IT Manager | On-premises, .NET | Custom | Mature, no investment | Confidential | No interface to ClaimCenter; data is re-keyed |
| APP03 | DocGen Classic | CAP08 | Raj Mehta, Claims IT Manager | On-premises | Custom | End of life | Confidential | Unsupported template engine |
| APP04 | Smart Communications | CAP08 | Kevin Brooks, Claims Operations Manager | SaaS | Vendor | Active | Confidential | Used for about 30% of templates only |
| APP05 | FraudShield | CAP05 | Tom Reyes, Head of SIU | SaaS | Vendor | Active | Restricted | Batch scoring only |
| APP06 | Claims Data Mart | CAP09 | David Chen, Head of Claims Data | On-premises SQL Server | Custom | Mature | Confidential | Nightly load; frequent load failures |

Data classifications above are supplied by the architect (Restricted where an application holds medical or fraud data; otherwise Confidential), so no BAM lookup is needed.

Observations confirmed by the domain owner:
- CAP08 is served by two overlapping applications (APP03 and APP04).
- CAP10 does not exist today, so it has no application support.
- APP01 and APP03 are the highest-risk systems (vendor support end and end of life).

Applications owned by other domains that Claims Management depends on (external dependencies, not part of this domain):
- PolicyCore (Policy Administration L3 domain): policy system of record.
- SAP S/4HANA Finance (Finance domain): general ledger and payment execution.
- Salesforce CRM (Customer domain): customer master.

### Current integrations

| From | To | Mechanism | Data |
|---|---|---|---|
| APP01 ClaimCenter | PolicyCore | SOAP web service | Policy lookup |
| APP01 ClaimCenter | APP05 FraudShield | Daily batch file (SFTP) | Claims for scoring |
| APP05 FraudShield | APP01 ClaimCenter | Daily batch file (SFTP) | Fraud scores |
| APP01 ClaimCenter | APP03 DocGen Classic | Database link | Correspondence requests |
| APP01 ClaimCenter | APP04 Smart Communications | REST | Correspondence requests |
| APP01 ClaimCenter | SAP S/4HANA Finance | Daily flat file | Payment instructions |
| APP01 ClaimCenter | APP06 Claims Data Mart | Nightly ETL | Claims, reserves, payments |
| APP02 FNOL Desktop | APP01 ClaimCenter | None (manual re-keying) | FNOL details |

---

## 5. Target application landscape (decisions)

Disposition model: TIME (Tolerate, Invest, Migrate, Eliminate). All dispositions below are confirmed decisions.

| ID | Application | Disposition | Target capabilities | Target platform | Rationale | Dependencies / sequencing |
|---|---|---|---|---|---|---|
| APP01 | Guidewire ClaimCenter v8 | Migrate | None after migration (moves to APP07) | Decommissioned after migration | Vendor support ends; principle P1 | Stops serving production claims at APP07 go-live (2028-08-31); technical decommissioning and archival in Phase 3 |
| APP02 | FNOL Call Centre Desktop | Eliminate | None (replaced by APP08) | Decommissioned | No interface, manual re-keying; principle P2 | Retired at the end of Phase 1, once call centre agents capture FNOL in APP08 |
| APP03 | DocGen Classic | Eliminate | None (replaced by APP04) | Decommissioned | End of life; duplicates APP04 | Retire after all templates move to APP04 (Phase 1) |
| APP04 | Smart Communications | Invest | CAP08 | SaaS | Becomes the single correspondence platform | Template migration from APP03 in Phase 1 |
| APP05 | FraudShield | Invest | CAP05 | SaaS | Real-time API scoring at FNOL and before payment | Requires MuleSoft APIs and APP07 (Phase 2) |
| APP06 | Claims Data Mart | Migrate | None after migration (moves to APP09) | Decommissioned after migration | Nightly batch cannot meet intraday reporting | Migrate after APP07 is live (Phase 3) |

New target applications (disposition shown as "New (not subject to TIME)"; TIME applies to current applications only):

| ID | Application | Target capabilities | Owner | Platform / hosting | Build type | Data classification |
|---|---|---|---|---|---|---|
| APP07 | Guidewire ClaimCenter Cloud | CAP02, CAP03, CAP04, CAP06, CAP07 | Raj Mehta, Claims IT Manager | Guidewire Cloud (SaaS on AWS, vendor-managed) | Vendor | Restricted |
| APP08 | Claims Portal | CAP01, CAP10 | Maria Lopez, Head of Claims Intake | Salesforce Experience Cloud (SaaS), on the same Salesforce org as Salesforce CRM | Vendor platform, configured | Restricted |
| APP09 | Claims Lakehouse | CAP09 | David Chen, Head of Claims Data | Enterprise lakehouse on Azure Databricks | Configured on enterprise platform | Restricted |

Target capability coverage: every target L2 capability (CAP01–CAP10) is supported by at least one target application, as listed above.

Migration paths: APP01 → APP07; APP02 → APP08; APP03 → APP04; APP06 → APP09.

Channels: the mobile channel is APP08 delivered as a responsive Experience Cloud site; no separate mobile app is built. Email FNOL is withdrawn at the end of Phase 1; customers are directed to the portal or phone.

Users of APP08: customers and brokers use the self-service portal; call centre agents capture phone FNOLs in the APP08 agent console from Phase 1 onwards. Customers and brokers sign in with Salesforce Experience Cloud identity and a one-time passcode (MFA); staff sign in through Microsoft Entra ID SSO with MFA.

### Target integrations (all through MuleSoft Anypoint, principle P3)

| From | To | Mechanism | Data |
|---|---|---|---|
| APP08 Claims Portal | APP07 ClaimCenter Cloud | REST API via MuleSoft | FNOL submission, documents, claim status, customer–adjuster messages |
| APP07 ClaimCenter Cloud | PolicyCore | REST API via MuleSoft | Policy and coverage lookup |
| APP07 ClaimCenter Cloud | APP05 FraudShield | REST API via MuleSoft (real time) | Claim and payment scoring requests and scores |
| APP07 ClaimCenter Cloud | APP04 Smart Communications | REST API via MuleSoft | Correspondence requests |
| APP04 Smart Communications | APP07 ClaimCenter Cloud | REST API via MuleSoft | Outbound correspondence filed back as Claim Documents |
| APP07 ClaimCenter Cloud | SAP S/4HANA Finance | Event-driven via MuleSoft (near real time) | Payment instructions and payment status |
| APP07 ClaimCenter Cloud | APP09 Claims Lakehouse | Change data capture via MuleSoft (every 15 minutes) | Claims, exposures, reserves, payments |
| APP08 Claims Portal | Salesforce CRM | Native access within the same Salesforce org (not a cross-system integration) | Customer identity and contact details |
| APP05 FraudShield | APP09 Claims Lakehouse | Daily batch via MuleSoft | Fraud scores, SIU referrals and referral outcomes |
| SAP S/4HANA Finance | APP09 Claims Lakehouse | Monthly batch via MuleSoft | Earned premium by line of business (for loss ratio) |

The FNOL submission from APP08 carries the Salesforce customer ID of the reporting customer, in both the interim (APP08 → APP01) and target (APP08 → APP07) integrations. APP07 stores it on the Claimant record.

Principle P3 scope: APP08 and Salesforce CRM run on the same Salesforce org, so APP08 reads customer data natively. The L4 architecture board has confirmed this is not a cross-system integration, so P3 and NFR12 do not apply to it.

### One-off migration loads (confirmed)
- APP01 → APP07 (Phase 2): run by Claims IT with Guidewire's cloud migration tooling.
- APP06 → APP09 (Phase 3): run by the Enterprise Data Platform team with Azure Data Factory.
- Both are one-off data-management processes, not system-to-system integrations. The L4 architecture board has confirmed they are exempt from P3, DP3 and NFR12.

### Interim integrations (transition only, all through MuleSoft Anypoint)

| From | To | Mechanism | Data | Period |
|---|---|---|---|---|
| APP08 Claims Portal | APP01 ClaimCenter v8 | REST API via MuleSoft | FNOL submission, documents, claim status, customer–adjuster messages | Phase 1 go-live until APP07 go-live (2028-08-31) |
| APP04 Smart Communications | APP01 ClaimCenter v8 | REST API via MuleSoft | Outbound correspondence filed back as Claim Documents | End of Phase 1 template consolidation until APP07 go-live (2028-08-31) |
| APP07 ClaimCenter Cloud | APP06 Claims Data Mart | Nightly batch via MuleSoft | Claims, exposures, reserves, payments | APP07 go-live (2028-08-31) until APP06 decommissioning (2028-12-15) |

Treatment of current integrations during the transition (confirmed):
- Current-state integrations are not re-routed through MuleSoft. Principle P3 and NFR12 apply to target and interim integrations only; current integrations are tolerated unchanged until they are retired.
- APP01 → APP03 (database link) is retired with APP03 at the end of Phase 1.
- APP01 → PolicyCore (SOAP), APP01 ↔ APP05 (daily SFTP), APP01 → APP04 (REST), APP01 → SAP (daily flat file) and APP01 → APP06 (nightly ETL) continue unchanged until APP07 go-live on 2028-08-31, and are retired with APP01.
- APP02 has no integrations, so nothing is retired with it.

Lakehouse cut-over (confirmed): APP09 runs in parallel with APP06 from 2028-11-01 to 2028-11-30. APP09 becomes the reporting system of record on 2028-11-30. APP06 and the interim APP07 → APP06 feed are decommissioned on 2028-12-15.

### Transition plan

| Phase | Scope | Start | End |
|---|---|---|---|
| Phase 1 | Claims Portal (APP08) live for FNOL (customers, brokers and call centre agents) and self-service, integrated with APP01 through MuleSoft; correspondence consolidated onto APP04; APP02 and APP03 retired | 2027-04-01 | 2027-12-31 |
| Phase 2 | ClaimCenter Cloud (APP07) migration and production go-live on 2028-08-31; APP01 stops serving production claims; APP08 re-pointed to APP07; FraudShield real-time API | 2028-01-01 | 2028-08-31 |
| Phase 3 | Claims Lakehouse (APP09) parallel run 2028-11-01 to 2028-11-30 and go-live 2028-11-30; APP06 decommissioned 2028-12-15; APP01 technical decommissioning and data archival (no production use) | 2028-09-01 | 2028-12-31 |

Vendor support (resolved): standard support for APP01 ends December 2027. Extended vendor support runs to 2028-09-30, which covers production use of APP01 up to APP07 go-live on 2028-08-31. After go-live, APP01 is used only for decommissioning and archival, which does not need vendor support. Risk owner: Raj Mehta.

---

## 6. Data

### Guiding data principles
- DP1: Each entity has exactly one system of record; other systems hold references or read-only copies.
- DP2: Policy and customer data are consumed from their owning domains, never re-mastered in Claims.
- DP3: Data is shared through MuleSoft APIs, events or MuleSoft-orchestrated batch transfers, not direct database access. Like P3, DP3 applies to target and interim flows; current integrations are tolerated unchanged until they are retired.
- DP4: Personal and medical data is classified and protected by default.

### Data domains and ownership

| Data domain | Data owner | Data steward |
|---|---|---|
| Claims (claim, exposure, claimant, reserve, claim payment, document) | David Chen, Head of Claims Data | Priya Nair (personal auto), Mark Ellis (homeowners) |
| Fraud (fraud score, SIU referral) | Tom Reyes, Head of SIU | Ana Gomez, SIU Analyst Lead |

### Key entities and systems of record (target)

| Entity | Target system of record | Key attributes | Notes |
|---|---|---|---|
| Claim | APP07 ClaimCenter Cloud | Claim number, loss date, cause of loss, status | |
| Exposure | APP07 ClaimCenter Cloud | Exposure ID, type (vehicle, property, injury) | One claim has one or more exposures |
| Claimant | APP07 ClaimCenter Cloud | Claimant ID, name, contact, role | Linked to Salesforce customer ID where the claimant is a customer |
| Reserve | APP07 ClaimCenter Cloud | Reserve line, amount, currency | |
| Claim Payment | APP07 ClaimCenter Cloud | Payment ID, amount, method, status | The payment request raised in Claims |
| Payment Ledger Entry | SAP S/4HANA Finance (Finance domain) | Ledger entry ID, payment reference, posting date | Referenced, not owned; created when SAP executes a Claim Payment |
| Claim Document | APP07 ClaimCenter Cloud | Document ID, type, upload date | Uploaded through APP08 or by adjusters |
| Fraud Score | APP05 FraudShield | Score, model version, timestamp | |
| SIU Referral | APP05 FraudShield (referral case module) | Referral ID, reason, status, investigator | Created when a claim is referred to SIU |
| Policy | PolicyCore (Policy Administration domain) | Policy number, coverage | Referenced, not owned |
| Customer | Salesforce CRM (Customer domain) | Customer ID | Referenced, not owned |

Relationships (confirmed cardinalities):
- Each Claim belongs to exactly one Policy; a Policy has zero or more Claims.
- A Claim has one or more Exposures, one or more Claimants, zero or more Reserves, zero or more Claim Payments (claims can close without payment) and zero or more Claim Documents.
- A Claim has one or more Fraud Scores (every claim is scored at FNOL, and again before each payment) and zero or more SIU Referrals.
- Each Exposure, Reserve, Claim Payment, Claim Document, Fraud Score and SIU Referral belongs to exactly one Claim.
- Each Claimant record belongs to exactly one Claim. A Claimant is optionally linked to one Customer through the Salesforce customer ID; a Customer can be linked to zero or more Claimant records.
- A Claim Payment has zero or one Payment Ledger Entry; the ledger entry exists only after SAP executes the payment. Each Payment Ledger Entry relates to exactly one Claim Payment.

### Systems of record during the transition (confirmed)
- APP01 is the system of record for Claims-domain entities until APP07 go-live on 2028-08-31; APP07 is the system of record from then on.
- Migrated to APP07: all open claims and all claims closed in the previous 7 years, with their exposures, claimants, reserves, payments and documents.
- Older closed claims are extracted from APP01 in Phase 3 to the archive store (Azure Blob Storage, archive tier) and kept under the retention rules below.
- APP06 historical data is migrated to APP09 before APP06 is decommissioned. APP06 holds no medical information, so nothing is excluded for that reason. Records already past their APP09 retention point (7 years after claim closure) are not loaded.

### Data flows
The target data flows are the target integrations in section 5. Analytical data flows from APP07 to APP09 by change data capture every 15 minutes.

### Governance and quality
- Governance body: Claims Data Governance Council, chaired by David Chen, meets monthly.
- Known issues: duplicate claimants (about 3%); inconsistent cause-of-loss codes between ClaimCenter and the data mart.
- A duplicate claimant means two or more Claimant records for the same party on the same Claim. Match-and-merge applies within a claim only. Across claims, Claimant records for the same party are linked (by Salesforce customer ID, or by the matching rules below) for identification and fraud purposes, but are never merged, so each Claimant record still belongs to exactly one Claim.
- Targets: duplicate claimants below 0.5% by end of 2028 (match-and-merge within a claim in APP07); a single cause-of-loss code set mastered by Claims Data and enforced in APP07 and APP09, in place by 2028-06-30 (before APP07 go-live).

### Master and reference data
- Customer master: Salesforce CRM. Policy master: PolicyCore.
- Claimant name and contact details are a claim-specific snapshot captured at FNOL and owned by the Claims domain. Adjusters update the snapshot on the claim if details change. Salesforce CRM remains the customer master and is not updated from Claims.
- Claimant matching: claimants who are customers are linked by Salesforce customer ID. Claimants who are not customers (for example third parties) have no customer link; APP07 matches them against existing claimant records on name, date of birth, address and phone number.
- Reference data: cause-of-loss codes and loss types are maintained by Claims Data; currency and country codes come from the enterprise reference data service.

### Security, privacy and classification
- Claimant personal data: Confidential. Medical information in injury claims: Restricted.
- Regulation: state insurance data security laws based on the NAIC Insurance Data Security Model Law (#668); HIPAA applies to medical records held for injury claims.
- Fraud Scores and SIU Referrals: Restricted. Claim, Exposure, Reserve and Claim Payment: Confidential. Claim Documents: Confidential, except medical documents, which are Restricted.
- Access to Restricted data:
  - APP07: visible only to the adjuster assigned to the claim, their team lead and SIU, enforced by role-based access.
  - APP08: customers can upload and view only their own medical documents; call centre agents cannot view medical documents after upload.
  - APP09: medical information is not replicated to the lakehouse. Fraud data is visible only to the SIU and Claims Data roles.
  - APP04: medical details and fraud data are never included in correspondence and are not sent to APP04.
- Access to Confidential claimant personal data:
  - APP07: claims staff by role (adjusters, claims operations, claims finance), with read access logged.
  - APP08: customers and brokers see only claims they reported or are party to; agents see claims they are handling.
  - APP09: claimant personal fields are masked for all users except the Claims Data team.

### Retention and archival
- Claim records (Claim, Exposure, Claimant, Reserve and Claim Payment) and Claim Documents: 7 years after claim closure, then archived to cold storage for 3 more years and deleted.
- Cold storage: Azure Blob Storage archive tier, operated by the Enterprise Data Platform team.
- Archival transfers are a data-management process run by the Enterprise Data Platform team with Azure Data Factory: a one-off extraction of older closed claims from APP01 in Phase 3, and a monthly job that moves APP07 claim records and documents to cold storage 7 years after claim closure. The L4 architecture board has confirmed that archival is not a system-to-system integration, so P3, DP3 and NFR12 do not apply to it.
- At the Phase 3 extraction, claims closed more than 10 years earlier are deleted, not archived. Claims closed 7–10 years earlier are archived and deleted when they reach 10 years after closure.
- Fraud Scores and SIU Referrals (APP05): 7 years after claim closure, then deleted (not archived).
- Lakehouse (APP09) copies of claim records are deleted 7 years after claim closure, when the source record moves to cold storage. Fraud data in APP09 is deleted at the same point.
- APP08 keeps no FNOL data or Claim Documents after it hands them to MuleSoft (queued if APP07 is unavailable). It reads claim status and documents from APP01 (interim) or APP07 (target) through MuleSoft, so it needs no retention rule.
- APP04 keeps no correspondence or request data beyond processing (deleted within 24 hours). Every outbound letter, email and SMS is filed back to APP07 (APP01 during the interim) as a Claim Document.

### Analytics and reporting
Monthly loss ratio by line; claim cycle time; fraud referral and hit rates; intraday claims volume during catastrophe events. Delivered from APP09 through the enterprise Power BI service, owned by the Enterprise Data Platform team. Power BI reads APP09 through the governed Databricks SQL endpoint; the L4 architecture board has confirmed that BI consumption of the lakehouse is not a system-to-system integration, so DP3 and P3 do not apply to it.

---

## 7. Non-functional requirements (confirmed targets)

All NFR targets below are supplied by the architect, so no lookup of enterprise NFR standards is needed.

Scope rules (confirmed):
- "All applications" means the target applications APP04, APP05, APP07, APP08 and APP09. Current applications being retired (APP01, APP02, APP03, APP06) are tolerated as they are until retirement and are not subject to these NFRs.
- NFRs for APP08 (NFR01, NFR03, NFR04, NFR11) apply from APP08 go-live in Phase 1, including while APP08 integrates with APP01.
- Business hours are 06:00–22:00 Monday to Saturday, Arizona time (America/Phoenix), where the single claims operations centre is based.
- If APP07 is unavailable, FNOLs accepted by APP08 are queued in MuleSoft and processed when APP07 recovers, with no loss. NFR01 therefore measures APP08 on its own.

| ID | Category | Requirement | Measurable target | Applies to | Source | Verification |
|---|---|---|---|---|---|---|
| NFR01 | Availability | Claims Portal availability (APP08 on its own) | 99.9% per calendar month | APP08, CAP01, CAP10 | Domain owner | Monthly uptime report from Splunk |
| NFR02 | Availability | Core claims platform availability | 99.95% during business hours (Mon–Sat 06:00–22:00 America/Phoenix); 99.5% outside them | APP07, CAP02, CAP03, CAP04, CAP06, CAP07 | Domain owner | Monthly uptime report from vendor SLA and Splunk |
| NFR03 | Performance | FNOL submission response time, measured from the customer's submit to APP08 returning a claim reference | Under 3 seconds at the 95th percentile | APP08, CAP01 | Domain owner | Load test before go-live; Splunk monitoring |
| NFR04 | Scalability | FNOL volume | 5,000 FNOLs per day on average; 20,000 FNOLs per day during catastrophe events (4×), with up to 3,000 in the busiest hour, while NFR03 is still met | APP08, APP07 | Domain owner | Load test at 20,000 per day and 3,000 per hour |
| NFR05 | Performance | Real-time fraud scoring, measured as the round trip from APP07 through MuleSoft to APP05 and back | Under 500 ms at the 95th percentile | APP05, CAP05 | Head of SIU | Performance test; API monitoring |
| NFR06 | Resilience / Data | Recovery objectives for core claims data | RPO 15 minutes; RTO 4 hours | APP07, APP09 | Domain owner | Annual disaster recovery test |
| NFR07 | Security | Encryption | TLS 1.2 or higher in transit; AES-256 at rest | APP04, APP05, APP07, APP08, APP09 | Enterprise security standard | Security architecture review; annual penetration test |
| NFR08 | Security | Authentication | Staff: SSO through Microsoft Entra ID with MFA for 100% of users. Customers and brokers on APP08: Experience Cloud identity with one-time-passcode MFA | APP04, APP05, APP07, APP08, APP09 | Enterprise security standard | Quarterly access review |
| NFR09 | Compliance | Data protection | Compliance with NAIC Model Law #668 and HIPAA for medical data; zero high-severity audit findings | APP04, APP05, APP07, APP08, APP09 | Compliance | Annual compliance audit |
| NFR10 | Observability | Logging | All application logs sent to Splunk and retained for 1 year; alerting on availability breaches within 5 minutes | APP04, APP05, APP07, APP08, APP09 | L4 shared platform standard | Monitoring configuration review |
| NFR11 | Accessibility | Portal accessibility | WCAG 2.1 AA | APP08 | Domain owner | Accessibility audit before go-live |
| NFR12 | Interoperability | Integration standard | 100% of target and interim cross-system integrations through MuleSoft APIs or events (principle P3); native access within the same Salesforce org is not a cross-system integration | All target and interim integrations | L4 principle P3 | Architecture review of each integration |
| NFR13 | Data | Reporting freshness | Claims data in APP09 no more than 15 minutes old | APP09, CAP09 | Head of Claims Data | Data freshness monitoring |
| NFR14 | Maintainability | Vendor platform currency | APP07 kept within one major release of the vendor's current version | APP07 | Claims IT Manager | Quarterly release review |
| NFR15 | Performance | Claim creation after FNOL | Claim created in APP07 within 60 seconds of APP08 accepting the FNOL, at the 95th percentile | APP08, APP07, CAP01 | Head of Claims Intake | End-to-end monitoring in Splunk |
| NFR16 | Availability / Resilience | Fraud scoring service | 99.9% per calendar month; RPO 1 hour; RTO 4 hours | APP05, CAP05 | Head of SIU | Monthly vendor SLA report; annual DR test |
| NFR17 | Availability | Correspondence platform | 99.5% per calendar month | APP04, CAP08 | Claims Operations Manager | Monthly vendor SLA report |
| NFR18 | Availability | Claims Lakehouse | 99.5% per calendar month | APP09, CAP09 | Head of Claims Data | Monthly uptime report |
| NFR19 | Availability | Integration platform (L4 shared platform) | 99.95% per calendar month, per the L4 platform SLA | MuleSoft Anypoint (all target and interim integrations) | L4 shared platform SLA | Monthly platform SLA report |
| NFR20 | Data / Compliance | Retention and archival | Records retained, archived and deleted as defined in section 6 (Retention and archival), with 100% of eligible records deleted on schedule | APP05, APP07, APP09, archive store | Records management policy | Annual records-management audit |

## 8. Key risks, dependencies and decisions

| Item | Type | Description | Owner |
|---|---|---|---|
| R1 | Risk | APP07 go-live (planned 2028-08-31) slips past the end of extended support for APP01 (2028-09-30) | Raj Mehta |
| R2 | Risk | Data quality issues (duplicate claimants) migrate into APP07 | David Chen |
| DEP1 | Dependency | PolicyCore REST APIs must be available before Phase 2 | Policy Administration domain owner |
| DEP2 | Dependency | Enterprise lakehouse capacity available before Phase 3 | Enterprise Data Platform team |
| DEC1 | Decision required | Sponsor approval of Phase 2 budget by 2027-10-31 | James Okafor |
