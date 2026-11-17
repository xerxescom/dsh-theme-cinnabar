/**
 * The liquid-glass material: a third stylesheet layer, dark scheme only.
 *
 * What "liquid glass" means here, in the order the browser paints it:
 *
 *   1. **A translucent fill.** The composer is its surface token at 88% over
 *      whatever blurs behind it. The remaining 12% is what makes scrolled chat
 *      text smear through the pane instead of disappearing under it.
 *   2. **A backdrop blur with a saturation lift.** The blur is the effect; the
 *      saturation keeps the warm ink from washing grey, which is what a plain
 *      `blur()` does to a near-black surface.
 *   3. **A specular rim.** One white inset hairline on the top edge, one black
 *      on the bottom. That pair is what reads as *glass* and not as
 *      *translucency*, because it implies a light source above the pane.
 *   4. **An accent bloom.** A cinnabar radial in the top-left corner, mixed
 *      from `--dsw-alias-state-business-primary` rather than a literal, so the
 *      glow can never drift from the accent.
 *
 * Two rules the layer keeps:
 *
 *   - **Readability is still the gate.** The fill alpha is chosen so that text
 *     painted on a pane stays above its floor *even if the backdrop behind the
 *     glass is pure white* — see {@link GLASS_WORST_CASE}. `tools/check.mjs`
 *     recomputes that on every run from `tokens.json` and the numbers below.
 *   - **Only what DSH does not already have.** The design system ships its own
 *     frosted menus (`--dsw-menu-surface-fill` + `--dsw-menu-backdrop-filter:
 *     blur(40px)`), so this file does not re-implement them; it does not even
 *     set those variables. The composer is the surface with no material, and
 *     that is what this layer fills in.
 *
 * Dark only for now: on paper, translucency trades away exactly the warm surface
 * tone the light scheme is built on, and the alpha that works over ink does not
 * work over `#faf7f2`. A light variant needs its own fill/rim pair, not a toggle.
 */

/**
 * The material's numbers. Every literal the stylesheet prints comes from here,
 * so a colour check can read the same constants instead of scraping CSS.
 */
export const GLASS = {
  /** Pane fill as a fraction of its surface token, over the blurred backdrop. */
  fill: 0.88,
  /** Blur radius of the pane. */
  blurPx: 26,
  /** Saturation lift: the ingredient that keeps a near-black surface from going grey. */
  saturate: 160,
  /** Backdrop brightness. Slightly under 1 so the pane reads as smoked glass. */
  brightness: 0.94,
  /** White wash along the top edge of the pane, and its softer midpoint. */
  sheen: 0.11,
  sheenSoft: 0.035,
  /** The same wash while the composer has focus, and its midpoint. */
  sheenActive: 0.16,
  sheenActiveSoft: 0.05,
  /** White inset hairline, top edge, and the stronger focused value. */
  rimTop: 0.26,
  rimTopActive: 0.34,
  /** Black inset hairline, bottom edge, and the stronger focused value. */
  rimBottom: 0.36,
  rimBottomActive: 0.38,
  /** The 1px gradient ring: bright where the light enters, faint on the swing. */
  ringHead: 0.55,
  ringHeadActive: 0.7,
  ringMid: 0.1,
  ringMidActive: 0.14,
  ringTail: 0.3,
  ringTailActive: 0.36,
  /** Accent bloom in the pane's top-left corner, as a percentage of the token. */
  bloom: 22,
}

/**
 * The backdrops the fill was sized against.
 *
 * `#ffffff` is not the usual case, it is the bound: a bright photograph behind
 * the optional background layer, or a code block full of white text averaged by
 * a 26px blur, both sit on the far side of anything the fill is expected to
 * handle. If the pane passes there, it passes everywhere the app can take it.
 */
export const GLASS_WORST_CASE = {
  backdrop: '#ffffff',
  floors: { '--dsw-alias-label-primary': 7, '--dsw-alias-label-secondary': 4.5 },
}

/** One decimal, as a percentage, for gradients. */
const pct = (value) => `${Math.round(value * 100)}%`

/**
 * The glass stylesheet.
 *
 * Written as one string so the client bundle can carry it without a network
 * round-trip, and so `tools/check.mjs` can scan exactly what ships.
 *
 * @param {typeof GLASS} glass Numeric material constants.
 * @returns {string} The stylesheet text.
 */
