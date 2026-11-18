/**
 * The motion and finish layer: the CSS this theme injects as one `<style>` tag.
 *
 * Everything here is deliberately built from Standard CSS that needs no DSH
 * internals: pseudo-elements, `::selection`, `:focus-visible`, transitions and
 * `@keyframes`. Nothing selects a hashed class name, so an upstream redesign
 * can only make a rule inert — never break the page.
 *
 * Two rules the layer must keep:
 *
 *   1. **Never raise contrast risk.** The readability gate measured 38 pairs of
 *      text-on-surface; this layer changes selection colour, focus rings and
 *      transitions, none of which are in that set, and it re-tints nothing the
 *      gate measures.
 *   2. **Respect reduced motion.** Every animation is inside a
 *      `prefers-reduced-motion: no-preference` block, so a user who asked the OS
 *      for calm gets instant, motionless UI.
 *
 * The palette values arrive as CSS variables (`--cinnabar-*`) written by the
 * client half, so this file carries no colour literals that could drift from
 * tokens.json.
 */

/**
 * The first-load curtain.
 *
 * It paints after the client bundle runs, so it cannot be a real splash screen
 * — it is a veil over the shell that is already drawn. That is exactly why it
 * stays around a second, never takes a pointer event and is skipped outright
 * under `prefers-reduced-motion`.
 *
 * The order is the effect: the reading surface, the whale mark surfacing out of
 * a soft blur, then the paper lifts while the mark spreads — blur and scale
 * grow as its opacity falls — so the logo dissolves into the interface instead
 * of switching off. One animation fills forwards: the paper itself, which the
 * client half removes on `animationend`. It carries no `backdrop-filter` and is
 * gone after about a second and a half, so the backdrop-root problem that
 * forbids animated popovers (see motionCss) does not apply here.
 *
 * The mark is its own fixed layer above the paper: as a child it would be
 * dimmed twice, once by its own fade and once by the paper's.
 *
 * Exported on its own so `tools/preview.mjs` plays this very text instead of
 * keeping a hand-made copy that would drift.
 * @returns {string} The boot-entrance stylesheet text.
 */
export function bootEntranceCss() {
  return /* css */ `
/* ---- boot entrance ------------------------------------------------------ */
@media (prefers-reduced-motion: no-preference) {
  .cinnabar-boot {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    pointer-events: none;
    background: var(--dsw-alias-bg-base, #faf7f2);
    will-change: opacity;
    /* The paper holds while the mark surfaces and disperses, then lifts. The
       order matters: the logo must be gone before the text behind it is
       readable, or its blur reads as a red smear over the conversation. */
    animation: cinnabar-boot-lift 420ms var(--cinnabar-ease, cubic-bezier(.22,.61,.36,1)) 1080ms forwards;
  }

  /* The ink bloom: a warm radial wash under the mark that expands while it
     thins out. This is what reads as "墨迹散开"; a plain opacity fade on a
     flat colour does not. */
  .cinnabar-boot::before {
    content: "";
    position: absolute;
    inset: -10%;
    background: radial-gradient(circle at 50% 46%,
      color-mix(in srgb, var(--dsw-alias-state-business-primary, #c41002) 13%, transparent) 0,
      transparent 36%);
    transform: scale(.4);
    opacity: 0;
    animation: cinnabar-boot-bloom 820ms cubic-bezier(.22,.61,.36,1) 120ms;
  }

  /* The mark layer. Fixed and pointer-transparent; the SVG carries the timing
     so the layer itself can stay still. */
  .cinnabar-boot-mark {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: center;
    pointer-events: none;
  }

  /* The whale. Its own animation covers the whole life — surface, hold,
     disperse — and ends at the base state (opacity 0) at exactly the moment the
     paper starts to lift, so no part of the blur ever sits over readable text. */
  .cinnabar-boot-mark svg {
    width: 216px;
    height: 154px;
    color: var(--dsw-alias-state-business-primary, #c41002);
    opacity: 0;
    animation: cinnabar-boot-whale 1080ms var(--cinnabar-ease, cubic-bezier(.22,.61,.36,1)) backwards;
  }

  /* Out of the blur, hold sharp, then spread: blur and scale grow while the
     opacity falls, so it reads as ink thinning into the paper rather than a
     logo switching off. The beat is deliberately slow — the mark is the first
     thing the client shows, so it gets a moment. */
  @keyframes cinnabar-boot-whale {
    0% { opacity: 0; transform: scale(1.04); filter: blur(6px); }
    20% { opacity: 1; transform: none; filter: blur(0); }
    58% { opacity: 1; transform: none; filter: blur(0); }
    76% { opacity: .4; transform: scale(1.07); filter: blur(7px); }
    90% { opacity: .07; transform: scale(1.13); filter: blur(13px); }
    100% { opacity: 0; transform: scale(1.18); filter: blur(18px); }
  }

  @keyframes cinnabar-boot-lift {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes cinnabar-boot-bloom {
    from { opacity: 0; transform: scale(.4); }
    30% { opacity: .85; }
    to { opacity: 0; transform: scale(1.2); }
  }
}
`
}

