/**
 * Runtime smoke test for `lib/client.js`.
 *
 * `check.mjs` only reads text; the bug this file guards against was a runtime
 * race, not a typo. `ThemeRuntime.adopt()` restores the persisted preference
 * whenever the settings document lands, so a third-party theme id selected at
 * boot is reverted a few frames later — the dark scheme needed re-picking on
 * every launch. The fix is structural (a token layer over the built-in
 * preference), and these cases are what prove it:
 *
 *   1. a fresh mount installs ONE layer with every token as a {light,dark} pair,
 *      registers no third-party id, and leaves DSH's preference alone;
 *   2. a late settings adoption ("system" → whatever is stored) does not remove
 *      the layer, and the row's chips follow the live preference;
 *   3. the switch really toggles: off retracts the layer and disables the
 *      stylesheet, on restores both;
 *   4. choosing 深色 writes DSH's own preference — the value the settings
 *      document keeps, which is what makes the choice survive a restart;
 *   5. the old package's switch and pre-0.4 `choice` key are migrated once,
 *      and the chosen scheme is carried over;
 *   6. unloading the plugin retracts both the layer and the stylesheet.
 *
 * Everything is a stub: no DOM, no React, no theme service. Node's `vm` runs
 * the bundle exactly as shipped.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const CLIENT = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8')
const data = JSON.parse(readFileSync(join(HERE, 'tokens.json'), 'utf8'))
const TOKEN_NAMES = new Set([
  ...Object.keys(data.tokens ?? {}),
  ...Object.keys(data.typography ?? {}),
  ...Object.keys(data.radius ?? {}),
])

const results = []
const verify = (name, ok, detail) => {
  results.push({ name, ok, detail })
}

// --------------------------------------------------------------------------
// Stubs
// --------------------------------------------------------------------------

const createNode = (tag) => {
  const node = {
    tagName: String(tag).toUpperCase(),
    dataset: {},
    textContent: '',
    disabled: false,
    removed: false,
    className: '',
    children: [],
    attributes: new Map(),
    listeners: [],
    setAttribute(name, value) {
      this.attributes.set(name, value)
    },
    getAttribute(name) {
      return this.attributes.get(name) ?? null
    },
    appendChild(child) {
      this.children.push(child)
      child.parent = node
      return child
    },
    addEventListener(type, fn) {
      this.listeners.push({ type, fn })
    },
    remove() {
      this.removed = true
      const parent = this.parent
      if (parent) parent.children = parent.children.filter((child) => child !== this)
    },
  }
  return node
}

const createDocument = () => {
  const head = []
  const bodyStyle = new Map()
  const body = {
    children: [],
    attributes: new Map(),
    style: {
      setProperty: (name, value) => bodyStyle.set(name, value),
      removeProperty: (name) => bodyStyle.delete(name),
      getPropertyValue: (name) => bodyStyle.get(name) ?? '',
    },
    setAttribute(name, value) {
      this.attributes.set(name, value)
    },
    removeAttribute(name) {
      this.attributes.delete(name)
    },
    appendChild: (node) => {
      body.children.push(node)
      node.parent = body
      return node
    },
  }
  return {
    head: { appendChild: (node) => head.push(node) },
    body,
    documentElement: { offsetHeight: 0 },
    styles: head,
    createElement: (tag) => createNode(tag),
    createElementNS: (_ns, tag) => createNode(tag),
    querySelector: () => null,
  }
}

const createTheme = () => {
  const listeners = new Set()
  const layers = new Map()
  const builtins = [
    { id: 'light', colorScheme: 'light' },
    { id: 'dark', colorScheme: 'dark' },
  ]
  let seq = 0
  const emit = () => {
    for (const fn of [...listeners]) fn()
  }
  const theme = {
    preference: 'system',
    layers,
    registrations: 0,
    getTheme() {
      return { preference: theme.preference, themes: builtins, revision: seq }
    },
    /** Not expected: ids are session-scoped, which is the whole bug. */
    register() {
      theme.registrations += 1
      throw new Error('third-party theme id registered')
    },
    setTheme(id) {
      if (id !== 'system' && !builtins.some((t) => t.id === id)) throw new Error(`theme "${id}" is not registered`)
      if (theme.preference === id) return
      theme.preference = id
      emit()
    },
    overrideTokens(source, tokens) {
      const layer = { seq: seq++, tokens: { ...tokens } }
      layers.set(source, layer)
      emit()
      return () => {
        if (layers.get(source) === layer) layers.delete(source)
      }
    },
    listen(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    /** ThemeRuntime.adopt(): the durable preference lands late and rewrites it. */
    adopt(preference) {
      if (theme.preference === preference) return
      theme.preference = preference
      emit()
    },
  }
  return theme
}

