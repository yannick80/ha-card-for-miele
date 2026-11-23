# AGENTS.md – ha-card-for-miele

Dashboard card for [Miele@LAN](https://github.com/tiehfood/ha-miele-at-lan)
appliances, distributed through HACS as a **Dashboard** (plugin) repository.
It is not shipped inside the integration.

## Working agreement

- Work on a feature branch. Commit locally, never push. Push, tags on remotes
  and GitHub releases only on explicit request.
- Commit as the agent with the attribution trailers the session provides.
- Release = two commits: the change, then `vX.Y.Z -- <summary>` that bumps
  `VERSION` in `dist/miele-card.js` and moves the CHANGELOG entry from
  *Unreleased* to the new version. Annotated tag `vX.Y.Z` locally.
  The release workflow refuses a tag that does not match `VERSION`.
- Semver: feature = minor, fix = patch.
- TDD: every bug gets a regression test that fails on the old code (check it).
- Never claim "tested in Home Assistant" when only the node tests and a
  mocked browser ran.

## Project structure

```
dist/miele-card.js          the card (single file, no build step, no deps)
tests/card.test.mjs         node tests (vm + minimal DOM stub)
hacs.json                   HACS metadata (filename, min. HA version)
.github/workflows/          validate.yml (HACS, syntax, tests), release.yml
docs/                       preview.html + render-previews.sh -> README images
README.md, CHANGELOG.md, LICENSE
```

## Card rules

- Whole file in `(function () { … })();`, syntax ≤ ES2019 (no `?.`, `??`,
  logical assignment, `.at()`, `replaceAll`, `#private`).
- Every `color-mix()` has a plain fallback declaration directly before it;
  no flex/grid `gap`, no `inset`.
- Registration guarded (`customElements.get`, `window.customCards` by type).
- Render errors are caught and shown in the card (`_safeUpdate`).
- Server/user strings only via `textContent`.
- Entities are resolved via `hass.entities` (device_id + platform
  `miele_lan` + `translation_key`), never by entity ID patterns. Users can
  override single roles with `entities:`.
- No silent defaults: without a device the card shows a hint.
- State labels: `hass.formatEntityState`, fallback
  `hass.localize("component.miele_lan.entity.sensor.<key>.state.<state>")`.
- Editor: load `ha-form` via `loadCardHelpers()` before use; write the device
  into the config as soon as it is known, independent of `ha-form`.

## Tests

`node --test tests/*.mjs` covers:

- the card file evaluated twice as a classic script in one shared context;
- source scan for syntax newer than ES2019, function scope wrapper,
  `color-mix()` fallbacks, no `gap`/`inset`;
- hints for missing device, unknown device and missing status sensor;
- running/off/finished/unavailable rendering;
- render errors shown inside the card;
- `getCardSize`, `getGridOptions`, `getLayoutOptions`;
- `getStubConfig` returns an explicit device and never throws;
- editor works without `ha-form` and fills in the device.

Visual check: render with Playwright and mocked `ha-card`/`ha-icon` (inline
MDI SVG paths), light and dark, every state, at the real tile size (6 of 12
columns ≈ 245 px), and once with `color-mix()` stripped.
