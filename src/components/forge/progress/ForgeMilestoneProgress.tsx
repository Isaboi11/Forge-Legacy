import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { PROG } from './_progressTokens'
import type { ForgeMilestoneProgressProps, MilestoneNode } from './types'

export function ForgeMilestoneProgress({
  milestones,
  style,
  accessibilityLabel,
}: ForgeMilestoneProgressProps) {
  if (milestones.length === 0) return null

  const completedCount = milestones.filter(m => m.state === 'completed').length

  // Fill line covers up to the CURRENT node (exclusive)
  const fillPct = milestones.length > 1 ? (completedCount / (milestones.length - 1)) * 100 : 0

  const NODE = PROG.NODE_SIZE
  const LINE = PROG.LINE_HEIGHT

  return (
    <View
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? `${completedCount} of ${milestones.length} milestones complete`}
    >
      {/* Track layer */}
      <View style={[styles.trackArea, { height: NODE }]}>
        {/* Background track line */}
        <View style={[styles.line, styles.lineTrack, { top: NODE / 2 - LINE / 2, height: LINE }]} />

        {/* Bronze fill line */}
        {fillPct > 0 ? (
          <LinearGradient
            colors={[PROG.FILL_DARK_FROM, PROG.FILL_DARK_TO]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.line,
              styles.lineFill,
              {
                top:    NODE / 2 - LINE / 2,
                height: LINE,
                width:  `${fillPct}%`,
              },
            ]}
          />
        ) : null}

        {/* Nodes */}
        {milestones.map((milestone, i) => {
          const leftPct = milestones.length > 1 ? (i / (milestones.length - 1)) * 100 : 50
          return (
            <MilestoneNodeView
              key={milestone.key}
              milestone={milestone}
              leftPct={leftPct}
              nodeSize={NODE}
            />
          )
        })}
      </View>

      {/* Labels below nodes */}
      <View style={styles.labelsRow}>
        {milestones.map((milestone, i) => {
          const isCurrent = milestone.state === 'current'
          return (
            <View key={milestone.key} style={styles.labelCell}>
              <Text
                style={[
                  styles.nodeLabel,
                  isCurrent && styles.nodeLabelCurrent,
                  milestone.state === 'locked' && styles.nodeLabelLocked,
                ]}
                numberOfLines={1}
              >
                {milestone.label}
              </Text>
            </View>
          )
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendItem color={PROG.NODE_FROM} label="Completed" />
        <LegendItem color={color.accent.primary} label="Current" isRing />
        <LegendItem color={color.border.subtle} label="Locked" />
      </View>
    </View>
  )
}

function MilestoneNodeView({
  milestone,
  leftPct,
  nodeSize,
}: {
  milestone: MilestoneNode
  leftPct: number
  nodeSize: number
}) {
  const r = nodeSize / 2

  const nodeStyle: object = milestone.state === 'completed' ? styles.nodeCompleted :
                            milestone.state === 'current'   ? styles.nodeCurrent   :
                                                              styles.nodeLocked

  return (
    <View
      style={[
        styles.nodeOuter,
        { left: `${leftPct}%`, width: nodeSize, height: nodeSize, marginLeft: -r },
      ]}
    >
      {milestone.state === 'completed' ? (
        <LinearGradient
          colors={[PROG.NODE_FROM, PROG.NODE_TO]}
          start={{ x: 0.3, y: 0.2 }}
          end={{ x: 1, y: 1 }}
          style={[styles.nodeInner, { width: nodeSize, height: nodeSize, borderRadius: r, borderColor: PROG.NODE_BORDER }]}
        >
          <Feather name="check" size={14} color={color.text.inverse} strokeWidth={3} />
        </LinearGradient>
      ) : milestone.state === 'current' ? (
        <View style={[styles.nodeInner, nodeStyle, { width: nodeSize, height: nodeSize, borderRadius: r }]}>
          <View style={styles.currentDot} />
        </View>
      ) : (
        <View style={[styles.nodeInner, nodeStyle, { width: nodeSize, height: nodeSize, borderRadius: r }]}>
          <Feather name="lock" size={12} color={color.text.tertiary} />
        </View>
      )}
    </View>
  )
}

function LegendItem({ color: c, label, isRing }: { color: string; label: string; isRing?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          isRing
            ? { backgroundColor: color.background.primary, borderWidth: 2, borderColor: c }
            : { backgroundColor: c },
        ]}
      />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  trackArea: {
    position: 'relative',
    marginHorizontal: 14,
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 99,
  },
  lineTrack: {
    backgroundColor: color.border.subtle,
  },
  lineFill: {
    // width set inline
  },
  nodeOuter: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeInner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  nodeCompleted: {
    borderColor: PROG.NODE_BORDER,
  },
  nodeCurrent: {
    backgroundColor: color.background.primary,
    borderColor: color.accent.primary,
    borderWidth: 2,
  },
  nodeLocked: {
    backgroundColor: color.background.elevated,
    borderColor: color.border.subtle,
  },
  currentDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: color.accent.primary,
    shadowColor: 'rgba(185,125,65,0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  labelsRow: {
    flexDirection: 'row',
    marginHorizontal: 14,
  },
  labelCell: {
    flex: 1,
    alignItems: 'center',
  },
  nodeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: color.text.secondary,
    textAlign: 'center',
  },
  nodeLabelCurrent: {
    color: color.accent.primary,
    fontWeight: '700',
  },
  nodeLabelLocked: {
    color: color.text.tertiary,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
  },
  legendLabel: {
    fontSize: 11,
    color: color.text.tertiary,
  },
})
