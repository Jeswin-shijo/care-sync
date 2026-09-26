---
name: testing-agent
description: Automated test suite for the CareSync hospital app. Runs static architecture audits, mock-data integrity checks, and real-source tests of the domain logic (registration, booking, IPD/discharge, pharmacy, lab, billing), clinical rules engine, MediOS AI engine, formatters and PDF generation.
---

# CareSync Testing Agent

`scripts/testing-agent.js` tests the **real** TypeScript sources: Node (≥ 22.18) strips types natively, and a small module hook resolves extensionless imports and stubs the native-only modules (`react-native`, `expo-print`, `expo-sharing`). Keep business rules in `src/logic/` (pure TS, no React/RN imports) so they stay testable.

## Run

```bash
npm run test:agent
```

## What it covers

1. **Static architecture audits** — no deprecated `SafeAreaView` import; every route in `src/app/` has a default export and the route contract is complete; live code never imports the dead React Navigation layer (`src/screens`, `src/navigation`); no `router.push` onto a tab route (it stacks a duplicate tab navigator); no "coming soon" placeholders; no hardcoded 2025 dates in screens; `src/logic` stays framework-free; theme/config complete.
2. **Mock data integrity** — unique UHIDs; appointments/invoices/labs/vitals/visits/tasks/prescriptions reference real patients and doctors; invoice line items add up; wards balance and every admitted patient holds a unique bed; safety facts agree across modules.
3. **Domain logic** — registration bills the new patient (regression for the old stale-closure bug), sequential UHIDs and receipt numbers, booking conflicts and slots, admission bed allocation and billing, discharge, pharmacy stock/expiry, lab order → receive → results, consultation → pharmacy review → follow-up, dispensing overrides and safer alternatives, vitals flags, collections, operations (ambulance, blood bank, indents).
4. **Clinical rules** — allergy/interaction/renal/duplicate rules, vitals early-warning flags, lab trends, AI alerts.
5. **MediOS AI engine** — answers come from live state with citations, intent routing has no substring collisions, cohort queries, honest "not found", patient assistant.
6. **Utilities & documents** — currency, number-to-words (incl. paise), date helpers, receipt/document HTML (escaping, paid vs due), role-based access, every report builds.
7. **Component contracts** — shared components and motion primitives exist.

## Quality gates before declaring work done

1. `npm run test:agent` — 0 failures.
2. `npx tsc --noEmit` — 0 errors.
3. Drive the changed screens on a device/emulator (see the run notes in the conversation or README).
