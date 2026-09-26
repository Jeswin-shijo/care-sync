/**
 * CareSync brand mark — single source of truth.
 *
 * A rounded medical cross (care) with a heartbeat line (monitoring), wrapped in
 * a circular sync arrow (CareSync) whose gap holds a sparkle (MediOS AI).
 * `scripts/generate-icons.js` renders the app icons from this; the PDF
 * generator embeds it in receipt headers.
 */

export const BRAND = {
  primary: '#1E6BFF',
  gradientStart: '#4C93FF',
  gradientEnd: '#0A3FB4',
  sparkle: '#9BE7FF',
};

export interface LogoOptions {
  /** Output size in px (the drawing is always on a 1024 grid). */
  size?: number;
  /** Paint the blue gradient tile behind the mark. */
  background?: boolean;
  /** Tile corner radius on the 1024 grid (0 = square, e.g. iOS icon). */
  cornerRadius?: number;
  /** Scale of the mark around the centre (Android foreground needs ~0.84). */
  markScale?: number;
  /** Single-colour white mark with the heartbeat cut out (Android themed icon). */
  monochrome?: boolean;
  /** Soft drop shadow under the mark. */
  shadow?: boolean;
  /** Draw the mark (false = background tile only, e.g. Android background layer). */
  mark?: boolean;
}

const C = 512;
const r1 = (n: number) => Math.round(n * 10) / 10;
const polar = (radius: number, deg: number): [number, number] => {
  const t = (deg * Math.PI) / 180;
  return [C + radius * Math.cos(t), C + radius * Math.sin(t)];
};

/** Plus sign with rounded outer corners and filleted inner corners. */
const crossPath = (a = 232, b = 82, ro = 48, ri = 20) => {
  const v: Array<[number, number, boolean]> = [
    [-b, -a, true], [b, -a, true], [b, -b, false], [a, -b, true], [a, b, true], [b, b, false],
    [b, a, true], [-b, a, true], [-b, b, false], [-a, b, true], [-a, -b, true], [-b, -b, false],
  ];
  const n = v.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const [x, y, convex] = v[i];
    const [px, py] = v[(i - 1 + n) % n];
    const [nx, ny] = v[(i + 1) % n];
    const r = convex ? ro : ri;
    const inLen = Math.hypot(px - x, py - y);
    const outLen = Math.hypot(nx - x, ny - y);
    const p1x = x + ((px - x) / inLen) * r;
    const p1y = y + ((py - y) / inLen) * r;
    const p2x = x + ((nx - x) / outLen) * r;
    const p2y = y + ((ny - y) / outLen) * r;
    d += `${i === 0 ? 'M' : 'L'}${r1(C + p1x)} ${r1(C + p1y)} A${r} ${r} 0 0 ${convex ? 1 : 0} ${r1(C + p2x)} ${r1(C + p2y)} `;
  }
  return `${d}Z`;
};

const PULSE: Array<[number, number]> = [
  [-188, 6], [-96, 6], [-66, -38], [-31, 55], [8, -68], [42, 32], [70, 6], [188, 6],
];
const pulsePoints = () => PULSE.map(([x, y]) => `${C + x},${C + y}`).join(' ');

const RING_R = 330;
const RING_W = 56;
const ARC_START = 20;
const ARC_END = 290;

const ringPath = () => {
  const [sx, sy] = polar(RING_R, ARC_START);
  const [ex, ey] = polar(RING_R, ARC_END);
  return `M${r1(sx)} ${r1(sy)} A${RING_R} ${RING_R} 0 1 1 ${r1(ex)} ${r1(ey)}`;
};

