/**
 * Card for Miele@LAN – a Home Assistant dashboard card for appliances connected
 * through the Miele@LAN integration. Not affiliated with Miele & Cie. KG.
 * https://github.com/yannick80/ha-card-for-miele
 *
 * Plain custom element, no build step and no dependencies. Entities are found
 * through the device registry and their translation_key, so the card works
 * independently of the language the integration was set up in and of any
 * renamed entity IDs.
 */

(function () {
"use strict";

const VERSION = "1.0.1";
const DOMAIN = "miele_lan";

// translation_keys of Miele@LAN sensors the card can use
const ROLES = [
  "status",
  "program_id",
  "program_type",
  "program_phase",
  "remaining_minutes",
  "elapsed_minutes",
  "start_in_minutes",
  "finish_time",
  "progress",
  "cavity_temperature",
  "target_temperature",
  "core_temperature",
  "core_target_temperature",
  "drying_step",
];

const EMPTY = new Set(["", "unknown", "unavailable", "none", "null", "no_program", "not_running"]);

const MODE_BY_STATUS = {
  in_use: "running",
  autocleaning: "running",
  rinse_hold: "running",
  pause: "paused",
  waiting_to_start: "scheduled",
  programmed: "ready",
  on: "ready",
  idle: "ready",
  program_ended: "finished",
  failure: "error",
  program_interrupted: "error",
};

const STRINGS = {
  de: {
    running: "läuft",
    off: "aus",
    on: "an",
    finished: "fertig",
    error: "Störung",
    unavailable: "nicht erreichbar",
    paused: "Pausiert",
    remaining: "noch {d}",
    until: "bis {t}",
    starts: "Start um {t}",
    starts_in: "in {d}",
    core: "Kern",
    no_device: "Kein Miele@LAN-Gerät ausgewählt",
    device_missing: "Gerät nicht gefunden",
    no_status: "Kein Status-Sensor gefunden",
    no_devices: "Keine Miele@LAN-Geräte ausgewählt",
    start_in: "Start in {d}",
    offline: "offline",
    all_off: "Alle Geräte aus",
    profiles: {
      oven: ["Backofen", "Programm beendet"],
      steam_oven: ["Dampfgarer", "Programm beendet"],
      microwave: ["Mikrowelle", "Programm beendet"],
      dryer: ["Trockner", "Wäsche kann raus"],
      washer_dryer: ["Waschtrockner", "Wäsche kann raus"],
      washer: ["Waschmaschine", "Wäsche kann raus"],
      dishwasher: ["Spülmaschine", "Geschirr kann raus"],
      coffee: ["Kaffeevollautomat", "Fertig"],
      generic: [null, "Programm beendet"],
    },
    editor: {
      device: "Gerät",
      name: "Name",
      icon: "Symbol",
      color: "Farbe im Betrieb",
      show_elapsed: "Laufzeit anzeigen",
      show_progress: "Fortschrittsbalken anzeigen",
      finished_text: "Text bei Programmende",
      devices: "Geräte",
      columns: "Geräte pro Reihe",
      hide_off: "Ausgeschaltete Geräte zusammenfassen",
    },
  },
  en: {
    running: "running",
    off: "off",
    on: "on",
    finished: "finished",
    error: "fault",
    unavailable: "unavailable",
    paused: "Paused",
    remaining: "{d} left",
    until: "until {t}",
    starts: "Starts at {t}",
    starts_in: "in {d}",
    core: "Core",
    no_device: "No Miele@LAN device selected",
    device_missing: "Device not found",
    no_status: "No status sensor found",
    no_devices: "No Miele@LAN appliances selected",
    start_in: "Starts in {d}",
    offline: "offline",
    all_off: "All appliances off",
    profiles: {
      oven: ["Oven", "Program finished"],
      steam_oven: ["Steam oven", "Program finished"],
      microwave: ["Microwave", "Program finished"],
      dryer: ["Dryer", "Laundry is dry"],
      washer_dryer: ["Washer-dryer", "Laundry is done"],
      washer: ["Washing machine", "Laundry is done"],
      dishwasher: ["Dishwasher", "Dishes are clean"],
      coffee: ["Coffee machine", "Done"],
      generic: [null, "Program finished"],
    },
    editor: {
      device: "Device",
      name: "Name",
      icon: "Icon",
      color: "Color while running",
      show_elapsed: "Show elapsed time",
      show_progress: "Show progress bar",
      finished_text: "Text when finished",
      devices: "Appliances",
      columns: "Appliances per row",
      hide_off: "Collapse appliances that are off",
    },
  },
};

const PROFILES = {
  oven: { icon: "mdi:stove", color: "orange", elapsed: true },
  steam_oven: { icon: "mdi:stove", color: "orange", elapsed: true },
  microwave: { icon: "mdi:microwave", color: "orange", elapsed: true },
  dryer: { icon: "mdi:tumble-dryer", color: "blue", elapsed: false },
  washer_dryer: { icon: "mdi:washing-machine", color: "blue", elapsed: false },
  washer: { icon: "mdi:washing-machine", color: "blue", elapsed: false },
  dishwasher: { icon: "mdi:dishwasher", color: "blue", elapsed: false },
  coffee: { icon: "mdi:coffee-maker", color: "brown", elapsed: false },
  generic: { icon: "mdi:information-outline", color: "blue", elapsed: false },
};

// Miele@LAN reports a readable model label ("Oven", "Tumble Dryer", ...)
function profileForModel(model) {
  const m = String(model || "").toLowerCase();
  if (m.includes("dishwasher")) return "dishwasher";
  if (m.includes("washer-dryer") || m.includes("washer dryer")) return "washer_dryer";
  if (m.includes("dryer")) return "dryer";
  if (m.includes("washing") || m.includes("washer")) return "washer";
  if (m.includes("steam")) return "steam_oven";
  if (m.includes("microwave") && !m.includes("oven")) return "microwave";
  if (m.includes("oven")) return "oven";
  if (m.includes("coffee")) return "coffee";
  return "generic";
}

function strings(hass) {
  const lang = (hass && hass.locale && hass.locale.language) || (hass && hass.language) || "en";
  return lang.toLowerCase().startsWith("de") ? STRINGS.de : STRINGS.en;
}

function fmt(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (values[k] !== undefined && values[k] !== null ? values[k] : ""));
}

function fmtDuration(minutes) {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} h`;
}

function fmtClock(hass, date) {
  const lang = (hass.locale && hass.locale.language) || hass.language || undefined;
  try {
    return new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" }).format(date);
  } catch (e) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
}

function colorVar(name) {
  if (!name) return "var(--state-icon-color, var(--secondary-text-color))";
  const n = String(name).trim();
  if (/^(#|rgb|hsl|var\()/i.test(n)) return n;
  if (n === "disabled") return "var(--disabled-color, var(--disabled-text-color))";
  return `var(--${n}-color)`;
}

function cap(text) {
  const s = String(text || "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ------------------------------------------------- shared appliance logic
// Plain functions so the single card and the overview card read appliances
// the same way. `map` is { role: entity_id } for one appliance.

function deviceIdFor(hass, cfg) {
  if (cfg.device) return cfg.device;
  const ent = cfg.entity && hass.entities && hass.entities[cfg.entity];
  return ent ? ent.device_id : undefined;
}

function resolveEntities(hass, deviceId, cfg) {
  const map = {};
  for (const e of Object.values(hass.entities || {})) {
    if (e.device_id !== deviceId || e.platform !== DOMAIN) continue;
    if (!e.entity_id.startsWith("sensor.") || !e.translation_key) continue;
    if (ROLES.includes(e.translation_key) && !map[e.translation_key]) map[e.translation_key] = e.entity_id;
  }
  if (cfg.entity && !map.status) map.status = cfg.entity;
  Object.assign(map, cfg.entities || {});
  return map;
}

// Resolving entities walks the whole registry, so cache it per appliance
function cachedEntities(cache, hass, deviceId, cfg) {
  const key = `${deviceId}|${Object.keys(hass.entities || {}).length}|${JSON.stringify(cfg.entities || {})}`;
  if (cache.key === key && cache.registry === hass.entities) return cache.map;
  cache.key = key;
  cache.registry = hass.entities;
  cache.map = resolveEntities(hass, deviceId, cfg);
  return cache.map;
}

function readState(hass, map, role) {
  const id = map[role];
  return id ? hass.states[id] : undefined;
}

function isValid(hass, map, role) {
  const s = readState(hass, map, role);
  return !!s && !EMPTY.has(String(s.state).toLowerCase());
}

function readNum(hass, map, role) {
  if (!isValid(hass, map, role)) return undefined;
  const n = parseFloat(readState(hass, map, role).state);
  return Number.isFinite(n) ? n : undefined;
}

function stateLabel(hass, map, role) {
  const s = readState(hass, map, role);
  if (!s) return "";
  if (typeof hass.formatEntityState === "function") {
    try {
      return hass.formatEntityState(s);
    } catch (e) {
      /* fall through */
    }
  }
  const ent = hass.entities && hass.entities[s.entity_id];
  if (ent && ent.translation_key && typeof hass.localize === "function") {
    const txt = hass.localize(`component.${DOMAIN}.entity.sensor.${ent.translation_key}.state.${s.state}`);
    if (txt) return txt;
  }
  const raw = String(s.state).replace(/_/g, " ");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function applianceMode(hass, map) {
  const statusObj = readState(hass, map, "status");
  const status = statusObj ? String(statusObj.state) : "unavailable";
  let mode = MODE_BY_STATUS[status] || "off";
  if (status === "unavailable" || status === "unknown" || status === "not_connected") mode = "unavailable";
  if (status === "programmed" && (readNum(hass, map, "start_in_minutes") || 0) > 0) mode = "scheduled";
  return mode;
}

// { minutes, finish } while time is left, otherwise undefined
function remainingTime(hass, map) {
  let remaining = readNum(hass, map, "remaining_minutes");
  let finish;
  if (isValid(hass, map, "finish_time")) {
    const d = new Date(readState(hass, map, "finish_time").state);
    if (!Number.isNaN(d.getTime())) finish = d;
  }
  if (remaining === undefined && finish) remaining = Math.ceil((finish.getTime() - Date.now()) / 60000);
  if (remaining === undefined || remaining <= 0) return undefined;
  if (!finish) finish = new Date(Date.now() + remaining * 60000);
  return { minutes: remaining, finish };
}

function stateSignature(hass, map) {
  return Object.values(map)
    .map((id) => {
      const s = hass.states[id];
      return s ? `${s.state}|${s.last_changed}` : "-";
    })
    .join(";");
}

function applianceName(t, item, device) {
  const profileName = t.profiles[profileForModel(device && device.model)][0];
  return item.name || profileName || (device && (device.name_by_user || device.name)) || "Miele";
}

// ------------------------------------------------------------ base element

class MieleBase extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (this._config) this._safeUpdate();
  }

  get hass() {
    return this._hass;
  }

  _safeUpdate() {
    try {
      this._update();
    } catch (e) {
      console.error(`${this._tag}: render failed`, e);
      this._showWarning(`${this._tag}: ${(e && e.message) || e}`);
    }
  }

  connectedCallback() {
    // Re-render every 30 s so the remaining time stays correct even when it
    // has to be derived from the finish time.
    this._timer = setInterval(() => {
      this._signature = "";
      if (this._hass && this._config) this._safeUpdate();
    }, 30000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
  }

  _moreInfoFor(entityId) {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true })
    );
  }

  _showWarning(text) {
    this._signature = "";
    this._warning = true;
    this.shadowRoot.innerHTML = `<ha-card><div class="warning"></div></ha-card>
      <style>.warning{padding:12px 16px;color:var(--error-color,#db4437);}</style>`;
    this.shadowRoot.querySelector(".warning").textContent = text;
    this._els = { card: this.shadowRoot.querySelector("ha-card") };
  }
}

// ------------------------------------------------------------- single card

class MieleCard extends MieleBase {
  static getConfigElement() {
    return document.createElement("miele-card-editor");
  }

  static getStubConfig(hass) {
    try {
      const ents = Object.values((hass && hass.entities) || {});
      const dev = Object.values((hass && hass.devices) || {}).find((d) =>
        ents.some((e) => e.device_id === d.id && e.platform === DOMAIN)
      );
      return { device: dev ? dev.id : "" };
    } catch (e) {
      console.error("miele-card: getStubConfig failed", e);
      return { device: "" };
    }
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._tag = "miele-card";
    this._signature = "";
    this._entityCache = {};
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    if (config.entities && typeof config.entities !== "object") {
      throw new Error("'entities' must be a mapping of role: entity_id");
    }
    this._config = { ...config };
    this._entityCache = {};
    this._signature = "";
    this._build();
    if (this._hass) this._safeUpdate();
  }

  getCardSize() {
    return 1;
  }

  getGridOptions() {
    return { columns: 6, min_columns: 4, rows: "auto" };
  }

  // Layout options of the pre-2024.11 sections grid (4 columns)
  getLayoutOptions() {
    return { grid_columns: 2, grid_rows: 1 };
  }

  // ---------------------------------------------------------------- entities

  _deviceId() {
    return deviceIdFor(this._hass, this._config);
  }

  _entities() {
    return cachedEntities(this._entityCache, this._hass, this._deviceId(), this._config);
  }

  _state(role) {
    return readState(this._hass, this._map, role);
  }

  _valid(role) {
    return isValid(this._hass, this._map, role);
  }

  _num(role) {
    return readNum(this._hass, this._map, role);
  }

  _label(role) {
    return stateLabel(this._hass, this._map, role);
  }

  // ---------------------------------------------------------------- render

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; }
        ha-card {
          height: 100%;
          box-sizing: border-box;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .row {
          display: flex;
          align-items: center;
          padding: 10px;
          min-height: 36px;
        }
        .icon {
          --mdc-icon-size: 24px;
          flex: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--miele-color);
          background: rgba(127, 127, 127, 0.12);
          background: color-mix(in srgb, var(--miele-color) 20%, transparent);
          transition: color 180ms ease-in-out, background-color 180ms ease-in-out;
        }
        .info { min-width: 0; flex: 1; display: flex; flex-direction: column; margin-left: 10px; }
        .primary {
          font-size: var(--ha-font-size-m, 14px);
          font-weight: var(--ha-font-weight-medium, 500);
          line-height: 20px;
          color: var(--primary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .secondary {
          font-size: var(--ha-font-size-s, 12px);
          line-height: 16px;
          color: var(--secondary-text-color);
        }
        .secondary:empty { display: none; }
        .progress {
          height: 4px;
          background: rgba(127, 127, 127, 0.15);
          background: color-mix(in srgb, var(--miele-color) 20%, transparent);
        }
        .progress[hidden] { display: none; }
        .bar {
          height: 100%;
          width: 0;
          background: var(--miele-color);
          transition: width 400ms ease-in-out;
        }
        .warning {
          padding: 12px 16px;
          color: var(--error-color, #db4437);
        }
      </style>
      <ha-card>
        <div class="row">
          <div class="icon"><ha-icon></ha-icon></div>
          <div class="info">
            <span class="primary"></span>
            <span class="secondary"></span>
          </div>
        </div>
        <div class="progress" hidden><div class="bar"></div></div>
      </ha-card>
    `;
    this._els = {
      card: this.shadowRoot.querySelector("ha-card"),
      icon: this.shadowRoot.querySelector("ha-icon"),
      primary: this.shadowRoot.querySelector(".primary"),
      secondary: this.shadowRoot.querySelector(".secondary"),
      progress: this.shadowRoot.querySelector(".progress"),
      bar: this.shadowRoot.querySelector(".bar"),
    };
    this._els.card.addEventListener("click", () => this._moreInfo());
  }

  _moreInfo() {
    this._moreInfoFor(this._map && this._map.status);
  }

  _update() {
    const hass = this._hass;
    const t = strings(hass);
    const deviceId = this._deviceId();
    const device = deviceId && hass.devices ? hass.devices[deviceId] : undefined;

    if (!deviceId) return this._showWarning(t.no_device);
    if (hass.devices && !device) return this._showWarning(t.device_missing);

    this._map = this._entities();
    if (!this._map.status) return this._showWarning(t.no_status);

    // Only re-render when something relevant changed
    const sig = `${hass.locale && hass.locale.language};${stateSignature(hass, this._map)}`;
    if (sig === this._signature) return;
    this._signature = sig;

    const profileKey = profileForModel(device && device.model);
    const profile = PROFILES[profileKey];
    const profileDone = t.profiles[profileKey][1];
    const name = applianceName(t, this._config, device);
    const mode = applianceMode(hass, this._map);

    const program = this._valid("program_id") ? this._label("program_id") : "";
    const runColor = this._config.color || profile.color;
    let primary = "";
    let parts = [];
    let color = "disabled";

    switch (mode) {
      case "running":
      case "paused": {
        color = runColor;
        primary = program || `${name} ${t.running}`;
        if (mode === "paused") parts.push(t.paused);
        parts.push(...this._detailParts(t, profile));
        break;
      }
      case "scheduled": {
        color = runColor;
        primary = program || name;
        const startIn = this._num("start_in_minutes");
        if (startIn !== undefined) {
          const at = new Date(Date.now() + startIn * 60000);
          parts.push(`${fmt(t.starts, { t: fmtClock(hass, at) })} (${fmt(t.starts_in, { d: fmtDuration(startIn) })})`);
        }
        if (this._valid("drying_step")) parts.push(this._label("drying_step"));
        break;
      }
      case "finished": {
        color = "green";
        primary = `${name} ${t.finished}`;
        parts.push(this._config.finished_text || profileDone);
        break;
      }
      case "error": {
        color = "red";
        primary = `${name}: ${t.error}`;
        parts.push(this._label("status"));
        break;
      }
      case "ready": {
        color = null; // neutral state colour
        primary = `${name} ${t.on}`;
        if (program) parts.push(program);
        break;
      }
      case "unavailable": {
        primary = `${name} ${t.unavailable}`;
        break;
      }
      default: {
        primary = `${name} ${t.off}`;
      }
    }

    if (this._warning) {
      this._warning = false;
      this._build();
    }
    this._els.card.style.setProperty("--miele-color", colorVar(color));
    this._els.icon.setAttribute("icon", this._config.icon || profile.icon);
    this._els.primary.textContent = primary;
    this._els.primary.title = primary;
    this._els.secondary.textContent = parts.filter(Boolean).join(" · ");

    const progress = this._num("progress");
    const showProgress =
      this._config.show_progress !== false &&
      (mode === "running" || mode === "paused") &&
      progress !== undefined;
    this._els.progress.hidden = !showProgress;
    this._els.bar.style.width = showProgress ? `${Math.min(100, Math.max(0, progress))}%` : "0";
  }

  _detailParts(t, profile) {
    const parts = [];

    const cavity = this._num("cavity_temperature");
    const target = this._num("target_temperature");
    if (cavity !== undefined && target !== undefined) parts.push(`${Math.round(cavity)} / ${Math.round(target)} °C`);
    else if (cavity !== undefined) parts.push(`${Math.round(cavity)} °C`);

    const core = this._num("core_temperature");
    const coreTarget = this._num("core_target_temperature");
    if (core !== undefined && coreTarget !== undefined && coreTarget > 0) {
      parts.push(`${t.core} ${Math.round(core)} / ${Math.round(coreTarget)} °C`);
    }

    const showElapsed = this._config.show_elapsed !== undefined ? this._config.show_elapsed : profile.elapsed;
    const elapsed = this._num("elapsed_minutes");
    if (showElapsed && elapsed !== undefined) parts.push(fmtDuration(elapsed));

    if (this._valid("program_phase")) parts.push(this._label("program_phase"));
    if (this._valid("drying_step")) parts.push(this._label("drying_step"));

    const rem = remainingTime(this._hass, this._map);
    if (rem) {
      parts.push(`${fmt(t.remaining, { d: fmtDuration(rem.minutes) })} (${fmt(t.until, { t: fmtClock(this._hass, rem.finish) })})`);
    }
    return parts;
  }
}


// ----------------------------------------------------------- overview card

const RING_R = 20.5;
const RING_C = 2 * Math.PI * RING_R;

// Only numbers go into this markup; colours come from CSS (--miele-color)
function ringSvg(progress) {
  let arc = "";
  if (progress !== undefined) {
    const p = Math.min(100, Math.max(0, progress));
    const offset = (RING_C * (1 - p / 100)).toFixed(2);
    arc = `<circle class="arc" cx="22" cy="22" r="${RING_R}" stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="${offset}" transform="rotate(-90 22 22)"></circle>`;
  }
  return `<svg class="ring-svg" viewBox="0 0 44 44" width="44" height="44"><circle class="track" cx="22" cy="22" r="${RING_R}"></circle>${arc}</svg>`;
}

// "abc123" -> { device }, "sensor.x" -> { entity }, objects stay as they are
function normalizeItem(entry) {
  if (typeof entry === "string") return entry.indexOf(".") > 0 ? { entity: entry } : { device: entry };
  if (entry && typeof entry === "object") {
    if (entry.entities && typeof entry.entities !== "object") {
      throw new Error("'entities' must be a mapping of role: entity_id");
    }
    return { ...entry };
  }
  throw new Error("Each entry under 'devices' needs a device or an entity");
}

class MieleOverviewCard extends MieleBase {
  static getConfigElement() {
    return document.createElement("miele-overview-card-editor");
  }

  static getStubConfig(hass) {
    try {
      const ents = Object.values((hass && hass.entities) || {});
      const devs = Object.values((hass && hass.devices) || {}).filter((d) =>
        ents.some((e) => e.device_id === d.id && e.platform === DOMAIN)
      );
      return { devices: devs.slice(0, 4).map((d) => d.id) };
    } catch (e) {
      console.error("miele-overview-card: getStubConfig failed", e);
      return { devices: [] };
    }
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._tag = "miele-overview-card";
    this._signature = "";
    this._items = [];
    this._caches = [];
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    if (config.devices !== undefined && !Array.isArray(config.devices)) {
      throw new Error("'devices' must be a list of appliances");
    }
    this._items = (config.devices || []).map(normalizeItem);
    this._config = { ...config };
    this._caches = this._items.map(() => ({}));
    this._signature = "";
    this._build();
    if (this._hass) this._safeUpdate();
  }

  getCardSize() {
    return 2;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  getLayoutOptions() {
    return { grid_columns: 4, grid_rows: 2 };
  }

  _build() {
    this._warning = false;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; }
        ha-card {
          height: 100%;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .tiles { display: flex; flex-wrap: wrap; }
        .tile {
          box-sizing: border-box;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 12px 4px 10px;
          cursor: pointer;
          border-left: var(--sep, 0) solid var(--divider-color, rgba(127, 127, 127, 0.2));
        }
        .tile[hidden] { display: none; }
        .ring { position: relative; flex: none; width: 44px; height: 44px; }
        .ring-svg { position: absolute; left: 0; top: 0; display: block; }
        .track { fill: none; stroke-width: 3; stroke: rgba(127, 127, 127, 0.2); }
        .arc {
          fill: none;
          stroke-width: 3;
          stroke-linecap: round;
          stroke: var(--miele-color);
          transition: stroke-dashoffset 400ms ease-in-out;
        }
        .icon {
          --mdc-icon-size: 22px;
          position: absolute;
          left: 5px;
          top: 5px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--miele-color);
          background: rgba(127, 127, 127, 0.12);
          background: color-mix(in srgb, var(--miele-color) 20%, transparent);
        }
        .name, .value, .sub {
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .name {
          margin-top: 6px;
          font-size: var(--ha-font-size-s, 12px);
          line-height: 16px;
          color: var(--secondary-text-color);
        }
        .value {
          font-size: var(--ha-font-size-m, 14px);
          font-weight: var(--ha-font-weight-medium, 500);
          line-height: 20px;
          color: var(--primary-text-color);
        }
        .sub {
          min-height: 14px;
          font-size: 11px;
          line-height: 14px;
          color: var(--secondary-text-color);
        }
        .footer {
          padding: 8px 12px;
          font-size: var(--ha-font-size-s, 12px);
          line-height: 16px;
          text-align: center;
          color: var(--secondary-text-color);
          border-top: var(--sep, 1px) solid var(--divider-color, rgba(127, 127, 127, 0.2));
        }
        .footer[hidden] { display: none; }
      </style>
      <ha-card>
        <div class="tiles"></div>
        <div class="footer" hidden></div>
      </ha-card>
    `;
    const tilesEl = this.shadowRoot.querySelector(".tiles");
    this._tiles = this._items.map((item, i) => {
      const el = (tag, cls) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        return e;
      };
      const tile = {
        root: el("div", "tile"),
        ringBox: el("div", "ring"),
        ring: el("div"),
        iconBox: el("div", "icon"),
        icon: el("ha-icon"),
        name: el("div", "name"),
        value: el("div", "value"),
        sub: el("div", "sub"),
      };
      tile.iconBox.appendChild(tile.icon);
      tile.ringBox.appendChild(tile.ring);
      tile.ringBox.appendChild(tile.iconBox);
      tile.root.appendChild(tile.ringBox);
      tile.root.appendChild(tile.name);
      tile.root.appendChild(tile.value);
      tile.root.appendChild(tile.sub);
      tile.root.addEventListener("click", () => this._moreInfoFor(this._entries && this._entries[i].map && this._entries[i].map.status));
      tilesEl.appendChild(tile.root);
      return tile;
    });
    this._els = {
      card: this.shadowRoot.querySelector("ha-card"),
      footer: this.shadowRoot.querySelector(".footer"),
    };
  }

  _resolve(item, i) {
    const hass = this._hass;
    const deviceId = deviceIdFor(hass, item);
    const device = deviceId && hass.devices ? hass.devices[deviceId] : undefined;
    if (!deviceId) return { item, problem: "no_device" };
    if (hass.devices && !device) return { item, problem: "device_missing" };
    const map = cachedEntities(this._caches[i], hass, deviceId, item);
    if (!map.status) return { item, device, problem: "no_status" };
    return { item, device, map };
  }

  _update() {
    const hass = this._hass;
    const t = strings(hass);
    if (!this._items.length) return this._showWarning(t.no_devices);

    const entries = this._items.map((item, i) => this._resolve(item, i));
    const sig = [hass.locale && hass.locale.language]
      .concat(entries.map((e) => (e.map ? stateSignature(hass, e.map) : e.problem)))
      .join("#");
    if (sig === this._signature) return;
    this._signature = sig;
    if (this._warning) this._build();
    this._entries = entries;

    const hideOff = this._config.hide_off === true;
    const visible = [];
    const offNames = [];
    entries.forEach((entry, i) => {
      const view = this._view(entry, t);
      const hide = hideOff && (view.mode === "off" || view.mode === "unavailable");
      this._tiles[i].root.hidden = hide;
      if (hide) offNames.push(view.name);
      else visible.push(i);
      this._paint(this._tiles[i], view);
    });

    const perRow = Math.max(1, Math.min(visible.length || 1, Number(this._config.columns) || 4));
    visible.forEach((idx, k) => {
      const style = this._tiles[idx].root.style;
      style.setProperty("width", `${Math.floor((10000 / perRow)) / 100}%`);
      style.setProperty("--sep", k % perRow === 0 ? "0" : "1px");
    });

    const footer = this._els.footer;
    footer.hidden = offNames.length === 0;
    footer.textContent = visible.length ? `${offNames.join(", ")} ${t.off}` : t.all_off;
    footer.style.setProperty("--sep", visible.length ? "1px" : "0");
  }

  _view(entry, t) {
    const hass = this._hass;
    const item = entry.item;
    const profileKey = profileForModel(entry.device && entry.device.model);
    const profile = PROFILES[profileKey];
    const name = applianceName(t, item, entry.device);
    const view = { mode: "off", name, icon: item.icon || profile.icon, color: "disabled", value: "", sub: "" };

    if (entry.problem) {
      return { ...view, mode: "problem", icon: "mdi:alert-circle-outline", color: "red", value: "?", sub: t[entry.problem] };
    }

    const map = entry.map;
    const mode = applianceMode(hass, map);
    const runColor = item.color || profile.color;
    const program = isValid(hass, map, "program_id") ? stateLabel(hass, map, "program_id") : "";
    view.mode = mode;

    switch (mode) {
      case "running":
      case "paused": {
        const rem = remainingTime(hass, map);
        view.color = runColor;
        view.value = rem ? fmtDuration(rem.minutes) : t.running;
        if (mode === "paused") view.sub = t.paused;
        else view.sub = rem ? fmt(t.until, { t: fmtClock(hass, rem.finish) }) : program;
        if (item.show_progress !== false) view.progress = readNum(hass, map, "progress");
        break;
      }
      case "scheduled": {
        const startIn = readNum(hass, map, "start_in_minutes");
        view.color = runColor;
        if (startIn !== undefined) {
          view.value = fmtClock(hass, new Date(Date.now() + startIn * 60000));
          view.sub = fmt(t.start_in, { d: fmtDuration(startIn) });
        } else {
          view.value = program || t.on;
        }
        break;
      }
      case "finished": {
        view.color = "green";
        view.value = t.finished;
        view.sub = item.finished_text || t.profiles[profileKey][1];
        view.progress = 100;
        break;
      }
      case "error": {
        view.color = "red";
        view.value = t.error;
        view.sub = stateLabel(hass, map, "status");
        break;
      }
      case "ready": {
        view.color = null;
        view.value = t.on;
        view.sub = program;
        break;
      }
      case "unavailable": {
        view.value = t.offline;
        break;
      }
      default: {
        view.value = t.off;
      }
    }
    return view;
  }

  _paint(tile, view) {
    tile.root.style.setProperty("--miele-color", colorVar(view.color));
    tile.icon.setAttribute("icon", view.icon);
    tile.name.textContent = view.name;
    tile.root.title = `${view.name}: ${view.value}${view.sub ? ` · ${view.sub}` : ""}`;
    tile.value.textContent = cap(view.value);
    tile.sub.textContent = view.sub || "";
    tile.ring.innerHTML = ringSvg(view.progress);
  }
}

// -------------------------------------------------------------------- editor

class MieleCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
  }

  setConfig(config) {
    this._config = { ...config };
    this._fillRequired();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._fillRequired();
    this._render();
  }

  // Write the device into the config as soon as it is known (e.g. YAML with
  // only `entity:`), independent of ha-form being loaded.
  _fillRequired() {
    if (!this._hass || this._config.device || !this._config.entity) return;
    const ent = this._hass.entities && this._hass.entities[this._config.entity];
    if (!ent || !ent.device_id) return;
    this._config = { ...this._config, device: ent.device_id };
    this._emit(this._config);
  }

  _emit(config) {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  connectedCallback() {
    this._ensureForm();
  }

  async _ensureForm() {
    if (customElements.get("ha-form")) return;
    // ha-form is loaded lazily by HA; loading the editor of a built-in card pulls it in.
    try {
      const helpers = await window.loadCardHelpers();
      const card = await helpers.createCardElement({ type: "button", entity: "sun.sun" });
      if (card && card.constructor && card.constructor.getConfigElement) {
        await card.constructor.getConfigElement();
      }
    } catch (e) {
      /* ignore – the form will appear once ha-form is defined */
    }
    await customElements.whenDefined("ha-form");
    this._render();
  }

  _schema() {
    return [
      { name: "device", required: true, selector: { device: { integration: DOMAIN } } },
      { name: "name", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "icon", selector: { icon: {} } },
          { name: "color", selector: { ui_color: {} } },
        ],
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "show_elapsed", selector: { boolean: {} } },
          { name: "show_progress", selector: { boolean: {} } },
        ],
      },
      { name: "finished_text", selector: { text: {} } },
    ];
  }

  _render() {
    if (!this._hass || !customElements.get("ha-form")) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => strings(this._hass).editor[s.name] || s.name;
      this._form.addEventListener("value-changed", (ev) => this._onFormValue(ev.detail.value));
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    this._form.data = this._formData();
  }

  _formData() {
    const device = this._config.device && this._hass.devices ? this._hass.devices[this._config.device] : undefined;
    const profile = PROFILES[profileForModel(device && device.model)];
    return { show_progress: true, show_elapsed: profile.elapsed, ...this._config };
  }

  _onFormValue(value) {
    const config = { ...value };
    for (const k of Object.keys(config)) {
      if (config[k] === "" || config[k] === undefined) delete config[k];
    }
    this._config = config;
    this._emit(config);
  }
}

