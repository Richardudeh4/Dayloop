/**
 * Kairo design tokens: "Calm Teal".
 *
 * Light, quiet and trustworthy. One brand colour (teal) that also marks the
 * primary action (Join). Every text colour below passes WCAG AA (4.5:1) on
 * both `bg` and `surface`. Never use colour as the only signal (spec 7.12):
 * pair it with an icon or a word.
 */
export const colors = {
  // Surfaces
  bg: '#F7F8FA', // app background
  surface: '#FFFFFF', // cards, sheets, inputs
  surfaceMuted: '#F1F5F9', // pressed rows, subtle fills

  // Text
  text: '#0F172A', // headings and body (16.8:1)
  textDim: '#475569', // secondary text (7.1:1)
  textFaint: '#5E6E82', // hints, captions (4.9:1)
  placeholder: '#94A3B8', // input placeholders only (decorative contrast)

  // Lines
  hairline: '#E2E8F0',
  border: '#CBD5E1',

  // Brand: also the Join / primary action colour
  brand: '#0F766E', // white text on it: 5.5:1
  brandPressed: '#115E59',
  brandBright: '#14B8A6', // logo ring highlight, focus glow; not for text
  brandTint: '#CCFBF1', // selected backgrounds, chips
  brandSoft: '#F0FDFA', // very light wash
  onBrand: '#FFFFFF', // text and icons placed on `brand`

  // Status (always with an icon or label)
  danger: '#B91C1C',
  dangerTint: '#FEE2E2',
  warning: '#B45309',
  warningTint: '#FEF3C7',
  success: '#15803D',
  successTint: '#DCFCE7',

  white: '#FFFFFF',
} as const;

export const fonts = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
} as const;

export const radius = { sm: 12, md: 16, lg: 24, pill: 999 } as const;

/** Soft shadow for cards on the light background. */
export const shadow = {
  card: '0 1px 2px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.05)',
  raised: '0 8px 30px rgba(15,23,42,0.12)',
  brand: '0 6px 20px rgba(15,118,110,0.28)',
} as const;

/**
 * Colours a user can give a list. Mid-tone so they read as dots on white;
 * the list name is always shown next to the dot.
 */
export const listColors = [
  { name: 'Teal', value: '#0F766E' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Violet', value: '#7C3AED' },
  { name: 'Rose', value: '#E11D48' },
  { name: 'Amber', value: '#D97706' },
  { name: 'Green', value: '#16A34A' },
] as const;

/** Lists saved before the Calm Teal palette keep their old hex; show the new equivalent. */
const LEGACY_LIST_COLORS: Record<string, string> = {
  '#7C6CFF': '#7C3AED', // violet
  '#2EE6D6': '#0F766E', // teal
  '#FF5FA2': '#E11D48', // pink -> rose
  '#FFC56B': '#D97706', // amber
  '#5BF0B4': '#16A34A', // mint -> green
  '#FFD6EA': '#E11D48', // blush -> rose
};

export function listColor(stored: string | null | undefined): string {
  if (!stored) return colors.brand;
  return LEGACY_LIST_COLORS[stored.toUpperCase()] ?? stored;
}
