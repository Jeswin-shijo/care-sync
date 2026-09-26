import { Ionicons } from '@expo/vector-icons';
import type { AppNotification } from '../../data/mockData';
import { colors } from '../../constants/theme';

export interface NotificationVisual {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

const V = (icon: NotificationVisual['icon'], color: string, bg: string): NotificationVisual => ({ icon, color, bg });

const CALENDAR = V('calendar', colors.primary, colors.primaryLight);
const CASH = V('cash', colors.success, colors.successLight);
const LAB = V('flask', colors.purple, colors.purpleLight);
const BED = V('bed', '#DB2777', '#FDF2F8');
const ALERT = V('alert-circle', colors.danger, colors.dangerLight);
const PILL = V('medkit', '#D97706', colors.warningLight);
const PILL_FLAGGED = V('medkit', colors.danger, colors.dangerLight);
const AMBULANCE = V('car', colors.rose, colors.roseLight);
const BLOOD = V('water', colors.danger, colors.dangerLight);
const VITALS = V('pulse', colors.danger, colors.dangerLight);
const SCAN = V('scan', '#6366F1', '#EEF2FF');
const PATIENT = V('person-add', colors.teal, colors.tealLight);
const SYSTEM = V('notifications', '#475569', colors.cardMuted);

/** Picks an icon from what the notification is about, not just its tab. */
export const notificationVisual = (n: Pick<AppNotification, 'title' | 'description' | 'category'>): NotificationVisual => {
  const text = `${n.title} ${n.description}`.toLowerCase();
  if (/ambulance|dispatch/.test(text)) return AMBULANCE;
  if (/vital/.test(text)) return VITALS;
  if (/critical|abnormal|emergency|urgent/.test(text)) return ALERT;
  if (/prescription|\brx-|drug|dispens|pharmac/.test(text)) {
    return /flag|interaction|allergy|warning|clarification/.test(text) ? PILL_FLAGGED : PILL;
  }
  if (/\bscan\b|x-ray|\bmri\b|radiolog|ultrasound/.test(text)) return SCAN;
  // Lab before blood bank: "Complete Blood Count" is a lab test.
  if (/\blab\b|sample|\bcbc\b|hba1c|\blft\b|\bkft\b|culture|blood count/.test(text)) return LAB;
  if (/\bblood\b|donor|plasma|platelet|\bprbc\b/.test(text)) return BLOOD;
  if (/registered|new patient/.test(text)) return PATIENT;
  if (n.category === 'Billing' || /payment|\bpaid\b|invoice|receipt/.test(text)) return CASH;
  if (/admit|admission|discharg|\bbed\b|\bward\b|\bicu\b/.test(text)) return BED;
  if (/appointment|booked|follow|reminder|consult|token|schedul/.test(text)) return CALENDAR;
  if (n.category === 'Appointments') return CALENDAR;
  return SYSTEM;
};
