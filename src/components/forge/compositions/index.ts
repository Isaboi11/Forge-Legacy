/**
 * Forge Legacy — Tier 3 Screen-Level Compositions (CLA-C25–C37)
 *
 * Named Tier 2 compositions. Context-aware, owned jointly by this library
 * and their governing wireframe spec. Layout contract lives in the spec;
 * reuse contract lives here.
 *
 * Add exports here as each composition is approved and implemented.
 */

// CLA-C25/C26 (fused for Home v2) — MissionCard: Chapter + Goal + Program + Today + CTA
export * from './MissionCard' // H-1
// Home v2 — unified Train Together card (live squad/friend presence + Choose Someone, replaces the old Squad Card / split Squad-Friends section / Communities / Recent Activity tiers on H-1)
export * from './TrainTogetherCard' // H-1
// CLA-C27  export { GoalCard }           from './GoalCard'           // G-1, G-2
// CLA-C28  export { HonorCard }          from './HonorCard'          // L-10, L-11, P-1
// CLA-C29  export { SquadCard }          from './SquadCard'          // S-1
// CLA-C30  export { WorkoutSessionCard } from './WorkoutSessionCard' // W-17–W-19
// CLA-C31  export { ExerciseRow }        from './ExerciseRow'        // W-22–W-24, W-9–W-16
// CLA-C32  export { MemberRow }          from './MemberRow'          // S-2
// CLA-C33  export { TimelineEventRow }   from './TimelineEventRow'   // L-2
// CLA-C34  export { PostCard }           from './PostCard'           // Friends/Squad/Community feeds
// CLA-C35  export { AccomplishmentRow }  from './AccomplishmentRow'  // L-12–L-14, P-1
// CLA-C36  export { PhotoThumbnail }     from './PhotoThumbnail'     // L-15, L-16
// CLA-C37  HomepagePrinciple — implemented; export from dedicated subfolder:
export * from './HomepagePrinciple' // H-1
