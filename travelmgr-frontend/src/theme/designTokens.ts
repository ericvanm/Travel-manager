/**
 * Design tokens from Figma Make — Travel Manager redesign (Phase 1).
 * Use in MUI theme and as CSS custom properties in index.css.
 */
export const designTokens = {
  colors: {
    primary: {
      50: '#E8F0F4',
      100: '#C5D9E4',
      200: '#9BB8CC',
      500: '#2E6D8E',
      600: '#1B4F72',
      700: '#123648',
      800: '#0D2835',
    },
    accent: {
      400: '#E0A85C',
      500: '#C8873A',
      600: '#9A6829',
    },
    ground: {
      50: '#FAF9F6',
      100: '#F5F3EE',
      200: '#E8E4DC',
    },
    surface: {
      paper: '#FFFFFF',
      elevated: '#FFFFFF',
    },
    text: {
      primary: '#1A2E3B',
      secondary: '#5C6B73',
      muted: '#8A959C',
      inverse: '#FFFFFF',
    },
    border: {
      subtle: '#E2DDD4',
      default: '#D4CEC3',
    },
    semantic: {
      success: '#2E7D4F',
      warning: '#B8860B',
      error: '#C0392B',
      info: '#1B4F72',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
    '4xl': 64,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  elevation: {
    sm: '0 1px 2px rgba(26, 46, 59, 0.06)',
    md: '0 4px 12px rgba(26, 46, 59, 0.08)',
    lg: '0 8px 24px rgba(26, 46, 59, 0.10)',
    xl: '0 16px 40px rgba(26, 46, 59, 0.12)',
  },
  breakpoints: {
    mobile: 0,
    tablet: 768,
    desktop: 1024,
    wide: 1280,
  },
  typography: {
    fontFamily: {
      display: '"DM Serif Display", Georgia, "Times New Roman", serif',
      body: '"Inter", system-ui, -apple-system, sans-serif',
      mono: '"DM Mono", ui-monospace, monospace',
    },
  },
} as const

export type DesignTokens = typeof designTokens
