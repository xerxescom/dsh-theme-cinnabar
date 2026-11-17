/**
 * The liquid-glass material: a third stylesheet layer, one recipe per scheme.
 *
 * What "liquid glass" means here, in the order the browser paints it:
 *
 *   1. **A translucent fill.** The composer is its surface token at a fixed
 *      percentage over whatever blurs behind it. The remaining slice is what
 *      makes scrolled chat text smear through the pane instead of vanishing
 *      under it.
 *   2. **A backdrop blur with a saturation lift.** The blur is the effect; the
 *      saturation keeps a flat surface from going grey, which is what a plain
 *      `blur()` does to near-black (and to warm paper).
 *   3. **A specular rim.** One hairline on the top edge, one on the bottom.
 *      That pair is what reads as *glass* and not as *translucency*, because it
 *      implies a light source above the pane.
 *   4. **An accent bloom.** A cinnabar radial in the top-left corner, mixed
 *      from `--dsw-alias-state-business-primary` rather than a literal, so the
 *      glow can never drift from the accent.
 *
 * Two recipes, one gate:
 *
 *   - **dark — ink glass.** 88% of the composer surface, white rim, smoked
 *     brightness. Bound: a pure-white backdrop (a bright photo or a white code
 *     block smeared by the blur). 88% is what keeps body text at 7.8:1 there.
 *   - **light — paper glass.** 93% of the surface, a cinnabar hairline, no
 *     brightness shift. Bound: a pure-black backdrop (a dark photo scrolling
 *     under the composer). 93% is what keeps secondary text above 4.5:1 there;
 *     the material reads through the blur and the warm rim, not through more
 *     transparency.
 *
 * The light pane steps aside while the optional background image is on: that
 * image makes the backdrop arbitrary, and light readability is built on an
 * opaque paper surface. Without the image the composer is glass; with it the
 * composer and its seat scrim stay solid.
 *
 * Two rules the layer keeps:
 *
 *   - **Readability is still the gate.** `tools/check.mjs` recomputes both
 *     bounds on every run from `tokens.json` and the numbers below.
 *   - **Only what DSH does not already have.** The design system ships its own
 *     frosted menus (`--dsw-menu-surface-fill` + `--dsw-menu-backdrop-filter:
 *     blur(40px)`), so this file does not re-implement them; it does not even
 *     set those variables. The composer is the surface with no material, and
 *     that is what this layer fills in.
 */

/**
 * The dark material's numbers. Every literal the dark stylesheet prints comes
 * from here, so a colour check can read the same constants instead of scraping
 * CSS.
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
  /** Black wash along the bottom edge. */
  bottomWash: 0.06,
  /** White inset hairline, top edge, and the stronger focused value. */
  rimTop: 'rgba(255, 255, 255, 0.26)',
  rimTopActive: 'rgba(255, 255, 255, 0.34)',
  /** Black inset hairline, bottom edge, and the stronger focused value. */
  rimBottom: 'rgba(0, 0, 0, 0.36)',
  rimBottomActive: 'rgba(0, 0, 0, 0.38)',
  /** The 1px gradient ring: bright where the light enters, faint on the swing. */
  ring: {
    head: 'rgba(255, 255, 255, 0.55)',
    mid: 'rgba(255, 255, 255, 0.10)',
    tail: 'rgba(255, 255, 255, 0.30)',
    headActive: 'rgba(255, 255, 255, 0.70)',
    midActive: 'rgba(255, 255, 255, 0.14)',
    tailActive: 'rgba(255, 255, 255, 0.36)',
  },
  /** Accent bloom in the pane's top-left corner, as a percentage of the token. */
  bloom: 22,
  bloomActive: 26,
  /** Drop shadow under the pane, resting and focused. */
  shadow: '0 22px 56px -20px rgba(0, 0, 0, 0.72)',
  shadowActive: '0 26px 64px -22px rgba(0, 0, 0, 0.76)',
}

/**
 * The light material's numbers. The dark recipe inverted: the pane is lifted
 * off the paper instead of smoked, and the rim is warm instead of white.
 */
