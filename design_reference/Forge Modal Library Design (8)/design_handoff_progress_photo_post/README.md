# Progress Photo Post — handoff bundle

Everything needed to build the Progress Photo Post screen and rewire the two entry points into it.

## Contents

```
PROMPT.md      → give this to Claude Code. 24 numbered sections, line by line.
README.md      → this file. Context, decisions, open questions.
screenshots/   → 13 captures, indexed in PROMPT.md §24.
reference/     → the design files themselves, for anything the prompt leaves ambiguous.
```

## The problem

Progress photos were sharing as one long vertical card. It reads badly in an Instagram or Facebook
feed, and the athlete had no say in how it was laid out.

## What was built

A dedicated post composer for progress photos:

- **Format** — 1:1 (1080×1080) or 4:5 (1080×1350), chosen with proportion chips above a live preview.
- **Style** — Grid (up to 4 photos on one card, column count derived from how many are selected) or
  Hero (one photo per slide, swipeable like an Instagram carousel, up to 6, with dots and a counter).
- **Photos** — all six poses from the entry, tap to include, order preserved.
- **Entry** — switch which Transformation entry you're posting from; latest is preselected.
- **On the card** — Date, Stats, Chapter, Name, Pose labels. Pose labels default off.
- **Send** — Instagram, Facebook, Save, More; primary CTA becomes `Post to {squad}` when opened from
  the squad composer.

The same rendered card goes everywhere. There is no separate in-app layout.

## Entry points

1. **Squad Composer.** `Check-in` is retired and replaced by `Progress Photos` as the first member
   post type. Selecting it skips the text form and opens this screen.
2. **Transformation entry Share.** Now opens this screen instead of Share Configuration.

Historic check-in posts still render in squad feeds — the type stays resolvable, it just can't be
authored any more.

## Decisions worth knowing

- **Bronze only.** Selection is bronze border plus bronze tint everywhere — chips, style cards, pose
  tiles, toggles. No second accent was introduced.
- **The preview is the export.** Authored once at 300pt wide and multiplied by 3.6 on export, so
  nothing has to be laid out twice.
- **Dots indicate, they don't control.** The carousel's active slide is derived from scroll position.
- **Never zero photos.** Deselecting the last one is a no-op. Over the cap, a toast — never a silent
  drop.
- **Grid keeps portrait crops honest.** `object-fit: cover`, centered; a standing figure survives a
  center crop even in a narrow 3-up cell.

## Deliberately out of scope

Then/Now comparison sharing still lives in `Forge Share Configuration` and was not touched. Per your
note, the two get merged in a later pass — this screen was built first so the merge has something to
merge into.

## Open

- **Athlete name is hardcoded** to `Ada Ridge` in the prototype. Wire to the real profile.
- **Instagram and Facebook targets** are represented with neutral glyphs, not brand marks. Swap in
  the official assets under each platform's brand guidelines before ship.
- **Six-slide Hero cap** is a judgment call, not a platform limit (Instagram allows 10). Confirm.
- **Export rendering** is specified but not implemented in the prototype — the preview is live DOM,
  not a rasterizer.
