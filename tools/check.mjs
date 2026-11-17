/**
 * Verifies the artefacts on disk — no colour maths, that is palette.mjs's job.
 *
 * This script only proves four things:
 *
 *   1. **Consistency.** `lib/client.js` embeds exactly the token set that
 *      `tokens.json` holds, and `report.json` was generated from the current
 *      `tokens.json`. A palette edited by hand or regenerated halfway fails here.
 *   2. **Contract.** Every token name still exists in the installed DSH, and the
 *      DOM anchors the background layer rides on are still present in the client
 *      bundles. This is where an upstream upgrade surfaces.
 *   3. **Gate.** The readability gate in `report.json` has no BROKEN pair, and
 *      the pairs actually got re-measured by this run rather than trusted.
 *   4. **Wiring.** `lib/index.js` is a side-effect-free host anchor; the client
 *      half injects the `theme` service and hands its disposers to `ctx.effect`;
 *      the package name is the same in `package.json`, `cordis.patch.yml` and the
 *      bundle id.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readBaseline, readClientBundle } from './baseline.mjs'
import { contrast, isColor, parseColor, toOklch } from './color.mjs'
import { GLASS, GLASS_LIGHT, GLASS_WORST_CASE, GLASS_WORST_CASE_LIGHT, glassCss } from './glass.mjs'
import { gate, generate } from './palette.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

/** @type {{ ok: boolean, name: string, detail: string }[]} */
const checks = []
const check = (name, ok, detail) => checks.push({ name, ok, detail })

// --------------------------------------------------------------------------
// Load artefacts
// --------------------------------------------------------------------------

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const data = JSON.parse(readFileSync(join(HERE, 'tokens.json'), 'utf8'))
const report = JSON.parse(readFileSync(join(HERE, 'report.json'), 'utf8'))
const clientSource = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8')
const hostSource = readFileSync(join(ROOT, 'lib', 'index.js'), 'utf8')
const patch = readFileSync(join(ROOT, 'cordis.patch.yml'), 'utf8')

const tokens = data.tokens

// --------------------------------------------------------------------------
// 1. Shape of tokens.json
// --------------------------------------------------------------------------

const shapeErrors = []
const seen = new Set()
for (const [name, pair] of Object.entries(tokens)) {
  if (seen.has(name)) shapeErrors.push(`duplicate key ${name}`)
  seen.add(name)
  if (!/^--(dsw|dsh|shiki)-[a-z0-9-]+$/.test(name)) shapeErrors.push(`bad token name ${name}`)
  if (pair === null || typeof pair !== 'object') {
    shapeErrors.push(`${name} is not a {light,dark} pair`)
    continue
  }
  for (const mode of ['light', 'dark']) {
    if (typeof pair[mode] !== 'string' || pair[mode].length === 0) shapeErrors.push(`${name} missing ${mode}`)
  }
}
check('tokens.json shape', shapeErrors.length === 0, shapeErrors.slice(0, 5).join('; ') || `${seen.size} tokens`)

// --------------------------------------------------------------------------
// 2. Every token still exists in the installed DSH
// --------------------------------------------------------------------------

const baseline = readBaseline()
const known = new Set([
  ...baseline.ramps,
  ...baseline.semantic,
  ...Object.keys(baseline.shiki.light),
  ...Object.keys(baseline.shiki.dark),
])

/** Non-colour declarations this theme may legitimately introduce. */
const INTRODUCED = new Set([
  ...Object.keys(data.typography ?? {}),
  ...Object.keys(data.radius ?? {}),
  '--shiki-foreground',
  '--shiki-background',
])

const missing = Object.keys(tokens).filter((name) => !known.has(name) && !INTRODUCED.has(name))
check(
  'tokens exist in installed DSH',
  missing.length === 0,
  missing.length === 0
    ? `baseline @deepseek-ai/dsh-client-ui-theme@${baseline.pkg.version}, ${known.size} names`
    : `gone upstream: ${missing.slice(0, 6).join(', ')}`,
)

