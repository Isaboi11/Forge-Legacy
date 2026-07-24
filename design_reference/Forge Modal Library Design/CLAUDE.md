# Forge Legacy — project notes

## Design system
Use the bound **Forge Legacy Visual Foundation** (`ForgeLegacyVisualFoundation_5368b2`, `_ds/forge-legacy-use-this-5368b220-…`). Compose its components (Card, ListRow, ProgressBar, Insignia, TimelineRow, Pill, StatBlock, Avatar, Button, Modal, BottomSheet, Toast, Skeleton, …) and style against its `--fl-*` foundation tokens. Do not reintroduce the old `--fl-color-* / --fl-space-* / --fl-type-* / --fl-radius-image` token names — those are from a superseded system.

## Runtime shims are not production patterns
Some DCs defer mounting a component-heavy grid behind a `ready`-state gate flipped in `componentDidMount`. This is a **Claude Design preview-runtime stability shim only** — it sidesteps first-paint mount races in the preview. Do **not** carry this pattern into production/app code: real components should mount normally, and a gate should be added only when there is an actual hydration or render-order problem.
