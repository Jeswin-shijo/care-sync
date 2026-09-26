import type { Patient, WardInfo } from '../../data/mockData';
import { bedLabel as hospitalBedLabel, type RoomType } from '../../logic/hospital';
import type { IconName } from './OpsUI';

/**
 * Bed-map presentation helpers. Which bed is taken by whom comes from the
 * shared `getWardBedMap` (logic/hospital `wardBedMap`) — the same mapping
 * admitPatient allocates from — so this file only turns it into tiles.
 */

export type BedKind = 'patient' | 'occupied' | 'available';

export interface BedTile {
  /** 1-based bed number within the ward. */
  number: number;
  kind: BedKind;
  patient?: Patient;
}

export interface WardBedMap {
  named: Map<number, Patient>;
  occupied: Set<number>;
  free: number[];
}

export const tilesFromBedMap = (ward: WardInfo, map: WardBedMap): BedTile[] => {
  const tiles: BedTile[] = [];
  for (let n = 1; n <= ward.totalBeds; n++) {
    const patient = map.named.get(n);
    if (patient) tiles.push({ number: n, kind: 'patient', patient });
    else if (map.occupied.has(n)) tiles.push({ number: n, kind: 'occupied' });
    else tiles.push({ number: n, kind: 'available' });
  }
  return tiles;
};

/** The room label admission writes for this bed ("ICU • Bed 7", "Deluxe Suite 121"). */
export const bedLabel = (ward: WardInfo, n: number) => hospitalBedLabel(ward, n);

export const wardShortName = (ward: WardInfo) => {
  if (ward.type === 'ICU') return 'ICU';
  if (ward.type === 'Deluxe') return 'Deluxe';
  const letter = /\bward\s+([A-Z0-9]+)\b/i.exec(ward.name)?.[1];
  return letter ? `Ward ${letter.toUpperCase()}` : ward.name;
};

/** Number printed on the tile — deluxe suites use their door numbers (101…). */
export const bedDisplayNumber = (ward: WardInfo, n: number) => (ward.type === 'Deluxe' ? 100 + n : n);

/** "Admit to ICU • Bed 7" / "Admit to Ward A • Bed 90" / "Admit to Deluxe Suite 121". */
export const admitTitle = (ward: WardInfo, n: number) =>
  ward.type === 'Deluxe' ? `Admit to Deluxe Suite ${100 + n}` : `Admit to ${wardShortName(ward)} • Bed ${n}`;

/** Room type understood by /ipd-admission. */
export const roomTypeForWard = (ward: WardInfo): RoomType =>
  ward.type === 'ICU' ? 'ICU' : ward.type === 'Deluxe' ? 'Private' : 'General Ward';

export const wardIcon = (ward: WardInfo): IconName => (ward.type === 'ICU' ? 'heart' : ward.type === 'Deluxe' ? 'star' : 'bed');

export const wardGender = (ward: WardInfo): 'Male' | 'Female' | null =>
  /\(female\)/i.test(ward.name) ? 'Female' : /\(male\)/i.test(ward.name) ? 'Male' : null;

/** Accepts a ward id ("ward-icu"), a type ("ICU") or part of the name ("Ward A"). */
export const findWardByParam = (wards: WardInfo[], param?: string | string[]) => {
  const raw = Array.isArray(param) ? param[0] : param;
  if (!raw) return undefined;
  const q = raw.trim().toLowerCase();
  return (
    wards.find((w) => w.id.toLowerCase() === q) ??
    wards.find((w) => w.type.toLowerCase() === q) ??
    wards.find((w) => w.name.toLowerCase().includes(q) || wardShortName(w).toLowerCase() === q)
  );
};

export const occupancyColor = (pct: number, palette: { success: string; warning: string; danger: string }) =>
  pct >= 0.9 ? palette.danger : pct >= 0.75 ? palette.warning : palette.success;
