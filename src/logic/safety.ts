/**
 * MediOS clinical rules engine (mock): allergy, interaction, renal-dose and
 * duplication checks for a list of drug names against a patient's profile.
 * Rules are deliberately small and explicit so every alert can cite its rule.
 */

export type SafetySeverity = 'critical' | 'warning' | 'info';

export interface SafetyAlert {
  kind: 'allergy' | 'interaction' | 'renal' | 'duplicate' | 'hepatic';
  severity: SafetySeverity;
  title: string;
  detail: string;
  suggestion?: string;
  /** Rule id shown as the citation. */
  rule: string;
}

interface DrugClassRule {
  className: string;
  /** Lower-case fragments that identify drugs in the class. */
  members: string[];
  /** Allergy text fragments that make the class contraindicated. */
  allergyTriggers: string[];
  alternative: string;
}

const DRUG_CLASSES: DrugClassRule[] = [
  {
    className: 'Penicillin / beta-lactam',
    members: ['amoxicillin', 'ampicillin', 'penicillin', 'piperacillin', 'augmentin', 'cloxacillin'],
    allergyTriggers: ['penicillin', 'beta-lactam', 'amoxicillin'],
    alternative: 'Ciprofloxacin 500mg BD or Clindamycin 300mg TDS',
  },
  {
    className: 'NSAID',
    members: ['diclofenac', 'ibuprofen', 'aceclofenac', 'naproxen', 'ketorolac', 'aspirin 300'],
    allergyTriggers: ['nsaid', 'ibuprofen', 'diclofenac', 'aspirin'],
    alternative: 'Paracetamol 500mg TDS',
  },
  {
    className: 'Sulfonamide',
    members: ['sulfamethoxazole', 'cotrimoxazole', 'septran', 'sulfasalazine'],
    allergyTriggers: ['sulfa', 'sulphonamide', 'sulfonamide'],
    alternative: 'Nitrofurantoin or Ciprofloxacin (per indication)',
  },
];

interface InteractionRule {
  id: string;
  a: string[];
  b: string[];
  severity: SafetySeverity;
  detail: string;
  suggestion: string;
}

const INTERACTIONS: InteractionRule[] = [
  {
    id: 'DDI-014',
    a: ['atorvastatin', 'simvastatin', 'lovastatin'],
    b: ['clarithromycin', 'erythromycin', 'ketoconazole', 'itraconazole'],
    severity: 'critical',
    detail: 'Strong CYP3A4 inhibition raises statin levels — risk of myopathy / rhabdomyolysis.',
    suggestion: 'Switch to Azithromycin 500mg OD or hold the statin during the course.',
  },
  {
    id: 'DDI-022',
    a: ['clopidogrel'],
    b: ['omeprazole', 'esomeprazole'],
    severity: 'warning',
    detail: 'Omeprazole reduces activation of clopidogrel (CYP2C19).',
    suggestion: 'Prefer Pantoprazole 40mg OD.',
  },
  {
    id: 'DDI-031',
    a: ['aspirin', 'clopidogrel', 'enoxaparin', 'heparin', 'warfarin'],
    b: ['diclofenac', 'ibuprofen', 'naproxen', 'ketorolac'],
    severity: 'critical',
    detail: 'NSAID with antiplatelet/anticoagulant therapy — high GI bleeding risk.',
    suggestion: 'Use Paracetamol 500mg for analgesia; add PPI cover.',
  },
  {
    id: 'DDI-040',
    a: ['metformin'],
    b: ['iodinated contrast', 'contrast'],
    severity: 'warning',
    detail: 'Hold metformin 48 hrs around iodinated contrast (lactic acidosis risk).',
    suggestion: 'Pause Metformin; recheck creatinine at 48 hrs.',
  },
  {
    id: 'DDI-052',
    a: ['telmisartan', 'losartan', 'ramipril', 'enalapril'],
    b: ['spironolactone', 'potassium chloride'],
    severity: 'warning',
    detail: 'Additive hyperkalemia risk, especially in CKD.',
    suggestion: 'Monitor potassium within 72 hrs.',
  },
];

const RENAL_CAUTION: Array<{ drug: string; minEgfr: number; advice: string }> = [
  { drug: 'metformin', minEgfr: 30, advice: 'Contraindicated below eGFR 30; halve dose at eGFR 30-45.' },
  { drug: 'diclofenac', minEgfr: 60, advice: 'Avoid NSAIDs in CKD — risk of acute kidney injury.' },
  { drug: 'ibuprofen', minEgfr: 60, advice: 'Avoid NSAIDs in CKD — risk of acute kidney injury.' },
  { drug: 'ciprofloxacin', minEgfr: 50, advice: 'Reduce to 250-500mg every 12-24 hrs when eGFR < 50.' },
];

const HEPATOTOXIC = ['paracetamol 1g', 'isoniazid', 'methotrexate', 'ketoconazole', 'valproate'];

