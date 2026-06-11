# Open Solvex · Design System

> **Open Solvex** — *Consultoría Profesional de Software y Digitalización Empresarial.*
> Tagline: "Software & IA que hace crecer tu negocio."

Open Solvex is a Spanish-speaking software & AI consultancy that designs tailor-made digital solutions to drive sales, attract customers, and elevate service quality for SMBs. The current visual system was developed around a single tagline — **Crecimiento Verde** ("Green Growth") — and is expressed through a dark-forest + neon-lime palette borrowed from the language of fintech/AI tooling, mixed with warm beige paper surfaces that keep the brand approachable.

The system covers two surfaces today:

1. **Open Solvex — main landing page** (`/landing_ia.html`)
   Generalist marketing site for software + AI consulting. Hero with an animated neural-network background and a "growth curve" alternative, value pillars, bento grid of services, results metrics, 4-step process timeline, case studies, sector matrix, and a contact form.
2. **Open Solvex Hotelería & Turismo — vertical sub-landing** (`/landing_hotelera.html`)
   Vertical for hotels/hospitality. Reuses all base tokens but adds a self-hosted open-source "stack" grid (Cal.com, Listmonk, Plausible, etc.), alternating big-format case studies, and a 3-column solutions list.

## Sources

The system was reconstructed from these uploads in `uploads/`:

| File | What it is |
|---|---|
| `Estilos Landing Page IA (1).css` | The full base CSS token system + section styles (873 lines). Source of truth for tokens. |
| `Landing Page IA (1).html` | App shell for the main IA landing (mounts React + babel scripts). |
| `Landing Page Hotelera.html` | App shell for the hotelería sub-landing. |
| `hospitality landing page (1).css` | Sub-landing overrides (stack grid, alternating cases, solutions). |
| `Landing Page Diseño Sistema.html` / `Landing Page Diseño System.html` | **Could not read** — filenames contain a combining diacritic that the editor's path validator rejects. See *Caveats* below. |

Companion JSX files referenced by the landings (`icons.jsx`, `sections.jsx`, `hospitality.jsx`, `neural-network.jsx`, `tweaks-panel.jsx`) **were not uploaded**; component recreations in `ui_kits/` are reconstructed from the CSS + HTML structure and the visual decisions encoded in the token system.

No Figma link or GitHub repo was provided.

---

## CONTENT FUNDAMENTALS

**Language.** Spanish (es-MX register). Direct, professional, second-person familiar — **tú**, never *usted*. Sentences are short, declarative, results-first. Marketing copy reads like a thoughtful product manager — never a sales pitch.

**Tone.** Confident, technical-but-warm. The brand sells software *and* IA, but the focus is always on **business outcome** ("más reservas directas", "menos fricción", "captar más huéspedes", "reducir comisiones"). The word *crecimiento* (growth) anchors everything.

**Casing.** Sentence case in body and headings — never Title Case. Eyebrow labels and tags are `UPPERCASE` in mono font with a leading short rule. Numbers in eyebrows are stylized as `01 / 02 / 03`.

**Headline rhythm.** Display headlines mix a regular phrase with a **lime-coloured emphasis word in italic-less em** (`<em>` styled as same weight, accent colour, no italics). E.g.:

> Software & IA que hace **crecer** tu negocio.
> Más reservas **directas**, menos fricción.

**Eyebrows.** Always paired with a number, e.g. `— 01 SERVICIOS`, `— 02 RESULTADOS`. Drives the "engineered roadmap" feel.

**Stats / metrics.** Large display-font numbers in lime, paired with a short uppercase mono label below. Always grounded in business KPIs (reservas, comisiones, tiempo de respuesta, ROI), never vanity tech metrics.

**Emoji.** Not used in core marketing copy. The one place an emoji glyph appears in code (`💬` as a decorative motif on a case-study tile) is overlaid with `filter: grayscale(1) brightness(2)` and 18% opacity — i.e. it's used as a *texture*, never as content.

