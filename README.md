# CareSync — Hospital Management System (MediOS AI)

CareSync is a hospital management mobile app built with **Expo SDK 57**, **Expo Router**, **React Native 0.86** and **TypeScript**. It covers clinical, administrative, billing and role-portal workflows for City Care Multispecialty Hospital, running entirely on **mock data** (no backend yet). The "MediOS AI" assistant and Doctor Copilot are simulated on-device: they answer only from the app's records and cite their sources.

## Run it

```bash
npx expo start            # Metro dev server
npx expo run:android      # (re)build & install the Android debug build
npm run test:agent        # real-source test suite (Node ≥ 22.18)
npx tsc --noEmit          # typecheck
npx expo lint             # lint (0 errors expected)
```

The installed debug build must be rebuilt (`npx expo run:android`) whenever native dependencies change, otherwise it crashes on launch (e.g. `Cannot find native module 'ExpoLinking'`).

## Architecture

```
src/
├── app/            Expo Router routes (every file is a screen; _layout.tsx files are navigators)
├── logic/          Pure business rules — no React; unit-tested in Node
│   ├── hospital.ts   state shape + every transition (register, book, consult, admit, discharge,
│   │                 dispense, lab orders/results, vitals, billing, operations) + selectors
│   ├── billing.ts    receipt numbering, collections, revenue
│   ├── safety.ts     drug safety rules (allergy, interaction, renal, duplicate)
│   ├── clinical.ts   vitals flags, lab trends, AI alerts, patient summaries
│   ├── aiEngine.ts   MediOS AI intent routing + answers with citations (staff & patient)
│   ├── reports.ts    report builders
│   └── access.ts     role-based access (RBAC)
├── context/        AppContext (runs logic transitions against the latest state), Alert & Toast providers
├── data/mockData.ts  one consistent hospital, all dates relative to today
├── components/     common/ (shared UI + Motion animation primitives) and per-area folders
│                   (shell, clinical, orders, finance, ai, portals, operations, receipt)
├── utils/          dates, formatters, pdfGenerator (A4 receipts & documents), navigation
└── constants/      theme tokens, hospital config
```

Rules of thumb:
- Put business rules in `src/logic` (pure TS) and call them from screens via `useApp()`; never look up a record with a fallback to another patient.
- Reach tab screens with `goToTab` / `openRoute` from `utils/navigation` (pushing a tab path stacks a second tab navigator).
- Don't import `@react-navigation/*` in app code — Expo Router 56+ refuses to bundle it; use `expo-router` or `expo-router/react-navigation`.
- Screens with inputs wrap their body in `KeyboardAwareContainer` (Android runs edge-to-edge, so the window does not resize for the keyboard).

## Screens

- **Home:** dashboard (live KPIs, quick actions, MediOS AI alerts, upcoming appointments), Patients, Billing, AI Assistant, More.
- **Clinical:** patient record (overview, history, visits, reports), 4-step registration, OPD consultation with live drug-safety checks, IPD admission with bed allocation, discharge summary with approve & discharge.
- **Scheduling & orders:** appointments (day strip, status actions), booking with real slots, pharmacy counter cart, lab and radiology orders.
- **Finance:** billing & invoices, receipts (paid/due, PDF/share/print), create invoice, receipt templates & previews, financial management, reports & report detail.
- **Role portals:** Doctor Copilot, Nurse (beds, tasks, vitals), Lab (sample pipeline, result entry, AI summary), Pharmacy review (safety checks, alternatives, overrides), Patient app (+ patient assistant, my reports, hospital navigation), Admin portal (overview, audit trail).
- **Operations:** blood bank, ambulance fleet, bed management, inventory, document support, settings, notifications, help & support.

## Legacy code

`App.tsx`, `index.ts`, `src/navigation/` and `src/screens/` are an older React Navigation copy of the app. They are never bundled (the entry point is `expo-router/entry`) and are excluded from lint; delete them:

```bash
git rm -r App.tsx index.ts src/navigation src/screens
```

## Connecting a backend

Replace the initial state in `createInitialState()` (`src/logic/hospital.ts`) with API data, and turn the transitions into API calls (or run them optimistically and sync). The entity types in `src/data/mockData.ts` are the contract.
