export const Colors = {
  light: {
    text: "#1A253C",
    background: "#F5F8FC",
    tint: "#0A2A66",
    icon: "#6B7B9A",
    tabIconDefault: "#6B7B9A",
    tabIconSelected: "#0A2A66",
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: "#fff",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#fff",
  },
};

export const Theme = {
  colors: {
    primary: "#0A2A66",      // Deep Navy
    secondary: "#1E88E5",    // Electric Blue
    accent: "#FF6B00",       // Safety Orange
    background: "#F5F8FC",   // Soft light bluish-grey
    surface: "#FFFFFF",      // Pure White
    text: "#1A253C",         // Dark slate for readability
    textLight: "#6B7B9A",    // Muted slate for captions
    border: "#E1E8F5",       // Soft border grey
    cardShadow: "#0C1A30",
    
    // Status colors
    pending: "#FF6B00",      // Accent/Orange
    in_progress: "#1E88E5",  // Bright Blue
    resolved: "#4CAF50",     // Premium Green
    
    // Severity colors
    low: "#4CAF50",
    medium: "#FF9800",
    high: "#F44336"
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40
  },
  roundness: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 30,
    full: 9999
  },
  typography: {
    h1: {
      fontSize: 28,
      fontWeight: "800" as const,
      lineHeight: 34
    },
    h2: {
      fontSize: 22,
      fontWeight: "700" as const,
      lineHeight: 28
    },
    h3: {
      fontSize: 18,
      fontWeight: "600" as const,
      lineHeight: 24
    },
    body: {
      fontSize: 15,
      fontWeight: "400" as const,
      lineHeight: 20
    },
    caption: {
      fontSize: 12,
      fontWeight: "500" as const,
      lineHeight: 16
    },
    button: {
      fontSize: 16,
      fontWeight: "700" as const
    }
  }
};