/** Arrowhead at the end of the sync arc, pointing clockwise. */
const arrowPath = () => {
  const t = (ARC_END * Math.PI) / 180;
  const [px, py] = polar(RING_R, ARC_END);
  const dir: [number, number] = [-Math.sin(t), Math.cos(t)];
  const nrm: [number, number] = [Math.cos(t), Math.sin(t)];
  const tip = [px + dir[0] * 64, py + dir[1] * 64];
  const b1 = [px - dir[0] * 16 + nrm[0] * 60, py - dir[1] * 16 + nrm[1] * 60];
  const b2 = [px - dir[0] * 16 - nrm[0] * 60, py - dir[1] * 16 - nrm[1] * 60];
  return `M${r1(tip[0])} ${r1(tip[1])} L${r1(b1[0])} ${r1(b1[1])} L${r1(b2[0])} ${r1(b2[1])} Z`;
};

/** Four-point sparkle sitting in the gap of the sync ring. */
const sparklePath = (cx: number, cy: number, r: number) => {
  const k = r * 0.17;
  return `M${r1(cx)} ${r1(cy - r)} Q${r1(cx + k)} ${r1(cy - k)} ${r1(cx + r)} ${r1(cy)} Q${r1(cx + k)} ${r1(cy + k)} ${r1(cx)} ${r1(cy + r)} Q${r1(cx - k)} ${r1(cy + k)} ${r1(cx - r)} ${r1(cy)} Q${r1(cx - k)} ${r1(cy - k)} ${r1(cx)} ${r1(cy - r)} Z`;
};

export const buildLogoSvg = ({
  size = 1024,
  background = true,
  cornerRadius = 0,
  markScale = 1,
  monochrome = false,
  shadow = true,
  mark: drawMark = true,
}: LogoOptions = {}): string => {
  const [sx, sy] = polar(RING_R, 335);
  const markFill = '#FFFFFF';
  const sparkleFill = monochrome ? '#FFFFFF' : BRAND.sparkle;
  const transform = markScale === 1 ? '' : ` transform="translate(${r1(C * (1 - markScale))} ${r1(C * (1 - markScale))}) scale(${markScale})"`;

  const defs = `
    <linearGradient id="cs-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND.gradientStart}"/>
      <stop offset="0.55" stop-color="${BRAND.primary}"/>
      <stop offset="1" stop-color="${BRAND.gradientEnd}"/>
    </linearGradient>
    <radialGradient id="cs-glow" cx="0.28" cy="0.2" r="0.6">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.26"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="cs-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#06245F" flood-opacity="0.32"/>
    </filter>
    <mask id="cs-pulse-cut">
      <rect width="1024" height="1024" fill="#FFFFFF"/>
      <polyline points="${pulsePoints()}" fill="none" stroke="#000000" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
    </mask>`;

  const tile = background
    ? `<rect width="1024" height="1024" rx="${cornerRadius}" fill="url(#cs-bg)"/><rect width="1024" height="1024" rx="${cornerRadius}" fill="url(#cs-glow)"/>`
    : '';

  const cross = monochrome
    ? `<path d="${crossPath()}" fill="${markFill}" mask="url(#cs-pulse-cut)"/>`
    : `<path d="${crossPath()}" fill="${markFill}"/><polyline points="${pulsePoints()}" fill="none" stroke="${BRAND.primary}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>`;

  const mark = `
    <g${shadow && !monochrome ? ' filter="url(#cs-shadow)"' : ''}>
      <path d="${ringPath()}" fill="none" stroke="${markFill}" stroke-width="${RING_W}" stroke-linecap="round" opacity="${monochrome ? 1 : 0.96}"/>
      <path d="${arrowPath()}" fill="${markFill}" stroke="${markFill}" stroke-width="12" stroke-linejoin="round"/>
      ${cross}
      <path d="${sparklePath(sx, sy, 66)}" fill="${sparkleFill}"/>
      <circle cx="${r1(sx - 78)}" cy="${r1(sy - 44)}" r="12" fill="${sparkleFill}" opacity="0.9"/>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024"><defs>${defs}</defs>${tile}${drawMark ? `<g${transform}>${mark}</g>` : ''}</svg>`;
};
