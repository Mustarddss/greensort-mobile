import { Stack } from 'expo-router';
import { View } from 'react-native';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      {/* 🟢 IDINAGDAG ANG animation: 'none' DITO SA SCREEN OPTIONS */}
      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" /> 
        <Stack.Screen name="settings" />
      </Stack>
    </View>
  );
}