const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...(props ?? {}), children } }),
  useReducer: () => [0, () => {}],
  useEffect: (fn) => {
    fn()
  },
}

const createContext = (theme) => {
  const effects = []
  let registration = null
  const ctx = {
    theme,
    on(event, fn) {
      if (event === 'theme/change') return theme.listen(fn)
      return () => {}
    },
    effect(execute) {
      const cleanup = execute()
      effects.push(cleanup)
      return () => {
        if (typeof cleanup === 'function') cleanup()
      }
    },
    slots: {
      inject: (_key, callback) => callback(),
      register(declaration, component) {
        registration = { declaration, component }
        return () => {}
      },
    },
  }
  return {
    ctx,
    effects,
    get registration() {
      return registration
    },
  }
}

const mount = ({ storage = {}, theme = createTheme(), viewTransition, reducedMotion = false } = {}) => {
  const document = createDocument()
  if (viewTransition) document.startViewTransition = viewTransition
  const setThemeBefore = Object.getOwnPropertyDescriptor(theme, 'setTheme')
  const map = new Map(Object.entries(storage))
  const localStorage = {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  }
  const matchMedia = (query) => ({ matches: reducedMotion && /prefers-reduced-motion:\s*reduce/.test(query) })
  const sandbox = { console, document, localStorage, queueMicrotask, setTimeout, clearTimeout, matchMedia }
  sandbox.window = sandbox
  sandbox.globalThis = sandbox
  let entry = null
  sandbox.__ModuleLoader__ = {
    load: (value) => {
      entry = value
    },
  }
  runInNewContext(CLIENT, sandbox, { filename: 'lib/client.js' })
  if (entry === null) throw new Error('lib/client.js never called __ModuleLoader__.load')
  const exported = entry.factory((name) => (name === 'react' ? react : {}))
  const context = createContext(theme)
  exported.apply(context.ctx)
  return { exported, theme, localStorage, document, setThemeBefore, ...context }
}

const find = (node, predicate) => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = find(child, predicate)
      if (hit !== null) return hit
    }
    return null
  }
  if (node === null || typeof node !== 'object') return null
  if (predicate(node)) return node
  return find(node.props?.children ?? [], predicate)
}

const rowProps = (mounted) => mounted.registration.declaration.inject()

/** Render the row, click the first matching control, then render it again. */
const press = (mounted, predicate) => {
  const tree = mounted.registration.component(rowProps(mounted))
  const node = find(tree, predicate)
  if (node === null) throw new Error(`row has no control matching ${predicate}`)
  node.props.onClick()
  return mounted.registration.component(rowProps(mounted))
}

// --------------------------------------------------------------------------
// 1. A fresh mount
// --------------------------------------------------------------------------

