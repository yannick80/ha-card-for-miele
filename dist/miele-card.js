/**
 * Card for Miele@LAN – a Home Assistant dashboard card for appliances connected
 * through the Miele@LAN integration. Not affiliated with Miele & Cie. KG.
 * https://github.com/yannick80/ha-miele-card
 *
 * Plain custom element, no build step and no dependencies. Entities are found
 * through the device registry and their translation_key, so the card works
 * independently of the language the integration was set up in and of any
 * renamed entity IDs.
 */

(function () {
"use strict";

const VERSION = "0.1.0";
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

class MieleCard extends HTMLElement {
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
    this._signature = "";
    this._entityCache = null;
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    if (config.entities && typeof config.entities !== "object") {
      throw new Error("'entities' must be a mapping of role: entity_id");
    }
    this._config = { ...config };
    this._entityCache = null;
    this._signature = "";
    this._build();
    if (this._hass) this._safeUpdate();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config) this._safeUpdate();
  }

  _safeUpdate() {
    try {
      this._update();
    } catch (e) {
      console.error("miele-card: render failed", e);
      this._showWarning(`miele-card: ${(e && e.message) || e}`);
    }
  }

  get hass() {
    return this._hass;
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
    const c = this._config;
    if (c.device) return c.device;
    const ent = c.entity && this._hass.entities && this._hass.entities[c.entity];
    return ent ? ent.device_id : undefined;
  }

  _entities() {
    const hass = this._hass;
    const deviceId = this._deviceId();
    const key = `${deviceId}|${Object.keys(hass.entities || {}).length}|${JSON.stringify(this._config.entities || {})}`;
    if (this._entityCache && this._entityCache.key === key && this._entityCache.registry === hass.entities) {
      return this._entityCache.map;
    }
    const map = {};
    for (const e of Object.values(hass.entities || {})) {
      if (e.device_id !== deviceId || e.platform !== DOMAIN) continue;
      if (!e.entity_id.startsWith("sensor.") || !e.translation_key) continue;
      if (ROLES.includes(e.translation_key) && !map[e.translation_key]) map[e.translation_key] = e.entity_id;
    }
    if (this._config.entity && !map.status) map.status = this._config.entity;
    Object.assign(map, this._config.entities || {});
    this._entityCache = { key, registry: hass.entities, map };
    return map;
  }

  _state(role) {
    const id = this._map[role];
    return id ? this._hass.states[id] : undefined;
  }

  _valid(role) {
    const s = this._state(role);
    return !!s && !EMPTY.has(String(s.state).toLowerCase());
  }

  _num(role) {
    if (!this._valid(role)) return undefined;
    const n = parseFloat(this._state(role).state);
    return Number.isFinite(n) ? n : undefined;
  }

  _label(role) {
    const s = this._state(role);
    if (!s) return "";
    if (typeof this._hass.formatEntityState === "function") {
      try {
        return this._hass.formatEntityState(s);
      } catch (e) {
        /* fall through */
      }
    }
    const ent = this._hass.entities && this._hass.entities[s.entity_id];
    if (ent && ent.translation_key && typeof this._hass.localize === "function") {
      const txt = this._hass.localize(
        `component.${DOMAIN}.entity.sensor.${ent.translation_key}.state.${s.state}`
      );
      if (txt) return txt;
    }
    const raw = String(s.state).replace(/_/g, " ");
    return raw.charAt(0).toUpperCase() + raw.slice(1);
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
    const entityId = this._map && this._map.status;
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true })
    );
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
    const sig = [
      hass.locale && hass.locale.language,
      ...Object.values(this._map).map((id) => {
        const s = hass.states[id];
        return s ? `${s.state}|${s.last_changed}` : "-";
      }),
    ].join(";");
    if (sig === this._signature) return;
    this._signature = sig;

    const profileKey = profileForModel(device && device.model);
    const profile = PROFILES[profileKey];
    const [profileName, profileDone] = t.profiles[profileKey];
    const name =
      this._config.name ||
      profileName ||
      (device && (device.name_by_user || device.name)) ||
      "Miele";

    const statusObj = this._state("status");
    const status = statusObj ? String(statusObj.state) : "unavailable";
    let mode = MODE_BY_STATUS[status] || "off";
    if (status === "unavailable" || status === "unknown" || status === "not_connected") mode = "unavailable";
    if (status === "programmed" && (this._num("start_in_minutes") || 0) > 0) mode = "scheduled";

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

    let remaining = this._num("remaining_minutes");
    let finish;
    if (this._valid("finish_time")) {
      const d = new Date(this._state("finish_time").state);
      if (!Number.isNaN(d.getTime())) finish = d;
    }
    if (remaining === undefined && finish) remaining = Math.ceil((finish.getTime() - Date.now()) / 60000);
    if (remaining !== undefined && remaining > 0) {
      if (!finish) finish = new Date(Date.now() + remaining * 60000);
      parts.push(`${fmt(t.remaining, { d: fmtDuration(remaining) })} (${fmt(t.until, { t: fmtClock(this._hass, finish) })})`);
    }
    return parts;
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
      this._form.addEventListener("value-changed", (ev) => {
        const config = { ...ev.detail.value };
        for (const k of Object.keys(config)) {
          if (config[k] === "" || config[k] === undefined) delete config[k];
        }
        this._config = config;
        this._emit(config);
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    const device = this._config.device && this._hass.devices ? this._hass.devices[this._config.device] : undefined;
    const profile = PROFILES[profileForModel(device && device.model)];
    this._form.data = { show_progress: true, show_elapsed: profile.elapsed, ...this._config };
  }
}

if (!customElements.get("miele-card")) customElements.define("miele-card", MieleCard);
if (!customElements.get("miele-card-editor")) customElements.define("miele-card-editor", MieleCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "miele-card")) {
  window.customCards.push({
    type: "miele-card",
    name: "Card for Miele@LAN",
    description: "Status, program and remaining time of a Miele@LAN appliance",
    preview: true,
    documentationURL: "https://github.com/yannick80/ha-miele-card",
  });
}

console.info(`%c miele-card %c ${VERSION} `, "color:#fff;background:#555;font-weight:700", "color:#555;background:#eee");

// Test hook: only active when evaluated with a CommonJS-style `module` (node tests)
if (typeof module !== "undefined" && module && module.exports) {
  module.exports = { MieleCard: MieleCard, MieleCardEditor: MieleCardEditor, profileForModel: profileForModel,
    fmtDuration: fmtDuration, colorVar: colorVar };
}
})();