// --------------------------------------------------------------------------
// 3. report.json describes the current tokens.json, and the gate is clean
// --------------------------------------------------------------------------

const regenerated = generate()
const regenerateDiff = Object.keys({ ...regenerated.tokens, ...tokens }).filter((name) => {
  const a = regenerated.tokens[name]
  const b = tokens[name]
  if (a === undefined || b === undefined) return true
  return a.light !== b.light || a.dark !== b.dark
})
check(
  'tokens.json matches the generator',
  regenerateDiff.length === 0,
  regenerateDiff.length === 0 ? 'deterministic' : `stale: ${regenerateDiff.slice(0, 6).join(', ')}`,
)

const freshGate = gate(tokens)
check(
  'readability gate passes',
  freshGate.failures.length === 0,
  freshGate.failures.length === 0
    ? `${freshGate.pairs.length} pairs, ${freshGate.shiki.length} code colours, 0 broken`
    : `${freshGate.failures.length} broken: ${freshGate.failures.slice(0, 4).map((f) => `${f.fg ?? f.token}@${f.mode}`).join(', ')}`,
)

const reportStale = report.generatedFrom !== `@deepseek-ai/dsh-client-ui-theme@${baseline.pkg.version}`
check(
  'report.json is from this baseline',
  !reportStale,
  reportStale ? `report says ${report.generatedFrom}, installed is @${baseline.pkg.version}` : report.generatedFrom,
)

check(
  'report gate is clean',
  Array.isArray(report.failures) && report.failures.length === 0,
  `${report.failures?.length ?? 'missing'} broken pairs recorded`,
)

// --------------------------------------------------------------------------
// 4. Surface: solid background is opaque, overlay is a translucency of it
// --------------------------------------------------------------------------

const surface = tokens['--dsw-alias-bg-base']
check(
  'reading surface is opaque',
  isColor(surface?.light ?? '') && isColor(surface?.dark ?? '') && (parseColor(surface.light)[3] ?? 1) === 1,
  `${surface?.light} / ${surface?.dark}`,
)

// --------------------------------------------------------------------------
// 5. The client bundle carries exactly the same tokens
// --------------------------------------------------------------------------

const lightBlock = /const PALETTE_LIGHT = \{([\s\S]*?)\n\t\t\};/.exec(clientSource)
const darkBlock = /const PALETTE_DARK = \{([\s\S]*?)\n\t\t\};/.exec(clientSource)
const collect = (block) => {
  const set = new Set()
  if (block !== null) for (const m of block[1].matchAll(/"(--[a-z0-9-]+)":/g)) set.add(m[1])
  return set
}
const lightEmbedded = collect(lightBlock)
const darkEmbedded = collect(darkBlock)
const nonColourNames = [...Object.keys(data.typography ?? {}), ...Object.keys(data.radius ?? {})]
const paletteNames = new Set([...Object.keys(tokens), ...nonColourNames])
const missingLight = Object.keys(tokens).filter((name) => !lightEmbedded.has(name))
const missingDark = Object.keys(tokens).filter((name) => !darkEmbedded.has(name))
const extraLight = [...lightEmbedded].filter((name) => !paletteNames.has(name))
const extraDark = [...darkEmbedded].filter((name) => !paletteNames.has(name))
const paletteProblems = missingLight.length + missingDark.length + extraLight.length + extraDark.length
check(
  'client bundle carries both palettes',
  lightBlock !== null && darkBlock !== null && paletteProblems === 0,
  lightBlock === null || darkBlock === null
    ? 'PALETTE block not found'
    : paletteProblems === 0
      ? lightEmbedded.size + ' light + ' + darkEmbedded.size + ' dark'
      : 'light missing ' + missingLight.length + ', dark missing ' + missingDark.length + ', extra ' + (extraLight.length + extraDark.length),
)

