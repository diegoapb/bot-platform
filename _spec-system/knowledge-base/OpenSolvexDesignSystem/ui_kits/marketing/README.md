# Marketing UI Kit · Open Solvex

Pixel-recreation of the two marketing surfaces that ship with this brand today.

## Pages

| Path | What it is |
|---|---|
| `index.html` | **Open Solvex IA** — generalist landing for software + AI consulting. Hero (with toggleable neural / growth visual), pillars, services bento, results metrics, 4-step process, cases, sectors, contact form, footer. |
| `hotelera.html` | **Open Solvex Hotelería & Turismo** — vertical sub-landing. Reuses the base section CSS, layers `hospitality.css` and `hospitality.jsx` for stack grid + alternating cases + 3-column solutions. |

Both ship with a Tweaks panel that toggles light/dark mode and (on `index`) swaps the hero background between the animated neural-network canvas and the static growth curve.

## Components

```
icons.jsx         · <Ico name="..." /> · Lucide-style stroked icons (see ICO_PATHS keys)
neural-network.jsx · <NeuralNetwork variant="neural|growth" /> · hero background
sections.jsx      · <Nav/> <Hero/> <Pillars/> <Services/> <Results/> <Process/> <Cases/> <Sectors/> <CTAForm/> <Footer/>
hospitality.jsx   · <HotNav/> <HotHero/> <HotPillars/> <HotStack/> <HotResults/> <HotCases/> <HotSolutions/> <HotCTA/> <HotFooter/>
tweaks-panel.jsx  · panel scaffold (starter component)
```

All components register themselves on `window` so a single root `<script type="text/babel">` can compose them without imports.

## CSS

`styles.css` is the verbatim source CSS (873 lines) lifted from `uploads/Estilos Landing Page IA (1).css`. `hospitality.css` is the verbatim sub-landing overrides. Tokens live at the top of `styles.css` (`:root`).

## Caveats

- Component source for the original landings (`sections.jsx`, `icons.jsx`, `neural-network.jsx`, `hospitality.jsx`) was **not uploaded** — these are reconstructions matching the class structure encoded in the CSS, not a 1:1 copy. Copy & content was written to match the brand voice (Spanish, *tú*, growth-first, mono eyebrows with numbers). If you have the original JSX, please attach it for reconciliation.
- Icons use **Lucide-style inline SVG** as a substitute. Swap `icons.jsx` if a custom icon set exists.
