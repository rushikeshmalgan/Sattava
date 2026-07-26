/**
 * Sattva Design System — Theme
 * ────────────────────────────
 * Every color in the app should come from this file.
 * DO NOT hardcode colors inside components.
 */

const shadow = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const theme = {
  light: {
    // ── Brand ─────────────────────────────────────────────────────
    primary:        '#1E7D5A',   // Deep Forest Green
    primaryLight:   '#D6F5E9',   // Very light green tint
    primaryDark:    '#145A46',
    accent:         '#F59E0B',   // Real Saffron/Amber
    accentLight:    '#FEF3C7',

    // ── Backgrounds ───────────────────────────────────────────────
    background:     '#F3F8F5',   // Slight green tint (not plain grey)
    card:           '#FFFFFF',
    cardElevated:   '#FFFFFF',
    surface:        '#FFFFFF',
    surfaceMuted:   '#F0F7F4',   // Slightly tinted surface

    // ── Text ──────────────────────────────────────────────────────
    text:           '#0F1F18',   // Near-black with green undertone
    textSecondary:  '#3D5A4F',
    textMuted:      '#6B8F7E',
    textLight:      '#9DB5A8',
    textOnPrimary:  '#FFFFFF',

    // ── Borders ───────────────────────────────────────────────────
    border:         '#D1E8DF',
    borderStrong:   '#A3C9BC',
    divider:        '#E8F4EF',

    // ── Status ────────────────────────────────────────────────────
    success:        '#10B981',
    successLight:   '#D1FAE5',
    warning:        '#F59E0B',
    warningLight:   '#FEF3C7',
    error:          '#DC2626',
    errorLight:     '#FEE2E2',
    info:           '#2563EB',
    infoLight:      '#DBEAFE',

    // ── Nutrition macros (consistent across all components) ────────
    macroProtein:   '#E05C8A',   // Lotus Pink
    macroCarbs:     '#1E7D5A',   // Forest Green
    macroFat:       '#F59E0B',   // Saffron
    macroFiber:     '#2563EB',   // Blue
    macroWater:     '#0EA5E9',   // Sky Blue

    // ── Shadow ────────────────────────────────────────────────────
    shadow:         shadow.light,
  },

  dark: {
    // ── Brand ─────────────────────────────────────────────────────
    primary:        '#34D399',   // Lighter emerald for dark bg
    primaryLight:   '#064E3B',
    primaryDark:    '#10B981',
    accent:         '#FBBF24',   // Lighter saffron for dark bg
    accentLight:    '#78350F',

    // ── Backgrounds ───────────────────────────────────────────────
    // The secret to good dark mode: 3 levels of dark backgrounds
    background:     '#0A1210',   // Deepest — screen bg
    card:           '#141F1B',   // Cards sit on background
    cardElevated:   '#1C2B24',   // Modals, elevated content
    surface:        '#1C2B24',
    surfaceMuted:   '#0F1A15',

    // ── Text ──────────────────────────────────────────────────────
    text:           '#E8F5F0',   // Near-white with green tint
    textSecondary:  '#A8D5C5',
    textMuted:      '#6B9E8D',
    textLight:      '#4A7063',
    textOnPrimary:  '#0A1210',

    // ── Borders ───────────────────────────────────────────────────
    border:         '#1F3329',
    borderStrong:   '#2A4438',
    divider:        '#162219',

    // ── Status ────────────────────────────────────────────────────
    success:        '#34D399',
    successLight:   '#064E3B',
    warning:        '#FBBF24',
    warningLight:   '#78350F',
    error:          '#F87171',
    errorLight:     '#7F1D1D',
    info:           '#60A5FA',
    infoLight:      '#1E3A5F',

    // ── Nutrition macros ──────────────────────────────────────────
    macroProtein:   '#F472B6',   // Lighter lotus for dark
    macroCarbs:     '#34D399',   // Lighter green for dark
    macroFat:       '#FBBF24',   // Lighter saffron for dark
    macroFiber:     '#60A5FA',   // Lighter blue for dark
    macroWater:     '#38BDF8',   // Lighter sky for dark

    // ── Shadow ────────────────────────────────────────────────────
    shadow:         shadow.dark,
  },
};

export type ThemeType = typeof theme.light;
