export const Colors = {
  // ── Primary
  PRIMARY: '#00BFA5',        // Premium Teal Green
  PRIMARY_DARK: '#00897B',   
  PRIMARY_LIGHT: '#E0F2F1',  

  // ── Secondary
  SECONDARY: '#FF5252',      // Soft Red
  SECONDARY_DARK: '#D32F2F', 
  SECONDARY_LIGHT: '#FFEBEE',

  // ── Accent: Purple
  ACCENT: '#6C5CE7',         // Soft Purple
  ACCENT_LIGHT: '#EFEEFE',   
  ACCENT_GOLD: '#FFB300',    

  // ── Backgrounds ────────────────────────────────────
  BACKGROUND: '#F8FAFC',     // Light Background
  SURFACE: '#FFFFFF',        // Pure White Card
  SURFACE_DARK: '#F1F5F9',   
  SURFACE_ELEVATED: '#FFFFFF', 

  // ── Typography ────────────────────────────────────────────────────────
  TEXT_MAIN: '#1E293B',      // Deep Slate
  TEXT_MUTED: '#64748B',     // Muted Blue-Grey
  TEXT_INVERSE: '#FFFFFF',   
  TEXT_LIGHT: '#94A3B8',     

  // ── Borders & Dividers ────────────────────────────────────────────────
  BORDER: '#E2E8F0',         
  DIVIDER: '#F1F5F9',        

  // ── Status ────────────────────────────────────────────────────────────
  SUCCESS: '#10B981',        
  ERROR: '#EF4444',          
  WARNING: '#F59E0B',        
  INFO: '#3B82F6',           

  // ── Special Palette ────────────────────────────────────────────
  FESTIVAL_GOLD: '#FFB300',  
  FESTIVAL_PINK: '#F06292',  
  LOTUS_PINK: '#F06292',     
  TURMERIC: '#FFB300',       
  MEHENDI: '#2D6A4F',        
  SINDOOR: '#C81D11',        

  // ── Chart & Data Visualization ────────────────────────────────────────
  CHART_1: '#00BFA5',        
  CHART_2: '#FF5252',        
  CHART_3: '#6C5CE7',        
  CHART_4: '#0EA5E9',        
  CHART_5: '#F59E0B',        
  CHART_6: '#94A3B8',        

  // ── Nutrition Health Ratings ──────────────────────────────────────────
  HEALTHY: '#10B981',
  MODERATE: '#F59E0B',
  UNHEALTHY: '#EF4444',

  // ── Google / OAuth ────────────────────────────────────────────────────
  GOOGLE_RED: '#DB4437',
};

// Gradient definitions for LinearGradient
export const Gradients = {
  SAFFRON: ['#00BFA5', '#009688'], 
  GREEN: ['#10B981', '#059669'],
  GOLD: ['#F59E0B', '#D97706'],
  TRICOLOR: ['#00BFA5', '#FFFFFF', '#FF5252'],
  CARD_WARM: ['#FFFFFF', '#F8FAFC'],
  HEADER: ['#00BFA5', '#009688'],
  CALORIE_CARD: ['#FFFFFF', '#F8FAFC'],
  PROTEIN_CARD: ['#FFFFFF', '#F8FAFC'],
  WATER_CARD: ['#FFFFFF', '#F8FAFC'],
  STEPS_CARD: ['#FFFFFF', '#F8FAFC'],
  YOGA_CARD: ['#FFFFFF', '#F8FAFC'],
} as const;
