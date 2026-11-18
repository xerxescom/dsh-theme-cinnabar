/**
 * The live-session accent: the only layer that reacts to Session state.
 *
 * DSH's sidebar row renders no state of its own. Its classes are CSS Module
 * hashes, and the one stable hook it carries is `data-row-key="session:<id>"`.
 * The client half therefore copies `ctx.sessions.list`'s running flag onto that
 * row as `data-cinnabar-live="running"`, and this sheet keys off nothing else.
 *
 * Kept in its own module for the same reason as glass: the whole effect can be
 * found, read and removed in one place, and tools/check.mjs can diff it against
 * the copy embedded in lib/client.js.
 */
export function runningCss() {
  return `
/* ---- live sessions ------------------------------------------------------
   A 2px cinnabar bar on the row's leading edge.

   It is an inset box-shadow, not a pseudo-element, on purpose: DSH draws its
   own drop indicator on ::before and ::after of this same row, so a third
   consumer of those pseudo-elements would hide the drop line while a row is
   being dragged. An inset shadow also costs no layout and leaves the row's
   focus ring, hover fill and text masking exactly as they were.

   The shadow is clipped to the row's padding box, so the bar lands at the
   content edge — level with the status dot it belongs to, not under the
   Workspace indent. */
body [data-row-key][data-cinnabar-live="running"] {
  box-shadow: inset 2px 0 0 var(--dsw-alias-state-business-primary);
}

/* While the Session is live the bar breathes. 2.4s reads as "still working";
   anything faster reads as a spinner, which this is not. Reduced motion keeps
   the bar at full strength and drops the pulse: the cue is the bar, the pulse
   is a bonus. */
@media (prefers-reduced-motion: no-preference) {
  @keyframes cinnabar-live-breath {
    0%, 100% {
      box-shadow: inset 2px 0 0 color-mix(in srgb, var(--dsw-alias-state-business-primary) 45%, transparent);
    }
    50% {
      box-shadow: inset 2px 0 0 var(--dsw-alias-state-business-primary);
    }
  }

  body [data-row-key][data-cinnabar-live="running"] {
    animation: cinnabar-live-breath 2.4s ease-in-out infinite;
  }
}
`;
}
