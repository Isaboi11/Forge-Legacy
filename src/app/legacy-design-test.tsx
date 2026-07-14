/**
 * Legacy Hub — Design Prototype
 *
 * L-1 Legacy Hub + L-2 Timeline in a single self-contained screen.
 * View-switching is handled via local state so no router changes are needed.
 *
 * Source of truth: Legacy-Hub-Wireframe-Spec-L1.md (LOCKED)
 *                  Legacy-Timeline-Wireframe-Spec-L2.md (LOCKED)
 */
import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LC, LS } from '@/constants/legacy-theme'
import { LEGACY_DATA } from '@/data/legacy-placeholder'

import { IdentityStrip }          from '@/components/legacy/IdentityStrip'
import { ActiveChapterCard }      from '@/components/legacy/ActiveChapterCard'
import { InvitationCard }         from '@/components/legacy/InvitationCard'
import { FeaturedMomentCard }     from '@/components/legacy/FeaturedMomentCard'
import { ChapterHistorySection }  from '@/components/legacy/ChapterHistorySection'
import { PhotosSection }          from '@/components/legacy/PhotosSection'
import { TimelineTeaserSection }  from '@/components/legacy/TimelineTeaserSection'
import { AccomplishmentsSection } from '@/components/legacy/AccomplishmentsSection'
import { HonorsSection }          from '@/components/legacy/HonorsSection'
import { LegacyTimelineScreen }   from '@/components/legacy/LegacyTimelineScreen'

type ActiveView = 'hub' | 'timeline'

// ─── App Bar ─────────────────────────────────────────────────────────────────

function AppBar({ title }: { title: string }) {
  return (
    <View style={styles.appBar}>
      <Text style={styles.appBarTitle}>{title}</Text>
    </View>
  )
}

// ─── L-1 Legacy Hub ──────────────────────────────────────────────────────────

function LegacyHub({ onViewTimeline }: { onViewTimeline: () => void }) {
  const data = LEGACY_DATA

  return (
    <View style={styles.flex}>
      <AppBar title="Legacy" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.hubContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity Strip — always present, not a tap target */}
        <IdentityStrip rankName={data.rankName} subTier={data.rankSubTier} />

        {/* § 1 — Active Chapter */}
        <View style={styles.section}>
          {data.activeChapter ? (
            <ActiveChapterCard
              chapter={data.activeChapter}
              dayCount={data.dayCount}
            />
          ) : (
            <InvitationCard />
          )}
        </View>

        {/* § 2 — Featured Legacy Moment */}
        {data.featuredMoment && (
          <View style={styles.section}>
            <FeaturedMomentCard moment={data.featuredMoment} />
          </View>
        )}

        {/* § 3 — Chapter History (no section label per spec) */}
        {data.sealedChapters.length > 0 && (
          <View style={styles.section}>
            <ChapterHistorySection chapters={data.sealedChapters} />
          </View>
        )}

        {/* § 4 — Photos */}
        {data.photos.length > 0 && (
          <View style={styles.section}>
            <PhotosSection
              photos={data.photos}
              totalCount={data.totalPhotoCount}
            />
          </View>
        )}

        {/* § 5 — Timeline Teaser */}
        {data.timelineEntries.length > 0 && (
          <View style={styles.section}>
            <TimelineTeaserSection
              entries={data.timelineEntries}
              onViewAll={onViewTimeline}
            />
          </View>
        )}

        {/* § 6 — Accomplishments */}
        {data.accomplishments.length > 0 && (
          <View style={styles.section}>
            <AccomplishmentsSection
              accomplishments={data.accomplishments}
              totalCount={data.totalAccomplishmentCount}
            />
          </View>
        )}

        {/* § 7 — Honors */}
        {data.honors.length > 0 && (
          <View style={styles.section}>
            <HonorsSection
              honors={data.honors}
              totalCount={data.totalHonorCount}
            />
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function LegacyDesignTest() {
  const [view, setView] = useState<ActiveView>('hub')

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={LC.background} />

      {view === 'hub' ? (
        <LegacyHub onViewTimeline={() => setView('timeline')} />
      ) : (
        <LegacyTimelineScreen onBack={() => setView('hub')} />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: LC.background,
  },
  flex: {
    flex: 1,
  },

  // App bar
  appBar: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: LS.screenPadH,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LC.surfaceBorder,
  },
  appBarTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: LC.text,
  },

  // Hub scroll
  hubContent: {
    paddingHorizontal: LS.screenPadH,
    paddingTop: LS.screenPadT,
  },
  section: {
    marginTop: LS.sectionGap,
  },
})
