# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow
[Semantic Versioning](https://semver.org/).

## 1.1.0 - 2026-11-24

### Added

- Overview card (`custom:miele-overview-card`): several appliances side by
  side, each with the most important value (time left, start time, finished,
  fault, off) and a progress ring around the icon. Tap an appliance to open
  its status. Options `columns` and `hide_off` (appliances that are off are
  listed in one line); per-appliance `name`, `icon`, `color` and more. Visual
  editor with a multi-device picker. Same file, no extra resource needed.

### Changed

- The single card and the overview card share the code that finds an
  appliance's sensors and derives its state.

## 1.0.0
Initial Release

## 1.0.1
Fix repo urls