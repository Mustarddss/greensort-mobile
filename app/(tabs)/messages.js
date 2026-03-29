import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function MessagesList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');

  useEffect(() => { 
      fetchChats(); 
      const msgChannel = supabase.channel('realtime-msg-list')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
           fetchChats();
        }).subscribe();
      return () => { supabase.removeChannel(msgChannel); };
  }, []);

  const fetchChats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const myName = session.user.user_metadata?.full_name;
    setCurrentUserName(myName);

    const { data: messages } = await supabase.from('messages')
      .select('*')
      .or(`sender_name.eq."${myName}",receiver_name.eq."${myName}"`)
      .order('created_at', { ascending: false });

    if (messages) {
      const chatMap = new Map();
      const otherUserNames = [...new Set(messages.map(m => m.sender_name === myName ? m.receiver_name : m.sender_name))];
      
      const { data: profileAvatars } = await supabase.from('profiles').select('full_name, avatar_url').in('full_name', otherUserNames);
      const { data: postAvatars } = await supabase.from('posts').select('user, avatar').in('user', otherUserNames);

      const avatarLookup = {};
      postAvatars?.forEach(p => { avatarLookup[p.user] = p.avatar; }); 
      profileAvatars?.forEach(p => { avatarLookup[p.full_name] = p.avatar_url; }); 

      const { data: notifs } = await supabase.from('notifications')
        .select('actor_name, owner_name, post_title')
        .eq('action', 'wants to contact you about')
        .or(`actor_name.eq."${myName}",owner_name.eq."${myName}"`)
        .order('created_at', { ascending: false });

      const inquiryLookup = {};
      notifs?.forEach(n => {
          const other = n.actor_name === myName ? n.owner_name : n.actor_name;
          if (!inquiryLookup[other]) inquiryLookup[other] = n.post_title;
      });

      messages.forEach(msg => {
        const otherPerson = msg.sender_name === myName ? msg.receiver_name : msg.sender_name;
        const isMe = msg.sender_name === myName;

        if (!chatMap.has(otherPerson)) {
          chatMap.set(otherPerson, { 
            chatUser: otherPerson, 
            latestMessageOriginal: msg.text ? (isMe ? `You: ${msg.text}` : msg.text) : '',
            latestImageUrl: msg.image_url, 
            time: msg.created_at,
            unreadCount: 0, 
            avatar: avatarLookup[otherPerson] || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherPerson)}&background=007C00&color=fff&bold=true`,
            postTitle: inquiryLookup[otherPerson] || null
          });
        }
        if (msg.receiver_name === myName && !msg.is_read) {
           chatMap.get(otherPerson).unreadCount += 1;
        }
      });

      const uniqueChats = Array.from(chatMap.values()).map(chat => {
          let displayMsg = chat.latestMessageOriginal;
          if (chat.unreadCount > 1) { displayMsg = `${chat.unreadCount} new messages`; }
          else if (chat.latestImageUrl) { displayMsg = chat.latestMessageOriginal.includes('You:') ? 'You sent an attachment.' : 'Sent an attachment.'; }
          return { ...chat, displayMessage: displayMsg };
      });
      setChats(uniqueChats);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchChats(); setRefreshing(false);
  }, []);

  const filteredChats = chats.filter(chat => chat.chatUser.toLowerCase().includes(searchQuery.toLowerCase()));

  const formatTime = (dateString) => {
    const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000);
    if (diffMins < 1) return 'now'; if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`; 
    return new Date(dateString).toLocaleDateString([], { weekday: 'short' }).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
          <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={{alignItems: 'center'}}>
                  <Text style={styles.headerTitle}>Messages</Text>
              </View>
              <View style={{ width: 40 }} />
          </View>
      </View>

      <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput 
              style={styles.searchInput} 
              placeholder="Search conversations..." 
              placeholderTextColor="#999" 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
          />
          {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#ccc" />
              </TouchableOpacity>
          )}
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.chatUser}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        // 🟢 PINNED AI CHATBOT AT THE TOP OF THE LIST
        ListHeaderComponent={() => (
          <TouchableOpacity 
            style={[styles.chatCard, { backgroundColor: '#E8F5E9', borderColor: '#007C00', borderWidth: 1, marginBottom: 15 }]} 
            onPress={() => router.push({ pathname: '/chat', params: { chatUser: 'GreenSort AI Assistant', isBot: 'true' } })}
          >
            <View style={[styles.avatar, { backgroundColor: '#007C00', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="sparkles" size={28} color="white" />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.chatName, {color: '#007C00'}]}>🤖 GreenSort AI Assistant</Text>
                    <View style={{backgroundColor: '#007C00', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10}}>
                        <Text style={{color: 'white', fontSize: 9, fontWeight: 'bold'}}>ONLINE</Text>
                    </View>
                </View>
                <Text style={[styles.latestMessage, {color: '#2E7D32', marginTop: 4}]} numberOfLines={1}>
                    Ask me anything about recycling!
                </Text>
            </View>
          </TouchableOpacity>
        )}
        renderItem={({ item }) => {
          const isUnread = item.unreadCount > 0;
          return (
            <TouchableOpacity style={styles.chatCard} onPress={() => router.push({ pathname: '/chat', params: { chatUser: item.chatUser, postTitle: item.postTitle } })}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={{ flex: 1, justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.chatName, isUnread ? styles.unreadText : null]}>{item.chatUser}</Text>
                      <Text style={[styles.timeText, isUnread ? {color: '#007C00', fontWeight: 'bold'} : null]}>{formatTime(item.time)}</Text>
                  </View>

                  {item.postTitle && (
                    <View style={styles.inquiryBadge}>
                        <Ionicons name="leaf" size={10} color="#007C00" />
                        <Text style={styles.inquiryText} numberOfLines={1}>Inquiring: {item.postTitle}</Text>
                    </View>
                  )}

                  <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingRight: 10}}>
                      <Text style={[styles.latestMessage, isUnread ? styles.unreadText : null]} numberOfLines={1}>{item.displayMessage}</Text>
                      {isUnread ? <View style={styles.unreadDot} /> : null}
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
  container: { flex: 1, backgroundColor: '#F5F7FA' }, 
  header: { backgroundColor: '#007C00', paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5, zIndex: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
  searchBar: { backgroundColor: '#ffffff', marginHorizontal: 20, marginTop: 20, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }, 
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#333' },
  chatCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, alignItems: 'center' }, 
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 15, backgroundColor: '#eee' }, 
  chatName: { fontSize: 16, fontWeight: '600', color: '#333' }, 
  latestMessage: { fontSize: 13, color: '#777', flex: 1 }, 
  timeText: { fontSize: 11, color: '#999' }, 
  unreadText: { fontWeight: '900', color: '#000' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#007C00', marginLeft: 8 },
  inquiryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4, gap: 4 },
  inquiryText: { fontSize: 10, color: '#007C00', fontWeight: 'bold' }
});