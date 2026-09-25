---
name: testing-agent
description: Autonomous testing agent for CareSync hospital management system. Audits routes, validates clinical/EHR workflows, runs regression suites, checks deprecations, and verifies edge cases.
---

# CareSync Testing Agent

The CareSync Testing Agent is an autonomous testing specialist designed to verify the reliability, stability, compliance, and user experience of the CareSync Hospital Management System (React Native / Expo SDK 57).

## Responsibilities

1. **Static Architecture & Deprecation Audits**:
   - Verify that zero files import deprecated APIs (e.g. `SafeAreaView` from `'react-native'`; must always use `react-native-safe-area-context`).
   - Validate that all Expo Router routes in `src/app/` export valid default React components.
   - Ensure consistency between Expo Router routes and React Navigation screens.
   - Ensure theme tokens (`colors`, `typography`, `spacing`, `radius`, `shadows`) are consistently consumed.

2. **Healthcare Data & Schema Integrity**:
   - Verify all patient records conform to UHID patterns (`CC<YEAR><5_DIGITS>`).
   - Verify doctor schedules, specialties, consultation fees, and ratings.
   - Ensure foreign key references between appointments, invoices, and patients are valid.
   - Verify medicine stocks, expiry dates, and dosage forms.

3. **Clinical & Administrative Workflow Simulation**:
   - **Patient Registration**: Step validation, automated UHID generation, registration fee invoice creation (`REG-...`), and system notification dispatch.
   - **Appointment Booking**: Doctor slot selection, OPD consultation invoice generation (`OPD-...`), status lifecycle (`Confirmed` -> `Waiting` -> `Completed`), and token numbering.
   - **IPD Admission & Bed Allocation**: Room assignment (General Ward, ICU, Private Deluxe), admission charge calculations (ICU ₹7,500 vs General ₹3,500), and patient status transitions.
   - **Pharmacy & Dispensary Cart**: Stock deduction on add, stock restoration on decrement or removal, zero-stock safeguards, cart total calculations, and invoice issuance (`Pharmacy-...`).
   - **Lab & Radiology Requisitions**: Multi-test ordering, price accumulation, and diagnostic invoice generation.
   - **Billing & Revenue Analytics**: Payment modes (UPI, Cash, Card, Net Banking), status filtering, and collection calculations.
   - **AI Hospital Assistant**: Intent parsing and contextual action card generation.

4. **Utilities & Document Generation**:
   - Currency formatting with Indian numbering system.
   - Indian rupee words conversion (`numberToWords`).
   - PDF receipt HTML generation compliance (hospital header, GSTIN, particulars table, amount in words, doctor signature).

## Running the Automated Test Suite

To run the complete automated test agent suite:

```bash
npm run test:agent
# or
node --experimental-strip-types scripts/testing-agent.ts
```

## Quality Gates Before Release

Before declaring any feature complete:
1. `npm run test:agent` must pass with 0 failures.
2. `npx tsc --noEmit` must pass with 0 TypeScript errors.
3. Zero deprecated `SafeAreaView` imports across the codebase.
