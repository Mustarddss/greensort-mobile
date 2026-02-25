import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, RefreshControl, StatusBar, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase'; // 👈 Binago ang path kasi nilabas natin sa tabs folder
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router'; // 👈 Idinagdag para sa Back button

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter(); 

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const myName = session.user.user_metadata?.full_name;
      const { data } = await supabase.from('notifications')
        .select('*')
        .eq('owner_name', myName)
        .order('created_at', { ascending: false });
      
      if (data) setNotifications(data);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const getIcon = (action) => {
    if (action === 'liked') return <MaterialCommunityIcons name="heart" color="#FF1744" size={20} />;
    if (action === 'commented on') return <MaterialCommunityIcons name="comment-text" color="#2979FF" size={20} />;
    return <MaterialCommunityIcons name="email" color="#00C853" size={20} />;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* 🟢 HEADER NA MAY BACK BUTTON */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.notifCard}>
            <Image source={{ uri: item.actor_avatar }} style={styles.avatar} />
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.notifText}>
                <Text style={{ fontWeight: 'bold', color: '#333' }}>{item.actor_name}</Text> {item.action} your post <Text style={{ fontWeight: 'bold' }}>"{item.post_title}"</Text>
              </Text>
              <Text style={styles.timeText}>Just recently</Text>
            </View>
            {getIcon(item.action)}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: 'white', paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  notifCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  notifText: { fontSize: 14, color: '#555', lineHeight: 20 },
  timeText: { fontSize: 11, color: '#999', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50 }
});