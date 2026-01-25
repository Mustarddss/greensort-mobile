import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  initialRouteName: 'login', 
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* 1. AUTH */}
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
        
        {/* 2. GATEKEEPER */}
        <Stack.Screen name="index" />

        {/* 3. DASHBOARD (Ito yung file na inilabas natin sa folder) */}
        <Stack.Screen name="dashboard" />

        {/* 4. TABS (Dito papasok ang Scan, Projects, atbp.) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}