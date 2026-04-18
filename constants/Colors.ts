/**
 * SwasthBharat — Indian Wellness Color System
 * Inspired by the Indian tricolor: Saffron, White, and Green
 * with Ashoka Chakra deep navy as accent
 */
export const Colors = {
  // ── Primary: Saffron ─────────────────────────────────────────────────
  PRIMARY: '#FF9933',        // Saffron — Indian flag
  PRIMARY_DARK: '#D97706',   // Deep amber — pressed states
  PRIMARY_LIGHT: '#FFB366',  // Light saffron — highlights

  // ── Secondary: India Green ────────────────────────────────────────────
  SECONDARY: '#138808',      // Indian flag green
  SECONDARY_DARK: '#0A5C05', // Forest green — borders
  SECONDARY_LIGHT: '#22C55E',// Mint green — success variants

  // ── Accent: Ashoka Navy ───────────────────────────────────────────────
  ACCENT: '#003087',         // Ashoka Chakra deep blue
  ACCENT_LIGHT: '#1D4ED8',   // Royal blue — links
  ACCENT_GOLD: '#C8973A',    // Turmeric gold — premium

  // ── Backgrounds (warm cream tones) ────────────────────────────────────
  BACKGROUND: '#FFFDF7',     // Warm cream / ivory
  SURFACE: '#FFF8ED',        // Card background — warm white
  SURFACE_DARK: '#F5EDDC',   // Slightly deeper card
  SURFACE_ELEVATED: '#FFFFFF',// Pure white cards on cream

  // ── Typography ────────────────────────────────────────────────────────
  TEXT_MAIN: '#1A0F00',      // Warm near-black
  TEXT_MUTED: '#7A6040',     // Warm muted — subtitles
  TEXT_INVERSE: '#FFFFFF',   // White text on colored bg
  TEXT_LIGHT: '#A89070',     // Very muted — placeholders

  // ── Borders & Dividers ────────────────────────────────────────────────
  BORDER: '#E8D5B0',         // Warm beige border
  DIVIDER: '#EDE0C8',        // Section separators

  // ── Status ────────────────────────────────────────────────────────────
  SUCCESS: '#138808',        // Indian green
  ERROR: '#CC2200',          // Deep red
  WARNING: '#FF9933',        // Saffron as warning
  INFO: '#003087',           // Ashoka blue

  // ── Special Indian Palette ────────────────────────────────────────────
  FESTIVAL_GOLD: '#D4A017',  // Diwali gold
  FESTIVAL_PINK: '#E91E8C',  // Holi pink
  LOTUS_PINK: '#F4608B',     // Lotus pink
  TURMERIC: '#C8973A',       // Turmeric yellow
  MEHENDI: '#4A7C59',        // Mehendi green
  SINDOOR: '#CC2200',        // Sindoor red

  // ── Chart & Data Visualization ────────────────────────────────────────
  CHART_1: '#FF9933',        // Saffron — calories/carbs
  CHART_2: '#138808',        // Green — protein
  CHART_3: '#003087',        // Blue — fat
  CHART_4: '#C8973A',        // Gold — fiber
  CHART_5: '#E91E8C',        // Pink — water
  CHART_6: '#9B59B6',        // Purple — steps

  // ── Nutrition Health Ratings ──────────────────────────────────────────
  HEALTHY: '#138808',
  MODERATE: '#FF9933',
  UNHEALTHY: '#CC2200',

  // ── Google / OAuth ────────────────────────────────────────────────────
  GOOGLE_RED: '#DB4437',
};

// Gradient definitions for LinearGradient
export const Gradients = {
  SAFFRON: ['#FF9933', '#FFB366'],
  GREEN: ['#138808', '#22C55E'],
  GOLD: ['#C8973A', '#E8C060'],
  TRICOLOR: ['#FF9933', '#FFFDF7', '#138808'],
  CARD_WARM: ['#FFF8ED', '#FFFDF7'],
  HEADER: ['#FF9933', '#D97706'],
  CALORIE_CARD: ['#FF6B1A', '#FF9933'],
  PROTEIN_CARD: ['#138808', '#1AA00A'],
  WATER_CARD: ['#003087', '#1D4ED8'],
  STEPS_CARD: ['#9B59B6', '#7D3C98'],
  YOGA_CARD: ['#E91E8C', '#F4608B'],
} as const;
