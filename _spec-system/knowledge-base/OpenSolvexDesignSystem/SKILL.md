---
name: open-solvex-design
description: Use this skill to generate well-branded interfaces and assets for Open Solvex (Consultoría Profesional de Software y Digitalización Empresarial), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping. Spanish-language brand; dark-forest + neon-lime palette built around the tagline "Crecimiento Verde".
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

Tokens live in `colors_and_type.css`. Brand assets live in `assets/`. A ready-made marketing UI kit (Open Solvex IA landing + Hotelería sub-landing) lives in `ui_kits/marketing/` — both pages share the same React component library (`sections.jsx`, `hospitality.jsx`, `icons.jsx`, `neural-network.jsx`).

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. The simplest entry point is to copy `ui_kits/marketing/styles.css` + `assets/logo-on-forest.svg` (or `logo-forest-on-light.svg` for light surfaces) into a new HTML file and start composing — the section CSS already covers buttons, cards, eyebrows, the hero, the bento grid, the timeline, the testimonial pattern, the form, and the footer. For production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts or production code, depending on the need.

**Quick-reference essentials (full detail in README.md):**

- **Two surfaces only.** Dark sections use Forest `#0D2818` + Lime `#00FF88`. Light sections use Beige `#F5F1E8` + Graphite `#1F2937`. Lime is the only accent — there is no secondary colour.
- **Three fonts only.** Space Grotesk (display, 500), DM Sans (body), Geist Mono (eyebrows + KPI labels).
- **Headline pattern.** Spanish, *tú* address, business-outcome verbs. One word per headline gets `<em>` styling for lime emphasis (no italics).
- **Eyebrows.** `— 01 SERVICIOS` — mono uppercase + lime number + lime tick rule.
- **No emoji**, no photography, no gradients beyond subtle lime radials on hero/CTA. Iconography is **Lucide 1.5px stroke** in lime-on-forest tiles.
- **Cards** are paper (`#FFFDF7`) on light, forest on dark/feature. 1 px hairline border, 14–20 px radius. Shadows only on hover. The primary CTA gets a lime glow ring — the only saturated shadow in the system.
- **Animation.** `cubic-bezier(.2, .8, .2, 1)` at 250–350 ms. Hover lifts `-2px` and intensifies borders. No bounces, no parallax.
