# CareSync — Hospital Management System (MediOS AI)

CareSync is a hospital management mobile app built with **Expo SDK 57**, **Expo Router**, **React Native 0.86** and **TypeScript**. It covers clinical, administrative, billing and role-portal workflows. Staff sign in with their **MediOS** account (the backend in `../hospital backend`, shared with the web app), or explore an **offline demo** on sample data. The "MediOS AI" assistant and Doctor Copilot run on-device: they answer only from the app's records and cite their sources.

## Run it

```bash
npx expo start            # Metro dev server
npx expo run:android      # (re)build & install the Android debug build
npm run test:agent        # real-source test suite (Node ≥ 22.18)
npx tsc --noEmit          # typecheck
npx expo lint             # lint (0 errors expected)
```

The installed debug build must be rebuilt (`npx expo run:android`) whenever native dependencies change, otherwise it crashes on launch (e.g. `Cannot find native module 'ExpoLinking'`).

## Live and demo modes

The first screen offers **Sign in** (a MediOS staff account) or **Explore the offline demo**.

| | Live (signed in) | Offline demo |
|---|---|---|
| Data | The MediOS backend: patients, appointments, visits & SOAP notes, prescriptions & medicines, vitals, lab results, imaging reports, bills & payments, documents, open tasks as notifications, hospital profile | Sample hospital (City Care) in memory |
| Saving | Registration, booking, appointment status, OPD consultations (note, prescription, follow-up), vitals, approved clinical notes, bills, payments, documents and hospital profile go to the API | Nothing leaves the device |
| Role | The account's role (doctor, nurse, lab, pharmacy, admin, front desk); no switching | Switch freely |

Modules the backend does not cover yet (nurse, lab, pharmacy, patient and admin portals, pharmacy counter, lab and radiology ordering, IPD admission, discharge, beds, blood bank, ambulance, inventory, finance; staff, branches and departments in Settings) still open for a signed-in account, on the **sample hospital**: their header carries a "Preview • sample data, nothing is saved" strip, and they never touch real records. The account's role still decides whether they open.

**Sessions.** The 15-minute access token stays in memory. The rotating refresh token lives in `expo-secure-store` (Keychain / Keystore, never backed up); the app identifies itself with `X-MediOS-Client: mobile`, so the API returns the refresh token in the body instead of a browser cookie. On a 401 the client refreshes once and retries; if that fails the user is signed out. Records reload on pull-to-refresh and when the app returns to the foreground after a minute away. Signing out removes patient data from memory.

**Configuration** (`.env.development`, read at build time):

| Variable | Default | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://10.0.2.2:4000/api` (Android emulator), `http://localhost:4000/api` (iOS simulator) | Backend URL; a phone needs the computer's LAN IP, release builds need HTTPS |
| `EXPO_PUBLIC_CLINIC_DATE` | real date | Pins "today" (development pins it to the seeded day, 26 Sep 2026, like the web app) |

**Try it locally:** start MongoDB and the backend (`npm run seed`, `npm run start:dev` in `../hospital backend`), then `npx expo run:android`. Development builds show one-tap buttons for the seeded accounts (`doctor@`, `admin@`, `nurse@`, `frontdesk@`, `pharmacy@`, `lab@medios.ai`, password `Admin@123`).

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
├── api/            MediOS backend: client (tokens, refresh, errors), mappers (backend → app types,
│                   unit-tested), hospitalApi (load the hospital, save changes), secure token store
├── context/        SessionContext (live / demo / signed out), AppContext (runs logic transitions against
│                   the latest state; live writes save first, then replay with the server's ids),
│                   Alert & Toast providers
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
- **Token queue** (signed in): check-in from Appointments issues the day's queue token, the number the waiting-room display shows. The Token Queue screen calls the next patient to your room, announces again, marks no-shows and puts them back. The offline demo has no shared queue.
- **Finance:** billing & invoices, receipts (paid/due, PDF/share/print), create invoice, receipt templates & previews, financial management, reports & report detail.
- **Role portals:** Doctor Copilot, Nurse (beds, tasks, vitals), Lab (sample pipeline, result entry, AI summary), Pharmacy review (safety checks, alternatives, overrides), Patient app (+ patient assistant, my reports, hospital navigation), Admin portal (overview, audit trail).
- **Operations:** blood bank, ambulance fleet, bed management, inventory, document support, settings, notifications, help & support.

## How live writes work

A change to a record the backend holds is planned with the same pure transition the demo uses, saved to the API, then applied locally inside `withServerIds(...)` so the local copy carries the server's ids, UHIDs and bill numbers. Every side effect (notifications, audit entries, profile updates) stays in `src/logic`. A refused save changes nothing locally, tells the user why, and reloads from the server. Screens call these actions with `await`; they resolve to `null` when nothing was saved.
