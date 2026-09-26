import type { HospitalProfile } from '../../../logic/hospital';

export type ProfileField = keyof HospitalProfile;

export const PROFILE_FIELDS: ProfileField[] = ['name', 'tagline', 'address', 'phone', 'email', 'website', 'gstin', 'regNo'];

/** Indian GSTIN: 2-digit state code, PAN, entity number, "Z", checksum. */
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const normalizeProfile = (p: HospitalProfile): HospitalProfile => ({
  name: p.name.trim().replace(/\s+/g, ' '),
  tagline: p.tagline.trim(),
  address: p.address.trim().replace(/\s+/g, ' '),
  phone: p.phone.trim(),
  email: p.email.trim().toLowerCase(),
  website: p.website.trim(),
  gstin: p.gstin.trim().toUpperCase(),
  regNo: p.regNo.trim(),
});

export const validateProfile = (p: HospitalProfile): Partial<Record<ProfileField, string>> => {
  const n = normalizeProfile(p);
  const e: Partial<Record<ProfileField, string>> = {};
  if (n.name.length < 3) e.name = 'Enter the hospital name (at least 3 characters).';
  if (n.address.length < 8) e.address = 'Enter the full address.';
  else if (!/\b\d{6}\b/.test(n.address)) e.address = 'Include the 6-digit PIN code, e.g. Kochi - 682030.';
  const digits = n.phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) e.phone = 'Enter a valid phone number (10–13 digits).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(n.email)) e.email = 'Enter a valid email address.';
  if (n.website && !/^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(n.website)) e.website = 'Enter a valid website, e.g. www.hospital.com.';
  if (!GSTIN_RE.test(n.gstin)) e.gstin = 'GSTIN has 15 characters, e.g. 32ABCDE1234F1Z5.';
  if (n.regNo.length < 4) e.regNo = 'Enter the hospital registration number.';
  return e;
};