// --------------------------------------------------------------------------
// 6. Client wiring
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// 5b. Loader protocol: factory MUST receive `require`
// --------------------------------------------------------------------------
//
// The module table passes `require` as the factory's argument. A factory written
// as `() => {...}` that calls require() anywhere throws ReferenceError the first
// time apply() runs — which took the whole page down once already.

// ---- motion layer ---------------------------------------------------------
// Every animation must sit behind prefers-reduced-motion, and the selection
// pair must stay above the text floor (it is a text background).

const motionGate = (report.motion?.contrast ?? [])
const motionBroken = motionGate.filter((c) => c.ratio < c.floor)
check(
  "selection colours pass their floor",
  motionGate.length === 2 && motionBroken.length === 0,
  motionBroken.length === 0
    ? motionGate.map((c) => c.pair.replace("selection-text on ", "") + " " + c.ratio.toFixed(1) + ":1").join(", ")
    : motionBroken.map((c) => c.pair + " " + c.ratio.toFixed(2)).join(", "),
)

const reducedMotionGuarded = /prefers-reduced-motion:\s*no-preference/.test(clientSource) && /prefers-reduced-motion:\s*reduce/.test(clientSource)
check(
  "motion respects reduced-motion",
  reducedMotionGuarded,
  reducedMotionGuarded ? "animations gated on no-preference" : "animations must be wrapped in a prefers-reduced-motion guard",
)

const styleLayerRetractable = /style\.remove\(\)/.test(clientSource) && /function applyStyleLayer/.test(clientSource)
check(
  "style layer is retractable",
  styleLayerRetractable,
  styleLayerRetractable ? "one <style>, removed on dispose" : "the injected stylesheet must be removed when the plugin unloads",
)

// ---- dark surface ladder --------------------------------------------------
// "Do not ship a black layout": the dark reading surface must clear L 0.24
// (below that the warm tint disappears on most panels) and each step up the
// stack must gain enough lightness to read as a separate surface.

const darkSurface = tokens["--dsw-alias-bg-base"]?.dark
const darkSurfaceOklch = darkSurface ? toOklch(parseColor(darkSurface)) : null
check(
  "dark surface is ink, not black",
  darkSurfaceOklch !== null && darkSurfaceOklch.L >= 0.24 && darkSurfaceOklch.C >= 0.006,
  darkSurfaceOklch === null
    ? "no dark surface"
    : `${darkSurface} L=${darkSurfaceOklch.L.toFixed(3)} C=${darkSurfaceOklch.C.toFixed(3)}`,
)

const ladder = ["--dsw-specific-sidebar-fill", "--dsw-alias-bg-layer-1", "--dsw-alias-bg-layer-2", "--dsw-alias-bg-layer-3"]
const ladderL = [darkSurfaceOklch?.L, ...ladder.map((n) => (tokens[n]?.dark ? toOklch(parseColor(tokens[n].dark)).L : NaN))]
const steps = ladderL.slice(1).map((L, i) => L - ladderL[i])
const minStep = 0.025
check(
  "dark stack separates into layers",
  steps.every((d) => Number.isFinite(d) && d >= minStep),
  steps.map((d) => d.toFixed(3)).join(" / ") + " (min " + minStep + ")",
)

// --------------------------------------------------------------------------
// 5c. Liquid glass
// --------------------------------------------------------------------------
//
// The glass layer is the only place this theme paints translucency, so it gets
// the strictest checks in the file: it must stay dark-only, it must ship in the
// bundle exactly as `tools/glass.mjs` generates it, and its panes must clear the
// text floors *over a pure-white backdrop* — the bound, not the usual case.