const fresh = mount()
const layer = fresh.theme.layers.get('dsh-theme-cinnabar')
verify('installs exactly one palette layer', fresh.theme.layers.size === 1, `${fresh.theme.layers.size} layer(s)`)
verify(
  'layer carries every token as a light/dark pair',
  layer !== undefined
    && TOKEN_NAMES.size === Object.keys(layer.tokens).length
    && [...TOKEN_NAMES].every((name) => typeof layer.tokens[name]?.light === 'string' && typeof layer.tokens[name]?.dark === 'string'),
  layer === undefined ? 'no layer' : `${Object.keys(layer.tokens).length} pairs`,
)
verify('registers no third-party theme id', fresh.theme.registrations === 0, `${fresh.theme.registrations} registration(s)`)
verify('leaves the DSH preference alone on mount', fresh.theme.preference === 'system', fresh.theme.preference)
verify('injects theme + slots', Array.isArray(fresh.exported.inject) && fresh.exported.inject.join(',') === 'theme,slots', String(fresh.exported.inject))
verify('settings row is registered', fresh.registration !== null && fresh.registration.declaration.id === 'cinnabar-theme', fresh.registration?.declaration.id ?? 'none')
const freshStyle = fresh.document.styles[0]
verify(
  'injects one stylesheet, enabled',
  fresh.document.styles.length === 1 && freshStyle.disabled === false && freshStyle.textContent.includes('liquid glass'),
  `${fresh.document.styles.length} style(s), disabled=${freshStyle?.disabled}`,
)

const veils = (mounted) => mounted.document.body.children.filter((node) => node.className === 'cinnabar-boot')
const marks = (mounted) => mounted.document.body.children.filter((node) => node.className === 'cinnabar-boot-mark')
const freshVeil = veils(fresh)[0]
verify(
  'plays the first-load curtain',
  veils(fresh).length === 1 && marks(fresh).length === 1,
  `${veils(fresh).length} veil(s), ${marks(fresh).length} mark layer(s)`,
)
const freshSvg = marks(fresh)[0]?.children[0]
const freshPath = freshSvg?.children[0]
verify(
  'curtain carries the official whale mark',
  freshVeil?.attributes.get('aria-hidden') === 'true'
    && freshSvg?.tagName === 'SVG'
    && typeof freshSvg?.attributes.get('viewBox') === 'string'
    && freshPath?.tagName === 'PATH'
    && String(freshPath?.attributes.get('d')).startsWith('M168.384')
    && freshPath?.attributes.get('fill') === 'currentColor',
  freshSvg === undefined
    ? 'no svg'
    : `viewBox=${freshSvg.attributes.get('viewBox')}, d=${String(freshPath?.attributes.get('d')).slice(0, 12)}…`,
)

// --------------------------------------------------------------------------
// 2. The settings document lands after the plugin did
// --------------------------------------------------------------------------

fresh.theme.adopt('light')
verify('late adoption does not retract the layer', fresh.theme.layers.size === 1, `${fresh.theme.layers.size} layer(s) after adopt(light)`)
fresh.theme.adopt('dark')
const tree = fresh.registration.component(rowProps(fresh))
const pressed = find(tree, (node) => node.type === 'button' && node.props['aria-pressed'] === true)
verify('chips follow the adopted preference', pressed !== null && pressed.props.children.includes('朱砂 · 深色'), pressed?.props.children ?? 'no pressed chip')
const hint = find(tree, (node) => Array.isArray(node.props?.children) && node.props.children.some((child) => typeof child === 'string' && child.startsWith('已启用')))
verify('row reports the live scheme', hint !== null && hint.props.children.join('').includes('朱砂 · 深色'), hint?.props.children.join('') ?? 'no hint')
const seal = find(tree, (node) => node?.props?.style?.background === 'var(--dsw-alias-state-business-primary)')
verify('settings row carries the cinnabar seal', seal !== null && seal.props['aria-hidden'] === true, seal === null ? 'no seal element' : '12px seal at the row title')

// --------------------------------------------------------------------------
// 3. The switch
// --------------------------------------------------------------------------

