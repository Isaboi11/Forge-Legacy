/**
 * ProgramMissionGrid — the Home 2-column Program | Mission grid.
 * Source of truth: Forge Home.dc.html (§ Program | Mission, lines 142–186).
 *
 * Program tile reads REAL data (the active program from `training/active-program.ts`).
 * Mission tile shows the real chapter goal (0025) — the caller passes it in.
 */

import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'
import { Pressable, StyleSheet, Text, View } from 'react-native'
// No `flRadius` / `flShadow` any more — nothing here has a corner or an edge to cast one.
import { flColor, flFont } from '@/constants/foundation'
import { useTourAnchor } from '@/hooks/useTourAnchors'
import type { TourAnchorId } from '@/domain/onboarding/tour-plan'
import { ProgressBar } from '../../composites/ProgressBar'
import { SectionHeader } from '../../composites/SectionHeader'
import { ChevronRightIcon } from '../../primitives/icons/HomeIcons'

export interface ProgramMissionGridProps {
  /**
   * The active program — OMITTED when there isn't one, leaving Mission alone across the full width.
   *
   * ══ WHY THIS IS OPTIONAL, WHICH IS THE INTERESTING PART ══
   *
   * The Mission tile was never program-dependent. It reads the athlete's live chapter goals and has
   * nothing to do with a program. But Home guarded this whole two-tile grid on one condition — the
   * program's name being non-empty — so an athlete with no program silently lost their GOAL as well.
   * Collateral damage from a single `&&`, and invisible precisely because nothing was drawn to notice.
   *
   * The day-to-day athlete is the one who had it taken; making the program half optional gives it back
   * without a second component.
   */
  programName?: string
  /**
   * TRUE when the program is PLANNED but never started.
   *
   * The tile was hard-labelled "Current Program" and fed whichever program Home could find, falling back
   * to a `future` one — so a program the athlete had adopted and never pressed Start on was announced as
   * the one they are on, with a progress bar under it reading 0 of 32. `index.tsx` had already stopped
   * the HERO from offering its sessions for exactly this reason ("Home asserting a program relationship
   * the athlete never entered"); the fix stopped one element short of the tile's own label.
   */
  programPlanned?: boolean
  completed?: number
  total?: number
  missionTarget: string
  goalsRemaining: number
  onProgram?: () => void
  onMission?: () => void
  /** Guided-tour spotlight targets. Each tile is rung separately — they are two unrelated ideas. */
  programAnchor?: TourAnchorId
  missionAnchor?: TourAnchorId
}

/**
 * The label over an open column.
 *
 * Same all-caps bronze `SectionHeader` uses everywhere else on Home (CLA-D14) — because these are
 * sections now, not tiles, and a section is what a section label goes over. The chevron is the only
 * thing left saying "this is tappable" once the surface is gone, so it stays.
 */
function ColumnHeader({ label }: { label: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>{label}</Text>
      <ChevronRightIcon size={14} color={flColor.bronze400} />
    </View>
  )
}

function TargetIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={flColor.bronze400} strokeWidth={2} />
      <Circle cx={12} cy={12} r={3} stroke={flColor.bronze400} strokeWidth={2} />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="square" />
    </Svg>
  )
}

