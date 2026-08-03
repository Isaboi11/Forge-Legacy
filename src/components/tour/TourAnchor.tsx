/**
 * TourAnchor — marks a block of a screen as something the guided tour can spotlight.
 *
 * A thin wrapper View, used where the thing to ring is a whole composition rather than one pressable
 * element: RN function components don't accept a `ref` they haven't declared, so `<TodaysWorkoutCard />`
 * cannot be measured directly the way a `<Pressable ref={…}>` can. Where a component DOES own the element
 * (the two tiles of the Program | Mission grid, the two buttons of the quick-action row), it takes an
 * anchor id prop and attaches `useTourAnchor` itself — no wrapper, no layout touched.
 *
 * The wrapper is layout-neutral in a column: it takes the style you give it and nothing else.
 */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTourAnchor } from '@/hooks/useTourAnchors';
import type { TourAnchorId } from '@/domain/onboarding/tour-plan';

export function TourAnchor({
  id,
  style,
  children,
}: {
  id?: TourAnchorId;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const ref = useTourAnchor(id);
  // `collapsable={false}` or Android may optimize this view out of the hierarchy entirely — and an
  // optimized-away view has no rect to measure, which reads downstream as "that card isn't on screen".
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
