import { ComingSoonScreen } from '@/components/coming-soon-screen';

/**
 * Legacy tab root. The real screen (Forge Legacy.dc.html — can reuse the existing
 * components/legacy/* building blocks) lands in Phase 3, STEP D. Replaces the old
 * `/legacy-design-test` route as the Legacy tab target.
 */
export default function LegacyScreen() {
  return <ComingSoonScreen title="Legacy" />;
}