press(fresh, (node) => node.props?.role === 'switch')
verify('switch off retracts the layer', fresh.theme.layers.size === 0, `${fresh.theme.layers.size} layer(s)`)
verify('switch off disables the stylesheet', freshStyle.disabled === true, `disabled=${freshStyle.disabled}`)
verify('switch off is remembered', fresh.localStorage.getItem('dsh-theme-cinnabar:enabled') === 'false', fresh.localStorage.getItem('dsh-theme-cinnabar:enabled'))
verify('switch off leaves the DSH preference alone', fresh.theme.preference === 'dark', fresh.theme.preference)
press(fresh, (node) => node.props?.role === 'switch')
verify('switch on restores the layer', fresh.theme.layers.size === 1, `${fresh.theme.layers.size} layer(s)`)
verify('switch on re-enables the stylesheet', freshStyle.disabled === false, `disabled=${freshStyle.disabled}`)

// --------------------------------------------------------------------------
// 3b. The first-load curtain
// --------------------------------------------------------------------------

const endVeil = (mounted) => {
  const veil = veils(mounted)[0]
  if (veil === undefined) return
  const listener = veil.listeners.find((entry) => entry.type === 'animationend')
  if (listener !== undefined) listener.fn({ target: veil })
}

const freshMark = marks(fresh)[0]
endVeil(fresh)
verify(
  'curtain removes itself on animationend',
  veils(fresh).length === 0 && marks(fresh).length === 0 && freshVeil.removed === true && freshMark.removed === true,
  `${veils(fresh).length} veil(s), ${marks(fresh).length} mark(s) left`,
)

const curtainOff = mount({ storage: { 'dsh-theme-cinnabar:motion': 'false' } })
verify(
  'curtain switch off skips the veil',
  veils(curtainOff).length === 0 && marks(curtainOff).length === 0 && curtainOff.theme.layers.size === 1,
  `${veils(curtainOff).length} veil(s), ${curtainOff.theme.layers.size} layer(s)`,
)
verify(
  'curtain switch off still ships the stylesheet',
  curtainOff.document.styles[0].textContent.includes('cinnabar-boot'),
  'boot CSS present, just not mounted',
)

const calm = mount({ reducedMotion: true })
verify(
  'reduced motion skips the curtain',
  veils(calm).length === 0 && marks(calm).length === 0,
  `${veils(calm).length} veil(s), ${marks(calm).length} mark(s)`,
)

press(curtainOff, (node) => node.props?.['aria-label'] === '启用启动动画')
verify(
  'turning the curtain on previews it once',
  veils(curtainOff).length === 1 && marks(curtainOff).length === 1 && curtainOff.localStorage.getItem('dsh-theme-cinnabar:motion') === 'true',
  `${veils(curtainOff).length} veil(s), motion=${curtainOff.localStorage.getItem('dsh-theme-cinnabar:motion')}`,
)
press(curtainOff, (node) => node.props?.['aria-label'] === '启用启动动画')
verify(
  'turning the curtain off is remembered',
  curtainOff.localStorage.getItem('dsh-theme-cinnabar:motion') === 'false',
  `motion=${curtainOff.localStorage.getItem('dsh-theme-cinnabar:motion')}`,
)

// --------------------------------------------------------------------------
// 4. A chip writes the persisted preference
// --------------------------------------------------------------------------

fresh.theme.adopt('light')
press(fresh, (node) => node.type === 'button' && Array.isArray(node.props.children) && node.props.children.includes('朱砂 · 深色'))
verify('choosing 深色 writes the built-in preference', fresh.theme.preference === 'dark', fresh.theme.preference)
verify('theme switch arms the crossfade', fresh.document.body.attributes.has('data-dsh-theme-fade'), 'data-dsh-theme-fade')

