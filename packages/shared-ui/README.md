# Shared controls 1.1.0

Canonical source: the existing `@relay/shared-ui` package in `lrnolivia/ctrl`.
This begins the reusable component library with the approved CTRL Work unit
and the Green & White Media/Gallery adapter. Files is a configuration variant,
not a new file-service implementation. No package registry publication or
automatic production coupling is implied.

## Stable exports

- `work-controls.js`: `controlBarVersion`, `controlBarVariants`,
  `renderControlShell`, `renderControlChoiceGroup`, `renderControlFooter`,
  `workControlGlyph`, and the CTRL-specific `renderWorkControls`.
- `work-controls-react.jsx`: `BrowseControls`, `ControlChoiceGroup`,
  `SharedControlGlyph`. React comes from the consuming application.
- `work-controls.css`: approved inner filter/organize treatment.
- `work-controls-shell.css`: portable outer adapter for applications without
  CTRL's existing source-backed outer shell. CTRL's existing search/toggle and
  two rounded controls remain unchanged in its current shell styles.

Consumers configure search label and placeholder, view values/names/icons,
filter content, sort options, organize content/actions, and theme tokens.
`renderViewIcon(option)` lets React consumers preserve their own approved view
icons. Default Work uses Find work and list/visual. Media uses contextual
photo/video search; GW overrides it to Find a memory and retains its existing
Grid, Natural, Strip and Carousel views. File consumers use Find files and
their own authorized file actions.

The shell never loads, filters, selects, archives, deletes, saves, uploads, or
transmits domain data itself. Hosts provide state and callbacks. CTRL review
`completed` is deliberately labeled reviewed and does not complete source work.
The generic string renderer's `filterContent`/`organizeContent` slots accept
only trusted host-rendered markup, never raw user content.

## React use

Import the React adapter, optional portable shell CSS, then inner CSS, then
your scoped theme variables. Pass controlled search, onSearch, view, onView,
views, filters and organize. Set contextual labels and hints. Independent
disclosures can stay open together by default; Escape and Done close the
current disclosure and restore trigger focus. View buttons have accessible
names and pressed state. Choice groups support arrows, Home and End.

## Deliberate updates

Every consuming repository stores the exact package version, source commit
(once committed), and per-file SHA256 pins in its own manifest. During draft
recovery, the immutable private Library artifact and file hashes are the pin.
Vendor the exact source files unchanged, with product-only wrappers and tokens
outside the shared directory. Never fetch mutable main or latest at runtime.
Shared changes require a new version, reviewed consumer update, focused tests,
and exact-head visual/keyboard/mobile checks in each product before release.
Roll back by restoring the preceding manifest and exact vendor files.

This is a reconstruction of approved pixels and behavior. Historical tests do
not validate these bytes. Fresh deterministic tests are included; hosted visual
and runtime gates remain required before release.
