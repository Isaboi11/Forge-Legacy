# Forge Legacy — Architecture Amendment 001
## Program / Chapter Import
### Status: Approved | MVP | Locked | June 2026

**Amendment Authority:** Product decision, locked.
**PRD Integration:** This amendment is incorporated into the Forge Legacy Master PRD v1.0 as an extension of Section 8 (Workout System) and Section 5 (MVP Definition). All references to import as Post-MVP or Future Roadmap are superseded by this amendment.

---

## Section 1 — Feature Summary

Program / Chapter Import enables athletes to bring existing training systems into Forge Legacy without manual recreation.

Athletes who have been training for months or years often maintain training records in external formats: Excel spreadsheets, Google Sheets, CSV exports from other apps, or coach-provided programs. Forcing these athletes to recreate their training from scratch inside Forge Legacy is a barrier to adoption and a failure of the product's core promise.

**The product's mission is to help athletes preserve their fitness journey.** That journey did not begin when the athlete downloaded Forge Legacy. Import is the mechanism that allows athletes to honor their training history — and to structure their future training — using systems they have already built.

**What import enables:**
- An athlete with a 12-week coach program in a spreadsheet can import it directly as a Forge Legacy Program
- An athlete beginning a new chapter can bring their existing training template as that chapter's foundation
- Existing training systems are respected, not discarded

**What import does not do:**
- Import does not automatically name chapters or infer goals — the athlete declares those
- Import does not parse unstructured documents (PDFs, images) — structured formats only
- Import does not apply AI interpretation to any content — reliable parsing over intelligent guessing

---

## Section 2 — User Flow Summary

### 2.1 Program Import Flow

```
Upload File (W-IM-1)
        ↓
File parsed — structured data extracted
        ↓
Import Review & Destination (W-IM-2)
  · Parsed program structure shown
  · Athlete selects: "Create Program"
        ↓
Import Confirm (W-IM-4)
  · Final review of what will be created
  · Athlete taps "Create Program"
        ↓
Program Created → navigates to W-3 Program Detail
```

### 2.2 Chapter Import Flow

```
Upload File (W-IM-1)
        ↓
File parsed — structured data extracted
        ↓
Import Review & Destination (W-IM-2)
  · Parsed program structure shown
  · Athlete selects: "Create Chapter"
        ↓
Chapter Setup (W-IM-3)
  · Athlete enters: Chapter Name (required)
  · Athlete enters: Primary Goal (required)
  · System does not infer either field
        ↓
Import Confirm (W-IM-4)
  · Final review: chapter name + goal + imported structure
  · Athlete taps "Create Chapter"
        ↓
Chapter Created → navigates to L-3 Chapter Detail (Active)
```

### 2.3 Entry Points

Import is accessible from three entry points:

1. **W-1 Workouts Hub** — "Import Training" Secondary CTA below the Log Activity Entry Point
2. **W-2 Programs Browse** — "Import a Program" option within the Programs library
3. **L-5 Create Chapter** — "Import from existing training" option within the chapter creation flow

All three entry points navigate to W-IM-1 Import Upload.

### 2.4 Parse Failure State

If the uploaded file cannot be parsed (unsupported structure, empty file, unrecognized format), the athlete receives a clear failure state within W-IM-1 or W-IM-2:
- Specific, actionable error message
- Guidance on supported formats (CSV, XLSX, structured tables)
- Option to upload a different file or switch to manual creation

No data is saved to the system on a parse failure. The athlete returns to the upload step.

### 2.5 Supported Input Formats

| Format | Description |
|--------|-------------|
| CSV | Comma-separated values — standard export from most spreadsheet tools |
| XLSX | Excel workbook format — single-sheet and multi-sheet workbooks accepted |
| Structured copy/paste | Tabular data pasted directly into a text input — Forge Legacy parses the table structure |

**Not supported in MVP:** PDF, image files (JPG, PNG, HEIC), plain text without tabular structure, proprietary app formats.

