import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#00C853', 
      tabBarInactiveTintColor: '#888888',
      headerShown: false,
      tabBarStyle: { 
        height: 65,
        paddingBottom: 10,
        paddingTop: 10,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        elevation: 10,
      },
      tabBarLabelStyle: {
        fontSize: 11, 
        fontWeight: '500',
        marginTop: -2,
      }
    }}>
      
      {/* 1. HOME TAB */}
      <Tabs.Screen 
        name="dashboard" 
        options={{
          title: 'Home', 
          tabBarIcon: ({ color, focused }) => (
             <MaterialCommunityIcons name={focused ? "home-variant" : "home-variant-outline"} size={28} color={color} />
          ),
      }} />

      {/* 2. SCAN TAB */}
      <Tabs.Screen name="scan" options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => (
             // Pinalitan ko ng 'crop-free' para sure na gumana (ito yung parang frame)
             <MaterialCommunityIcons name="crop-free" size={26} color={color} />
          ),
      }} />

      {/* 3. GUIDES TAB */}
      <Tabs.Screen name="projects" options={{
          title: 'Guides', 
          tabBarIcon: ({ color }) => (
             <MaterialCommunityIcons name="recycle" size={28} color={color} />
          ),
      }} />

      {/* 4. REWARDS TAB (Ito ang nag-eerror kanina) */}
      <Tabs.Screen name="rewards" options={{
          title: 'Rewards',
          tabBarIcon: ({ color, focused }) => (
             // ✅ FIX: Pinalitan ko ng "medal" kasi walang "rosette"
             <MaterialCommunityIcons name={focused ? "medal" : "medal-outline"} size={28} color={color} />
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