// The device picker only knows device IDs; options set in YAML per appliance
// (name, icon, ...) are kept for appliances that stay in the list.
class MieleOverviewCardEditor extends MieleCardEditor {
  _fillRequired() {}

  _deviceIdOf(entry) {
    try {
      return deviceIdFor(this._hass || {}, normalizeItem(entry));
    } catch (e) {
      return undefined;
    }
  }

  _schema() {
    return [
      { name: "devices", required: true, selector: { device: { integration: DOMAIN, multiple: true } } },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "columns", selector: { number: { min: 1, max: 6, mode: "box" } } },
          { name: "hide_off", selector: { boolean: {} } },
        ],
      },
    ];
  }

  _formData() {
    const ids = (this._config.devices || []).map((e) => this._deviceIdOf(e)).filter(Boolean);
    return { ...this._config, devices: ids };
  }

  _onFormValue(value) {
    const old = this._config.devices || [];
    const devices = (value.devices || []).map((id) => {
      const keep = old.find((e) => this._deviceIdOf(e) === id);
      return keep !== undefined ? keep : id;
    });
    const config = { ...this._config, ...value, devices };
    for (const k of Object.keys(config)) {
      if (config[k] === "" || config[k] === undefined || config[k] === null) delete config[k];
    }
    this._config = config;
    this._emit(config);
  }
}

