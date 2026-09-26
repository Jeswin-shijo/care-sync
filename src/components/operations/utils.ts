import { Alert, Linking } from 'react-native';

/** "1 unit" / "3 units". */
export const plural = (n: number, word: string, pluralWord?: string) => `${n} ${n === 1 ? word : pluralWord ?? `${word}s`}`;

/**
 * Opens the phone dialer. Simulators and tablets without telephony reject
 * tel: links — explain instead of failing silently.
 */
export const callNumber = async (phone: string, label?: string): Promise<boolean> => {
  const dial = phone.replace(/[^\d+]/g, '');
  try {
    await Linking.openURL(`tel:${dial}`);
    return true;
  } catch {
    Alert.alert('Unable to place call', `${label ? `${label}: ` : ''}please dial ${phone} from a phone.`);
    return false;
  }
};

/** Runs `fn` after a modal/alert has finished closing (iOS can't present two modals at once). */
export const afterModal = (fn: () => void, ms = 320) => setTimeout(fn, ms);

/** Initials for compact tiles ("Arun Kumar" → "AK"). */
export const initialsOf = (name: string) => {
  const parts = name
    .replace(/^(Dr|Mr|Mrs|Ms|Nurse)\.?\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '—';
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
};
