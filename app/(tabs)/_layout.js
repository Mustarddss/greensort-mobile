import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const isTablet = width >= 768; 

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let myName = '';

    const initializeData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        myName = session.user.user_metadata?.full_name;
        
        const { count } = await supabase.from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_name', myName)
          .eq('is_read', false);
        setUnreadCount(count || 0);

        // 🟢 FOREVER ONLINE TRACKER 🟢
        const globalChannel = supabase.channel('green_sort_global', {
          config: { presence: { key: myName } }
        });
        
        globalChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await globalChannel.track({ online: true });
          }
        });
      }
    };

    initializeData();

    // 🟢 DITO ANG FIX: Nilagyan ng Date.now() para iwas bug sa Hot Reload
    const uniqueTopic = `realtime-unread-msgs-${Date.now()}`;
    const msgChannel = supabase.channel(uniqueTopic)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
         initializeData(); 
      }).subscribe();

    return () => { 
        supabase.removeChannel(msgChannel); 
    };
  }, []);

  const tabHeight = Platform.OS === 'ios' ? 65 + insets.bottom : 70;

  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#007C00', tabBarInactiveTintColor: '#666666', headerShown: false,
      tabBarStyle: { height: tabHeight, paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10, paddingTop: 10, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0', elevation: 10, paddingHorizontal: isTablet ? '15%' : 0 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 0 }
    }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => ( <MaterialCommunityIcons name={focused ? "home" : "home-outline"} size={28} color={color} /> ) }} />
      <Tabs.Screen name="rewards" options={{ title: 'Exchange', tabBarIcon: ({ color }) => ( <MaterialCommunityIcons name="recycle" size={28} color={color} /> ) }} />
      <Tabs.Screen name="scan" options={{ title: '', tabBarIcon: () => (
             <View style={{ width: 60, height: 60, backgroundColor: '#007C00', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginTop: -30, elevation: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 3 }}>
                 <MaterialCommunityIcons name="crop-free" size={30} color="white" />
             </View>
          ) }} />
      <Tabs.Screen name="projects" options={{ title: 'Upcycle', tabBarIcon: ({ color, focused }) => ( <MaterialCommunityIcons name={focused ? "lightbulb-on" : "lightbulb-outline"} size={28} color={color} /> ) }} />
      
      {/* 🟢 BAGONG PROFILE TAB NA NASA IBABA */}
      <Tabs.Screen name="profile" options={{ 
          title: 'Profile', 
          tabBarIcon: ({ color, focused }) => ( 
              <MaterialCommunityIcons name={focused ? "account" : "account-outline"} size={28} color={color} /> 
          ) 
      }} />

      {/* 🟢 NAKATAGO NA ANG MGA ITO SA TABS */}
      <Tabs.Screen name="messages" options={{ href: null }} /> 
      <Tabs.Screen name="history" options={{ href: null }} /> 
      <Tabs.Screen name="explore" options={{ href: null }} /> 
    </Tabs>
  );
}