if (!customElements.get("miele-card")) customElements.define("miele-card", MieleCard);
if (!customElements.get("miele-card-editor")) customElements.define("miele-card-editor", MieleCardEditor);
if (!customElements.get("miele-overview-card")) customElements.define("miele-overview-card", MieleOverviewCard);
if (!customElements.get("miele-overview-card-editor")) {
  customElements.define("miele-overview-card-editor", MieleOverviewCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "miele-card")) {
  window.customCards.push({
    type: "miele-card",
    name: "Card for Miele@LAN",
    description: "Status, program and remaining time of a Miele@LAN appliance",
    preview: true,
    documentationURL: "https://github.com/yannick80/ha-card-for-miele",
  });
}
if (!window.customCards.some((c) => c.type === "miele-overview-card")) {
  window.customCards.push({
    type: "miele-overview-card",
    name: "Overview card for Miele@LAN",
    description: "Several Miele@LAN appliances side by side: time left, start time or state",
    preview: true,
    documentationURL: "https://github.com/yannick80/ha-card-for-miele#overview-card",
  });
}

console.info(`%c miele-card %c ${VERSION} `, "color:#fff;background:#555;font-weight:700", "color:#555;background:#eee");

// Test hook: only active when evaluated with a CommonJS-style `module` (node tests)
if (typeof module !== "undefined" && module && module.exports) {
  module.exports = { MieleCard: MieleCard, MieleCardEditor: MieleCardEditor, MieleOverviewCard: MieleOverviewCard,
    profileForModel: profileForModel,
    fmtDuration: fmtDuration, colorVar: colorVar };
}
})();