export function ProgramMissionGrid({
  programName,
  programPlanned,
  completed,
  total,
  missionTarget,
  goalsRemaining,
  onProgram,
  onMission,
  programAnchor,
  missionAnchor,
}: ProgramMissionGridProps) {
  const programRef = useTourAnchor(programAnchor)
  const missionRef = useTourAnchor(missionAnchor)

  const done = completed ?? 0
  const all = total ?? 0

  /*
   * ══ WITH NO PROGRAM BESIDE IT, MISSION IS NOT A TILE ══
   *
   * A tile is one half of a pair; alone it became a full-width container holding four stacked slots
   * (eyebrow, title, description, divider, metadata) and read as a dashboard widget rather than as part
   * of the chapter above it. PO: *"Mission doesn't need that entire container — imagine it sitting
   * almost directly on the stone."*
   *
   * So the SOLO case drops the surface entirely: the ground shows through, `SectionHeader` gives it the
   * same all-caps bronze label every other section on Home already uses (CLA-D14, the one sanctioned
   * all-caps scale), and the objective is set at chapter weight instead of tile weight.
   *
   * ⚠ THE TWO-UP GRID IS UNCHANGED. Beside a program tile, matching surfaces are what makes the pair
   * read as a pair — the complaint was never about the grid.
   */
  if (!programName) {
    return (
      <Pressable
        ref={missionRef}
        onPress={onMission}
        accessibilityRole="button"
        accessibilityLabel={`Mission: ${missionTarget}. ${goalsRemaining} goals remaining.`}
        style={({ pressed }) => [styles.solo, pressed ? styles.soloPressed : null]}
      >
        <SectionHeader label="Mission" />
        <Text style={styles.soloTitle} numberOfLines={2}>
          {missionTarget}
        </Text>
        <Text style={styles.soloSub}>Your long-term objective</Text>
        <View style={styles.soloRule} />
        <View style={styles.soloFoot}>
          <TargetIcon />
          <Text style={styles.goalsText}>
            {goalsRemaining} {goalsRemaining === 1 ? 'goal' : 'goals'} remaining
          </Text>
          <View style={styles.soloChevron}>
            <ChevronRightIcon size={16} color={flColor.gray600} />
          </View>
        </View>
      </Pressable>
    )
  }

  /*
   * ══ CARDS ARE FOR THINGS YOU ACT INSIDE OF ══
   *
   * PO, setting the rule for the whole product: *"Cards are reserved for things the user acts inside
   * of. Information doesn't automatically get a card."* Program and Mission are glanceable STATUS —
   * nobody makes a decision in here, they read two numbers and move on — so two full containers gave
   * them the same visual weight as Today's Workout, which is the one thing on this screen you act on.
   *
   * What is left is spacing and one centre rule. Both halves stay independently tappable and each keeps
   * its chevron, so the usability of the tiles survives without their surfaces.
   *
   * ⚠ NO OUTER BORDER, NO PER-COLUMN BACKGROUND. The moment either comes back this is two tiles with a
   * line between them again.
   */
  return (
    <View style={styles.grid}>
      <Pressable
        ref={programRef}
        onPress={onProgram}
        accessibilityRole="button"
        accessibilityLabel={
          programPlanned
            ? `Planned program: ${programName}, ${all} workouts. Not started.`
            : `Current program: ${programName}. ${done} of ${all} workouts complete.`
        }
        style={({ pressed }) => [styles.col, pressed ? styles.colPressed : null]}
      >
        <ColumnHeader label={programPlanned ? 'Planned Program' : 'Current Program'} />
        <Text style={styles.colTitle} numberOfLines={2}>
          {programName}
        </Text>
        {/* A PLANNED program shows its SIZE, not its progress. An empty bar under "0 / 32 Workouts"
            is the picture of somebody who has started and done nothing, which is a different and
            worse thing to say to an athlete than "you have not started this yet". */}
        {programPlanned ? (
          <View style={styles.progressBlock}>
            <View style={styles.countRow}>
              <Text style={styles.countBig}>{all}</Text>
            </View>
            <Text style={styles.unitLabel}>Workouts</Text>
            <Text style={styles.plannedNote}>Not started — tap to begin</Text>
          </View>
        ) : (
          /* The unit sits UNDER the bar rather than opposite the count. Pushed to the far right of a
             tile it was balancing the container; with the container gone there is nothing to balance,
             and "0 / 36" reads as one phrase with its noun beneath it. */
          <View style={styles.progressBlock}>
            <View style={styles.countRow}>
              <Text style={styles.countBig}>{done}</Text>
              <Text style={styles.countTotal}>/ {all}</Text>
            </View>
            <ProgressBar value={done} max={all} label={`Program progress: ${done} of ${all}`} />
            <Text style={styles.unitLabel}>Workouts</Text>
          </View>
        )}
      </Pressable>

      {/* The only structure the region gets. */}
      <View style={styles.centreRule} />

      <Pressable
        ref={missionRef}
        onPress={onMission}
        accessibilityRole="button"
        accessibilityLabel={`Mission: ${missionTarget}. ${goalsRemaining} goals remaining.`}
        style={({ pressed }) => [styles.col, pressed ? styles.colPressed : null]}
      >
        <ColumnHeader label="Mission" />
        <Text style={styles.colTitle} numberOfLines={2}>
          {missionTarget}
        </Text>
        <Text style={styles.subtle}>Your long-term objective</Text>
        <View style={styles.missionDivider} />
        <View style={styles.goalsRow}>
          <TargetIcon />
          <Text style={styles.goalsText}>
            {goalsRemaining} {goalsRemaining === 1 ? 'goal' : 'goals'} remaining
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  /* An open column: no background, no border, no radius, no shadow. Only the gutter the centre rule
     needs on either side. */
  col: {
    flex: 1,
    minWidth: 0,
    gap: 9,
    paddingVertical: 2,
  },
  colPressed: {
    opacity: 0.75,
  },
  /* Full-height hairline, the same one every other rule on Home uses. It is doing the work four
     borders and two fills used to. */
  centreRule: {
    width: 1,
    marginHorizontal: 16,
    backgroundColor: flColor.bronzeBorderSubtle,
  },
  colTitle: {
    fontFamily: flFont.display,
    fontSize: 23,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 27,
    color: flColor.cream100,
  },
  /* The noun under the number, now that it is not balancing a tile. */
  unitLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: flColor.gray600,
  },
  /* No background, no border, no radius, no shadow — the point of the solo case. Only the padding a
     touch target needs, so the objective sits on the same ground the chapter above it does. */
  solo: {
    paddingVertical: 2,
  },
  soloPressed: {
    opacity: 0.75,
  },
  /* Chapter weight, not tile weight: this is the one long-lived thing on the screen, and at 18sp inside
     a box it was the quietest text on Home. */
  soloTitle: {
    fontFamily: flFont.display,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.4,
    lineHeight: 30,
    color: flColor.cream100,
  },
  soloSub: {
    marginTop: 5,
    fontSize: 13,
    color: flColor.gray400,
  },
  /* The rule replaces the container. One line carries the same grouping four borders used to. */
  soloRule: {
    height: 1,
    backgroundColor: flColor.bronzeBorderSubtle,
    marginTop: 16,
    marginBottom: 13,
  },
  soloFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  soloChevron: {
    marginLeft: 'auto',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  tileTitle: {
    fontFamily: flFont.display,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 21,
    color: flColor.cream100,
  },
  progressBlock: {
    gap: 8,
    marginTop: 3,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  countBig: {
    fontFamily: flFont.display,
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 32,
    color: flColor.cream100,
  },
  countTotal: {
    fontSize: 14,
    fontWeight: '500',
    color: flColor.gray400,
  },
  plannedNote: {
    fontSize: 11,
    fontWeight: '600',
    color: flColor.bronze400,
  },
  subtle: {
    fontSize: 12.5,
    color: flColor.gray400,
    marginTop: 2,
  },
  missionDivider: {
    height: 1,
    backgroundColor: flColor.bronzeBorderSubtle,
    marginVertical: 2,
  },
  goalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalsText: {
    fontSize: 12,
    color: flColor.gray400,
  },
})