**CTA verbs.** Action-first, no marketing fluff: `Agendar diagnóstico`, `Ver casos`, `Hablar con un experto`. Buttons are pill-shaped and short — never more than 3 words.

**Trust signals.** Stack is named explicitly ("open-source", lists specific tools by name with their `OS` badge). Cases reference real businesses (Lomas, Bahía, La Posada in hospitality) with named people in testimonials.

---

## VISUAL FOUNDATIONS

**Palette philosophy.** Two-surface system. Dark sections use **Forest `#0D2818`** as the ground and **Lime `#00FF88`** as the only accent. Light sections use **Beige `#F5F1E8`** as the ground with **Graphite `#1F2937`** as the type. The lime is the single load-bearing colour — there is no secondary accent, no orange, no blue. Sections alternate Forest → Beige → Beige-2 → Forest to create vertical rhythm.

**Typography.** Three families, no more:
- **Space Grotesk** (display & headings, weight 500 with `letter-spacing: -0.025em`) — handles every headline.
- **DM Sans** (body, weight 400–600) — handles every paragraph, button, and form field.
- **Geist Mono** (mono, weight 400–500) — eyebrows, tags, KPI labels, system-y metadata.

Display headlines are *deliberately tight* (`line-height: 0.98`, negative tracking). Body copy is generous (`line-height: 1.5–1.55`, max-width ~56ch). `text-wrap: balance` on headlines, `text-wrap: pretty` on lede paragraphs.

**Spacing.** A loose 4/8-pt scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 112). Sections breathe — vertical padding of 110–130 px between marketing sections. Cards use 24–32 px interior padding.

**Backgrounds.** Three flavours:
1. **Solid forest** with two corner radial gradients of lime at very low opacity (8–18%) to suggest a soft glow without bloom. Always paired with a subtle linear vignette toward the bottom.
2. **Beige paper** (`#FFFDF7`) for cards on light sections — slightly brighter than the section ground so cards lift.
3. **Animated neural-network canvas** as a hero variant (small white dots + lime connecting lines, low density). Alternative is a "growth curve" SVG.

No photographic imagery in the system today. Case studies use **abstract geometric overlays** (dashed circles, repeating vertical lines, dot grids) rendered in CSS, not images.

**Animation.** Restrained.
- Default easing: `cubic-bezier(.2, .8, .2, 1)` (a sharp-out ease) at 250–350 ms.
- Hover lift: `translateY(-2px)` paired with a colour-shift on the border and a long, soft shadow.
- Hero badge has a 2.4 s `pulse` on the lime dot. The 4-step process timeline fills a lime line across nodes on scroll-into-view (1.2 s).
- Reveal pattern: `opacity 0 → 1` + `translateY(20px → 0)` over 800 ms. Used sparingly.
- **No bounces, no spring physics, no parallax**, no flashy entrances.

**Hover & press.**
- Primary button: 6 px lime glow ring + 12 px y-translation downward shadow. Internal `.arr` icon shifts `+3px` right. Slight `translateY(-1px)` on the whole button.
- Ghost button: border colour shifts from 22 % opacity to lime; text colour shifts to lime.
- Cards: border colour intensifies (`var(--line-light)` → `var(--lime)` or `var(--graphite)`), `translateY(-2px)`, soft long shadow appears.
- Nav links: text colour → lime, no underline.
- Press state: not explicitly styled — relies on the OS default click feedback, slightly muted by the hover transform.

**Borders.** Hairlines are the dominant separator. Light sections use `rgba(31,41,55,0.10)`; dark sections use `rgba(245,241,232,0.10)`. Cards have 1 px borders that intensify on hover instead of using shadow alone. Dashed `border-bottom` (1 px, line-light) used for in-card section breaks (e.g., between testimonial body and result KPI).

**Shadows / elevation.** Used sparingly and *only on hover*. Always large-radius, long-y, low-opacity (negative spread): `0 18px 40px -28px rgba(31,41,55,0.25)`. Resting cards rely on borders + surface contrast, not drop shadows. The primary CTA gets a coloured glow (lime, 55 % opacity) — the only saturated shadow in the system.

