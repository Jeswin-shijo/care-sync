#!/usr/bin/env node

/**
 * CareSync Hospital Management System - Autonomous Testing Agent
 *
 * Version: 2.0.0
 * Architecture: React Native / Expo SDK 57 / TypeScript
 *
 * Unlike v1 (which re-implemented the logic inline and so could never catch
 * bugs in the app), every logic test here imports the REAL modules from src/
 * using Node's built-in TypeScript type stripping. Native-only modules
 * (react-native, expo-print, expo-sharing) are stubbed.
 *
 * Suites:
 * 1. Static architecture audits (routes, dead code, navigation, placeholders)
 * 2. Mock data integrity (every cross-reference resolves)
 * 3. Hospital domain logic (registration, booking, IPD, discharge, pharmacy, lab, billing…)
 * 4. Clinical rules engine (drug safety, vitals, lab trends, AI alerts)
 * 5. MediOS AI engine (intent routing, live answers, citations)
 * 6. Utilities & document generation
 * 7. Component contracts
 */

const fs = require('fs');
const path = require('path');
const Module = require('node:module');

const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);

// -------------------------------------------------------------
// Load real TypeScript sources (Node >= 22.18 strips types natively)
// -------------------------------------------------------------
const STUBS = {
  'react-native': "export const Alert = { alert() {} }; export const Platform = { OS: 'ios' }; export default {};",
  'expo-print': 'export const printAsync = async () => {}; export const printToFileAsync = async () => ({ uri: "" }); export default {};',
  'expo-sharing': 'export const isAvailableAsync = async () => false; export const shareAsync = async () => {}; export default {};',
};

Module.registerHooks({
  resolve(specifier, context, next) {
    if (STUBS[specifier]) return { url: `stub:${specifier}`, shortCircuit: true };
    try {
      return next(specifier, context);
    } catch (err) {
      if (specifier.startsWith('.')) {
        for (const ext of ['.ts', '.tsx']) {
          try {
            return next(specifier + ext, context);
          } catch {}
        }
      }
      throw err;
    }
  },
  load(url, context, next) {
    if (url.startsWith('stub:')) return { format: 'module', source: STUBS[url.slice(5)], shortCircuit: true };
    return next(url, context);
  },
});

process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name !== 'ExperimentalWarning' && !/MODULE_TYPELESS_PACKAGE_JSON/.test(w.code || '')) console.warn(w);
});

const src = (p) => require(path.join(ROOT, 'src', p));
const MD = src('data/mockData.ts');
const H = src('logic/hospital.ts');
const billing = src('logic/billing.ts');
const safety = src('logic/safety.ts');
const clinical = src('logic/clinical.ts');
const ai = src('logic/aiEngine.ts');
const access = src('logic/access.ts');
const dates = src('utils/dates.ts');
const fmt = src('utils/formatters.ts');
const pdf = src('utils/pdfGenerator.ts');
const theme = src('constants/theme.ts');
const { HOSPITAL_CONFIG } = src('constants/config.ts');
const reportsPath = path.join(ROOT, 'src/logic/reports.ts');
const reports = fs.existsSync(reportsPath) ? require(reportsPath) : null;

// ANSI Color Tokens
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

class TestingAgent {
  constructor() {
    this.results = [];
    this.currentSuite = '';
    this.startTime = Date.now();
  }

  suite(name) {
    this.currentSuite = name;
    console.log(`\n${c.bold}${c.cyan}=== [SUITE] ${name} ===${c.reset}`);
  }

  test(name, fn) {
    const start = performance.now();
    try {
      fn();
      const durationMs = (performance.now() - start).toFixed(2);
      this.results.push({ name, suite: this.currentSuite, passed: true, durationMs });
      console.log(`  ${c.green}✔ PASS${c.reset} ${name} ${c.dim}(${durationMs}ms)${c.reset}`);
    } catch (err) {
      const durationMs = (performance.now() - start).toFixed(2);
      this.results.push({ name, suite: this.currentSuite, passed: false, error: err.message || String(err), durationMs });
      console.log(`  ${c.red}✖ FAIL${c.reset} ${name} ${c.dim}(${durationMs}ms)${c.reset}`);
      console.log(`    ${c.red}Error: ${err.message}${c.reset}`);
    }
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) throw new Error(`Expected truthy value but got ${actual}`);
      },
      toBeFalsy: () => {
        if (actual) throw new Error(`Expected falsy value but got ${actual}`);
      },
      toBeGreaterThan: (expected) => {
        if (!(actual > expected)) throw new Error(`Expected ${actual} > ${expected}`);
      },
      toBeGreaterThanOrEqual: (expected) => {
        if (!(actual >= expected)) throw new Error(`Expected ${actual} >= ${expected}`);
      },
      toBeLessThanOrEqual: (expected) => {
        if (!(actual <= expected)) throw new Error(`Expected ${actual} <= ${expected}`);
      },
      toContain: (expected) => {
        if (typeof actual === 'string' && !actual.includes(expected)) {
          throw new Error(`Expected string to contain "${expected}", got: "${actual.slice(0, 160)}..."`);
        }
        if (Array.isArray(actual) && !actual.includes(expected)) throw new Error(`Expected array to contain "${expected}"`);
      },
      notToContain: (expected) => {
        if ((typeof actual === 'string' || Array.isArray(actual)) && actual.includes(expected)) {
          throw new Error(`Expected not to contain "${expected}"`);
        }
      },
      toMatch: (regex) => {
        if (!regex.test(String(actual))) throw new Error(`Expected "${String(actual).slice(0, 160)}" to match pattern ${regex}`);
      },
    };
  }

  summary() {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    const totalTime = Date.now() - this.startTime;

    console.log(`\n${c.bold}===================================================================${c.reset}`);
    console.log(`${c.bold}${c.magenta}CareSync Autonomous Testing Agent - Quality Report${c.reset}`);
    console.log(`${c.bold}===================================================================${c.reset}`);
    console.log(`Total Test Verifications: ${c.bold}${total}${c.reset}`);
    console.log(`Tests Passed:             ${c.bold}${c.green}${passed}${c.reset}`);
    console.log(`Tests Failed:             ${c.bold}${failed > 0 ? c.red : c.green}${failed}${c.reset}`);
    console.log(`Pass Rate:                ${c.bold}${failed ? c.red : c.green}${((passed / total) * 100).toFixed(1)}%${c.reset}`);
    console.log(`Execution Time:           ${c.bold}${totalTime}ms${c.reset}`);

    if (failed > 0) {
      console.log(`\n${c.red}${c.bold}Failed Tests:${c.reset}`);
      this.results.filter((r) => !r.passed).forEach((r) => console.log(`  - [${r.suite}] ${r.name}: ${r.error}`));
      return false;
    }
    console.log(`\n${c.green}${c.bold}✔ All checks passed.${c.reset}\n`);
    return true;
  }
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
const rel = (p) => path.relative(ROOT, p);
const LIVE_DIRS = ['src/app', 'src/components', 'src/context', 'src/utils', 'src/logic'];
const liveFiles = () => LIVE_DIRS.flatMap((d) => (fs.existsSync(d) ? walk(d) : [])).filter((f) => /\.(ts|tsx)$/.test(f));
const read = (f) => fs.readFileSync(f, 'utf8');
const fresh = () => H.createInitialState();
const patientByName = (s, name) => s.patients.find((p) => p.name === name);
const doctorByName = (s, name) => s.doctors.find((d) => d.name === name);

