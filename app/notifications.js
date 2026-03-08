import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, RefreshControl, StatusBar, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All'); 
  const insets = useSafeAreaInsets();
  const router = useRouter(); 
  const [myName, setMyName] = useState('');

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const name = session.user.user_metadata?.full_name;
      setMyName(name);
      const { data } = await supabase.from('notifications').select('*').eq('owner_name', name).order('created_at', { ascending: false });
      if (data) setNotifications(data);
    }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchNotifications(); setRefreshing(false); }, []);

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('owner_name', myName);
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getNotificationContent = (item) => {
    if (item.action === 'liked') return { title: 'Someone liked your post', body: `${item.actor_name} liked your post "${item.post_title}"` };
    if (item.action.includes('comment')) return { title: 'New comment on your post', body: `${item.actor_name} commented on "${item.post_title}"` };
    return { title: `New message from ${item.actor_name}`, body: `Regarding your post "${item.post_title}"` };
  };

  const formatTime = (dateString) => {
    const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000);
    if (diffMins < 1) return 'now'; if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`; return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const displayedNotifications = activeTab === 'All' ? notifications : notifications.filter(n => !n.is_read);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}><Ionicons name="arrow-back" size={28} color="#333" /></TouchableOpacity>
        <View><Text style={styles.headerTitle}>Notifications</Text><Text style={styles.headerSubtitle}>{unreadCount} unread notifications</Text></View>
      </View>

      <View style={styles.contentPad}>
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}><Ionicons name="checkmark-done" size={18} color="#333" style={{marginRight: 8}} /><Text style={styles.markAllText}>Mark all as read</Text></TouchableOpacity>
          <View style={styles.tabsContainer}>
              <TouchableOpacity style={[styles.tabBtn, activeTab === 'All' && styles.activeTab]} onPress={() => setActiveTab('All')}><Text style={[styles.tabText, activeTab === 'All' && styles.activeTabText]}>All ({notifications.length})</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.tabBtn, activeTab === 'Unread' && styles.activeTab]} onPress={() => setActiveTab('Unread')}><Text style={[styles.tabText, activeTab === 'Unread' && styles.activeTabText]}>Unread ({unreadCount})</Text></TouchableOpacity>
          </View>
      </View>

      <FlatList
        data={displayedNotifications}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>You're all caught up!</Text>}
        renderItem={({ item }) => {
          const content = getNotificationContent(item);
          const isUnread = !item.is_read;
          return (
            <TouchableOpacity style={[styles.notifCard, isUnread && styles.notifCardUnread]} activeOpacity={0.7} onPress={() => { if (isUnread) markAsRead(item.id); if (item.action.includes('contact')) router.push({ pathname: '/chat', params: { chatUser: item.actor_name } }); }}>
              <Image source={{ uri: item.actor_avatar }} style={styles.avatar} />
              <View style={styles.textContainer}><Text style={styles.titleText}>{content.title}</Text><Text style={styles.bodyText} numberOfLines={2}>{content.body}</Text><View style={styles.timeContainer}><Ionicons name="time-outline" size={14} color="#999" style={{marginRight: 4}} /><Text style={styles.timeText}>{formatTime(item.created_at)}</Text></View></View>
              <View style={styles.actionsContainer}>
                  {isUnread && (<TouchableOpacity onPress={() => markAsRead(item.id)} style={{marginBottom: 15}}><Ionicons name="checkmark" size={22} color="#007C00" /></TouchableOpacity>)}
                  <TouchableOpacity onPress={() => deleteNotification(item.id)}><Ionicons name="trash-outline" size={20} color="#999" /></TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' }, header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 15, paddingHorizontal: 20 }, headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#111' }, headerSubtitle: { fontSize: 14, color: '#666', marginTop: 2 }, contentPad: { paddingHorizontal: 20 }, markAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F7FA', paddingVertical: 12, borderRadius: 12, marginBottom: 15 }, markAllText: { fontSize: 14, fontWeight: '600', color: '#333' }, tabsContainer: { flexDirection: 'row', backgroundColor: '#F5F7FA', borderRadius: 25, padding: 4, marginBottom: 20 }, tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 }, activeTab: { backgroundColor: 'white', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }, tabText: { fontSize: 14, fontWeight: '500', color: '#666' }, activeTabText: { color: '#333', fontWeight: 'bold' },
  notifCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eee', alignItems: 'flex-start' }, notifCardUnread: { borderColor: '#A5D6A7', borderLeftWidth: 5, borderLeftColor: '#007C00', backgroundColor: '#F9FBE7' }, avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#eee' }, textContainer: { flex: 1, marginRight: 10 }, titleText: { fontSize: 15, fontWeight: 'bold', color: '#222', marginBottom: 4 }, bodyText: { fontSize: 13, color: '#555', lineHeight: 18 }, timeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 }, timeText: { fontSize: 12, color: '#999' }, actionsContainer: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 }, emptyText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 15 }
});