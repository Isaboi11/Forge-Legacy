import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { WorkoutSessionProvider } from '@/hooks/useWorkoutSession';
import { ShareProvider } from '@/hooks/useShareSheet';
import { CeremonyProvider } from '@/hooks/useCeremony';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <WorkoutSessionProvider>
        <ShareProvider>
          <CeremonyProvider>
            <AnimatedSplashOverlay />
            <AppTabs />
          </CeremonyProvider>
        </ShareProvider>
      </WorkoutSessionProvider>
    </ThemeProvider>
  );
}
