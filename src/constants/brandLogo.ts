/**
 * MediOS brand mark — single source of truth for the mobile and web icons.
 *
 * A soft medical cross (care) on a deep blue tile, crossed by a heartbeat trace
 * whose two peaks draw an "M" (MediOS). Plain shapes, so it stays legible from
 * the 1024px store icon down to a 16px browser tab (the `small` variant thickens
 * the trace for those sizes). `scripts/generate-icons.js` renders every app and
 * web icon from this; the PDF generator embeds it in receipt headers.
 */

export const BRAND = {
  primary: '#1E62F5',
  gradientStart: '#4D8DFF',
  gradientEnd: '#0B36A8',
  pulse: '#1A56E8',
};

export interface LogoOptions {
  /** Output size in px (the drawing is always on a 1024 grid). */
  size?: number;
  /** Paint the blue gradient tile behind the mark. */
  background?: boolean;
  /** Tile corner radius on the 1024 grid (0 = square, e.g. iOS icon). */
  cornerRadius?: number;
  /** Scale of the mark around the centre (Android's adaptive foreground). */
  markScale?: number;
  /** Single-colour white mark with the trace cut out (Android themed icon). */
  monochrome?: boolean;
  /** Soft drop shadow under the cross. */
  shadow?: boolean;
  /** Draw the mark (false = background tile only, e.g. Android background layer). */
  mark?: boolean;
  /** `small`: a heavier trace for 16–48px (favicons, tab icons). */
  variant?: 'full' | 'small';
}

const C = 512;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Plus sign with rounded outer corners and filleted inner corners. */
const crossPath = (a = 300, b = 130, ro = 80, ri = 34) => {
  const v: [number, number, boolean][] = [
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

/**
 * The heartbeat: flat lead-in, two peaks with a shallow dip between them (the
 * "M"), flat lead-out. The peaks rise into the cross's vertical arm.
 */
const TRACE = {
  full: { width: 52, points: [[-226, 42], [-148, 42], [-84, -104], [0, 24], [84, -104], [148, 42], [226, 42]] },
  small: { width: 100, points: [[-196, 50], [-128, 50], [-70, -88], [0, 22], [70, -88], [128, 50], [196, 50]] },
} as const;

const tracePoints = (variant: 'full' | 'small') => TRACE[variant].points.map(([x, y]) => `${C + x},${C + y}`).join(' ');

export const buildLogoSvg = ({
  size = 1024,
  background = true,
  cornerRadius = 0,
  markScale = 1,
  monochrome = false,
  shadow = true,
  mark: drawMark = true,
  variant = 'full',
}: LogoOptions = {}): string => {
  const trace = TRACE[variant];
  const transform = markScale === 1 ? '' : ` transform="translate(${r1(C * (1 - markScale))} ${r1(C * (1 - markScale))}) scale(${markScale})"`;
  const line = (stroke: string) =>
    `<polyline points="${tracePoints(variant)}" fill="none" stroke="${stroke}" stroke-width="${trace.width}" stroke-linecap="round" stroke-linejoin="round"/>`;

  const defs = `
    <linearGradient id="mo-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND.gradientStart}"/>
      <stop offset="0.5" stop-color="${BRAND.primary}"/>
      <stop offset="1" stop-color="${BRAND.gradientEnd}"/>
    </linearGradient>
    <radialGradient id="mo-glow" cx="0.25" cy="0.15" r="0.75">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="mo-shadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#041A55" flood-opacity="0.35"/>
    </filter>
    <mask id="mo-trace-cut">
      <rect width="1024" height="1024" fill="#FFFFFF"/>
      ${line('#000000')}
    </mask>`;

  const tile = background
    ? `<rect width="1024" height="1024" rx="${cornerRadius}" fill="url(#mo-bg)"/><rect width="1024" height="1024" rx="${cornerRadius}" fill="url(#mo-glow)"/>`
    : '';

  const markSvg = monochrome
    ? `<path d="${crossPath()}" fill="#FFFFFF" mask="url(#mo-trace-cut)"/>`
    : `<path d="${crossPath()}" fill="#FFFFFF"${shadow ? ' filter="url(#mo-shadow)"' : ''}/>${line(BRAND.pulse)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024"><title>MediOS</title><defs>${defs}</defs>${tile}${drawMark ? `<g${transform}>${markSvg}</g>` : ''}</svg>`;
};
