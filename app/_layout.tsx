import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useThemeControls } from '../src/theme/useTheme';
import { PrefsBootstrap } from '../src/prefs/PrefsBootstrap';

function Shell() {
  const { theme, scheme } = useThemeControls();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    SpaceMono_700Bold,
  });
  // Render on error too so a font failure never bricks the app (falls back to system font).
  if (!loaded && !error) return null;
  return (
    <ThemeProvider>
      <PrefsBootstrap />
      <Shell />
    </ThemeProvider>
  );
}