---

## Section 3 — Architecture Impact Summary

### 3.1 New Screens (W-IM-1 through W-IM-4)

| Screen ID | Name | Description |
|-----------|------|-------------|
| W-IM-1 | Import Upload | File picker (CSV/XLSX) + structured paste input. Supported formats displayed. Parse failure handled here. |
| W-IM-2 | Import Review & Destination | Displays parsed structure. Athlete selects destination: "Create Program" or "Create Chapter." |
| W-IM-3 | Chapter Setup | Conditional — Chapter path only. Athlete enters Chapter Name (required) and Primary Goal (required). System provides no inference. |
| W-IM-4 | Import Confirm | Final review screen for both paths. Shows what will be created, its name, its structure. Confirm CTA initiates creation. |

### 3.2 New Navigation Paths

| From | Action | To |
|------|--------|----|
| W-1 Workouts Hub | "Import Training" Secondary CTA | W-IM-1 |
| W-2 Programs Browse | "Import a Program" | W-IM-1 |
| L-5 Create Chapter | "Import from existing training" | W-IM-1 |
| W-IM-4 (Program confirm) | "Create Program" | W-3 Program Detail |
| W-IM-4 (Chapter confirm) | "Create Chapter" | L-3 Chapter Detail (Active) |

### 3.3 Impact on Existing Screens

**W-1 Workouts Hub:**
"Import Training" Secondary CTA added below the quick-select row in the Log Activity Entry Point section. Not Primary — does not compete with "Log Activity." Present in all W-1 states.

**W-2 Programs Browse:**
"Import a Program" option added within the Programs library as an alternative to Browse and Create.

**L-5 Create Chapter:**
"Import from existing training" option added as a creation path alongside manual chapter creation. Chapter Name and Primary Goal are always athlete-entered in W-IM-3 — never inferred.

**W-1 Workouts Hub Wireframe Spec (approved):**
The approved W-1 spec requires a minor amendment to document the "Import Training" Secondary CTA in Section 5 (Log Activity Entry Point). This does not alter W-1's core structure or hierarchy. The amendment is documented here and applied to the spec.

### 3.4 Screen Count Impact

| Area | Previous Count | New Count | Delta |
|------|---------------|-----------|-------|
| Workouts | 20 | 24 | +4 |
| **Total MVP** | **~76** | **~80** | **+4** |

### 3.5 Data Architecture Notes

**Program import produces:**
- A user-owned program (equivalent to a created or forked program)
- Program name sourced from the imported file's structure or athlete-edited on W-IM-4
- Version: v1.0 (original — not a fork of any existing Forge Legacy program)
- No external source reference retained after creation — the program is fully owned by the athlete

**Chapter import produces:**
- A new active chapter (equivalent to L-5 Create Chapter)
- Chapter Name: athlete-entered in W-IM-3 — never inferred by the system
- Primary Goal: athlete-entered in W-IM-3 — never inferred by the system
- The imported training becomes the chapter's initial program structure

**Imported content ownership:**
All imported programs and chapters are fully owned by the importing athlete. Import creates new records — not references to external sources.

---

## Section 4 — MVP Scope Definition

### 4.1 Approved for MVP

| Feature | Status |
|---------|--------|
| CSV import | ✓ MVP |
| XLSX import | ✓ MVP |
| Structured copy/paste table input | ✓ MVP |
| Program creation from import | ✓ MVP |
| Chapter creation from import | ✓ MVP |
| Athlete-defined chapter name and goal | ✓ MVP (required, never inferred) |
| Parse failure handling with actionable error | ✓ MVP |
| Review step before creation | ✓ MVP (always required) |
| Multi-sheet XLSX: athlete selects sheet | ✓ MVP |

### 4.2 Not in MVP Scope