/**
 * @param {{ light: string, dark: string, overlay: { light: number, dark: number }, blurPx: number, radius: Record<string, string> }} config
 * @returns {string} The stylesheet text.
 */
export function motionCss(config) {
  const wash = (mode) => `color-mix(in srgb, ${config.surface[mode]} ${Math.round(config.overlay[mode] * 100)}%, transparent)`

  return /* css */ `
/* ---- motion and finish layer ------------------------------------------- */

/* Theme switch: colour changes ease instead of snapping. The 180ms is short
   enough to feel instant on a click and long enough to read as intentional. */
:root {
  --cinnabar-ease: cubic-bezier(.22, .61, .36, 1);
  --cinnabar-dur: 180ms;
}

body,
body [data-conversation-content],
body [data-conversation-scroll] {
  transition: background-color var(--cinnabar-dur) var(--cinnabar-ease),
              color var(--cinnabar-dur) var(--cinnabar-ease);
}

/* Theme switch crossfade. The primary path is the View Transitions API: the
   browser snapshots the whole page and dissolves old into new on the
   compositor, so a heavy session cannot drop frames. The fallback (engines
   without the API) is a cheap colour-only transition on the tree, armed by
   the client half for the switch window — never always-on, because that would
   replace the host's own opacity/transform transitions. */
@media (prefers-reduced-motion: no-preference) {
  /* The UA crossfade leaves both snapshots translucent at the midpoint, so
     whatever sits behind the overlay shows through. Painting the overlay with
     the incoming surface keeps the midpoint a blend of the two themes instead
     of a flash of the canvas/colour-scheme. */
  ::view-transition {
    background-color: var(--cinnabar-vt-bg, Canvas);
  }

  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: 240ms;
    animation-timing-function: var(--cinnabar-ease);
  }

  body[data-dsh-theme-fade],
  body[data-dsh-theme-fade] * {
    transition-property: color, background-color, border-color, outline-color !important;
    transition-duration: 220ms !important;
    transition-timing-function: var(--cinnabar-ease) !important;
    transition-delay: 0s !important;
  }

  /* Freeze: while the incoming snapshot is being captured, colour transitions
     must not be running — the capture records their start value and the element
     then looks like it changed after the crossfade (one beat late). Zero
     duration makes every token change land at its final value synchronously. */
  body[data-dsh-vt-freeze],
  body[data-dsh-vt-freeze] *,
  body[data-dsh-vt-freeze] *::before,
  body[data-dsh-vt-freeze] *::after {
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
}

/* Selection: a warm ink wash instead of the browser default blue, which is
   the loudest unthemed thing left on the page once the palette lands. */
::selection {
  background: var(--cinnabar-selection);
  color: var(--cinnabar-selection-text);
}

/* Focus rings: cinnabar, matching the accent, with a soft halo so keyboard
   users see the target without a hard rectangle. */
:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
  border-radius: var(--dsw-radius-xs, 4px);
  transition: outline-color var(--cinnabar-dur) var(--cinnabar-ease),
              box-shadow var(--cinnabar-dur) var(--cinnabar-ease);
  box-shadow: 0 0 0 4px var(--cinnabar-focus-halo);
}

/* Thin ink hairlines where the design system already draws borders: a warm
   undertone reads as paper rather than as a UI wireframe. */
body {
  caret-color: var(--dsw-alias-state-business-primary);
}

/* ---- background image --------------------------------------------------- */
/* Present only while data-dsh-cinnabar-bg is set (the optional picture). The
   wash is opaque enough that the photograph can never move text contrast. */
body[data-dsh-cinnabar-bg]::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--cinnabar-bg-image);
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  animation: cinnabar-fade-in 420ms var(--cinnabar-ease) backwards;
}

body[data-dsh-cinnabar-bg]::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  backdrop-filter: blur(var(--cinnabar-bg-blur));
  background: var(--cinnabar-bg-wash);
}

/* Containers that paint the surface themselves must let the picture through. */
body[data-dsh-cinnabar-bg] [data-conversation-content],
body[data-dsh-cinnabar-bg] [data-conversation-scroll],
body[data-dsh-cinnabar-bg] [data-conversation-session],
body[data-dsh-cinnabar-bg] [data-chat-turn] {
  background-color: transparent;
}

/* ---- motion ------------------------------------------------------------- */
@media (prefers-reduced-motion: no-preference) {
  @keyframes cinnabar-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Message rows settle upward as they arrive. Short travel (6px) and a fast
     ease keep long sessions from feeling animated.

     "backwards", never "both": an animation that keeps filling leaves the row
     animated for its whole life, which keeps a compositor layer per message and
     disables any backdrop-filter inside the row. The entrance is the whole
     point; the resting state belongs to the element's own style. */
  @keyframes cinnabar-rise {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: none; }
  }

  body [data-chat-turn] {
    animation: cinnabar-rise 220ms var(--cinnabar-ease) backwards;
  }

  /* Menus and dialogs get no entrance animation from this layer, on purpose.

     DSH's popovers are a translucent material: a 70% fill over
     "backdrop-filter: blur(40px)". The frost is what keeps the workspace list,
     the composer labels and the send button from reading through an open menu.
     Any animation that touches transform or opacity on the popover root makes
     it its own backdrop root for the duration, and the blur stops applying —
     the panel becomes a plain 70% tint over sharp page content. With "both" it
     never comes back, because the element stays animated for its whole life:
     that is the "floating panel covers the text" report, where the list behind
     the menu fought the menu labels.

     "backwards" would only limit the damage to the entrance (the frost snaps on
     at the end), and the host already animates its own menus
     (--dsh-menu-enter, 40ms). So the honest fix is to leave popovers alone. */

  /* Hover on interactive rows: a quick wash, not a fade. */
  body button,
  body [role='button'] {
    transition: background-color 120ms var(--cinnabar-ease),
                border-color 120ms var(--cinnabar-ease),
                color 120ms var(--cinnabar-ease);
  }

  /* The settings row's own switch, so it matches the shell's motion. */
  body [role='switch'] {
    transition: background-color 160ms var(--cinnabar-ease);
  }

  /* Scrollbar: keep the design system's thin bar, only soften its colour
     transition when the pointer enters it. */
  body ::-webkit-scrollbar-thumb {
    transition: background-color 160ms var(--cinnabar-ease);
  }
}

${bootEntranceCss()}

/* A user who asked for reduced motion gets every colour change instantly and
   no transform animations at all. */
@media (prefers-reduced-motion: reduce) {
  body,
  body * {
    animation: none !important;
    transition-duration: 0ms !important;
  }
}
`
}

/**
 * The variable block the client half writes before injecting {@link motionCss},
 * so the stylesheet never hard-codes a palette value.
 *
 * @param {{ selection: { light: string, dark: string }, selectionText: { light: string, dark: string }, focusHalo: { light: string, dark: string }, surface: { light: string, dark: string }, overlay: { light: number, dark: number } }} config
 * @returns {string}
 */
export function motionVariables(config) {
  const block = (mode) => [
    `  --cinnabar-selection: ${config.selection[mode]};`,
    `  --cinnabar-selection-text: ${config.selectionText[mode]};`,
    `  --cinnabar-focus-halo: ${config.focusHalo[mode]};`,
    `  --cinnabar-bg-wash: color-mix(in srgb, ${config.surface[mode]} ${Math.round(config.overlay[mode] * 100)}%, transparent);`,
  ].join('\n')

  return `body { color-scheme: light; ${block('light')} }\nbody[data-ds-dark-theme] { color-scheme: dark; ${block('dark')} }`
}
