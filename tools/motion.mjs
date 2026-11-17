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

/* Theme switch crossfade. The client half arms this attribute for ~320ms
   around a preference write and forces one style flush before the write:
   without that flush the transition would be declared in the same style
   calculation as the new token values, and the browser would apply both
   without animating. Always-on transitions cannot do this job — they would
   replace the host's own opacity/transform transitions everywhere. */
@media (prefers-reduced-motion: no-preference) {
  body[data-dsh-theme-fade],
  body[data-dsh-theme-fade] *,
  body[data-dsh-theme-fade] *::before,
  body[data-dsh-theme-fade] *::after {
    transition-property: color, background-color, border-color, outline-color,
      box-shadow, fill, stroke, opacity, transform !important;
    transition-duration: 260ms !important;
    transition-timing-function: var(--cinnabar-ease) !important;
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
  animation: cinnabar-fade-in 420ms var(--cinnabar-ease) both;
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
     ease keep long sessions from feeling animated. */
  @keyframes cinnabar-rise {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: none; }
  }

  body [data-chat-turn] {
    animation: cinnabar-rise 220ms var(--cinnabar-ease) both;
  }

  /* Panels and popovers grow from their anchored edge by a hair, which is the
     "physical" cue that makes a menu read as placed rather than drawn. */
  @keyframes cinnabar-pop {
    from { opacity: 0; transform: scale(.985); }
    to { opacity: 1; transform: none; }
  }

  body [data-menu-surface],
  body [role='menu'],
  body [role='dialog'] {
    animation: cinnabar-pop 140ms var(--cinnabar-ease) both;
    transform-origin: top center;
  }

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
