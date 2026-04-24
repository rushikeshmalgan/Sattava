/**
 * Sattva — Global Color Palette
 *
 * Use SemanticColors from theme.ts for component styling.
 * Use these only for one-off elements or chart colors.
 */

export const Colors = {
  // ── Brand Primary: Forest Green ─────────────────────────────────
  PRIMARY:       '#1E7D5A',
  PRIMARY_DARK:  '#145A46',
  PRIMARY_LIGHT: '#D6F5E9',

  // ── Accent: Real Saffron/Amber ───────────────────────────────────
  ACCENT:        '#F59E0B',
  ACCENT_DARK:   '#D97706',
  ACCENT_LIGHT:  '#FEF3C7',

  // ── Lotus Pink (Indian identity) ─────────────────────────────────
  LOTUS:         '#E05C8A',
  LOTUS_LIGHT:   '#FCE7F3',

  // ── Backgrounds ───────────────────────────────────────────────────
  BACKGROUND:       '#F3F8F5',
  SURFACE:          '#FFFFFF',
  SURFACE_DARK:     '#F0F7F4',
  SURFACE_ELEVATED: '#FFFFFF',

  // ── Text ──────────────────────────────────────────────────────────
  TEXT_MAIN:    '#0F1F18',
  TEXT_MUTED:   '#6B8F7E',
  TEXT_LIGHT:   '#9DB5A8',
  TEXT_INVERSE: '#FFFFFF',

  // ── Borders ───────────────────────────────────────────────────────
  BORDER:  '#D1E8DF',
  DIVIDER: '#E8F4EF',

  // ── Status ────────────────────────────────────────────────────────
  SUCCESS: '#10B981',
  ERROR:   '#DC2626',
  WARNING: '#F59E0B',
  INFO:    '#2563EB',

  // ── Nutrition macro colors (same as theme.ts for consistency) ─────
  MACRO_PROTEIN: '#E05C8A',
  MACRO_CARBS:   '#1E7D5A',
  MACRO_FAT:     '#F59E0B',
  MACRO_FIBER:   '#2563EB',
  MACRO_WATER:   '#0EA5E9',

  // ── Health Rating ─────────────────────────────────────────────────
  HEALTHY:   '#10B981',
  MODERATE:  '#F59E0B',
  UNHEALTHY: '#DC2626',

  // ── Chart ─────────────────────────────────────────────────────────
  CHART_1: '#1E7D5A',
  CHART_2: '#E05C8A',
  CHART_3: '#F59E0B',
  CHART_4: '#2563EB',
  CHART_5: '#0EA5E9',
  CHART_6: '#9DB5A8',

  // ── Festivals ─────────────────────────────────────────────────────
  FESTIVAL_GOLD:  '#F59E0B',
  FESTIVAL_PINK:  '#E05C8A',
  TURMERIC:       '#F59E0B',
  MEHENDI:        '#1E7D5A',
  SINDOOR:        '#DC2626',

  // ── Google OAuth ──────────────────────────────────────────────────
  GOOGLE_RED: '#DB4437',

  // ── Legacy aliases (keep for backwards compat) ────────────────────
  SECONDARY:       '#E05C8A',
  SECONDARY_DARK:  '#C0346A',
  SECONDARY_LIGHT: '#FCE7F3',
  ACCENT_GOLD:     '#F59E0B',
};

/** LinearGradient color pairs */
export const Gradients = {
  // Hero headers
  PRIMARY:          ['#145A46', '#1E7D5A'] as const,
  SAFFRON:          ['#D97706', '#F59E0B'] as const,   // ACTUALLY saffron this time
  LOTUS:            ['#C0346A', '#E05C8A'] as const,

  // Card backgrounds
  CARD_WARM:        ['#FFFFFF', '#F3F8F5'] as const,
  CARD_GREEN:       ['#F0F7F4', '#FFFFFF'] as const,

  // Analytics header
  ANALYTICS_HEADER: ['#0A1210', '#145A46'] as const,

  // Streak / fire
  STREAK:           ['#F97316', '#F59E0B'] as const,

  // Full gradient (calorie ring)
  CALORIE_RING:     ['#1E7D5A', '#34D399'] as const,
} as const;
