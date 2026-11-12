/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Official PocketPot Brand Color Tokens & CSS Variable Fallbacks
        canvas: "var(--color-canvas, #F8F9FA)",                   // Canvas Background (Warm Off-White)
        surface: "var(--color-surface, #FFFFFF)",                 // Surface Card (Clean White)
        primaryText: "var(--color-primary-text, #1E293B)",         // Primary Text (Slate Navy)
        brandPrimary: "var(--color-brand-primary, #0D9488)",       // Brand Primary (Calming Teal)
        brandSecondary: "var(--color-brand-secondary, #D97706)",   // Brand Secondary (Warm Amber)
        positiveState: "var(--color-positive-state, #15803D)",     // Positive State (Sage Green)
        warningState: "var(--color-warning-state, #C2410C)",       // Warning State (Soft Terracotta)
        terracotta: "var(--color-warning-state, #C2410C)",         // Brand Guidelines Soft Terracotta
        softTerracotta: "var(--color-warning-state, #C2410C)",     // Brand Guidelines Soft Terracotta
        focusIndicator: "var(--color-focus-indicator, #4338CA)",   // Focus Indicator (Electric Indigo)

        // Supporting Semantic Tints
        tealSurface: "#F0FDFA",
        amberSurface: "#FFFBEB",
        greenSurface: "#F0FDF4",
        terracottaSurface: "#FFF7ED",
        indigoSurface: "#EEF2FF",
        borderMuted: "#E2E8F0",
      },
      fontFamily: {
        lexend: ["var(--font-lexend)", "sans-serif"],
      },
      fontSize: {
        // Accessibility Standard: Minimum body size 18sp/pt (1.125rem / 18px)
        body: ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        "body-lg": ["1.25rem", { lineHeight: "1.875rem", letterSpacing: "-0.015em" }],
        // Numerical Data: Minimum 24sp/pt (1.5rem / 24px) for isolated white card islands
        island: ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.015em", fontWeight: "700" }],
        "island-lg": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em", fontWeight: "700" }],
      },
      borderRadius: {
        pot: "1.25rem",         // 20px physical Pot container curvature
        island: "0.875rem",      // 14px isolated white card island
      },
      boxShadow: {
        potBase: "0 12px 30px -8px rgba(13, 148, 136, 0.14), 0 4px 12px -2px rgba(30, 41, 59, 0.05)",
        islandCard: "0 2px 8px -1px rgba(30, 41, 59, 0.08), 0 1px 3px -1px rgba(30, 41, 59, 0.05)",
        tactileRim: "inset 0 2px 3px rgba(255, 255, 255, 0.6), inset 0 -2px 4px rgba(0, 0, 0, 0.08)",
        tactileChamber: "inset 0 3px 8px rgba(30, 41, 59, 0.06), inset 0 -2px 4px rgba(255, 255, 255, 0.8)",
      },
    },
  },
  plugins: [],
};
