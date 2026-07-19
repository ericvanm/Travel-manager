import { createTheme, responsiveFontSizes, type Shadows } from '@mui/material/styles'
import { designTokens as t } from './designTokens'

const baseTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: t.colors.primary[600],
      light: t.colors.primary[500],
      dark: t.colors.primary[700],
      contrastText: t.colors.text.inverse,
    },
    secondary: {
      main: t.colors.accent[500],
      light: t.colors.accent[400],
      dark: t.colors.accent[600],
      contrastText: t.colors.text.inverse,
    },
    background: {
      default: t.colors.ground[100],
      paper: t.colors.surface.paper,
    },
    text: {
      primary: t.colors.text.primary,
      secondary: t.colors.text.secondary,
    },
    divider: t.colors.border.subtle,
    success: {
      main: t.colors.semantic.success,
    },
    warning: {
      main: t.colors.semantic.warning,
    },
    error: {
      main: t.colors.semantic.error,
    },
    info: {
      main: t.colors.semantic.info,
    },
  },
  typography: {
    fontFamily: t.typography.fontFamily.body,
    h1: {
      fontFamily: t.typography.fontFamily.display,
      fontWeight: 400,
      color: t.colors.text.primary,
    },
    h2: {
      fontFamily: t.typography.fontFamily.display,
      fontWeight: 400,
      color: t.colors.text.primary,
    },
    h3: {
      fontFamily: t.typography.fontFamily.display,
      fontWeight: 400,
      color: t.colors.text.primary,
    },
    h4: {
      fontFamily: t.typography.fontFamily.display,
      fontWeight: 400,
      color: t.colors.text.primary,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
    overline: {
      fontFamily: t.typography.fontFamily.mono,
      letterSpacing: '0.08em',
      fontSize: '0.6875rem',
    },
  },
  shape: {
    borderRadius: t.radius.md,
  },
  shadows: [
    'none',
    t.elevation.sm,
    t.elevation.md,
    t.elevation.lg,
    t.elevation.xl,
    ...Array(20).fill(t.elevation.xl),
  ] as Shadows,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: t.breakpoints.tablet,
      lg: t.breakpoints.desktop,
      xl: t.breakpoints.wide,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: t.colors.ground[100],
          color: t.colors.text.primary,
        },
        '#root': {
          minHeight: '100vh',
          width: '100%',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: t.radius.md,
          paddingInline: t.spacing.lg,
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: t.colors.primary[700],
          },
        },
        outlined: {
          borderColor: t.colors.border.default,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: t.radius.lg,
        },
        outlined: {
          borderColor: t.colors.border.subtle,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: 'default',
      },
      styleOverrides: {
        root: {
          backgroundColor: t.colors.surface.paper,
          color: t.colors.text.primary,
          borderBottom: `1px solid ${t.colors.border.subtle}`,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: t.elevation.lg,
        },
        primary: {
          backgroundColor: t.colors.accent[500],
          color: t.colors.text.inverse,
          '&:hover': {
            backgroundColor: t.colors.accent[600],
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: t.typography.fontFamily.mono,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: t.radius.md,
          backgroundColor: t.colors.surface.paper,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: t.radius.xl,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: t.radius.md,
        },
      },
    },
  },
})

/** MUI theme aligned with Figma Make tokens (responsive heading sizes). */
export const appTheme = responsiveFontSizes(baseTheme)
