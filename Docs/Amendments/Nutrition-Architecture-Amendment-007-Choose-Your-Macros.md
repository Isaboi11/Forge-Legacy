# Nutrition Architecture — Amendment 007: Choose which macros you see

**Status:** 🔒 LOCKED — PO, 2026-11-16 (*"For the nutrition page should we give the option to just show the macros
you want?"* → recommendation: calories always, protein / carbs / fat each switchable → *"Yes"*)
**Amends:** `Nutrition-Architecture-v1.0.md` §"Nutrition Home" (*"three macro indicators"*) · `Nutrition-Architecture-Amendment-003` NUT-A3-D1 (the Home card's macro line).
**Reads with:** `src/domain/nutrition/macro-display.ts` (the rule, tested) · `src/domain/settings/preferences.ts` (`hiddenMacros`).

Many lifters track calories and protein only. Before this change, carbs and fat showed rings whether the athlete
cared about them or not.

---

## Decisions

### NUT-A7-D1: Calories always show. Protein, carbs and fat can each be switched off.

All three may be off, which leaves a calories-only tracker. The calorie ring is the screen's main read and has no
switch.

### NUT-A7-D2: The switches live on Daily targets, under "Show on Nutrition"

Tapping the rings already opens Daily targets, so the switches go there and not on a new settings page. Each row
is a switch, saved as soon as it is tapped. The footer's "Use these targets" is for targets only and does not
save the switches.

### NUT-A7-D3: It changes what is shown, never what is stored

Every food still logs all three macros, targets still hold all three, and Holt still reads all three. Turning a
macro back on shows its full history. Recommended and Manual targets still set all three, because calories are
calculated from them.

### NUT-A7-D4: Hidden means hidden on every surface that tracks the day

| Surface | With a macro hidden |
|---|---|
| Nutrition tab | Its ring is not drawn. One or two rings keep their three-across width and are centred. With none, the row is gone and the calorie ring gets that space back on a short screen (`ringFit`). |
| Home Nutrition card | Its line and bar are not drawn. With none, the card is the calorie line alone. Holt's gap tip is about protein, so it stays quiet when protein is hidden. |
| Nutrition Details | Its row is not drawn, and the closing line never names it. With none, the "Macros · daily average" section is gone. |

**Not changed:** Food detail and the Meal Plan still show all three, because they describe a food or a plan,
not what the athlete tracks.

### NUT-A7-D5: Stored per account, free for everyone, no migration

The choice is stored as `hiddenMacros` in `profiles.app_prefs`, the same JSONB blob as `careLineUntil` and
`holtTips`. It follows the account to every device and is not tied to the phone.

- **Stored as the hidden list**, so an empty or missing value means all three show. Every athlete keeps today's
  screen on update.
- Logging is open to every signed-in athlete (0244), so this switch is free too.
- The change is app code only and ships as an OTA, with no new build.

⚠ **Known edge:** `saveAppPrefs` sanitises against the code it runs. A client still on a bundle older than this
change drops `hiddenMacros` when it saves any other preference, which brings all three back. This lasts only until
that phone takes the OTA.
