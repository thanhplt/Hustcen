/**
 * HUST Cine - Tailwind Configuration
 * Based on Stitch Technical Cinema Design System
 */
window.tailwindConfig = {
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
        "primary-container": "#c8102e",
        "on-primary": "#ffffff",
        "surface-dim": "#dcd9e0",
        "gold-vip": "#B8902A",
        "tertiary-fixed": "#ffdf9b",
        "background": "#fbf8ff",
        "secondary-container": "#fd6166",
        "inverse-on-surface": "#f3eff7",
        "on-primary-fixed-variant": "#92001c",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "surface-bright": "#fbf8ff",
        "surface-highlight": "#FDECEF",
        "status-error": "#B3261E",
        "outline-variant": "#e5bdbb",
        "on-secondary-fixed-variant": "#8f0c20",
        "on-secondary-fixed": "#410007",
        "surface-base": "#FFFFFF",
        "surface-container-low": "#f5f2f9",
        "surface-container-lowest": "#ffffff",
        "surface-container": "#f0edf4",
        "on-background": "#1b1b20",
        "border-subtle": "#E8E0E0",
        "text-primary": "#1A1A1F",
        "on-primary-fixed": "#410007",
        "text-muted": "#8A8A94",
        "secondary-fixed-dim": "#ffb3b1",
        "inverse-surface": "#303035",
        "primary-fixed-dim": "#ffb3b1",
        "status-info": "#1F6FD1",
        "tertiary-fixed-dim": "#edc157",
        "tertiary": "#624900",
        "status-success": "#1E8E5A",
        "surface-variant": "#e4e1e8",
        "on-primary-container": "#ffdad8",
        "on-tertiary-fixed": "#251a00",
        "error": "#ba1a1a",
        "surface": "#fbf8ff",
        "on-tertiary-container": "#ffdf9b",
        "surface-tint": "#bf0229",
        "status-warning": "#D98A00",
        "on-secondary-container": "#640011",
        "inverse-primary": "#ffb3b1",
        "secondary": "#b12a34",
        "on-error-container": "#93000a",
        "secondary-fixed": "#ffdad8",
        "on-surface": "#1b1b20",
        "surface-container-highest": "#e4e1e8",
        "surface-container-high": "#eae7ee",
        "on-tertiary-fixed-variant": "#5b4300",
        "on-surface-variant": "#5c403f",
        "text-secondary": "#5B5B66",
        "on-tertiary": "#ffffff",
        "primary": "#9e001f",
        "on-secondary": "#ffffff",
        "primary-fixed": "#ffdad8",
        "tertiary-container": "#806000",
        "outline": "#906f6e",
        "surface-alt": "#F7F4F4"
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      "spacing": {
        "gutter": "1.5rem",
        "gutter-mobile": "0.75rem",
        "space-xs": "0.25rem",
        "margin-mobile": "1rem",
        "margin": "2rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2.5rem"
      },
      "fontFamily": {
        "headline-md": ["Be Vietnam Pro"],
        "headline-sm": ["Be Vietnam Pro"],
        "body-sm": ["Be Vietnam Pro"],
        "display-hero-mobile": ["Be Vietnam Pro"],
        "code-time": ["Be Vietnam Pro"],
        "display-hero": ["Be Vietnam Pro"],
        "body-lg": ["Be Vietnam Pro"],
        "label-lg": ["Be Vietnam Pro"],
        "headline-lg": ["Be Vietnam Pro"],
        "body-md": ["Be Vietnam Pro"],
        "headline-lg-mobile": ["Be Vietnam Pro"],
        "label-md": ["Be Vietnam Pro"],
        "label-sm": ["Be Vietnam Pro"]
      },
      "fontSize": {
        "headline-md": ["22px", {"lineHeight": "28px", "fontWeight": "600"}],
        "headline-sm": ["18px", {"lineHeight": "24px", "fontWeight": "600"}],
        "body-sm": ["12px", {"lineHeight": "18px", "fontWeight": "400"}],
        "display-hero-mobile": ["30px", {"lineHeight": "38px", "letterSpacing": "-0.01em", "fontWeight": "800"}],
        "code-time": ["13px", {"lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "500"}],
        "display-hero": ["44px", {"lineHeight": "52px", "letterSpacing": "-0.02em", "fontWeight": "800"}],
        "body-lg": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
        "label-lg": ["14px", {"lineHeight": "18px", "letterSpacing": "0.01em", "fontWeight": "600"}],
        "headline-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.015em", "fontWeight": "700"}],
        "body-md": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
        "headline-lg-mobile": ["24px", {"lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "700"}],
        "label-md": ["12px", {"lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "600"}],
        "label-sm": ["11px", {"lineHeight": "14px", "letterSpacing": "0.04em", "fontWeight": "600"}]
      }
    }
  }
};

if (typeof tailwind !== 'undefined') {
  tailwind.config = window.tailwindConfig;
}