const glassSource = glassCss()
const embeddedGlass = /const GLASS_CSS = `([\s\S]*?)`;/.exec(clientSource)?.[1]
const normalise = (css) => css.replace(/\s+/g, ' ').trim()
check(
  'glass layer matches its generator',
  embeddedGlass !== undefined && normalise(embeddedGlass) === normalise(glassSource),
  embeddedGlass === undefined
    ? 'GLASS_CSS template literal not found in lib/client.js'
    : embeddedGlass !== undefined && normalise(embeddedGlass) === normalise(glassSource)
      ? `${glassSource.length} bytes of material`
      : 'stale: run node tools/build-client.mjs',
)

const glassWired = /MOTION_VARIABLES \+ MOTION_CSS \+ GLASS_CSS/.test(clientSource)
check(
  'glass ships in the injected stylesheet',
  glassWired,
  glassWired ? 'one <style>, same cleanup path' : 'GLASS_CSS is defined but never injected',
)

const glassRules = [...glassSource.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)]
  .map((match) => match[1].trim())
  .filter((selector) => selector.length > 0 && !selector.startsWith('@'))
const isDarkRule = (selector) => selector.includes('body[data-ds-dark-theme]')
const isLightRule = (selector) => selector.includes('body:not([data-ds-dark-theme])')
const unscopedGlass = glassRules.filter((selector) => !isDarkRule(selector) && !isLightRule(selector))
const lightGuarded = glassRules.filter(isLightRule).every((selector) => selector.includes('data-dsh-cinnabar-bg'))
check(
  'glass layer is scheme-scoped',
  unscopedGlass.length === 0 && lightGuarded,
  unscopedGlass.length === 0 && lightGuarded
    ? `${glassRules.length} rules, ${glassRules.filter(isDarkRule).length} dark + ${glassRules.filter(isLightRule).length} light (light off with a background image)`
    : `${unscopedGlass.length} unscoped, light guard ${lightGuarded ? 'present' : 'missing'}: ${unscopedGlass.slice(0, 2).join(' | ')}`,
)

