# CareSync - Hospital Management System (SaaS)

CareSync is a modern, full-featured hospital management SaaS mobile application built with **React Native**, **Expo Router (SDK 57)**, and **TypeScript**. It features comprehensive clinical, administrative, and billing workflows with static mock data, modular common components, helper utilities, and full readiness for REST/GraphQL backend integration.

---

## 🧭 File-Based Routing with Expo Router

All navigation is managed using **Expo Router**, with route screens residing in `src/app/`:

```
src/app/
├── _layout.tsx               # Root Layout configuring AppProvider & Stack
├── index.tsx                 # Splash / Onboarding screen ('/')
├── (tabs)/                   # 5-Tab Group
│   ├── _layout.tsx           # Tab Navigator layout
│   ├── index.tsx             # Home / Executive Dashboard ('/(tabs)')
│   ├── patients.tsx          # Patients Directory ('/(tabs)/patients')
│   ├── billing.tsx           # Billing & Invoices ('/(tabs)/billing')
│   ├── ai.tsx                # AI Hospital Assistant ('/(tabs)/ai')
│   └── more.tsx              # Operations & Modules Grid ('/(tabs)/more')
├── appointments.tsx          # Appointments Schedule ('/appointments')
├── book-appointment.tsx      # Doctor Selection & Booking ('/book-appointment')
├── patient/
│   └── [id].tsx              # Dynamic Patient EHR Details ('/patient/[id]')
├── register-patient.tsx      # 4-Step Patient Registration ('/register-patient')
├── opd-consultation.tsx      # OPD Consultation & Rx Builder ('/opd-consultation')
├── ipd-admission.tsx         # IPD Admission & Bed Assignment ('/ipd-admission')
├── pharmacy.tsx              # Pharmacy Catalog & Cart ('/pharmacy')
├── lab.tsx                   # Pathology Requisitions ('/lab')
├── radiology.tsx             # Imaging Scans Booking ('/radiology')
├── receipt/
│   └── [id].tsx              # Printable Receipt & Invoice ('/receipt/[id]')
├── receipt-templates.tsx     # 9 Receipt Templates ('/receipt-templates')
├── discharge-summary.tsx     # Clinical Discharge Summary & PDF ('/discharge-summary')
├── financial-management.tsx  # Revenue Analytics & Charts ('/financial-management')
├── reports.tsx               # Reports Directory ('/reports')
├── notifications.tsx         # Notification Center ('/notifications')
└── settings.tsx              # Hospital & App Settings ('/settings')
```

---

## 🏥 Features & Modules Built

- **Welcome / Splash Screen**: CareSync hospital branding, 3D architectural illustration, and onboarding CTA.
- **Executive Dashboard (Home)**:
  - Hospital director greeting & real-time notification alerts.
  - "City Care Multispecialty Hospital" glance card.
  - KPI Metrics (Total Patients, OPD Today, IPD Occupancy, Daily Revenue) with percentage trends.
  - 8 Quick Actions: Book Appointment, Register Patient, Add Admission, Generate Receipt, Pharmacy, Lab, Radiology, More.
  - Upcoming appointments list with live status indicators.
- **Appointments Management**:
  - Horizontal calendar day selector (Mon 22 Sep - Sat 27 Sep).
  - Search by patient, doctor, or department.
  - Filter by All, OPD, IPD, and Follow Up.
  - Status badges: Confirmed, Waiting, and Not Arrived.
  - "+ Book Appointment" CTA leading to doctor catalog and slot booking.
- **Book Appointment**:
  - Medical specialties carousel (General Medicine, Cardiology, Orthopedics, Gynecology, Pediatrics, Dermatology, ENT, etc.).
  - Doctor profiles with ratings, consultation fees, and available timings.
  - Interactive modal for patient selection, slot booking, and automatic consultation invoice generation.
- **Patient Directory & Registration**:
  - Search by patient name, UHID, or mobile number.
  - Status filtering: Active, Admitted, Discharged.
  - 4-Step Patient Registration Stepper (Personal, Contact, Medical, Summary).
  - Automated UHID generation (`CC2025XXXXX`) and initial registration invoice issuance.
- **Patient Details & Electronic Health Records (EHR)**:
  - Header profile with demographics and status tags.
  - 4 EHR Tabs: Overview, Medical History, Consultations & Visits, Invoices & Bills.
  - Quick action shortcuts for OPD consultation, IPD admission, and discharge summaries.
- **OPD Clinical Consultation**:
  - Attending physician banner (Dr. Priya Menon, Room 201).
  - Patient switcher, clinical symptoms notes, and definitive diagnosis.
  - Interactive prescription builder (dosage, frequency, duration).
- **IPD In-Patient Admission**:
  - Admission type (New Admission / Re-admission).
  - Department and ward room selector (General Ward, ICU, Private Deluxe).
  - Automated admission invoice generation.