export const GLASS_LIGHT = {
  /**
   * 92% over a 45/55 paper/white mix keeps `label-secondary` at 4.72:1 over a
   * pure-black backdrop. At 88% (the dark value) it would be 4.15:1, under the
   * 4.5 floor; the lift also makes the pane read as a sheet above the paper
   * rather than as the same surface with a border.
   */
  fill: 0.92,
  /** Share of `--dsw-alias-bg-base` in the pane's fill; the rest is white. */
  tint: 45,
  blurPx: 22,
  saturate: 130,
  brightness: 1,
  /** A white wash still helps over the translucent edge of a photo. */
  sheen: 0.42,
  sheenSoft: 0.12,
  sheenActive: 0.52,
  sheenActiveSoft: 0.16,
  bottomWash: 0.03,
  /** The light source is warm here: a cinnabar hairline over paper. */
  rimTop: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent)',
  rimTopActive: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 26%, transparent)',
  /** A brown-black, not a neutral black: the shadow belongs to the paper. */
  rimBottom: 'rgba(96, 64, 44, 0.10)',
  rimBottomActive: 'rgba(96, 64, 44, 0.12)',
  ring: {
    head: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 30%, transparent)',
    mid: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 7%, transparent)',
    tail: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)',
    headActive: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 38%, transparent)',
    midActive: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent)',
    tailActive: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 24%, transparent)',
  },
  bloom: 10,
  bloomActive: 14,
  shadow: '0 18px 40px -22px rgba(122, 84, 56, 0.24)',
  shadowActive: '0 22px 48px -24px rgba(122, 84, 56, 0.30)',
}

/**
 * The backdrops each fill was sized against.
 *
 * `#ffffff` is not the usual case for dark, it is the bound: a bright
 * photograph behind the optional background layer, or a code block full of
 * white text averaged by a 26px blur. `#000000` is the same bound for light: a
 * dark photo scrolling under the composer. If the pane passes there, it passes
 * everywhere the app can take it.
 */
export const GLASS_WORST_CASE = {
  backdrop: '#ffffff',
  floors: { '--dsw-alias-label-primary': 7, '--dsw-alias-label-secondary': 4.5 },
}

export const GLASS_WORST_CASE_LIGHT = {
  backdrop: '#000000',
  floors: { '--dsw-alias-label-primary': 7, '--dsw-alias-label-secondary': 4.5 },
}

const DARK_SCOPE = 'body[data-ds-dark-theme]'
/**
 * Light has no body attribute of its own, so it is the absence of the dark one.
 * The background-image frame is excluded: the optional picture makes the
 * backdrop arbitrary, and there the composer falls back to solid paper.
 */
const LIGHT_SCOPE = 'body:not([data-ds-dark-theme]):not([data-dsh-cinnabar-bg])'

/** One decimal, as a percentage, for gradients. */
const pct = (value) => `${Math.round(value * 100)}%`

/**
 * One scheme's rules: the pane, its lens edge, the seat change, and the two
 * fallbacks. Written as a function so both schemes keep the same structure and
 * a future tweak cannot drift between them.
 *
 * @param {typeof GLASS} glass Numeric material constants.
 * @param {string} scope The body selector the rules hang from.
 * @param {string} label Human-readable recipe name for the comment.
 * @param {string} fill The pane's fill expression (already a CSS colour).
 * @returns {string} One scheme's stylesheet text.
 */
