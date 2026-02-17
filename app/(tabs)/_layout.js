import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#00C853', 
      tabBarInactiveTintColor: '#666666',
      headerShown: false,
      tabBarStyle: { 
        height: 70, 
        paddingBottom: 10,
        paddingTop: 10,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        elevation: 10, // Shadow sa Android
        shadowColor: '#000', // Shadow sa iOS (Black lang dapat para safe)
        shadowOpacity: 0.1,
        shadowRadius: 10,
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

      {/* 3. SCAN TAB (GITNA - Floating Button) */}
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
                 
                 // FIX: Elevation lang gamitin sa Android, iwasan ang colored shadowColor
                 elevation: 5, 
                 shadowColor: '#000', // Ginawang black para compatible sa iOS/Android
                 shadowOpacity: 0.3,
                 shadowRadius: 5,
                 shadowOffset: { width: 0, height: 4 }
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