- **Pharmacy & Dispensary**:
  - Medicine inventory catalog with stock counts and expiry tracking.
  - Filters: All, In Stock, Low Stock.
  - Live cart calculation and "+ Add to Bill" with instant pharmacy invoice creation.
- **Laboratory & Diagnostics (Pathology)**:
  - Categorized pathology tests (Biochemistry, Hematology, Microbiology).
  - Multi-test selector with turnaround times and sample collection billing.
- **Radiology & Medical Imaging**:
  - Diagnostic scan catalog (X-Ray Chest, Ultrasound Abdomen, CT Scan Head, MRI Brain, Mammography).
  - Scan duration indicators and requisition invoices.
- **Billing & Invoices**:
  - Daily collection summary card with progress visualization.
  - Invoice categories: Registration, OPD, IPD, Pharmacy, Lab, Radiology.
  - Payment modes: UPI, Cash, Card, Net Banking.
  - Status badges: Paid, Pending.
- **Printable Medical Receipts & PDF Generation**:
  - Formatted medical receipt paper layout with hospital branding, GSTIN, and signature line.
  - Real PDF generation and export using `expo-print` and `expo-sharing`.
- **Receipt Templates Gallery**:
  - 9 hospital templates (Registration, OPD Consultation, IPD Admission, Pharmacy, Lab, Radiology, Surgery, Discharge, Insurance Claims).
- **Patient Discharge Summary**:
  - Clinical inpatient summary, course in hospital, advice, and discharge medication.
  - Full discharge summary PDF export.
- **CareSync AI Hospital Assistant**:
  - Interactive AI chatbot with suggested prompt triggers (pending bills above ₹10,000, OPD collection reports, ICU availability, etc.).
  - Actionable hospital navigation cards returned directly in chat responses.
- **Financial Analytics & Revenue Management**:
  - Total revenue metric (+12% monthly growth).
  - Breakdown by OPD, IPD, Pharmacy, and Diagnostics.
  - Interactive weekly revenue bar chart.
- **Reports Center**:
  - Categorized reports: Financial, Patient, and Operational.
- **Notifications Hub**:
  - Categorized tabs (All, Appointments, Billing, System) with mark-as-read controls.
- **Settings & Branch Management**:
  - Hospital profile, GST/Tax configuration, branches, user permissions, and push alerts.
- **More Modules Grid**:
  - Blood bank inventory, ambulance fleet status, bed management, and medical supplies inventory.

---

## 🛠 Project Architecture

```
├── app.json                       # Expo configuration with expo-router plugin & scheme
├── package.json                   # Dependencies, main: "expo-router/entry"
└── src/
    ├── app/                       # Expo Router file-based screens & layouts
    ├── components/
    │   ├── common/                # Reusable UI components
    │   │   ├── Avatar.tsx         # Patient/Doctor avatar with initials & status dot
    │   │   ├── Badge.tsx          # Status badges (Confirmed, Paid, Admitted, etc.)
    │   │   ├── Button.tsx         # Primary, outline, ghost buttons with haptics
    │   │   ├── Card.tsx           # Elevated cards with subtle shadows
    │   │   ├── EmptyState.tsx     # Placeholder for empty query lists
    │   │   ├── FilterTabs.tsx     # Horizontal scrollable category pill selector
    │   │   ├── Header.tsx         # Nav header with router.back()
    │   │   ├── SearchBar.tsx      # Rounded search input with clear trigger
    │   │   └── StatCard.tsx       # KPI card with trend percentages
    │   └── receipt/
    │       └── ReceiptCard.tsx    # Standard printable hospital receipt layout
    ├── constants/
    │   ├── config.ts              # Hospital details, GSTIN, phone, address
    │   └── theme.ts               # Colors, typography, spacing, shadows
    ├── context/
    │   └── AppContext.tsx         # Central state (Patients, Appointments, Billing, AI, Cart)
    ├── data/
    │   └── mockData.ts            # Realistic static data matching design screenshots
    └── utils/
        ├── formatters.ts          # Currency (₹), date, time, numberToWords
        └── pdfGenerator.ts        # expo-print & expo-sharing integration
```

---

## 🚀 How to Run the App

1. **Start the Expo development server**:
   ```bash
   npx expo start
   ```

2. **Open on your device / simulator**:
   - Press `i` to open in iOS Simulator (macOS with Xcode).
   - Press `a` to open in Android Emulator (Android Studio).
   - Press `w` to open in Web Browser.
   - Or scan the QR code with **Expo Go** on your physical iPhone or Android device.

---

## 🔌 Connecting to Backend (Next Step)

The app is decoupled using `AppContext` and `src/data/mockData.ts`. When ready to connect your backend API:
1. Replace state setters in `src/context/AppContext.tsx` with `fetch` or `axios` API client calls.
2. The data interfaces (`Patient`, `Doctor`, `Appointment`, `Invoice`, `Medicine`, `LabTest`, `RadiologyScan`) are already strictly typed in `src/data/mockData.ts`.