function schemeCss(glass, scope, label, fill) {
  const ring = (state) => `linear-gradient(150deg,
      ${glass.ring[state === 'active' ? 'headActive' : 'head']} 0%,
      ${glass.ring[state === 'active' ? 'midActive' : 'mid']} 24%,
      transparent 52%,
      ${glass.ring[state === 'active' ? 'midActive' : 'mid']} 76%,
      ${glass.ring[state === 'active' ? 'tailActive' : 'tail']} 100%)`
  const solidFallback = `
  ${scope} [data-composer-seat][data-conversation-region=composer] {
    background: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-bg-base) 0%, transparent) 0px, var(--dsw-alias-bg-base) 36px);
  }

  ${scope} [data-composer-card],
  ${scope} [data-composer-card]:focus-within {
    background: var(--dsw-specific-input-major);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    box-shadow: var(--dsw-elevation-soft);
  }`

  return `
/* ---- liquid glass: ${label} (${scope}) ---- */
/* The fill is the composer surface at ${pct(glass.fill)}; tools/check.mjs re-measures
   both schemes against their bounds every run. Menus are not here: DSH already
   ships a frosted menu material of its own. */

/* The composer: the one surface with no material of its own, floating over the
   session, so the blur has something to chew on while messages scroll by. */
${scope} [data-composer-card] {
  background:
    radial-gradient(120% 140% at 10% -20%,
      color-mix(in srgb, var(--dsw-alias-state-business-primary) ${glass.bloom}%, transparent),
      transparent 62%),
    linear-gradient(180deg,
      rgba(255, 255, 255, ${glass.sheen}),
      rgba(255, 255, 255, ${glass.sheenSoft}) 36%,
      rgba(255, 255, 255, 0) 64%,
      rgba(0, 0, 0, ${glass.bottomWash})),
    ${fill};
  -webkit-backdrop-filter: blur(${glass.blurPx}px) saturate(${glass.saturate}%) brightness(${glass.brightness});
  backdrop-filter: blur(${glass.blurPx}px) saturate(${glass.saturate}%) brightness(${glass.brightness});
  /* The design system's own elevation stroke stays in the stack: it is the
     0.5px rim outside the glass, and dropping it would leave the pane edgeless. */
  box-shadow:
    inset 0 1px 0 ${glass.rimTop},
    inset 0 -1px 0 ${glass.rimBottom},
    var(--dsw-elevation-soft),
    ${glass.shadow};
  transition: box-shadow var(--cinnabar-dur) var(--cinnabar-ease);
}

/* The lens edge: a 1px gradient ring, bright where the light enters at the top
   left and faint on the opposite swing. This is the cue that makes a
   translucent pane read as glass instead of as a faded panel, and it costs no
   layout — a masked pseudo-element, no border, no padding on the card itself.
   Guarded, because without mask support the ring would paint over the pane. */
@supports ((mask-composite: exclude) or (-webkit-mask-composite: xor)) {
  ${scope} [data-composer-card]::before {
    content: '';
    box-sizing: border-box;
    position: absolute;
    inset: 0;
    z-index: 1;
    padding: 1px;
    border-radius: inherit;
    pointer-events: none;
    background: ${ring('rest')};
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
  }

  ${scope} [data-composer-card]:focus-within::before {
    background: ${ring('active')};
  }
}

/* The seat behind the composer paints an opaque fade, and it exists for one
   reason: the stock composer is a solid fill, so scrolled text would crash into
   it. The glass card *is* that readability measure now — its fill and blur are
   gated to clear the text floors over the bound — so keeping the fade would
   only hide the material. */
${scope} [data-composer-seat][data-conversation-region=composer] {
  background: none;
}

/* While the caret is in the composer the pane catches a little more light:
   the "liquid" half of the material is that it reacts, not that it moves. */
${scope} [data-composer-card]:focus-within {
  background:
    radial-gradient(120% 140% at 10% -20%,
      color-mix(in srgb, var(--dsw-alias-state-business-primary) ${glass.bloomActive}%, transparent),
      transparent 62%),
    linear-gradient(180deg,
      rgba(255, 255, 255, ${glass.sheenActive}),
      rgba(255, 255, 255, ${glass.sheenActiveSoft}) 36%,
      rgba(255, 255, 255, 0) 64%,
      rgba(0, 0, 0, ${glass.bottomWash})),
    ${fill};
  box-shadow:
    inset 0 1px 0 ${glass.rimTopActive},
    inset 0 -1px 0 ${glass.rimBottomActive},
    var(--dsw-elevation-soft),
    ${glass.shadowActive};
}

/* No backdrop-filter (older engines, or a compositor that refused it): restore
   the stock scrim and fall back to the opaque surface, so the pane is never a
   washed-out smear. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
${solidFallback}
}

/* The OS-level "reduce transparency" switch is the user saying they want the
   material gone, not softened. Same treatment as an unsupported engine. */
@media (prefers-reduced-transparency: reduce) {
${solidFallback}
}
`
}

/**
 * The glass stylesheet, both schemes.
 *
 * Written as one string so the client bundle can carry it without a network
 * round-trip, and so `tools/check.mjs` can scan exactly what ships.
 *
 * @returns {string} The stylesheet text.
 */
export function glassCss() {
  const darkFill = `color-mix(in srgb, var(--dsw-specific-input-major) ${pct(GLASS.fill)}, transparent)`
  const lightFill = `color-mix(in srgb, color-mix(in srgb, var(--dsw-alias-bg-base) ${GLASS_LIGHT.tint}%, white) ${pct(GLASS_LIGHT.fill)}, transparent)`
  return (
    schemeCss(GLASS, DARK_SCOPE, 'dark / ink', darkFill) +
    schemeCss(GLASS_LIGHT, LIGHT_SCOPE, 'light / paper', lightFill)
  )
}