const norm = (s: string) => s.toLowerCase();
const matchesAny = (drug: string, fragments: string[]) => fragments.some((f) => norm(drug).includes(f));

/** Base generic name used for duplicate detection ("Paracetamol 500mg (TDS)" → "paracetamol"). */
const genericName = (drug: string) => norm(drug).replace(/^inj\.?\s*/, '').split(/[\s(]/)[0];

export interface SafetyContext {
  allergies: string[];
  /** Drugs the patient is already taking (checked for interactions too). */
  currentMedications?: string[];
  egfr?: number;
  hepaticImpairment?: boolean;
}

export const checkPrescriptionSafety = (drugs: string[], ctx: SafetyContext): SafetyAlert[] => {
  const alerts: SafetyAlert[] = [];
  const allergyText = ctx.allergies.map(norm).join(' | ');

  // 1. Allergy / class contraindications
  drugs.forEach((drug) => {
    DRUG_CLASSES.forEach((cls) => {
      if (matchesAny(drug, cls.members) && cls.allergyTriggers.some((t) => allergyText.includes(t))) {
        alerts.push({
          kind: 'allergy',
          severity: 'critical',
          title: `Allergy: ${drug.split('(')[0].trim()}`,
          detail: `Documented ${ctx.allergies.join(', ')} — ${cls.className} class is contraindicated.`,
          suggestion: `Substitute with ${cls.alternative}.`,
          rule: `ALG-${cls.className.split(' ')[0].toUpperCase()}`,
        });
      }
    });
  });

  // 2. Drug–drug interactions (new drugs vs each other and vs current meds)
  const pool = [...drugs, ...(ctx.currentMedications ?? [])];
  INTERACTIONS.forEach((rule) => {
    const hitA = pool.find((d) => matchesAny(d, rule.a));
    const hitB = pool.find((d) => matchesAny(d, rule.b));
    const involvesNew = drugs.some((d) => matchesAny(d, rule.a) || matchesAny(d, rule.b));
    if (hitA && hitB && hitA !== hitB && involvesNew) {
      alerts.push({
        kind: 'interaction',
        severity: rule.severity,
        title: `Interaction: ${hitA.split('(')[0].trim()} + ${hitB.split('(')[0].trim()}`,
        detail: rule.detail,
        suggestion: rule.suggestion,
        rule: rule.id,
      });
    }
  });

  // 3. Renal dosing
  if (typeof ctx.egfr === 'number') {
    drugs.forEach((drug) => {
      const rule = RENAL_CAUTION.find((r) => norm(drug).includes(r.drug));
      if (rule && ctx.egfr! < rule.minEgfr) {
        alerts.push({
          kind: 'renal',
          severity: 'warning',
          title: `Renal dose check: ${drug.split('(')[0].trim()}`,
          detail: `eGFR ${ctx.egfr} mL/min. ${rule.advice}`,
          rule: 'RENAL-DOSE',
        });
      }
    });
  }

  // 4. Hepatic caution
  if (ctx.hepaticImpairment) {
    drugs.forEach((drug) => {
      if (matchesAny(drug, HEPATOTOXIC)) {
        alerts.push({
          kind: 'hepatic',
          severity: 'warning',
          title: `Hepatic caution: ${drug.split('(')[0].trim()}`,
          detail: 'Raised transaminases on latest LFT — use the lowest effective dose.',
          rule: 'HEP-CAUTION',
        });
      }
    });
  }

  // 5. Duplicates within the new prescription
  const seen = new Map<string, string>();
  drugs.forEach((drug) => {
    const g = genericName(drug);
    if (seen.has(g)) {
      alerts.push({
        kind: 'duplicate',
        severity: 'info',
        title: `Duplicate: ${g.charAt(0).toUpperCase() + g.slice(1)}`,
        detail: `${seen.get(g)} and ${drug} are the same molecule.`,
        rule: 'DUP-THERAPY',
      });
    } else {
      seen.set(g, drug);
    }
  });

  return alerts;
};

/** Read-only view of the rule tables, for screens that explain the engine. */
export const SAFETY_RULES = {
  drugClasses: DRUG_CLASSES.map((c) => ({ className: c.className, members: c.members, alternative: c.alternative })),
  interactions: INTERACTIONS.map((r) => ({ id: r.id, a: r.a, b: r.b, severity: r.severity, detail: r.detail, suggestion: r.suggestion })),
  renal: RENAL_CAUTION.map((r) => ({ drug: r.drug, minEgfr: r.minEgfr, advice: r.advice })),
};

export const worstSeverity = (alerts: SafetyAlert[]): SafetySeverity | null => {
  if (alerts.some((a) => a.severity === 'critical')) return 'critical';
  if (alerts.some((a) => a.severity === 'warning')) return 'warning';
  if (alerts.length) return 'info';
  return null;
};
