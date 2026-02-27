import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, StatusBar, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MessagesList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [myName, setMyName] = useState('');

  useEffect(() => { 
      fetchChats(); 

      // 🟢 FIX: Ginawang '*' ang event para makinig siya sa BAGONG message (INSERT) at sa NABASANG message (UPDATE)
      const msgChannel = supabase.channel('realtime-msg-list')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
           fetchChats();
        }).subscribe();

      return () => { supabase.removeChannel(msgChannel); };
  }, []);

  const fetchChats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const currentName = session.user.user_metadata?.full_name;
    setMyName(currentName);

    const { data } = await supabase.from('messages')
      .select('*')
      .or(`sender_name.eq.${currentName},receiver_name.eq.${currentName}`)
      .order('created_at', { ascending: false });

    if (data) {
      const chatMap = new Map();

      data.forEach(msg => {
        const otherPerson = msg.sender_name === currentName ? msg.receiver_name : msg.sender_name;

        if (!chatMap.has(otherPerson)) {
          chatMap.set(otherPerson, { 
            chatUser: otherPerson, 
            latestMessageOriginal: msg.text,
            latestImageUrl: msg.image_url, // 🟢 FIX: Kinuha natin kung may image ba o wala
            time: msg.created_at,
            unreadCount: 0, 
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(otherPerson)}&background=E8F5E9&color=00C853&bold=true` 
          });
        }

        // Bilangin ang unread na padala sa'yo
        if (msg.receiver_name === currentName && msg.is_read === false) {
           chatMap.get(otherPerson).unreadCount += 1;
        }
      });

      // 🟢 FORMAT THE PREVIEW MESSAGE
      const uniqueChats = Array.from(chatMap.values()).map(chat => {
          let displayMsg = chat.latestMessageOriginal;
          
          if (chat.unreadCount > 1) {
              displayMsg = `${chat.unreadCount} new messages`;
          } else if (chat.latestImageUrl) { // 🟢 FIX: Dito na titingin kung may image, HINDI sa Like icon
              displayMsg = 'Sent an attachment.';
          }
          
          return { ...chat, displayMessage: displayMsg };
      });

      setChats(uniqueChats);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchChats(); setRefreshing(false);
  }, []);

  const formatTime = (dateString) => {
    const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000);
    if (diffMins < 1) return 'now'; if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`; 
    return new Date(dateString).toLocaleDateString([], { weekday: 'short' }).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
          <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <Text style={{color: '#999', marginLeft: 10}}>Search conversations...</Text>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.chatUser}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No active conversations.</Text>}
        renderItem={({ item }) => {
          const isUnread = item.unreadCount > 0;

          return (
            <TouchableOpacity style={styles.chatCard} onPress={() => router.push({ pathname: '/chat', params: { chatUser: item.chatUser } })}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              
              <View style={{ flex: 1, justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.chatName, isUnread && styles.unreadText]}>{item.chatUser}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.timeText, isUnread && {color: '#00C853', fontWeight: 'bold'}]}>{formatTime(item.time)}</Text>
                      </View>
                  </View>

                  <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingRight: 10}}>
                      <Text style={[styles.latestMessage, isUnread && styles.unreadText]} numberOfLines={1}>
                          {item.displayMessage}
                      </Text>
                      {isUnread && <View style={styles.unreadDot} />}
                  </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' }, 
  header: { backgroundColor: 'white', paddingBottom: 15, paddingHorizontal: 20 }, 
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' }, 
  searchBar: { backgroundColor: '#F5F7FA', marginHorizontal: 20, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, 
  chatCard: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F7FA', alignItems: 'center' }, 
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 15 }, 
  chatName: { fontSize: 16, fontWeight: '500', color: '#444' }, 
  latestMessage: { fontSize: 14, color: '#666', flex: 1 }, 
  timeText: { fontSize: 12, color: '#999' }, 
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50 },
  unreadText: { fontWeight: '900', color: '#000' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00C853', marginLeft: 8 }
});