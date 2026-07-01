/**
 * ForgeStepNavigation
 * Spec: Forge Navigation Library.dc.html §07
 *
 * Wayfinding through multi-step flows — onboarding, program builders, guided sets.
 * Completed steps hold bronze, current step glows, upcoming steps rest in gray.
 */

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color, space } from '@/constants/tokens'
import { NAV } from './_navigationTokens'
import type { ForgeStepNavigationProps, Step } from './types'

export function ForgeStepNavigation({
  variant = 'horizontalProgress',
  steps,
}: ForgeStepNavigationProps) {
  if (variant === 'dots') {
    return <DotStepper steps={steps} />
  }
  if (variant === 'numbered') {
    return <NumberedStepper steps={steps} />
  }
  if (variant === 'vertical') {
    return <VerticalStepper steps={steps} />
  }
  // horizontalProgress (default)
  return <HorizontalProgressStepper steps={steps} />
}

// ── Horizontal Progress Stepper (labeled) ──────────────────────────────────

function HorizontalProgressStepper({ steps }: { steps: Step[] }) {
  return (
    <View style={hStyles.container} accessibilityRole="progressbar">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <View key={step.key} style={hStyles.stepGroup}>
            <View style={hStyles.stepColumn}>
              <StepCircle step={step} size={NAV.STEP_SIZE} />
              {step.label ? (
                <Text style={[
                  hStyles.label,
                  step.status === 'current' ? hStyles.labelCurrent
                    : step.status === 'completed' ? hStyles.labelCompleted
                    : hStyles.labelUpcoming,
                ]}>
                  {step.label}
                </Text>
              ) : null}
            </View>
            {!isLast && <ConnectorLine leftStep={step} rightStep={steps[i + 1]} />}
          </View>
        )
      })}
    </View>
  )
}

const hStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  stepColumn: {
    alignItems: 'center',
    gap: 10,
    width: 96,
    flexShrink: 0,
  },
  label: {
    fontSize: 12,
  },
  labelCompleted: { fontWeight: '600', color: color.accent.primary },
  labelCurrent: { fontWeight: '600', color: color.text.primary },
  labelUpcoming: { fontWeight: '400', color: color.text.tertiary },
})

// ── Numbered Stepper ───────────────────────────────────────────────────────

function NumberedStepper({ steps }: { steps: Step[] }) {
  return (
    <View style={nStyles.container} accessibilityRole="progressbar">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <View key={step.key} style={nStyles.stepGroup}>
            <NumberCircle step={step} index={i + 1} size={NAV.STEP_SIZE} />
            {!isLast && <ConnectorLine leftStep={step} rightStep={steps[i + 1]} />}
          </View>
        )
      })}
    </View>
  )
}

const nStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
})

// ── Dot Stepper ───────────────────────────────────────────────────────────

function DotStepper({ steps }: { steps: Step[] }) {
  return (
    <View style={dStyles.container} accessibilityRole="progressbar">
      {steps.map(step => {
        const isActive = step.status === 'current'
        const isDone = step.status === 'completed'
        const isUpcoming = step.status === 'upcoming' || step.status === 'disabled'
        return (
          <View
            key={step.key}
            style={[
              dStyles.dot,
              isActive && dStyles.dotActive,
              isDone && dStyles.dotDone,
              isUpcoming && dStyles.dotUpcoming,
            ]}
          />
        )
      })}
    </View>
  )
}

const dStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dot: {
    height: NAV.STEP_DOT,
    width: NAV.STEP_DOT,
    borderRadius: NAV.RADIUS_PILL,
  },
  dotActive: {
    width: NAV.STEP_DOT_ACTIVE_W,
    backgroundColor: color.accent.primary,
    shadowColor: color.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  dotDone: {
    backgroundColor: color.accent.primary,
  },
  dotUpcoming: {
    backgroundColor: '#2C2C36',
  },
})

// ── Vertical Stepper ──────────────────────────────────────────────────────

