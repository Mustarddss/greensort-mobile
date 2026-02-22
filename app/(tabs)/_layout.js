import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#00C853', 
      tabBarInactiveTintColor: '#666666',
      headerShown: false,
      // SIMPLEHAN LANG NATIN ANG STYLE
      tabBarStyle: { 
        height: 70, 
        paddingBottom: 10,
        paddingTop: 10,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        elevation: 10, // Ito lang ang kailangan ng Android
      },
      tabBarLabelStyle: {
        fontSize: 10, 
        fontWeight: '600',
        marginTop: 0,
      }
    }}>
      
      {/* 1. HOME TAB */}
      <Tabs.Screen 
        name="dashboard" 
        options={{
          title: 'Home', 
          tabBarIcon: ({ color, focused }) => (
             <MaterialCommunityIcons name={focused ? "home" : "home-outline"} size={28} color={color} />
          ),
      }} />

      {/* 2. EXCHANGE TAB */}
      <Tabs.Screen name="rewards" options={{
          title: 'Exchange', 
          tabBarIcon: ({ color }) => (
             <MaterialCommunityIcons name="recycle" size={28} color={color} />
          ),
      }} />

      {/* 3. SCAN TAB (GITNA) */}
      <Tabs.Screen name="scan" options={{
          title: '', 
          tabBarIcon: ({ focused }) => (
             <View style={{
                 width: 60,
                 height: 60,
                 backgroundColor: '#00C853', 
                 borderRadius: 30, 
                 justifyContent: 'center',
                 alignItems: 'center',
                 marginBottom: 30, 
                 elevation: 5, // Elevation lang, WALANG SHADOW COLOR
             }}>
                 <MaterialCommunityIcons name="crop-free" size={30} color="white" />
             </View>
          ),
      }} />

      {/* 4. UPCYCLE TAB */}
      <Tabs.Screen name="projects" options={{
          title: 'Upcycle', 
          tabBarIcon: ({ color, focused }) => (
             <MaterialCommunityIcons name={focused ? "lightbulb-on" : "lightbulb-outline"} size={28} color={color} />
          ),
      }} />

      {/* 5. PROFILE TAB */}
      <Tabs.Screen name="profile" options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
             <MaterialCommunityIcons name={focused ? "account" : "account-outline"} size={28} color={color} />
          ),
      }} />

      {/* HIDE EXTRA FILES */}
      <Tabs.Screen name="history" options={{ href: null }} /> 
      <Tabs.Screen name="explore" options={{ href: null }} /> 
    </Tabs>
  );
}