let transitions = 0
const smooth = mount({ viewTransition: (callback) => { transitions += 1; callback() } })
smooth.theme.adopt('light')
press(smooth, (node) => node.type === 'button' && Array.isArray(node.props.children) && node.props.children.includes('朱砂 · 深色'))
verify(
  'view transitions replace the per-element fade',
  transitions === 1 && smooth.document.body.attributes.has('data-dsh-theme-fade') === false,
  `transitions=${transitions}`,
)
verify(
  'incoming snapshot freezes colour transitions',
  smooth.document.body.attributes.has('data-dsh-vt-freeze') === true,
  'data-dsh-vt-freeze',
)

// --------------------------------------------------------------------------
// 5. The old package's keys
// --------------------------------------------------------------------------

const legacyDark = mount({ storage: { 'dsh-theme-inkstone:choice': 'inkstone-dark' } })
verify('legacy dark is carried into the preference', legacyDark.theme.preference === 'dark', legacyDark.theme.preference)
verify(
  'legacy key is migrated and dropped',
  legacyDark.localStorage.getItem('dsh-theme-cinnabar:enabled') === 'true' && legacyDark.localStorage.getItem('dsh-theme-inkstone:choice') === null,
  `choice=${legacyDark.localStorage.getItem('dsh-theme-inkstone:choice')}`,
)
verify('legacy dark keeps the layer', legacyDark.theme.layers.size === 1, `${legacyDark.theme.layers.size} layer(s)`)

const legacyOff = mount({ storage: { 'dsh-theme-inkstone:choice': 'original' } })
verify(
  'legacy "原主题" stays off',
  legacyOff.localStorage.getItem('dsh-theme-cinnabar:enabled') === 'false' && legacyOff.theme.layers.size === 0 && legacyOff.document.styles[0].disabled === true,
  `layers=${legacyOff.theme.layers.size}`,
)

const legacySwitch = mount({ storage: { 'dsh-theme-inkstone:enabled': 'false' } })
verify(
  "old package's switch is carried over",
  legacySwitch.localStorage.getItem('dsh-theme-cinnabar:enabled') === 'false'
    && legacySwitch.localStorage.getItem('dsh-theme-inkstone:enabled') === null
    && legacySwitch.theme.layers.size === 0,
  `layers=${legacySwitch.theme.layers.size}`,
)

// --------------------------------------------------------------------------
// 6. Teardown
// --------------------------------------------------------------------------

for (const cleanup of fresh.effects) if (typeof cleanup === 'function') cleanup()
verify('unmount retracts the layer', fresh.theme.layers.size === 0, `${fresh.theme.layers.size} layer(s)`)
verify('unmount removes the stylesheet', freshStyle.removed === true, `removed=${freshStyle.removed}`)

const withVeil = mount()
const withVeilVeil = veils(withVeil)[0]
const withVeilMark = marks(withVeil)[0]
for (const cleanup of withVeil.effects) if (typeof cleanup === 'function') cleanup()
verify(
  'unmount takes the curtain down',
  withVeilVeil !== undefined
    && withVeilMark !== undefined
    && veils(withVeil).length === 0
    && marks(withVeil).length === 0
    && withVeilVeil.removed === true
    && withVeilMark.removed === true,
  `${veils(withVeil).length} veil(s), ${marks(withVeil).length} mark(s) left`,
)
const setThemeAfter = Object.getOwnPropertyDescriptor(fresh.theme, 'setTheme')
verify('theme switch patch is removed on unmount', setThemeAfter?.value === fresh.setThemeBefore?.value, setThemeAfter === undefined ? 'no own method' : 'restored')
verify('unmount clears the crossfade flag', fresh.document.body.attributes.has('data-dsh-theme-fade') === false, `flag=${fresh.document.body.attributes.has('data-dsh-theme-fade')}`)

// --------------------------------------------------------------------------
// Report
// --------------------------------------------------------------------------

let failed = 0
for (const { ok, name, detail } of results) {
  if (!ok) failed++
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`)
}
console.log(`\n${results.length - failed}/${results.length} runtime checks passed`)
if (failed > 0) process.exitCode = 1