function VerticalStepper({ steps }: { steps: Step[] }) {
  return (
    <View style={vStyles.container} accessibilityRole="progressbar">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <View key={step.key} style={vStyles.stepRow}>
            {/* Left column: circle + vertical line */}
            <View style={vStyles.leftCol}>
              <NumberCircle step={step} index={i + 1} size={NAV.STEP_SIZE_SM} />
              {!isLast && (
                <View style={[
                  vStyles.vertLine,
                  step.status === 'completed' ? vStyles.vertLineDone : vStyles.vertLineUpcoming,
                ]} />
              )}
            </View>
            {/* Right column: label */}
            {step.label ? (
              <Text style={[
                vStyles.label,
                step.status === 'current' ? vStyles.labelCurrent
                  : step.status === 'completed' ? vStyles.labelDone
                  : vStyles.labelUpcoming,
              ]}>
                {step.label}
              </Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

const vStyles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 14,
  },
  leftCol: {
    alignItems: 'center',
    width: NAV.STEP_SIZE_SM,
  },
  vertLine: {
    flex: 1,
    width: 2,
    minHeight: 20,
    marginVertical: 6,
  },
  vertLineDone: { backgroundColor: color.accent.primary },
  vertLineUpcoming: { backgroundColor: color.border.subtle },
  label: {
    fontSize: 13,
    paddingTop: 6,
    flex: 1,
  },
  labelDone: { fontWeight: '600', color: color.accent.primary },
  labelCurrent: { fontWeight: '600', color: color.text.primary },
  labelUpcoming: { color: color.text.tertiary },
})

// ── Shared sub-components ─────────────────────────────────────────────────

function StepCircle({ step, size }: { step: Step; size: number }) {
  const isCompleted = step.status === 'completed'
  const isCurrent   = step.status === 'current'
  const isDisabled  = step.status === 'disabled'

  return (
    <View style={[
      sc.circle,
      { width: size, height: size, borderRadius: size / 2 },
      isCompleted && sc.circleCompleted,
      isCurrent   && sc.circleCurrent,
      (!isCompleted && !isCurrent) && sc.circleUpcoming,
      isDisabled  && sc.circleDisabled,
    ]}>
      {isCompleted ? (
        <Feather name="check" size={size * 0.55} color={color.text.inverse} strokeWidth={2.4} />
      ) : null}
      {isCurrent && (
        <View style={sc.ringOuter} />
      )}
    </View>
  )
}

function NumberCircle({ step, index, size }: { step: Step; index: number; size: number }) {
  const isCompleted = step.status === 'completed'
  const isCurrent   = step.status === 'current'
  const isDisabled  = step.status === 'disabled'

  return (
    <View style={[
      sc.circle,
      { width: size, height: size, borderRadius: size / 2 },
      isCompleted && sc.circleCompletedFull,
      isCurrent   && sc.circleCurrent,
      (!isCompleted && !isCurrent) && sc.circleUpcoming,
      isDisabled  && sc.circleDisabled,
    ]}>
      {isCompleted ? (
        <Feather name="check" size={size * 0.5} color={color.text.inverse} />
      ) : (
        <Text style={[
          sc.indexText,
          isCurrent   ? sc.indexTextCurrent
            : isDisabled  ? sc.indexTextDisabled
            : sc.indexTextUpcoming,
        ]}>
          {index}
        </Text>
      )}
      {isCurrent && <View style={sc.ringOuter} />}
    </View>
  )
}

function ConnectorLine({ leftStep, rightStep }: { leftStep: Step; rightStep: Step }) {
  const leftDone = leftStep.status === 'completed'
  const rightDone = rightStep.status === 'completed'
  const isPartial = leftDone && !rightDone

  return (
    <View style={[
      cl.line,
      leftDone && !isPartial ? cl.lineDone : undefined,
      isPartial ? cl.linePartial : undefined,
      !leftDone ? cl.lineUpcoming : undefined,
    ]} />
  )
}

const sc = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  circleCompleted: {
    backgroundColor: color.accent.primary,
  },
  circleCompletedFull: {
    backgroundColor: color.accent.primary,
  },
  circleCurrent: {
    backgroundColor: color.background.primary,
    borderWidth: 2,
    borderColor: color.accent.primary,
    shadowColor: color.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  circleUpcoming: {
    backgroundColor: color.background.primary,
    borderWidth: 2,
    borderColor: color.border.subtle,
  },
  circleDisabled: {
    opacity: 0.45,
  },
  ringOuter: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 99,
    borderWidth: 0,
    backgroundColor: NAV.STEP_RING,
  },
  indexText: {
    fontSize: 14,
    fontWeight: '600',
  },
  indexTextCurrent: { color: color.accent.primary },
  indexTextUpcoming: { color: color.text.tertiary },
  indexTextDisabled: { color: color.text.tertiary },
})

const cl = StyleSheet.create({
  line: {
    flex: 1,
    height: NAV.STEP_LINE_H,
    marginTop: 15,
    alignSelf: 'flex-start',
  },
  lineDone: { backgroundColor: color.accent.primary },
  linePartial: { backgroundColor: color.border.subtle },
  lineUpcoming: { backgroundColor: color.border.subtle },
})

// Type reference
void (undefined as unknown as ForgeStepNavigationProps)
void (space as unknown)