**Protection gradients.** Hero uses a bottom-up linear gradient (`0% → 80%` of forest) to ensure stat tiles and CTAs remain legible over the animated neural network. CTA section uses a 50 % radial of lime at 18 % opacity from below to push the eye up into the headline.

**Layout rules.** 1240 px max content width. Horizontal padding clamps `20px → 4vw → 48px`. Sections are full-bleed coloured grounds with the content rail centred inside. Asymmetric two-column layouts at hero (1.15fr 1fr) and section headers (1fr 1fr).

**Transparency & blur.** Forms on dark sections use `rgba(245,241,232,0.04)` + `backdrop-filter: blur(10px)`. Stat tiles in the hero use `rgba(13,40,24,0.65)` + `blur(6px)` so the neural network shows through faintly. Blur is a hero/CTA-only effect — never on regular cards.

**Imagery treatment.** No photography. Where imagery is implied (case-study tiles), it's replaced with: forest-coloured panel + lime radial glow + 36 px dotted grid mask + one geometric primitive (concentric dashed circles, vertical line repeat, etc.). Mood is **cool, technical, calm** — never warm or stocky.

**Corner radii.**
- `8px` — chips, tags, input fields, small icon containers.
- `14px` — default radius for medium cards.
- `20px` — large cards, panels, the form container, primary surfaces.
- `999px` — pill buttons, badges with status dots.
Icon containers inside cards use `10–14px`.

**Card anatomy.**
- Bg: `#FFFDF7` (paper) on light sections, `var(--forest)` on feature/dark variants.
- Border: 1 px line-light at rest, lime or graphite on hover.
- Padding: 24–28 px. Min-height ~200–280 px so cards align in grids.
- Hover: `translateY(-2px)`, border shift, long soft shadow. Some variants also add a `box-shadow: 0 0 0 1px var(--lime)` to double up the border.
- Internal structure: eyebrow num (mono, top-left or top-right corner) → 44–52 px icon tile (forest bg + lime icon) → 22 px display title → 14.5–15 px body in graphite-2 → optional row of mono tags.

**Iconography.** See ICONOGRAPHY section below.

---

## ICONOGRAPHY

**No imported icon font in source.** The two landing pages reference an `icons.jsx` component (`Ico`) that **was not uploaded**, so the exact icon set is unknown. Based on the visual treatment (44–52 px coloured tile containers, 1.5–2 px stroke icons), the system is clearly using a **stroked, geometric set in the Lucide / Heroicons family**.

