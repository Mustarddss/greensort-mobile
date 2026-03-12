import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, RefreshControl, StatusBar, TouchableOpacity, Modal, ScrollView } from 'react-native';
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

  const [selectedAdminNotif, setSelectedAdminNotif] = useState(null);

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

  const getNotificationDetails = (item) => {
    if (item.action.includes('approved your report')) {
      const noteParts = item.action.split('Note: ');
      return { 
        title: 'Report Approved', 
        body: noteParts[1] ? noteParts[1] : `Admin approved your report on "${item.post_title}"`,
        iconName: 'shield-check', iconColor: '#00C853', bgColor: '#E8F5E9', isAdmin: true
      };
    }
    if (item.action.includes('declined your report')) {
      const noteParts = item.action.split('Note: ');
      return { 
        title: 'Report Reviewed', 
        body: noteParts[1] ? noteParts[1] : `Admin reviewed your report on "${item.post_title}"`,
        iconName: 'shield-alert-outline', iconColor: '#F57C00', bgColor: '#FFF3E0', isAdmin: true
      };
    }
    if (item.action === 'liked') return { 
        title: 'New Like', body: `${item.actor_name} liked your post "${item.post_title}"`,
        iconName: 'heart', iconColor: '#FF1744', bgColor: '#FFEBEE', isAdmin: false
    };
    if (item.action.includes('comment') || item.action.includes('replied')) return { 
        title: 'New Comment', body: `${item.actor_name} commented on "${item.post_title}"`,
        iconName: 'comment-text-multiple', iconColor: '#2979FF', bgColor: '#E3F2FD', isAdmin: false
    };
    return { 
        title: 'Message Request', body: `${item.actor_name} wants to contact you about "${item.post_title}"`,
        iconName: 'chat', iconColor: '#00C853', bgColor: '#E8F5E9', isAdmin: false
    };
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
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      
      {/* 🟢 HEADER ADJUSTED TO MATCH DASHBOARD EXACT HEIGHT */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
          <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={{alignItems: 'center'}}>
                  <Text style={styles.headerTitle}>Notifications</Text>
                  {/* 🟢 IDINAGDAG NA SUBTITLE PARA PUMANTAY SA 2-LINES NG DASHBOARD */}
                  <Text style={styles.headerSubtitle}>Recent updates & alerts</Text>
              </View>
              <View style={{ width: 40 }} />
          </View>
      </View>

      <View style={styles.tabsContainer}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.filterPill, activeTab === 'All' && styles.activePill]} onPress={() => setActiveTab('All')}>
                  <Text style={[styles.filterText, activeTab === 'All' && styles.activeFilterText]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterPill, activeTab === 'Unread' && styles.activePill]} onPress={() => setActiveTab('Unread')}>
                  <Text style={[styles.filterText, activeTab === 'Unread' && styles.activeFilterText]}>
                      Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
                  </Text>
              </TouchableOpacity>
          </View>

          {unreadCount > 0 && (
              <TouchableOpacity style={styles.markAllTabsBtn} onPress={markAllAsRead}>
                  <Ionicons name="checkmark-done-circle-outline" size={18} color="#007C00" style={{marginRight: 4}} />
                  <Text style={styles.markAllTabsText}>Mark all read</Text>
              </TouchableOpacity>
          )}
      </View>

      <FlatList
        data={displayedNotifications}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00C853']} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBg}><Ionicons name="notifications-off-outline" size={40} color="#00C853" /></View>
                <Text style={styles.emptyTitle}>You're all caught up!</Text>
                <Text style={styles.emptySub}>Check back later for new updates and alerts.</Text>
            </View>
        }
        renderItem={({ item }) => {
          const details = getNotificationDetails(item);
          const isUnread = !item.is_read;
          
          return (
            <TouchableOpacity 
                style={[styles.notifCard, isUnread && styles.notifCardUnread]} 
                activeOpacity={0.7} 
                onPress={() => { 
                    if (isUnread) markAsRead(item.id); 
                    
                    if (details.isAdmin) {
                        setSelectedAdminNotif(details);
                    } 
                    else if (item.action.includes('contact')) {
                        router.push({ pathname: '/chat', params: { chatUser: item.actor_name } }); 
                    }
                }}
            >
              <View style={styles.avatarContainer}>
                  <Image source={{ uri: item.actor_avatar }} style={styles.avatar} />
                  <View style={[styles.iconBadge, {backgroundColor: details.iconColor}]}>
                      <MaterialCommunityIcons name={details.iconName} size={10} color="white" />
                  </View>
              </View>

              <View style={styles.textContainer}>
                  <Text style={styles.titleText}>{details.title}</Text>
                  <Text style={[styles.bodyText, isUnread && {color: '#222', fontWeight: '500'}]} numberOfLines={3}>
                      {details.body}
                  </Text>
                  <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
              </View>

              <View style={styles.actionsContainer}>
                  {isUnread && <View style={styles.unreadDot} />}
                  <TouchableOpacity onPress={() => deleteNotification(item.id)} style={styles.deleteBtn}>
                      <Ionicons name="close" size={20} color="#999" />
                  </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={!!selectedAdminNotif} animationType="fade" transparent={true} onRequestClose={() => setSelectedAdminNotif(null)}>
        <View style={styles.modalOverlay}>
            <View style={styles.letterContainer}>
                <View style={styles.logoWrapper}>
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1892/1892747.png' }} style={styles.letterLogo} />
                </View>
                <Text style={styles.greetingText}>GREETINGS FROM GREENSORT ADMIN</Text>
                <View style={styles.divider} />
                <ScrollView style={styles.letterBodyScroll} showsVerticalScrollIndicator={false}>
                    <Text style={styles.letterBodyText}>
                        {selectedAdminNotif?.body}
                    </Text>
                </ScrollView>
                <View style={styles.divider} />
                <View style={styles.letterFooter}>
                    <Text style={styles.regardsText}>Best regards,</Text>
                    <Text style={styles.adminNameText}>GreenSort Admin</Text>
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1892/1892747.png' }} style={styles.letterLogoSmall} />
                </View>
                <TouchableOpacity style={styles.closeLetterBtn} onPress={() => setSelectedAdminNotif(null)}>
                    <Text style={styles.closeLetterBtnText}>Close Message</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, 
  
  // 🟢 ADJUSTED PADDING PARA TUGMA SA DASHBOARD HEIGHT
  header: { backgroundColor: '#007C00', paddingBottom: 25, paddingHorizontal: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 4, zIndex: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 }, // Idinagdag para may 2nd line
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },

  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, marginBottom: 15, justifyContent: 'space-between', alignItems: 'center' }, 
  filterPill: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: 'white', borderRadius: 20, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, borderWidth: 1, borderColor: '#eee' },
  activePill: { backgroundColor: '#007C00', borderColor: '#007C00' },
  filterText: { fontSize: 13, color: '#666', fontWeight: '600' },
  activeFilterText: { color: 'white' },
  
  markAllTabsBtn: { flexDirection: 'row', alignItems: 'center' },
  markAllTabsText: { fontSize: 13, fontWeight: 'bold', color: '#007C00' },

  notifCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }, 
  notifCardUnread: { backgroundColor: '#F0FDF4', borderColor: '#C8E6C9', borderWidth: 1 }, 
  avatarContainer: { position: 'relative', marginRight: 15 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' }, 
  iconBadge: { position: 'absolute', bottom: -2, right: -4, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  textContainer: { flex: 1, marginRight: 10, justifyContent: 'center' }, 
  titleText: { fontSize: 14, fontWeight: 'bold', color: '#111', marginBottom: 3 }, 
  bodyText: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 6 }, 
  timeText: { fontSize: 11, color: '#999', fontWeight: '500' }, 
  actionsContainer: { alignItems: 'flex-end', justifyContent: 'space-between' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00C853', marginTop: 5 },
  deleteBtn: { padding: 5, marginTop: 10 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#999', textAlign: 'center', paddingHorizontal: 40 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  letterContainer: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10, maxHeight: '80%' },
  logoWrapper: { alignItems: 'center', marginBottom: 15 },
  letterLogo: { width: 60, height: 60, resizeMode: 'contain' },
  greetingText: { fontSize: 16, fontWeight: '900', color: '#00C853', textAlign: 'center', letterSpacing: 1, marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#E0E0E0', width: '100%', marginVertical: 10 },
  letterBodyScroll: { marginVertical: 10 },
  letterBodyText: { fontSize: 15, color: '#444', lineHeight: 24, textAlign: 'justify' },
  letterFooter: { alignItems: 'center', marginTop: 15, marginBottom: 20 },
  regardsText: { fontSize: 14, color: '#666', fontStyle: 'italic', marginBottom: 2 },
  adminNameText: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 10 },
  letterLogoSmall: { width: 30, height: 30, resizeMode: 'contain', opacity: 0.8 },
  closeLetterBtn: { backgroundColor: '#F5F7FA', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  closeLetterBtnText: { color: '#555', fontSize: 14, fontWeight: 'bold' }
});