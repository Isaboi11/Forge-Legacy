repo: Isaboi11/Forge-Legacy
branch: main

## Last sync
date: 2026-08-10T20:22:34Z

### Updated in this project
- Read the program domain model (`ProgramDefinition`, blocks → A/B/C/D workouts, `ExercisePrescription`) before designing the coach Programs screen.
- Confirmed the coach profile's Program tab does not match the app's authored format — weekday columns and prescribed loads are not in the schema.
- Built the Forge Coach desktop wireframe map and the hi-fi Check-in Review / Roster / Client Profile screen.

## Screen map
| Project screen | Repo files |
| --- | --- |
| Forge Coach Wireframes.dc.html | Docs/FORGE_LEGACY_PRODUCT_DNA.md, src/constants/foundation.ts |
| Forge Coach Check-in Review.dc.html — Today, Roster, Client Profile | src/constants/foundation.ts, Docs/FORGE_LEGACY_PRODUCT_DNA.md |
| Forge Coach Check-in Review.dc.html — Program tab (needs rework) | src/domain/training/schema.ts, src/domain/training/active-program-core.ts, src/data/programs-live.ts, src/app/program-builder.tsx, src/components/forge/cards/ProgramCard.tsx |

## Sync history
- 2026-08-10T17:40:24Z — initial association; read product DNA + visual foundation.