export function glassCss(glass = GLASS) {
  const fill = `color-mix(in srgb, var(--dsw-specific-input-major) ${pct(glass.fill)}, transparent)`
  const bloom = `${glass.bloom}%`
  const bloomActive = `${glass.bloom + 4}%`

  return /* css */ `
/* ---- liquid glass (dark scheme only) ------------------------------------ */
/* A frosted pane is only safe where the text on it stays above the gate. The
   fill is the composer surface at ${pct(glass.fill)}, so even a pure-white backdrop behind the glass
   keeps body text above 7:1. tools/check.mjs re-measures that every run. Light
   mode stays flat on purpose: see tools/glass.mjs for why. Menus are not here:
   DSH already ships a frosted menu material of its own. */

/* The composer: the one surface with no material of its own, floating over the
   session, so the blur has something to chew on while messages scroll by. */
body[data-ds-dark-theme] [data-composer-card] {
  background:
    radial-gradient(120% 140% at 10% -20%,
      color-mix(in srgb, var(--dsw-alias-state-business-primary) ${bloom}, transparent),
      transparent 62%),
    linear-gradient(180deg,
      rgba(255, 255, 255, ${glass.sheen}),
      rgba(255, 255, 255, ${glass.sheenSoft}) 36%,
      rgba(255, 255, 255, 0) 64%,
      rgba(0, 0, 0, 0.06)),
    ${fill};
  -webkit-backdrop-filter: blur(${glass.blurPx}px) saturate(${glass.saturate}%) brightness(${glass.brightness});
  backdrop-filter: blur(${glass.blurPx}px) saturate(${glass.saturate}%) brightness(${glass.brightness});
  /* The design system's own elevation stroke stays in the stack: it is the
     0.5px rim outside the glass, and dropping it would leave the pane edgeless. */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, ${glass.rimTop}),
    inset 0 -1px 0 rgba(0, 0, 0, ${glass.rimBottom}),
    var(--dsw-elevation-soft),
    0 22px 56px -20px rgba(0, 0, 0, 0.72);
  transition: box-shadow var(--cinnabar-dur) var(--cinnabar-ease);
}

/* The lens edge: a 1px gradient ring, bright where the light enters at the top
   left and faint on the opposite swing. This is the cue that makes a
   translucent pane read as glass instead of as a faded panel, and it costs no
   layout — a masked pseudo-element, no border, no padding on the card itself.
   Guarded, because without mask support the ring would paint over the pane. */
@supports ((mask-composite: exclude) or (-webkit-mask-composite: xor)) {
  body[data-ds-dark-theme] [data-composer-card]::before {
    content: '';
    box-sizing: border-box;
    position: absolute;
    inset: 0;
    z-index: 1;
    padding: 1px;
    border-radius: inherit;
    pointer-events: none;
    background: linear-gradient(150deg,
      rgba(255, 255, 255, ${glass.ringHead}) 0%,
      rgba(255, 255, 255, ${glass.ringMid}) 24%,
      rgba(255, 255, 255, 0) 52%,
      rgba(255, 255, 255, ${glass.ringMid}) 76%,
      rgba(255, 255, 255, ${glass.ringTail}) 100%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
  }

  body[data-ds-dark-theme] [data-composer-card]:focus-within::before {
    background: linear-gradient(150deg,
      rgba(255, 255, 255, ${glass.ringHeadActive}) 0%,
      rgba(255, 255, 255, ${glass.ringMidActive}) 24%,
      rgba(255, 255, 255, 0) 52%,
      rgba(255, 255, 255, ${glass.ringMidActive}) 76%,
      rgba(255, 255, 255, ${glass.ringTailActive}) 100%);
  }
}

/* The seat behind the composer paints an opaque fade, and it exists for one
   reason: the stock composer is a solid fill, so scrolled text would crash into
   it. The glass card *is* that readability measure now — its fill and blur are
   gated to clear the text floors over a pure-white backdrop — so keeping the
   fade would only hide the material. */
body[data-ds-dark-theme] [data-composer-seat][data-conversation-region=composer] {
  background: none;
}

/* While the caret is in the composer the pane catches a little more light:
   the "liquid" half of the material is that it reacts, not that it moves. */
body[data-ds-dark-theme] [data-composer-card]:focus-within {
  background:
    radial-gradient(120% 140% at 10% -20%,
      color-mix(in srgb, var(--dsw-alias-state-business-primary) ${bloomActive}, transparent),
      transparent 62%),
    linear-gradient(180deg,
      rgba(255, 255, 255, ${glass.sheenActive}),
      rgba(255, 255, 255, ${glass.sheenActiveSoft}) 36%,
      rgba(255, 255, 255, 0) 64%,
      rgba(0, 0, 0, 0.06)),
    ${fill};
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, ${glass.rimTopActive}),
    inset 0 -1px 0 rgba(0, 0, 0, ${glass.rimBottomActive}),
    var(--dsw-elevation-soft),
    0 26px 64px -22px rgba(0, 0, 0, 0.76);
}

/* No backdrop-filter (older engines, or a compositor that refused it): restore
   the stock scrim and fall back to the opaque surface, so the pane is never a
   washed-out smear. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  body[data-ds-dark-theme] [data-composer-seat][data-conversation-region=composer] {
    background: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-bg-base) 0%, transparent) 0px, var(--dsw-alias-bg-base) 36px);
  }

  body[data-ds-dark-theme] [data-composer-card],
  body[data-ds-dark-theme] [data-composer-card]:focus-within {
    background: var(--dsw-specific-input-major);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

/* The OS-level "reduce transparency" switch is the user saying they want the
   material gone, not softened. Same treatment as an unsupported engine. */
@media (prefers-reduced-transparency: reduce) {
  body[data-ds-dark-theme] [data-composer-seat][data-conversation-region=composer] {
    background: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-bg-base) 0%, transparent) 0px, var(--dsw-alias-bg-base) 36px);
  }

  body[data-ds-dark-theme] [data-composer-card],
  body[data-ds-dark-theme] [data-composer-card]:focus-within {
    background: var(--dsw-specific-input-major);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    box-shadow: var(--dsw-elevation-soft);
  }
}
`
}