function run() {
  const agent = new TestingAgent();

  console.log(`${c.bold}${c.blue}╔════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.blue}║          CARESYNC AUTONOMOUS TESTING AGENT v2.0.0          ║${c.reset}`);
  console.log(`${c.bold}${c.blue}║   Real-source tests • Expo Router SDK 57 • RN 0.86         ║${c.reset}`);
  console.log(`${c.bold}${c.blue}╚════════════════════════════════════════════════════════════╝${c.reset}`);

  // -----------------------------------------------------------
  // 1. STATIC ARCHITECTURE
  // -----------------------------------------------------------
  agent.suite('Static Architecture Audits');

  agent.test('Audit 1: No live file imports the deprecated SafeAreaView from "react-native"', () => {
    const offenders = liveFiles().filter((f) => /import\s*\{[^}]*\bSafeAreaView\b[^}]*\}\s*from\s*['"]react-native['"]/.test(read(f)));
    if (offenders.length) throw new Error(`Deprecated SafeAreaView in: ${offenders.map(rel).join(', ')}`);
  });

  agent.test('Audit 2: Every route file exports a default component and the route contract is complete', () => {
    const routes = walk('src/app').filter((f) => f.endsWith('.tsx'));
    routes.forEach((f) => {
      if (!/export\s+default\s+function|export\s+default\s+[A-Z]/.test(read(f))) throw new Error(`${rel(f)} has no default export`);
    });
    const required = [
      '_layout', 'index', '(tabs)/_layout', '(tabs)/index', '(tabs)/patients', '(tabs)/billing', '(tabs)/ai', '(tabs)/more',
      'patient/[id]', 'register-patient', 'opd-consultation', 'ipd-admission', 'discharge-summary', 'appointments',
      'book-appointment', 'pharmacy', 'lab', 'radiology', 'receipt/[id]', 'receipt-templates', 'financial-management',
      'reports', 'notifications', 'settings', 'doctor-copilot', 'nurse-portal', 'lab-portal', 'pharmacy-review', 'patient-portal',
    ];
    required.forEach((r) => {
      if (!fs.existsSync(`src/app/${r}.tsx`)) throw new Error(`Missing route src/app/${r}.tsx`);
    });
    agent.expect(routes.length).toBeGreaterThanOrEqual(required.length);
  });

  agent.test('Audit 3: Live code never imports the dead React Navigation layer (src/screens, src/navigation)', () => {
    const offenders = liveFiles().filter((f) => /from\s+['"][./]*(screens|navigation)\//.test(read(f)));
    if (offenders.length) throw new Error(`Imports legacy layer: ${offenders.map(rel).join(', ')}`);
  });

  agent.test('Audit 3b: No live imports of @react-navigation/* (Expo Router 56+ refuses to bundle them)', () => {
    const offenders = liveFiles().filter((f) => /from\s+['"]@react-navigation\//.test(read(f)));
    if (offenders.length) throw new Error(`Use 'expo-router/react-navigation' instead in: ${offenders.map(rel).join(', ')}`);
  });

  agent.test('Audit 4: No router.push onto a tab route (it stacks a duplicate tab navigator)', () => {
    const offenders = liveFiles().filter((f) => /router\.push\(\s*['"`]\/\(tabs\)/.test(read(f)));
    if (offenders.length) throw new Error(`router.push('/(tabs)…') in: ${offenders.map(rel).join(', ')}`);
  });

  agent.test('Audit 5: No "coming soon" placeholders in screens', () => {
    const offenders = liveFiles().filter((f) => /coming soon|in roadmap|not implemented/i.test(read(f)));
    if (offenders.length) throw new Error(`Placeholder copy in: ${offenders.map(rel).join(', ')}`);
  });

  agent.test('Audit 6: Screens contain no hardcoded 2025 calendar dates (mock data is relative to today)', () => {
    const re = /\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) 2025\b|'2025-\d{2}-\d{2}'/;
    const offenders = walk('src/app').concat(walk('src/components')).filter((f) => re.test(read(f)));
    if (offenders.length) throw new Error(`Hardcoded 2025 dates in: ${offenders.map(rel).join(', ')}`);
  });

  agent.test('Audit 7: Domain logic modules are framework-free (no React / React Native imports)', () => {
    walk('src/logic').forEach((f) => {
      if (/from\s+['"](react|react-native|expo-[a-z-]+)['"]/.test(read(f))) throw new Error(`${rel(f)} imports a UI/native module`);
    });
  });

  agent.test('Audit 8: Theme tokens and hospital config are complete', () => {
    ['colors', 'typography', 'spacing', 'radius', 'shadows'].forEach((k) => agent.expect(!!theme[k]).toBeTruthy());
    agent.expect(HOSPITAL_CONFIG.gstin).toMatch(/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z0-9]{2}$/);
    agent.expect(HOSPITAL_CONFIG.name).toContain('City Care');
  });

  // -----------------------------------------------------------
  // 2. DATA INTEGRITY
  // -----------------------------------------------------------
  agent.suite('Mock Data Integrity');
  const s0 = fresh();
  const pid = new Set(s0.patients.map((p) => p.id));

  agent.test('Data 1: Patient UHIDs are unique and follow CC<YEAR><5 digits>', () => {
    const uhids = s0.patients.map((p) => p.uhid);
    agent.expect(new Set(uhids).size).toBe(uhids.length);
    uhids.forEach((u) => agent.expect(u).toMatch(/^CC\d{9}$/));
  });

  agent.test('Data 2: Appointments reference real patients/doctors and the doctor\'s own department', () => {
    s0.appointments.forEach((a) => {
      const p = s0.patients.find((x) => x.id === a.patientId);
      const d = s0.doctors.find((x) => x.id === a.doctorId);
      if (!p || !d) throw new Error(`${a.id} has a dangling reference`);
      agent.expect(a.patientName).toBe(p.name);
      agent.expect(a.department).toBe(d.department);
      agent.expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    agent.expect(s0.appointments.some((a) => a.date === dates.todayISO())).toBeTruthy();
  });

  agent.test('Data 3: Invoices belong to real patients and their line items add up to the amount', () => {
    s0.invoices.forEach((inv) => {
      const p = s0.patients.find((x) => x.id === inv.patientId);
      if (!p) throw new Error(`${inv.invoiceNo} → unknown patient`);
      agent.expect(inv.patientName).toBe(p.name);
      agent.expect(inv.uhid).toBe(p.uhid);
      const sum = billing.itemsTotal(inv.items || []);
      if (Math.abs(sum - inv.amount) > 0.01) throw new Error(`${inv.invoiceNo}: items ${sum} ≠ amount ${inv.amount}`);
    });
    const nos = s0.invoices.map((i) => i.invoiceNo);
    agent.expect(new Set(nos).size).toBe(nos.length);
  });

  agent.test('Data 4: Wards balance and every admitted patient holds a unique bed in a real ward', () => {
    s0.wardInfo.forEach((w) => agent.expect(w.occupied + w.available).toBe(w.totalBeds));
    const admitted = s0.patients.filter((p) => p.status === 'Admitted');
    admitted.forEach((p) => {
      if (!p.room || !s0.wardInfo.find((w) => w.id === p.wardId)) throw new Error(`${p.name} admitted without a valid bed`);
    });
    agent.expect(new Set(admitted.map((p) => p.room)).size).toBe(admitted.length);
    s0.patients.filter((p) => p.status !== 'Admitted').forEach((p) => agent.expect(p.wardId).toBe(undefined));
  });

  agent.test('Data 5: Clinical records (labs, vitals, visits, tasks, Rx, profiles) reference real patients', () => {
    const check = (list, label) =>
      list.forEach((x) => {
        if (x.patientId && !pid.has(x.patientId)) throw new Error(`${label} ${x.id} → unknown patient ${x.patientId}`);
      });
    check(s0.labSamples, 'sample');
    check(s0.vitals, 'vitals');
    check(s0.visits, 'visit');
    check(s0.nurseTasks, 'task');
    check(s0.prescriptionReviews, 'rx');
    check(s0.radiologyOrders, 'radiology order');
    s0.clinicalProfiles.forEach((cp) => agent.expect(pid.has(cp.patientId)).toBeTruthy());
    agent.expect(s0.clinicalProfiles.length).toBe(s0.patients.length);
  });

  agent.test('Data 6: Prescription items and dispensable lines map to stocked medicines', () => {
    s0.prescriptionReviews.forEach((rx) =>
      (rx.items || []).forEach((it) => {
        if (it.medicineId && !s0.medicines.find((m) => m.id === it.medicineId)) throw new Error(`${rx.prescriptionCode} → ${it.medicineId}`);
      })
    );
  });

  agent.test('Data 7: Safety-critical facts agree across modules (Vikram K penicillin allergy)', () => {
    const vikram = patientByName(s0, 'Vikram K');
    agent.expect(H.findProfile(s0, vikram.id).allergies.join(' ')).toMatch(/penicillin/i);
    agent.expect(s0.prescriptionReviews.find((r) => r.patientId === vikram.id).safetyStatus).toBe('Allergy Warning');
  });

  // -----------------------------------------------------------
  // 3. DOMAIN LOGIC (real src/logic/hospital.ts)
  // -----------------------------------------------------------
  agent.suite('Hospital Domain Logic (real code)');

  agent.test('Logic 1: Registration bills the NEW patient (regression: receipt used to go to patients[0])', () => {
    const s = fresh();
    const { state, result } = H.registerPatient(s, {
      name: 'Sunil Kumar', phone: '9447122334', dob: '15/08/1984', gender: 'Male',
      address: 'Aluva, Kochi', bloodGroup: 'B+', insurance: '', allergies: ['Sulfa drugs'],
    });
    agent.expect(result.invoice.patientId).toBe(result.patient.id);
    agent.expect(result.invoice.patientName).toBe('Sunil Kumar');
    agent.expect(result.invoice.uhid).toBe(result.patient.uhid);
    agent.expect(result.invoice.invoiceNo).toBe(`REG-${new Date().getFullYear()}-00126`);
    agent.expect(result.invoice.amount).toBe(500);
    agent.expect(result.patient.age).toBe(dates.ageFromDob(dates.parseDob('15/08/1984')));
    agent.expect(result.patient.phone).toBe('+91 94471 22334');
    agent.expect(result.patient.insurance).toBe('Self Pay');
    agent.expect(state.patients.length).toBe(s.patients.length + 1);
    agent.expect(H.findProfile(state, result.patient.id).allergies[0]).toBe('Sulfa drugs');
    agent.expect(state.notifications[0].title).toBe('New patient registered');
    agent.expect(H.findDuplicatePatients(state, '94471 22334').length).toBe(1);
  });

  agent.test('Logic 2: Booking assigns tokens, bills the doctor fee once and blocks double-booking', () => {
    const s = fresh();
    const ananya = patientByName(s, 'Ananya S');
    const arjun = doctorByName(s, 'Dr. Arjun Nair');
    const date = dates.isoDaysFromToday(7);
    const first = H.scheduleAppointment(s, { patientId: ananya.id, doctorId: arjun.id, date, time: '11:00 AM', type: 'OPD' });
    agent.expect(first.result.ok).toBe(true);
    agent.expect(first.result.invoice.amount).toBe(arjun.fee);
    agent.expect(first.result.appointment.tokenNo).toBe(1);
    const clash = H.scheduleAppointment(first.state, { patientId: patientByName(s, 'Rahul Nair').id, doctorId: arjun.id, date, time: '11:00 AM', type: 'OPD' });
    agent.expect(clash.result.ok).toBe(false);
    agent.expect(clash.result.error).toBe('SLOT_TAKEN');
    const slots = H.getAvailableSlots(first.state, arjun.id, date);
    agent.expect(slots.find((x) => x.time === '11:00 AM').available).toBe(false);
    const unknown = H.scheduleAppointment(s, { patientId: 'nope', doctorId: arjun.id, date, time: '09:00 AM', type: 'OPD' });
    agent.expect(unknown.result.error).toBe('UNKNOWN_PATIENT');
  });

  agent.test('Logic 3: IPD admission allocates a bed, updates census and bills an advance that adds up', () => {
    const s = fresh();
    const rahul = patientByName(s, 'Rahul Nair');
    const icuBefore = s.wardInfo.find((w) => w.type === 'ICU');
    const { state, result } = H.admitPatient(s, { patientId: rahul.id, roomType: 'ICU', department: 'Cardiology' });
    agent.expect(result.ok).toBe(true);
    agent.expect(result.patient.room).toBe(`ICU • Bed ${icuBefore.occupied + 1}`);
    agent.expect(billing.itemsTotal(result.invoice.items)).toBe(result.invoice.amount);
    agent.expect(result.invoice.amount).toBe(8500);
    agent.expect(state.wardInfo.find((w) => w.type === 'ICU').available).toBe(icuBefore.available - 1);
    agent.expect(H.bedSummary(state).occupied).toBe(H.bedSummary(s).occupied + 1);
    agent.expect(H.admitPatient(state, { patientId: rahul.id, roomType: 'ICU', department: 'Cardiology' }).result.error).toBe('ALREADY_ADMITTED');
    // Fill the ICU and prove the next admission is refused
    let t = state;
    t = { ...t, wardInfo: t.wardInfo.map((w) => (w.type === 'ICU' ? { ...w, occupied: w.totalBeds, available: 0 } : w)) };
    agent.expect(H.admitPatient(t, { patientId: patientByName(s, 'Sneha Joseph').id, roomType: 'ICU', department: 'Critical Care' }).result.error).toBe('NO_BED');
  });

  agent.test('Logic 4: Discharge frees the bed, finalises the summary and reports outstanding dues', () => {
    const s = fresh();
    const vikram = patientByName(s, 'Vikram K');
    const deluxe = s.wardInfo.find((w) => w.id === 'ward-deluxe');
    const { state, result } = H.dischargePatient(s, vikram.id);
    agent.expect(result.ok).toBe(true);
    agent.expect(result.patient.status).toBe('Discharged');
    agent.expect(result.patient.room).toBe(undefined);
    agent.expect(state.wardInfo.find((w) => w.id === 'ward-deluxe').occupied).toBe(deluxe.occupied - 1);
    agent.expect(result.summary.status).toBe('Final');
    agent.expect(result.outstanding).toBe(4500);
    agent.expect(H.dischargePatient(state, vikram.id).result.error).toBe('NOT_ADMITTED');
  });

  agent.test('Logic 5: Pharmacy cart respects stock & expiry and checkout deducts stock with a PH- bill', () => {
    let s = fresh();
    const vitD = s.medicines.find((m) => m.name === 'Vitamin D3');
    const outOfStock = s.medicines.find((m) => m.stock === 0);
    agent.expect(H.addToCart(s, { id: outOfStock.id, type: 'medicine', name: outOfStock.name, price: outOfStock.price }).result.error).toBe('OUT_OF_STOCK');
    const expired = { ...s, medicines: s.medicines.map((m) => (m.id === vitD.id ? { ...m, expiry: '01/20' } : m)) };
    agent.expect(H.addToCart(expired, { id: vitD.id, type: 'medicine', name: vitD.name, price: vitD.price }).result.error).toBe('EXPIRED');
    for (let i = 0; i < 3; i++) s = H.addToCart(s, { id: vitD.id, type: 'medicine', name: vitD.name, price: vitD.price }).state;
    agent.expect(H.cartQtyFor(s, vitD.id)).toBe(3);
    agent.expect(s.medicines.find((m) => m.id === vitD.id).stock).toBe(vitD.stock); // not reserved until billed
    const { state, result } = H.checkoutPharmacyCart(s, patientByName(s, 'Sneha Joseph').id, 'Cash');
    agent.expect(result.invoiceNo).toBe(`PH-${new Date().getFullYear()}-00322`);
    agent.expect(result.amount).toBe(180);
    agent.expect(state.medicines.find((m) => m.id === vitD.id).stock).toBe(vitD.stock - 3);
    agent.expect(state.cart.length).toBe(0);
  });

  agent.test('Logic 6: Lab orders flow into the lab pipeline and abnormal results notify the doctor', () => {
    const s = fresh();
    const suresh = patientByName(s, 'Suresh Kumar');
    const before = H.labPipelineCounts(s);
    const ordered = H.orderLabTests(s, suresh.id, ['lab-1', 'lab-2'], { paymentMode: 'UPI' });
    agent.expect(ordered.result.samples.length).toBe(2);
    agent.expect(ordered.result.invoice.type).toBe('Lab');
    agent.expect(ordered.result.invoice.amount).toBe(900);
    agent.expect(H.labPipelineCounts(ordered.state).New).toBe(before.New + 2);
    const sample = ordered.result.samples[0];
    const received = H.receiveSample(ordered.state, sample.id);
    agent.expect(received.result.status).toBe('Processing');
    const params = H.analyzerResultsFor(sample.testName).map((p) => (p.name === 'Platelets' ? { ...p, value: 42000 } : p));
    const resulted = H.enterLabResults(received.state, sample.id, params);
    agent.expect(resulted.result.status).toBe('Abnormal');
    agent.expect(resulted.state.notifications[0].title).toBe('Critical lab value');
    agent.expect(clinical.resultsForPatient(resulted.state.labSamples, suresh.id).length).toBeGreaterThanOrEqual(1);
  });

  agent.test('Logic 7: Consultation stores the visit, closes the appointment without double billing and screens the Rx', () => {
    const s = fresh();
    const vikram = patientByName(s, 'Vikram K');
    const { state, result } = H.saveConsultation(s, {
      patientId: vikram.id,
      doctorName: 'Dr. Rajesh Varma',
      department: 'Orthopedics',
      symptoms: 'Knee pain, low-grade fever',
      diagnosis: 'Septic bursitis (suspected)',
      prescription: [{ name: 'Amoxicillin 500mg', dose: '1 Cap', frequency: 'TDS', duration: '5 days' }],
      followUpDate: dates.isoDaysFromToday(8),
    });
    agent.expect(state.visits[0].id).toBe(result.visit.id);
    agent.expect(result.invoice).toBe(undefined); // appointment already exists → no second bill
    agent.expect(state.appointments.find((a) => a.id === 'apt-5').status).toBe('Completed');
    agent.expect(result.review.safetyStatus).toBe('Allergy Warning');
    agent.expect(result.review.items[0].qty).toBe(15);
    agent.expect(result.followUp.type).toBe('Follow Up');
    agent.expect(result.alerts.some((a) => a.kind === 'allergy')).toBeTruthy();
    // Walk-in (no appointment today) → one pending consultation bill
    const walkIn = H.saveConsultation(s, { patientId: patientByName(s, 'Maria Joseph').id, doctorName: 'Dr. Priya Menon', department: 'General Medicine', symptoms: 'Headache', diagnosis: 'Tension headache', prescription: [] });
    agent.expect(walkIn.result.invoice.status).toBe('Pending');
    agent.expect(walkIn.result.invoice.amount).toBe(500);
  });

  agent.test('Logic 8: Dispensing enforces overrides, deducts stock, bills and creates reminders; safer alternative re-screens', () => {
    const s = fresh();
    agent.expect(H.dispensePrescription(s, 'rx-1').result.error).toBe('NEEDS_OVERRIDE');
    const alt = H.applySaferAlternative(s, 'rx-1');
    agent.expect(alt.result.safetyStatus).toBe('Safe');
    agent.expect(alt.result.drugs.join(' ')).toContain('Azithromycin');
    const atorva = s.medicines.find((m) => m.id === 'med-8');
    const done = H.dispensePrescription(alt.state, 'rx-1');
    agent.expect(done.result.ok).toBe(true);
    agent.expect(done.result.invoice.type).toBe('Pharmacy');
    agent.expect(done.state.medicines.find((m) => m.id === 'med-8').stock).toBe(atorva.stock - 10);
    agent.expect(done.state.patientReminders.some((r) => r.patientId === 'pat-2')).toBeTruthy();
    const overridden = H.dispensePrescription(s, 'rx-2', { override: { reason: 'Allergy history verified as mild rash only', by: 'Neethu George' } });
    agent.expect(overridden.result.ok).toBe(true);
    agent.expect(overridden.result.review.dosageValidation).toContain('Override by Neethu George');
    agent.expect(overridden.state.auditLog[0].action).toContain('override');
  });

  agent.test('Logic 9: Recording vitals flags abnormal values, notifies and completes the vitals task', () => {
    const s = fresh();
    const arun = patientByName(s, 'Arun Kumar');
    const { state, result } = H.recordVitals(s, arun.id, { bp: '128/82', pulse: 112, spo2: 89, temp: 101.2, respRate: 26 });
    agent.expect(result.flags.some((f) => f.field === 'spo2' && f.severity === 'critical')).toBeTruthy();
    agent.expect(state.nurseTasks.find((t) => t.id === 'nt-1').completed).toBe(true);
    agent.expect(state.notifications[0].title).toContain('Abnormal vitals');
    agent.expect(H.latestVitals(state.vitals, arun.id).id).toBe(result.record.id);
  });

  agent.test('Logic 10: Invoice numbers are sequential per type and pending bills can be collected', () => {
    const s = fresh();
    agent.expect(billing.nextInvoiceNumber(s.invoices, 'OPD', 2026)).toBe('OPD-2026-00892');
    agent.expect(billing.nextInvoiceNumber(s.invoices, 'Radiology', 2027)).toBe('RAD-2027-00001');
    const before = H.todayStatsFor(s).todayCollection;
    agent.expect(before).toBe(482500);
    const { state, result } = H.markInvoicePaid(s, 'inv-5', 'UPI');
    agent.expect(result.status).toBe('Paid');
    agent.expect(H.todayStatsFor(state).todayCollection).toBe(before + 4500);
    agent.expect(H.todayStatsFor(state).pendingCount).toBe(H.todayStatsFor(s).pendingCount - 1);
  });

  agent.test('Logic 11: Operations — ambulance dispatch, blood issue and supply indents', () => {
    let s = fresh();
    const amb = s.ambulances.find((a) => a.status === 'Available');
    s = H.dispatchAmbulance(s, amb.id, { pickup: 'Kakkanad', reason: 'Fall injury' }).state;
    agent.expect(s.ambulances.find((a) => a.id === amb.id).status).toBe('On Trip');
    s = H.completeAmbulanceTrip(s, amb.id).state;
    agent.expect(s.ambulances.find((a) => a.id === amb.id).status).toBe('Available');
    const aPlus = s.bloodStock.find((b) => b.group === 'A+').prbc;
    const issued = H.issueBlood(s, 'br-1');
    agent.expect(issued.result.ok).toBe(true);
    agent.expect(issued.state.bloodStock.find((b) => b.group === 'A+').prbc).toBe(aPlus - 2);
    const n95 = s.supplies.find((x) => x.id === 'sup-2');
    const indented = H.raiseIndent(s, 'sup-2', 200);
    const received = H.receiveIndent(indented.state, 'sup-2');
    agent.expect(received.result.stock).toBe(n95.stock + 200);
  });

  // -----------------------------------------------------------
  // 4. CLINICAL RULES
  // -----------------------------------------------------------
  agent.suite('Clinical Rules Engine');

  agent.test('Safety 1: Allergy, interaction, renal-dose and duplicate rules fire with rule citations', () => {
    const allergy = safety.checkPrescriptionSafety(['Amoxicillin 500mg (TDS)'], { allergies: ['Penicillin (urticaria)'] });
    agent.expect(allergy[0].kind).toBe('allergy');
    const ddi = safety.checkPrescriptionSafety(['Clarithromycin 500mg (BD)'], { allergies: [], currentMedications: ['Atorvastatin 10mg (Night)'] });
    agent.expect(ddi[0].rule).toBe('DDI-014');
    const renal = safety.checkPrescriptionSafety(['Diclofenac 50mg (BD)'], { allergies: [], egfr: 52 });
    agent.expect(renal.some((a) => a.kind === 'renal')).toBeTruthy();
    const dup = safety.checkPrescriptionSafety(['Paracetamol 500mg (TDS)', 'Paracetamol 650mg (SOS)'], { allergies: [] });
    agent.expect(dup.some((a) => a.kind === 'duplicate')).toBeTruthy();
    agent.expect(safety.checkPrescriptionSafety(['Paracetamol 500mg (TDS)'], { allergies: [] }).length).toBe(0);
  });

  agent.test('Clinical 1: Vitals flags follow early-warning thresholds', () => {
    agent.expect(clinical.vitalsFlags({ bp: '118/76', pulse: 80, spo2: 98, temp: 98.4 }).length).toBe(0);
    const flags = clinical.vitalsFlags({ bp: '182/112', pulse: 124, spo2: 93, temp: 103.2, respRate: 24 });
    agent.expect(flags.find((f) => f.field === 'bp').severity).toBe('critical');
    agent.expect(flags.find((f) => f.field === 'spo2').severity).toBe('warning');
    agent.expect(flags.find((f) => f.field === 'temp').severity).toBe('critical');
  });

  agent.test('Clinical 2: Lab trends compare against previous results (Meera HbA1c 8.4 → 9.1 → 10.2, worsening)', () => {
    const trend = clinical.labTrends(s0.labSamples, 'pat-5').find((t) => t.parameter === 'HbA1c');
    agent.expect(trend.points.map((p) => p.value).join('→')).toBe('8.4→9.1→10.2');
    agent.expect(trend.direction).toBe('up');
    agent.expect(trend.worsening).toBe(true);
  });

  agent.test('Clinical 3: AI alerts surface abnormal labs, unsafe prescriptions and abnormal vitals, critical first', () => {
    const alerts = clinical.buildAiAlerts(s0);
    agent.expect(alerts.length).toBeGreaterThanOrEqual(5);
    agent.expect(alerts[0].severity).toBe('critical');
    agent.expect(alerts.some((a) => a.kind === 'Prescription safety' && a.patientName === 'Rahul Nair')).toBeTruthy();
    agent.expect(alerts.some((a) => a.kind === 'Vitals' && a.patientName === 'Ramanathan G')).toBeTruthy();
    alerts.forEach((a) => agent.expect(a.source.length).toBeGreaterThan(0));
  });

  // -----------------------------------------------------------
  // 5. AI ENGINE
  // -----------------------------------------------------------
  agent.suite('MediOS AI Engine');

  agent.test('AI 1: "Pending bills above ₹10,000" answers from live invoices (no invented patients)', () => {
    const a = ai.answerStaffQuery('Find all patients with pending bills above ₹10,000', s0);
    agent.expect(a.text).toContain('Sunita Patel');
    agent.expect(a.text).toContain('George Thomas');
    agent.expect(a.text).notToContain('Vikram K');
    agent.expect(a.text).toContain('₹26,500');
    agent.expect(a.citations[0].label).toContain('Billing ledger');
    const paid = H.markInvoicePaid(H.markInvoicePaid(s0, 'inv-6', 'Card').state, 'inv-7', 'Card').state;
    agent.expect(ai.answerStaffQuery('pending bills above 10k', paid).text).toContain('No pending bills');
  });

  agent.test('AI 2: Intent routing no longer collides on substrings ("prescribed" ≠ bed, Rahul interactions ≠ receipt)', () => {
    agent.expect(ai.answerStaffQuery("Check Rahul's drug interactions", s0).text).toContain('Medication safety — Rahul Nair');
    agent.expect(ai.answerStaffQuery('What was prescribed for Rahul?', s0).text).notToContain('bed status');
    agent.expect(ai.answerStaffQuery("Find the receipt for Rahul's payment yesterday", s0).text).toContain('OPD-2026-00891');
    agent.expect(ai.answerStaffQuery("Explain Vikram's lab report", s0).text).toContain('Liver Function Test');
    const dis = ai.answerStaffQuery('Create a discharge summary for Ananya S', s0);
    agent.expect(dis.text).toContain('Discharge summary');
    agent.expect(dis.actionCard.route).toBe('/discharge-summary');
    agent.expect(dis.actionCard.params.patientId).toBe('pat-1');
    agent.expect(ai.answerStaffQuery('Summarize Meera Krishnan history', s0).text).toContain('Problem List');
  });

  agent.test('AI 3: Custom cohort query — diabetic patients with abnormal HbA1c', () => {
    const a = ai.answerStaffQuery('Show all diabetic patients with abnormal HbA1c', s0);
    agent.expect(a.text).toContain('Meera Krishnan');
    agent.expect(a.text).toContain('10.2%');
  });

  agent.test('AI 4: Bed availability and collections come from live state', () => {
    const beds = ai.answerStaffQuery('Show bed availability in ICU', s0);
    agent.expect(beds.text).toContain('2 available of 8');
    const col = ai.answerStaffQuery("Generate today's OPD collection report", s0);
    agent.expect(col.text).toContain('₹4,82,500');
  });

  agent.test('AI 5: Protocol search returns the matching SOP with a citation', () => {
    const a = ai.answerStaffQuery('dengue protocol platelet threshold', s0);
    agent.expect(a.text).toContain('Dengue');
    agent.expect(a.citations[0].label).toContain('proto-5');
  });

  agent.test('AI 6: Unknown questions get an honest "not found", not a fabricated answer', () => {
    const a = ai.answerStaffQuery('What is the weather in Paris?', s0);
    agent.expect(a.text).toContain("couldn't match");
  });

  agent.test('AI 7: Patient assistant handles navigation, reports, red-flag symptoms and booking', () => {
    agent.expect(ai.answerPatientQuery('Where is the laboratory?', s0, 'pat-1').text).toContain('Laboratory');
    agent.expect(ai.answerPatientQuery('Explain my latest report', s0, 'pat-1').text).toContain('Complete Blood Count');
    agent.expect(ai.answerPatientQuery('I have chest pain and feel breathless', s0, 'pat-1').text).toContain('emergency');
    agent.expect(ai.answerPatientQuery('Book an appointment', s0, 'pat-1').actionCard.route).toBe('/book-appointment');
  });

  // -----------------------------------------------------------
  // 6. UTILITIES & DOCUMENTS
  // -----------------------------------------------------------
  agent.suite('Utilities, Formatters & Document Generation');

  agent.test('Util 1: formatCurrency uses Indian grouping, decimals on request and signs negatives', () => {
    agent.expect(fmt.formatCurrency(482500)).toBe('₹4,82,500');
    agent.expect(fmt.formatCurrency(1500000)).toBe('₹15,00,000');
    agent.expect(fmt.formatCurrency(500, { decimals: 2 })).toBe('₹500.00');
    agent.expect(fmt.formatCurrency(-16000)).toBe('-₹16,000');
    agent.expect(fmt.formatCompactCurrency(4825000)).toBe('₹48.3L');
  });

  agent.test('Util 2: numberToWords handles lakhs, crores and paise', () => {
    agent.expect(fmt.numberToWords(500)).toBe('Five Hundred Rupees Only');
    agent.expect(fmt.numberToWords(1234.5)).toBe('One Thousand Two Hundred Thirty Four Rupees and Fifty Paise Only');
    agent.expect(fmt.numberToWords(12500000)).toBe('One Crore Twenty Five Lakh Rupees Only');
    agent.expect(fmt.numberToWords(0)).toBe('Zero Rupees Only');
  });

  agent.test('Util 3: Date helpers — relative labels, DOB validation and age', () => {
    agent.expect(dates.relativeDayLabel(dates.todayISO())).toBe('Today');
    agent.expect(dates.relativeDayLabel(dates.isoDaysFromToday(1))).toBe('Tomorrow');
    agent.expect(dates.parseDob('31/02/1990')).toBe(null);
    agent.expect(dates.parseDob('01/01/2999')).toBe(null);
    const dob = dates.parseDob('14/04/1993');
    agent.expect(dates.ageFromDob(dob, new Date(2026, 8, 26))).toBe(33);
    agent.expect(dates.clockToMinutes('01:30 PM')).toBe(810);
    agent.expect(dates.formatDisplayDate('2026-09-26')).toBe('26 Sep 2026');
  });

  agent.test('Util 4: Receipt HTML escapes user input and never prints a pending bill as paid', () => {
    const html = pdf.generateReceiptHtml({
      receiptNo: 'IPD-2026-00078', receiptType: 'IPD Receipt', date: '26 Sep 2026', patientName: 'Ravi <K>',
      uhid: 'CC202600170', paymentMode: 'Card', amount: 4500, status: 'Pending',
    });
    agent.expect(html).toContain('Ravi &lt;K&gt;');
    agent.expect(html).notToContain('Ravi <K>');
    agent.expect(html).toContain('Amount Due');
    agent.expect(html).toContain('>DUE<');
    const paid = pdf.generateReceiptHtml({ receiptNo: 'REG-1', receiptType: 'Registration Receipt', date: 'x', patientName: 'A', uhid: 'U', paymentMode: 'UPI', amount: 500 });
    agent.expect(paid).toContain('Amount Paid');
    agent.expect(paid).toContain('Five Hundred Rupees Only');
    agent.expect(billing.receiptHeading({ type: 'REG', title: 'Registration Fee' })).toBe('Registration Receipt');
  });

  agent.test('Util 5: Clinical documents render sections, tables and signatory', () => {
    const html = pdf.generateDocumentHtml({
      title: 'Discharge Summary',
      meta: [['Patient', 'Ananya S']],
      sections: [
        { heading: 'Diagnosis', paragraphs: ['Acute viral fever'] },
        { heading: 'Medication', table: { columns: ['Drug', 'Dose'], rows: [['Paracetamol', 'TDS']] } },
      ],
      signatory: 'Dr. Priya Menon',
    });
    agent.expect(html).toContain('Acute viral fever');
    agent.expect(html).toContain('Paracetamol');
    agent.expect(html).toContain('Dr. Priya Menon');
  });

  agent.test('Util 6: Role-based access — admins see everything, nurses cannot open billing, patients only their app', () => {
    agent.expect(access.canAccess('admin', 'financial-management')).toBe(true);
    agent.expect(access.canAccess('nurse', 'nurse-portal')).toBe(true);
    agent.expect(access.canAccess('nurse', 'billing')).toBe(false);
    agent.expect(access.canAccess('patient', 'doctor-copilot')).toBe(false);
    agent.expect(access.PORTAL_FOR_ROLE.admin).toBe('/admin-portal');
  });

  agent.test('Util 7: Every report definition builds from live state', () => {
    if (!reports) throw new Error('src/logic/reports.ts is missing');
    MD.REPORT_DEFINITIONS.forEach((d) => {
      const r = reports.buildReport(d.id, s0);
      if (!r) throw new Error(`Report ${d.id} returned nothing`);
      if (!Array.isArray(r.columns) || !Array.isArray(r.rows)) throw new Error(`Report ${d.id} is malformed`);
      r.rows.forEach((row) => agent.expect(row.length).toBe(r.columns.length));
    });
    agent.expect(reports.buildReport('does-not-exist', s0)).toBe(null);
  });

  // -----------------------------------------------------------
  // 7. COMPONENT CONTRACTS
  // -----------------------------------------------------------
  agent.suite('Component & UI Contract Validation');

  agent.test('UI 1: Shared components exist and export React components', () => {
    [
      'Header', 'Button', 'SearchBar', 'FilterTabs', 'Badge', 'Avatar', 'StatCard', 'Card', 'EmptyState',
      'BottomSheet', 'PatientPicker', 'BottomActionBar', 'KeyboardAware', 'Motion', 'SectionHeader', 'CustomAlert', 'RoleSwitcher',
    ].forEach((name) => {
      const f = `src/components/common/${name}.tsx`;
      if (!fs.existsSync(f)) throw new Error(`Missing ${f}`);
      agent.expect(read(f)).toMatch(/export (const|function)/);
    });
  });

  agent.test('UI 2: Motion primitives are available to every screen', () => {
    const motion = read('src/components/common/Motion.tsx');
    ['FadeInView', 'PressableScale', 'AnimatedNumber', 'ProgressFill', 'GrowColumn', 'PulseDot', 'TypingDots', 'Skeleton', 'useReducedMotion'].forEach((x) =>
      agent.expect(motion).toContain(`export const ${x}`)
    );
  });

  agent.test('UI 3: Header supports back, title and right actions and falls back home on deep links', () => {
    const header = read('src/components/common/Header.tsx');
    agent.expect(header).toContain('showBack?: boolean');
    agent.expect(header).toContain('rightAction?: React.ReactNode');
    agent.expect(header).toContain("router.replace('/(tabs)')");
  });

  agent.test('UI 4: Status badges share one mapping (Completed is never shown as "Not Arrived")', () => {
    const badge = read('src/components/common/Badge.tsx');
    agent.expect(badge).toContain('export const statusVariant');
    agent.expect(badge).toMatch(/case 'Completed':/);
  });

  const success = agent.summary();
  if (!success) process.exit(1);
}

run();