**Substitution.** This design system standardises on **[Lucide](https://lucide.dev)** (the MIT-licensed fork of Feather, 1.5 px default stroke) as the icon substitute. Lucide is CDN-available, matches the geometric-thin aesthetic, and ships React components. Flag this to the brand owner — **if a custom icon set exists, please attach the `icons.jsx` file or the source SVGs** and we'll swap.

**Icon usage rules.**
- Inside cards / pillars: 22–26 px icon, white/lime on a 44–52 px squircle (`r-sm: 8px` to `14px`) coloured `--forest` (light section) or `--lime` background (feature card).
- In navigation / footer: 16–20 px, currentColor.
- In buttons: 16 px, paired with text via `gap: 10px`. Primary button has a right-arrow that animates `+3px` on hover.
- In sectors row: 22 px, graphite-2 → lime on hover, with text label beside.

**Emoji.** Not used as content. One decorative 💬 appears on a hospitality case tile, desaturated and at 18 % opacity — treat as a one-off texture, not a pattern. **Do not introduce emoji** in new designs.

**Unicode characters.** Smart quotes only — `“ ”` used around testimonial pull-quotes, coloured lime via `::before` / `::after`. No bullets, em-dashes, or other unicode chrome used as icons.

**Logo / wordmark.** The official mark is a **circular badge** containing two interlocking spirals that form a continuous infinity-style "S" silhouette — the spirals are knocked-out so the surface behind shows through. Four official lockups ship in `assets/`:

| File | Background | Circle | Knockout | Use |
|---|---|---|---|---|
| `assets/logo-on-forest.svg` | `#0D2818` Forest | Lime | Forest | **Primary** — dark marketing surfaces, hero, footer |
| `assets/logo-on-lime.svg` | `#00FF88` Lime | Forest | Lime | Accent surfaces, stickers, lime CTAs |
| `assets/logo-forest-on-light.svg` | `#F5F5F5` Light | Forest | Light | **Primary light** — light marketing, docs, slides |
| `assets/logo-lime-on-light.svg` | `#F5F5F5` Light | Lime | Light | Alt light — when forest would compete with type |

For flexible composition there are two **transparent mark-only** versions: `assets/mark-lime.svg` and `assets/mark-forest.svg` (the spirals are real transparent knockouts via SVG `<mask>`, so the surface behind shows through correctly).

**Wordmark.** Beside the mark, the wordmark reads **Open Solvex** in Space Grotesk 500. The word *Solvex* is wrapped in `<em>` and coloured lime when the lockup sits on a dark surface; on light surfaces the whole wordmark stays graphite. Mark size = wordmark cap height × ~1.2. Gap between mark and wordmark = mark size ÷ 3 (16 px at 48 px mark).

**Sizing.**
- Display (heroes, splash): 80 px+
- Default (nav, footer, cards): 48 px
- Compact nav / inline: 32 px
- Minimum (favicons only): 24 px — never go smaller; the knockout spirals lose definition.

**Clear space.** ¼ of the mark's diameter on all sides — no other element may enter that zone.

---

## Index

```
README.md                       this file
SKILL.md                        Agent-Skill manifest for Claude Code
colors_and_type.css             foundational tokens (CSS variables) + semantic styles
assets/
  logo-on-forest.svg            primary lockup — lime mark on forest
  logo-on-lime.svg              accent lockup — forest mark on lime
  logo-forest-on-light.svg      primary light lockup
  logo-lime-on-light.svg        alt light lockup
  mark-lime.svg                 transparent mark, lime circle (knockout cuts to bg)
  mark-forest.svg               transparent mark, forest circle (knockout cuts to bg)
  neural-network.svg            static still of the hero background motif
  growth-curve.svg              alternate hero visual
preview/                        ~20 cards rendered in the Design System tab
  colors-*.html
  type-*.html
  spacing-*.html
  components-*.html
  brand-*.html
ui_kits/
  marketing/                    Open Solvex IA + Hotelería marketing surfaces
    index.html
    Nav.jsx, Hero.jsx, Pillars.jsx, Services.jsx, Results.jsx, Process.jsx,
    Cases.jsx, Sectors.jsx, CTAForm.jsx, Footer.jsx, Icons.jsx
uploads/                        original source files
```

---

## Caveats / open asks

1. **Missing component source.** The original landings reference `sections.jsx`, `icons.jsx`, `neural-network.jsx`, `hospitality.jsx`, and `tweaks-panel.jsx`. Only the CSS + HTML shells were uploaded, so all React components in `ui_kits/` are **reconstructions from the CSS class structure + visual decisions encoded in the tokens**, not 1:1 copies. If you can attach the originals, we'll reconcile.
2. **Two source files unreadable.** `Landing Page Diseño Sistema.html` and `Landing Page Diseño System.html` have a combining diacritic in their filenames that the project's path validator rejects. **Could you re-upload them with ASCII filenames** (e.g. `Landing Page Diseno Sistema.html`)? They may contain the official design-system documentation we should mirror here.
3. ~~No logo / brand asset file.~~ **Resolved 2026-05-23** — official logos (`os-logo 27.svg` through `30.svg`) were uploaded and are now the canonical mark in `assets/`. The old reconstructed `logo-mark.jsx` was removed.
4. **Icon substitution.** Standardised on Lucide. Confirm or replace.
5. **No Figma / GitHub.** If a Figma library or repo exists, share it so we can pull design-context directly rather than working from a single CSS file.
