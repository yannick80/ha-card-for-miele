// Card tests: `node --test tests/*.mjs` – no npm dependencies.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

const CARD_DIR = new URL("../dist/", import.meta.url);
const CARD_FILES = readdirSync(CARD_DIR).filter((f) => f.endsWith(".js"));
const SOURCE = readFileSync(new URL("miele-card.js", CARD_DIR), "utf8");

// ------------------------------------------------------------ minimal DOM stub

class FakeEl {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.textContent = "";
    this.title = "";
    this.hidden = false;
    this.attributes = {};
    this.children = [];
    this.listeners = {};
    const props = {};
    this.style = { setProperty: (k, v) => (props[k] = v), getPropertyValue: (k) => props[k] || "", _props: props };
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  appendChild(c) { this.children.push(c); return c; }
}

class FakeRoot {
  constructor() { this._html = ""; this._els = {}; }
  set innerHTML(html) { this._html = html; this._els = {}; }
  get innerHTML() { return this._html; }
  querySelector(sel) {
    const probe = sel.startsWith(".") ? `class="${sel.slice(1)}"` : `<${sel}`;
    if (!this._html.includes(probe)) return null;
    if (!this._els[sel]) this._els[sel] = new FakeEl(sel.replace(/^\./, "div"));
    return this._els[sel];
  }
}

function makeContext(extra = {}) {
  const registry = new Map();
  class HTMLElement {
    constructor() { this.dispatched = []; this.children = []; }
    attachShadow() { this.shadowRoot = new FakeRoot(); return this.shadowRoot; }
    dispatchEvent(ev) { this.dispatched.push(ev); return true; }
    appendChild(c) { this.children.push(c); return c; }
  }
  const ctx = {
    console: { info() {}, error(...a) { ctx.__errors.push(a); }, warn() {} },
    __errors: [],
    HTMLElement,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    customElements: {
      get: (t) => registry.get(t),
      define: (t, c) => { if (registry.has(t)) throw new Error(`already defined: ${t}`); registry.set(t, c); },
      whenDefined: () => new Promise(() => {}), // ha-form never arrives in tests
    },
    document: { createElement: (t) => { const C = registry.get(t); return C ? new C() : new FakeEl(t); } },
    setInterval: () => 1,
    clearInterval: () => {},
    Intl, Date, Math, JSON, Number, String, Object, Array, Promise, Error, RegExp, Set, parseFloat,
    ...extra,
  };
  ctx.window = ctx;
  return vm.createContext(ctx);
}

function loadCard(withHook = true) {
  const ctx = makeContext(withHook ? { module: { exports: {} } } : {});
  vm.runInContext(SOURCE, ctx, { filename: "miele-card.js" });
  return ctx;
}

// ------------------------------------------------------------ mock hass

function mkHass(model, ents, lang = "de") {
  const hass = {
    locale: { language: lang }, language: lang,
    devices: { dev1: { id: "dev1", model, name: "EG Küche Gerät" } },
    entities: {}, states: {},
    formatEntityState: (s) => ({ fan_plus: "Heißluft plus", heating_up: "Aufheizen" })[s.state] || s.state,
  };
  for (const [key, state] of Object.entries(ents)) {
    const eid = `sensor.dev1_${key}`;
    hass.entities[eid] = { entity_id: eid, device_id: "dev1", platform: "miele_lan", translation_key: key };
    hass.states[eid] = { entity_id: eid, state: String(state), last_changed: "x" };
  }
  return hass;
}

function render(ctx, config, hass) {
  const Card = ctx.customElements.get("miele-card");
  const card = new Card();
  card.setConfig(config);
  card.hass = hass;
  const r = card.shadowRoot;
  const q = (s) => r.querySelector(s);
  return {
    card,
    warning: q(".warning") && q(".warning").textContent,
    primary: q(".primary") && q(".primary").textContent,
    secondary: q(".secondary") && q(".secondary").textContent,
    color: q("ha-card") && q("ha-card").style.getPropertyValue("--miele-color"),
    progressHidden: q(".progress") && q(".progress").hidden,
  };
}

// ------------------------------------------------------------ old WebViews

test("all card files evaluate as classic scripts in one shared context, twice", () => {
  const ctx = makeContext();
  for (let i = 0; i < 2; i++) {
    for (const f of CARD_FILES) {
      vm.runInContext(readFileSync(new URL(f, CARD_DIR), "utf8"), ctx, { filename: f });
    }
  }
  assert.ok(ctx.customElements.get("miele-card"));
  assert.equal(ctx.window.customCards.filter((c) => c.type === "miele-card").length, 1);
});

