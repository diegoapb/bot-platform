/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette
        forest: "var(--forest)",
        "forest-2": "var(--forest-2)",
        "forest-soft": "var(--forest-soft)",
        lime: "var(--lime)",
        "lime-dim": "var(--lime-dim)",
        beige: "var(--beige)",
        "beige-2": "var(--beige-2)",
        "beige-3": "var(--beige-3)",
        paper: "var(--paper)",
        graphite: "var(--graphite)",
        "graphite-2": "var(--graphite-2)",
        "graphite-3": "var(--graphite-3)",

        // Semantic surfaces / foreground (respond to data-surface="dark")
        bg: "var(--bg)",
        surface: "var(--surface)",
        soft: "var(--soft)",
        chip: "var(--chip)",
        fg: "var(--fg)",
        fg2: "var(--fg2)",
        fg3: "var(--fg3)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "on-accent": "var(--on-accent)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",

        // Status
        ok: "var(--ok)",
        "ok-bg": "var(--ok-bg)",
        warn: "var(--warn)",
        "warn-bg": "var(--warn-bg)",
        danger: "var(--danger)",
        "danger-bg": "var(--danger-bg)",
        info: "var(--info)",
        "info-bg": "var(--info-bg)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        mono: "var(--font-mono)",
        sans: "var(--font-body)",
      },
      borderColor: {
        DEFAULT: "var(--line)",
      },
      borderRadius: {
        sm: "var(--r-sm)",
        DEFAULT: "var(--r)",
        md: "var(--r)",
        lg: "var(--r-lg)",
        pill: "999px",
      },
      boxShadow: {
        e1: "var(--shadow-1)",
        e2: "var(--shadow-2)",
        e3: "var(--shadow-3)",
        glow: "var(--glow-lime)",
      },
      maxWidth: {
        rail: "1240px",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