| Feature | Reason Deferred |
|---------|-----------------|
| PDF imports | Document parsing complexity; requires OCR or structured extraction |
| Image imports (JPG, PNG, HEIC) | Computer vision / OCR complexity |
| AI program extraction | Explicitly post-MVP |
| AI chapter generation | Explicitly post-MVP |
| Goal inference | Chapter Name and Primary Goal are athlete-declared — system never infers |
| Chapter naming suggestions | Would introduce AI dependency; deferred |
| Import from third-party apps (Strava, Apple Health) | Third-party API complexity — separate Import History feature (OB-4B path) |
| Bulk import (multiple programs at once) | Not needed for MVP |

### 4.3 MVP Import Principles (Locked)

**Import First, Automate Later:**
The MVP focuses on reliable parsing of structured formats. No AI interpretation. No inference. What the file contains is what the athlete reviews.

**Athlete Intent Is Explicit:**
Chapter Name and Primary Goal are always athlete-entered. The import system never guesses what a chapter is about.

**Review Before Creation:**
No program or chapter is created without the athlete explicitly reviewing the parsed structure and confirming creation. Pipeline: Upload → Parse → Review → Confirm → Create.

**Existing Training Has Value:**
Forge Legacy does not require athletes to abandon or recreate their existing training systems. Import honors the work already done.

---

## Section 5 — Future Enhancement Notes

These items are not MVP and should not be referenced in current wireframes.

**PDF Import:**
Many coaches deliver programs as PDFs. PDF import would significantly expand the athlete addressable market. Requires reliable structured extraction from unstructured documents — a non-trivial parsing challenge. Post-MVP.

**Image Import:**
Screenshots of training tables from other apps, photos of printed programs. Requires OCR or vision model parsing. Post-MVP.

**AI Program Extraction:**
AI interpretation of loosely structured or narrative content ("3 sets of bench press, 4 sets of squats..."). Would allow import of formats beyond tabular CSV/XLSX. Post-MVP, dependent on AI features approval (PRD Section 20).

**AI Chapter Generation:**
AI proposes a chapter name and primary goal based on the imported content. Athletes still confirm. Post-MVP. Chapter identity is intentional and personal — automated suggestion is a product experience decision to be made carefully.

**Goal Inference:**
System suggests a primary goal based on the imported program's structure. Athletes confirm or override. Post-MVP.

**Import History Integration:**
Third-party app connections (Strava, Apple Health, MyFitnessPal) for historical workout data import — distinct from Program/Chapter Import. Already documented in PRD Section 5 as Post-MVP (OB-4B path).

**Bulk Import:**
Import multiple programs simultaneously. Post-MVP — single-program import covers the primary use case at launch.

---

---

## Section 6 — WS-A6: Workout Structure Alignment

**Applied: June 2026 (Workout Structure Amendment 001)**

Imported programs use the section-first data model defined in W-24 § 7.6 (WS-A1 applied) and W-4 Decision 2 (WS-A5 applied).

**Import section mapping (MVP):**
All exercises parsed from an imported file are placed in the MAIN section of each workout slot:

```
Imported slot → ProgramSlot {
  sections: [
    { type: 'MAIN', exercises: [...all parsed exercises...] }
  ]
}
```

No WARM_UP or COOL_DOWN sections are created during import. Optional sections are the athlete's domain — the system does not infer workout structure from file contents.

**Rationale:** Structure inference (detecting which exercises are warm-up vs. main work from a spreadsheet) is unreliable and creates false structure. Imported programs land with clean MAIN-section-only structure. Athletes who want section organization can use W-24 to add Warm-Up and Cool-Down sections after import.

This behavior is consistent with the "Option A" decision from Workout Structure Amendment 001: imports create self-contained flat-MAIN slots; athlete curates structure.

---

*Forge Legacy Architecture Amendment 001 — Program / Chapter Import*
*Status: Approved | MVP | Locked | June 2026*
*WS-A6 applied June 2026: imported exercises map to MAIN section; no optional sections created at import time.*
*This amendment is incorporated into the Forge Legacy Master PRD v1.0. All wireframe and implementation work should treat this feature as locked MVP scope.*