test("source uses no syntax newer than ES2019", () => {
  const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const forbidden = [
    [/\?\.(?!\d)/, "optional chaining ?."],
    [/\?\?/, "nullish coalescing ??"],
    [/(\|\||&&)=/, "logical assignment"],
    [/\.at\(/, ".at()"],
    [/\.replaceAll\(/, "replaceAll"],
    [/this\.#\w|^\s*(static\s+)?#\w+\s*[=(;]/m, "#private class members"],
  ];
  for (const [re, name] of forbidden) assert.doesNotMatch(code, re, `forbidden syntax: ${name}`);
});

test("whole file is wrapped in its own function scope", () => {
  const code = SOURCE.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "").trim();
  assert.match(code, /^\(function \(\) \{/);
  assert.match(code, /\}\)\(\);$/);
});

test("every color-mix() has a plain fallback declaration directly before it", () => {
  const lines = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").split("\n");
  let count = 0;
  lines.forEach((line, i) => {
    const m = line.match(/^\s*([a-z-]+)\s*:.*color-mix\(/);
    if (!m) return;
    count++;
    const prev = lines.slice(0, i).reverse().find((l) => l.trim() !== "");
    assert.ok(prev && new RegExp(`^\\s*${m[1]}\\s*:`).test(prev) && !prev.includes("color-mix("),
      `no fallback before line ${i + 1}: ${line.trim()}`);
  });
  assert.ok(count > 0);
});

test("CSS avoids flex/grid gap and inset", () => {
  assert.doesNotMatch(SOURCE, /^\s*(gap|inset)\s*:/m);
});

// ------------------------------------------------------------ behaviour

test("without a device the card shows a hint", () => {
  const ctx = loadCard();
  const r = render(ctx, {}, mkHass("Oven", { status: "off" }));
  assert.equal(r.warning, "Kein Miele@LAN-Gerät ausgewählt");
});

test("unknown device and missing status sensor show hints", () => {
  const ctx = loadCard();
  assert.equal(render(ctx, { device: "nope" }, mkHass("Oven", { status: "off" })).warning, "Gerät nicht gefunden");
  assert.equal(render(ctx, { device: "dev1" }, mkHass("Oven", { program_id: "x" })).warning, "Kein Status-Sensor gefunden");
});

test("running oven shows program, temperatures, elapsed, phase and remaining time", () => {
  const ctx = loadCard();
  const r = render(ctx, { device: "dev1" }, mkHass("Oven", {
    status: "in_use", program_id: "fan_plus", program_phase: "heating_up",
    cavity_temperature: 178.4, target_temperature: 200, elapsed_minutes: 42, remaining_minutes: 18, progress: 70,
  }));
  assert.equal(r.primary, "Heißluft plus");
  assert.match(r.secondary, /^178 \/ 200 °C · 0:42 h · Aufheizen · noch 0:18 h \(bis \d\d:\d\d\)$/);
  assert.equal(r.color, "var(--orange-color)");
  assert.equal(r.progressHidden, false);
});

test("off, finished and unavailable states", () => {
  const ctx = loadCard();
  const off = render(ctx, { device: "dev1" }, mkHass("Oven", { status: "off" }));
  assert.equal(off.primary, "Backofen aus");
  assert.equal(off.secondary, "");
  assert.match(off.color, /disabled/);
  const done = render(ctx, { device: "dev1" }, mkHass("Tumble Dryer", { status: "program_ended" }));
  assert.equal(done.primary, "Trockner fertig");
  assert.equal(done.secondary, "Wäsche kann raus");
  const gone = render(ctx, { device: "dev1" }, mkHass("Dishwasher", { status: "unavailable", remaining_minutes: 10 }));
  assert.equal(gone.primary, "Spülmaschine nicht erreichbar");
  assert.equal(gone.secondary, "");
});

test("render errors are shown inside the card instead of throwing", () => {
  const ctx = loadCard();
  const hass = mkHass("Oven", { status: "in_use" });
  Object.defineProperty(hass, "states", { get() { throw new Error("boom"); } });
  const r = render(ctx, { device: "dev1" }, hass);
  assert.match(r.warning, /boom/);
  assert.equal(ctx.__errors.length > 0, true);
});

test("card provides sizes for sections and the old masonry/grid layout", () => {
  const ctx = loadCard();
  const card = new (ctx.customElements.get("miele-card"))();
  assert.equal(typeof card.getCardSize(), "number");
  assert.equal(card.getGridOptions().columns, 6);
  assert.deepEqual({ ...card.getLayoutOptions() }, { grid_columns: 2, grid_rows: 1 });
});

test("getStubConfig names an explicit device and never throws", async () => {
  const ctx = loadCard();
  const Card = ctx.customElements.get("miele-card");
  assert.equal((await Card.getStubConfig(mkHass("Oven", { status: "off" }))).device, "dev1");
  assert.equal((await Card.getStubConfig({})).device, "");
});

// ------------------------------------------------------------ editor

test("editor works while ha-form is not defined and fills in the device", () => {
  const ctx = loadCard();
  const editor = new (ctx.customElements.get("miele-card-editor"))();
  editor.hass = mkHass("Oven", { status: "off" });
  editor.setConfig({ type: "custom:miele-card", entity: "sensor.dev1_status" });
  editor.connectedCallback();
  const ev = editor.dispatched.find((e) => e.type === "config-changed");
  assert.ok(ev, "config-changed was not fired");
  assert.equal(ev.detail.config.device, "dev1");
});
