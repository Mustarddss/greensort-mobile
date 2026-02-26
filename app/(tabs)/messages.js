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

  useEffect(() => { fetchChats(); }, []);

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
      const uniqueChats = [];
      const chatSet = new Set();
      data.forEach(msg => {
        const otherPerson = msg.sender_name === currentName ? msg.receiver_name : msg.sender_name;
        if (!chatSet.has(otherPerson)) {
          chatSet.add(otherPerson);
          uniqueChats.push({ 
            chatUser: otherPerson, latestMessage: msg.text, time: msg.created_at,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(otherPerson)}&background=E8F5E9&color=00C853&bold=true` 
          });
        }
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
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`; return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}><Text style={styles.headerTitle}>Messages</Text></View>
      <View style={styles.searchBar}><Ionicons name="search" size={20} color="#999" /><Text style={{color: '#999', marginLeft: 10}}>Search conversations...</Text></View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.chatUser}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No active conversations.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatCard} onPress={() => router.push({ pathname: '/chat', params: { chatUser: item.chatUser } })}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={{ flex: 1, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.chatName}>{item.chatUser}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name="time-outline" size={12} color="#999" style={{marginRight: 2}} /><Text style={styles.timeText}>{formatTime(item.time)}</Text></View>
                </View>
                <Text style={styles.latestMessage} numberOfLines={1}>{item.latestMessage}</Text>
            </View>
            <TouchableOpacity style={{paddingLeft: 10}}><Ionicons name="ellipsis-vertical" size={20} color="#999" /></TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' }, header: { backgroundColor: 'white', paddingBottom: 15, paddingHorizontal: 20 }, headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' }, searchBar: { backgroundColor: '#F5F7FA', marginHorizontal: 20, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, chatCard: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F7FA', alignItems: 'center' }, avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 }, chatName: { fontSize: 16, fontWeight: 'bold', color: '#333' }, latestMessage: { fontSize: 14, color: '#666', marginTop: 4 }, timeText: { fontSize: 12, color: '#999' }, emptyText: { textAlign: 'center', color: '#999', marginTop: 50 }
});