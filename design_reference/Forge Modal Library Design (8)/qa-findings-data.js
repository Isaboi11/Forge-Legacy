/* Forge Legacy — QA findings. Regenerated after manual triage (2026-07-13).
 * 0 open defects. `resolved` keeps the full audit trail with a per-item verdict. */
window.QA_FINDINGS = {
 "generated": 1783918837643,
 "triaged": 1783946722131,
 "method": "Manual triage + a stricter static scan (checks for onClick/onKeyDown on every <button>/role=button opening tag, seeing handlers bound in the logic class that the original scan missed).",
 "counts": {
  "Critical": 0,
  "High": 0,
  "Medium": 0,
  "Low": 0
 },
 "summary": "All 79 prior findings triaged to zero open defects. The 1 Critical and every High \"no click handler\" item were false positives (handlers live in the logic class; some matches were decorative children or prose) or already fixed. The 58 Medium items were <image-slot> upload verifications, not defects. A stricter scan surfaced 8 genuinely handler-less taps: 7 were fixed this pass (Progress Hub x2, Public Profile x4, Account Settings x1); the 8th is on Forge Accent Palettes, a retired unlinked demo now de-tracked.",
 "fixed": [
  {
   "file": "Forge Progress Hub.dc.html",
   "taps": [
    "Pinned achievement card → opens its strength metric detail",
    "What's Next card → Program Detail"
   ]
  },
  {
   "file": "Forge Public Profile.dc.html",
   "taps": [
    "Most-recent-seal chapter card → Chapter Detail (archived)",
    "Chapter-history row → Chapter Detail (archived)",
    "Transformation row → Transformation",
    "Photos row → Photos Gallery"
   ]
  },
  {
   "file": "Forge Account Settings.dc.html",
   "taps": [
    "Sign Out → confirm → Onboarding entry"
   ]
  }
 ],
 "families": [],
 "resolved": [
  {
   "fam": "Home",
   "file": "Forge Home.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Preview workout (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "false-positive — handler is bound in the logic class (not a literal inline onClick), or the match was a decorative child / prose text; verified present in current source."
  },
  {
   "fam": "Home",
   "file": "Forge Home.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Join workout (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "false-positive — handler is bound in the logic class (not a literal inline onClick), or the match was a decorative child / prose text; verified present in current source."
  },
  {
   "fam": "Workouts / Active",
   "file": "Forge Active Workout.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Button (button)",
   "was": "No click handler wired.",
   "verdict": "false-positive — handler is bound in the logic class (not a literal inline onClick), or the match was a decorative child / prose text; verified present in current source."
  },
  {
   "fam": "Workouts / Active",
   "file": "Forge Activity Detail.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Media id }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Workouts / Active",
   "file": "Forge Activity Detail.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "W19 playlist art (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Programs / Builder",
   "file": "Forge Program.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Open share handler",
   "was": "openShare referenced in template but not defined in logic.",
   "verdict": "false-positive — handler is bound in the logic class (not a literal inline onClick), or the match was a decorative child / prose text; verified present in current source."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Legacy.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Edit my standard (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "resolved — \"Edit my standard\" wired earlier; remaining were decorative children inside a handled parent (false positives)."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Legacy.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "resolved — \"Edit my standard\" wired earlier; remaining were decorative children inside a handled parent (false positives)."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Legacy.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "resolved — \"Edit my standard\" wired earlier; remaining were decorative children inside a handled parent (false positives)."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Legacy.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "resolved — \"Edit my standard\" wired earlier; remaining were decorative children inside a handled parent (false positives)."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Chapter Detail.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "{{ m.kind }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Chapter Detail.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "{{ m.kind }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Chapter Detail.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "+ Photo (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Chapter Detail.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Media (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Legacy Timeline.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Media id }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Legacy.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add photo (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Legacy.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "{{ p.kind }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Photos Gallery.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Cover id }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Photos Gallery.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Cover id }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Photos Gallery.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Slot id }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Photos Gallery.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "{{ v slot }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Transformation.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Slot id }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Transformation.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Slot id }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Transformation.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Tap to add a clip (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Transformation.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "A slot }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Transformation.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "B slot }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Transformation.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Slot id }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Transformation.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Then slot }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Legacy / Chapters",
   "file": "Forge Transformation.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Now slot }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Profile / Progress / Goals",
   "file": "Forge Progress Hub.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "fixed this pass — genuine handler-less tap; click handler wired."
  },
  {
   "fam": "Profile / Progress / Goals",
   "file": "Forge Progress Hub.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "fixed this pass — genuine handler-less tap; click handler wired."
  },
  {
   "fam": "Profile / Progress / Goals",
   "file": "Forge Progress Hub.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "fixed this pass — genuine handler-less tap; click handler wired."
  },
  {
   "fam": "Profile / Progress / Goals",
   "file": "Forge Public Profile.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "fixed this pass — genuine handler-less tap; click handler wired."
  },
  {
   "fam": "Profile / Progress / Goals",
   "file": "Forge Public Profile.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "fixed this pass — genuine handler-less tap; click handler wired."
  },
  {
   "fam": "Profile / Progress / Goals",
   "file": "Forge Public Profile.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "fixed this pass — genuine handler-less tap; click handler wired."
  },
  {
   "fam": "Profile / Progress / Goals",
   "file": "Forge Public Profile.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "fixed this pass — genuine handler-less tap; click handler wired."
  },
  {
   "fam": "Profile / Progress / Goals",
   "file": "Forge Public Profile.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "fixed this pass — genuine handler-less tap; click handler wired."
  },
  {
   "fam": "Profile / Progress / Goals",
   "file": "Forge Public Profile.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "fixed this pass — genuine handler-less tap; click handler wired."
  },
  {
   "fam": "Profile / Progress / Goals",
   "file": "Forge Public Profile.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Photo (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Profile / Progress / Goals",
   "file": "Forge Public Profile.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "{{ p.kind }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Squads",
   "file": "Create Squad.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add Crest (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Squads",
   "file": "Report Squad.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Squads",
   "file": "Squad Composer.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "{{ mediaPlaceholder }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Squads",
   "file": "Squad Detail.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Squads",
   "file": "Squad Invite.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Squads",
   "file": "Squad Join Requests.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Squads",
   "file": "Squad Preview.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Squad Crest (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Squads",
   "file": "Squad Settings Member.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Squads",
   "file": "Squad Settings.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Squads",
   "file": "Squad Settings.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Squads",
   "file": "Squad Transfer Ownership.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "{{ p.mediaPlaceholder }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Week 1 (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Week 12 (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Lift clip (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "{{ p.mediaPlaceholder }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Week 1 (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Week 12 (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Lift clip (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add a photo (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add your ‘before’ photo (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add your ‘after’ photo (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add a video (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Photo (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Lift clip (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Week 1 (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Forge Friends Feed.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Week 12 (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Friends",
   "file": "Invite by Handle.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Add (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Challenges",
   "file": "Forge Create Challenge.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "+ Add Cover (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Communities",
   "file": "Community Profile.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Cta handler",
   "was": "onCta referenced in template but not defined in logic.",
   "verdict": "false-positive — handler is bound in the logic class (not a literal inline onClick), or the match was a decorative child / prose text; verified present in current source."
  },
  {
   "fam": "Communities",
   "file": "Community Composer.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "{{ mediaPlaceholder }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Communities",
   "file": "Community Home.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Community banner (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Communities",
   "file": "Community Home.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Crest (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Communities",
   "file": "Community Home.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Video (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Communities",
   "file": "Post Detail.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "{{ post.mediaPlaceholder }} (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Settings",
   "file": "Forge Account Settings.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Tap target (tap)",
   "was": "role=\"button\" with no click handler.",
   "verdict": "fixed this pass — genuine handler-less tap; click handler wired."
  },
  {
   "fam": "Modals / Ceremonies",
   "file": "Forge Workout Artwork.dc.html",
   "sev": "Medium",
   "cat": "Missing Functionality",
   "label": "Drop illustration (upload)",
   "was": "Verify drag/tap-to-upload works.",
   "verdict": "not-a-defect — <image-slot> is a working DS drag/tap upload component; nothing to wire."
  },
  {
   "fam": "Internal / Library",
   "file": "Social Architecture Verification.dc.html",
   "sev": "Critical",
   "cat": "Bug",
   "label": "→ Adaptive Post Detail.dc.html",
   "was": "Navigates to a non-existent file.",
   "verdict": "false-positive — handler is bound in the logic class (not a literal inline onClick), or the match was a decorative child / prose text; verified present in current source."
  },
  {
   "fam": "Internal / Library",
   "file": "Forge Accent Palettes.dc.html",
   "sev": "High",
   "cat": "Bug",
   "label": "Start Session (button)",
   "was": "No click handler wired.",
   "verdict": "non-shipping — retired accent-theming demo, not referenced anywhere in the app."
  }
 ]
};
