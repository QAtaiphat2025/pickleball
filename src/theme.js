import { theme as antdTheme } from 'antd'

// Dark theme tokens ported from qlsx-admin so the look matches the
// production management app the user already runs.
export const themeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorBgLayout: '#09162f',
    colorBgContainer: '#131f3a',
    colorBgElevated: '#0e1d38',
    colorText: '#f8fbff',
    colorTextSecondary: '#a6bdd7',
    colorPrimary: '#3fd9ff',
    colorSuccess: '#4ade80',
    colorWarning: '#fde047',
    colorError: '#fb7185',
    colorBorder: 'rgba(101, 227, 255, 0.28)',
    borderRadius: 16,
    fontSize: 14,
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif',
  },
  components: {
    Layout: {
      headerBg: '#0e1d38',
      siderBg: '#0e1d38',
      bodyBg: '#09162f',
    },
    Button: {
      borderRadius: 12,
      controlHeight: 40,
    },
    Card: {
      borderRadiusLG: 18,
    },
    Table: {
      borderRadiusLG: 14,
    },
    Segmented: {
      borderRadius: 12,
    },
    Drawer: {
      colorBgElevated: '#0e1d38',
    },
    Modal: {
      contentBg: '#131f3a',
      headerBg: '#131f3a',
    },
    Input: {
      borderRadius: 12,
    },
    Select: {
      borderRadius: 12,
    },
  },
}

// Skill-level accent colors (A strongest → D).
export const LEVEL_COLORS = {
  A: '#fb7185',
  B: '#fde047',
  C: '#4ade80',
  D: '#3fd9ff',
}
