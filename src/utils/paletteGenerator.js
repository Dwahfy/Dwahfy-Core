function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)))
      .toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function linearize(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Adjusts hex lightness until contrast against bg meets the target ratio.
// direction: 'darken' (reduce L) or 'lighten' (increase L)
function adjustForContrast(h, s, startL, bg, targetRatio, direction) {
  let l = startL;
  const step = direction === 'darken' ? -1 : 1;
  const limit = direction === 'darken' ? 0 : 100;
  while (l !== limit) {
    const candidate = hslToHex(h, s, l);
    if (contrastRatio(candidate, bg) >= targetRatio) return candidate;
    l += step;
  }
  return hslToHex(h, s, l);
}

function generatePalette(hex) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);

  // Ensure enough saturation to produce a visible tint
  const accentS = Math.max(s, 45);

  // Background: very light, low-saturation tint of the hue
  const background = hslToHex(h, Math.max(Math.round(accentS * 0.25), 8), 96);

  // Accent: saturated mid-lightness — avoid pure white/black traps
  const accentL = Math.min(Math.max(l, 35), 55);
  const accent = hslToHex(h, accentS, accentL);

  // Border: medium-light tint for dividers
  const border = hslToHex(h, Math.max(Math.round(accentS * 0.35), 12), 82);

  // Text on background: dark, low-saturation — guaranteed WCAG AA (4.5:1)
  const text = adjustForContrast(h, Math.max(Math.round(accentS * 0.2), 8), 20, background, 4.5, 'darken');

  // Text that sits ON the accent swatch (for buttons etc.)
  const accentOnWhite = contrastRatio('#ffffff', accent);
  const accentText = accentOnWhite >= 3 ? '#ffffff'
    : adjustForContrast(h, Math.max(Math.round(accentS * 0.15), 8), 15, accent, 3, 'darken');

  return { background, accent, border, text, accentText };
}

module.exports = { generatePalette, contrastRatio };