const glassFallbacks = /@supports not \(\(backdrop-filter/.test(glassSource) && /prefers-reduced-transparency: reduce/.test(glassSource)
check(
  'glass degrades to an opaque pane',
  glassFallbacks,
  glassFallbacks ? '@supports fallback + prefers-reduced-transparency' : 'a pane with no blur support must fall back to the solid token',
)

const glassRecipes = [
  {
    name: 'dark',
    fill: GLASS.fill,
    worst: GLASS_WORST_CASE,
    pane: () => parseColor(tokens['--dsw-specific-input-major'].dark),
  },
  {
    name: 'light',
    fill: GLASS_LIGHT.fill,
    worst: GLASS_WORST_CASE_LIGHT,
    // The light fill is a paper/white mix, not a bare token: reproduce it.
    pane: () => {
      const base = parseColor(tokens['--dsw-alias-bg-base'].light)
      const tint = GLASS_LIGHT.tint / 100
      return base.map((channel) => Math.round(channel * tint + 255 * (1 - tint)))
    },
  },
]
const glassRows = []
for (const recipe of glassRecipes) {
  const backdrop = parseColor(recipe.worst.backdrop)
  const [r, g, b] = recipe.pane()
  const glassFill = [r, g, b, recipe.fill]
  for (const [fgToken, floor] of Object.entries(recipe.worst.floors)) {
    const fg = tokens[fgToken]?.[recipe.name]
    if (fg === undefined) continue
    glassRows.push({ recipe: recipe.name, fg: fgToken, floor, backdrop: recipe.worst.backdrop, ratio: contrast(parseColor(fg), glassFill, backdrop) })
  }
}
const glassBroken = glassRows.filter((row) => row.ratio < row.floor)
const glassExpected = glassRecipes.reduce((count, recipe) => count + Object.keys(recipe.worst.floors).length, 0)
check(
  'glass panes stay readable over their bounds',
  glassBroken.length === 0 && glassRows.length === glassExpected,
  glassBroken.length === 0
    ? glassRows.map((row) => `${row.recipe}/${row.fg.replace('--dsw-alias-', '')} ${row.ratio.toFixed(1)}:1 over ${row.backdrop}`).join(', ')
    : glassBroken.map((row) => `${row.recipe}/${row.fg} ${row.ratio.toFixed(2)} < ${row.floor}`).join(', '),
)

// The composer hook and the seat scrim are the DOM contracts the glass rides
// on. Menus are deliberately absent: DSH ships its own frosted menu material.
const conversationSource = readClientBundle(baseline.pkg.dir, 'dsh-client-ui-conversation')
const glassHooks = ['data-composer-card', 'data-composer-seat', 'data-conversation-region']
const missingHooks = glassHooks.filter((hook) => conversationSource === null || !conversationSource.includes(hook))
check(
  'glass DOM contract intact',
  missingHooks.length === 0,
  missingHooks.length === 0 ? glassHooks.join(', ') : `gone upstream: ${missingHooks.join(', ')}`,
)

const reimplementsMenus = /--dsw-menu-surface-fill|--dsw-menu-backdrop-filter|--dsw-specific-menu/.test(glassSource)
check(
  'glass leaves the menu material to DSH',
  !reimplementsMenus,
  reimplementsMenus ? 'glass must not restate the design system\'s menu material' : 'composer only; menus keep the host material',
)

const factorySignature = /factory:\s*\(\s*require\s*\)\s*=>/.test(clientSource)
check(
  "factory accepts require",
  factorySignature,
  factorySignature ? "factory(require)" : "factory must take require as its parameter, not a bare () =>",
)

// The theme service persists only light/dark/system: ThemeRuntime.adopt()
// restores the stored preference whenever the settings document lands, so a
// third-party theme id selected at boot is reverted. The palette must therefore
// be a token layer over the built-in preference, never a registered theme.

const paletteIsLayer = /ctx\.theme\.overrideTokens\(SOURCE, PALETTE\)/.test(clientSource) && /for \(const name of Object\.keys\(PALETTE_LIGHT\)\)/.test(clientSource)
check(
  "palette is a layer, not a theme id",
  paletteIsLayer,
  paletteIsLayer ? "{light,dark} pairs folded over the active built-in theme" : "applyPalette must call overrideTokens(SOURCE, PALETTE) with both schemes",
)

const noThirdPartyThemeId = !/ctx\.theme\.register\(/.test(clientSource)
check(
  "no third-party theme id to lose on restart",
  noThirdPartyThemeId,
  noThirdPartyThemeId ? "the scheme is DSH's own persisted preference" : "register() ids are session-scoped; adopt() reverts them on every launch",
)

const applyGuarded = /function step\(label, fn\)/.test(clientSource) && /step\("register settings row"/.test(clientSource)
check(
  "apply steps are isolated",
  applyGuarded,
  applyGuarded ? "each step wrapped; a failure cannot abort plugin mount" : "apply() has an unguarded step - a throw there escapes into the host",
)

const wiring = [
  ['injects theme + slots', /const inject = \["theme", "slots"\]/.test(clientSource)],
  ['installs one token layer', /ctx\.theme\.overrideTokens\(SOURCE, PALETTE\)/.test(clientSource)],
  ['registers a settings row', /ctx\.slots\.register\(/.test(clientSource)],
  ['remembers the switch', /localStorage\??\.setItem\(STORAGE_KEY/.test(clientSource)],
  ['writes the built-in scheme', /function chooseScheme\(ctx, id\)/.test(clientSource) && /ctx\.theme\.setTheme\(id\)/.test(clientSource)],
  ['migrates the pre-0.4 key', /LEGACY_KEY/.test(clientSource) && /removeItem\(LEGACY_KEY\)/.test(clientSource)],
  ['migrates the old package switch', /LEGACY_ENABLED_KEY/.test(clientSource) && /removeItem\(LEGACY_ENABLED_KEY\)/.test(clientSource)],
  ['chips follow the live preference', /readPreference\(ctx\)/.test(clientSource) && /ctx\.on\("theme\/change", notify\)/.test(clientSource)],
  ['style layer follows the switch', /style\.disabled = !readEnabled\(\)/.test(clientSource) && /function setStyleEnabled/.test(clientSource)],
  ['background layer is retractable', /style\.remove\(\)/.test(clientSource)],
  ['style layer is present', /MOTION_CSS/.test(clientSource)],
  ['crossfades theme switches', /function withThemeFade/.test(clientSource) && /startViewTransition/.test(clientSource) && /body\[data-dsh-theme-fade\]/.test(clientSource)],
]
const wiringFailures = wiring.filter(([, ok]) => !ok).map(([name]) => name)
check('client half wiring', wiringFailures.length === 0, wiringFailures.join('; ') || wiring.length + ' checks')

check(
  'host half has no side effects',
  /export function apply\(\) \{\}/.test(hostSource),
  hostSource.includes('export') ? 'empty apply()' : 'no export found',
)

// --------------------------------------------------------------------------
// 7. Package wiring: three places must agree on the plugin id
// --------------------------------------------------------------------------

const bundleId = /id: "([^"]+)"/.exec(clientSource)?.[1]
const patchId = /id:\s*'?([a-z0-9-]+)'?/.exec(patch)?.[1]
check(
  'package id agrees',
  bundleId === pkg.name && patchId === pkg.name,
  `package.json=${pkg.name} client.js=${bundleId} cordis.patch.yml=${patchId}`,
)

const exported = Object.values(pkg.exports ?? {})
check(
  'exports point at real files',
  exported.every((path) => existsSync(join(ROOT, path))),
  exported.join(', '),
)

// --------------------------------------------------------------------------
// 8. DOM contract for the background layer, read from the installed bundles
// --------------------------------------------------------------------------

const ANCHORS = [
  ['dsh-client-ui-conversation', 'data-conversation-content'],
  ['dsh-client-ui-conversation', 'data-conversation-scroll'],
  ['dsh-client-ui-conversation', 'data-conversation-session'],
  ['dsh-client-ui-chat', 'data-chat-turn'],
]
const missingAnchors = []
for (const [packageName, attribute] of ANCHORS) {
  const source = readClientBundle(baseline.pkg.dir, packageName)
  if (source === null || !source.includes(attribute)) missingAnchors.push(`${attribute} (${packageName})`)
}
check(
  'background DOM contract intact',
  missingAnchors.length === 0,
  missingAnchors.length === 0 ? ANCHORS.map(([, a]) => a).join(', ') : `gone upstream: ${missingAnchors.join(', ')}`,
)

// The background layer clears a container's own fill so the page shows through.
// That only works while the container defaults to the surface colour; if DSH
// ever gives it a different fill, clearing it would reveal the wrong backdrop.
const conversationRootPaintsSurface = [['dsh-client-ui-conversation', 'root']].every(([packageName, role]) => {
  const source = readClientBundle(baseline.pkg.dir, packageName)
  if (source === null) return false
  return [...source.matchAll(new RegExp('\\.' + '[A-Za-z0-9_]*_' + role + '\\{[^}]*\\}', 'g'))].some(
    (m) => m[0].includes('background:var(--dsw-alias-bg-base)'),
  )
})
check(
  'containers being cleared paint the surface',
  conversationRootPaintsSurface,
  conversationRootPaintsSurface
    ? 'conversation root defaults to var(--dsw-alias-bg-base)'
    : 'conversation root no longer defaults to the surface — re-check the background layer',
)

// --------------------------------------------------------------------------
// Report
// --------------------------------------------------------------------------

let failed = 0
for (const { ok, name, detail } of checks) {
  if (!ok) failed++
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`)
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`)
if (failed > 0) process.exitCode = 1

void contrast
