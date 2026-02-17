import { Stack } from 'expo-router';
import { View } from 'react-native';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Dito natin sinasabi na sa 'login' tayo magsisimula
  initialRouteName: 'login',
};

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Ito ang listahan ng mga screens mo */}
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        
        {/* IMPORTANT: Ito ang maglo-load ng Tabs/Footer mo kapag nag-login ka */}
        <Stack.Screen name="(tabs)" /> 
      </Stack>
    </View>
  );
}