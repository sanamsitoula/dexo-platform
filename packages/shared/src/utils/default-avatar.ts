/**
 * Deterministic placeholder logo/avatar — an initials-on-a-colored-circle SVG
 * data URI. No file storage, no external request, no broken-image icon: used
 * anywhere a tenant logo, user avatar, or staff profile photo would otherwise
 * render `null`/undefined and show a blank or broken image.
 */

const PALETTE = ['#4F46E5', '#0EA5E9', '#059669', '#D97706', '#DB2777', '#7C3AED', '#DC2626', '#0891B2'];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Returns a data: URI SVG — safe to use directly as an <img src> or CSS background-image. */
export function defaultAvatarUrl(name: string): string {
  const safeName = name || '?';
  const initials = initialsFor(safeName);
  const color = PALETTE[hashString(safeName) % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
    `<rect width="128" height="128" rx="24" fill="${color}"/>` +
    `<text x="64" y="64" dy="0.35em" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="52" font-weight="700" fill="#ffffff">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
