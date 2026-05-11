import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Keyboard, Modal, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function MessagesList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');

  // 🟢 STATES PARA SA OPTIONS AT REPORT
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [reportStep, setReportStep] = useState(0); // 0 = Menu (Report/Delete), 1 = Reasons, 2 = Confirm
  const [selectedMainReason, setSelectedMainReason] = useState(null);
  const [reportAdditionalInfo, setReportAdditionalInfo] = useState('');

  const userReportReasons = [
    "Harassment or bullying",
    "Scam or fraud attempt",
    "Spamming messages",
    "Inappropriate or offensive language",
    "Fake account or impersonation"
  ];

  useEffect(() => {
  fetchChats();

  // ✅ Unique realtime channel para walang duplicate callback issue
  const uniqueChannelName = `realtime-msg-list-${Date.now()}`;

  // ✅ REGISTER EVENTS FIRST
  const msgChannel = supabase
    .channel(uniqueChannelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      () => {
        fetchChats();
      }
    );

  // ✅ SUBSCRIBE AFTER .on()
  msgChannel.subscribe((status) => {
    console.log('Messages realtime status:', status);
  });

  // ✅ CLEANUP PARA DI MAG STACK CALLBACKS
  return () => {
    supabase.removeChannel(msgChannel);
  };
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
            latestMessageOriginal: msg.text ? (isMe ? `You: ${msg.text.replace('|||INQUIRY|||', '').replace(/\{.*\}/, '')}` : msg.text.replace('|||INQUIRY|||', '').replace(/\{.*\}/, '')) : '',
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
          else if (!chat.latestMessageOriginal && chat.postTitle) { displayMsg = chat.latestMessageOriginal.includes('You:') ? `You inquired about ${chat.postTitle}` : `Inquiring about ${chat.postTitle}`; }
          return { ...chat, displayMessage: displayMsg };
      });
      setChats(uniqueChats);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchChats(); setRefreshing(false);
  }, []);

  // 🟢 LONG PRESS TRIGGER - STEP 0 (OPTIONS MENU)
  const handleLongPressChat = (userName) => {
    if (userName === 'GreenSort AI Assistant') return; 
    setSelectedChatUser(userName);
    setReportStep(0); // Magsisimula sa options menu
    setOptionsModalVisible(true);
  };

  // 🟢 DELETE CHAT FUNCTION
  const handleDeleteChat = () => {
      setOptionsModalVisible(false);
      Alert.alert(
          "Delete Chat",
          `Are you sure you want to permanently delete your conversation with ${selectedChatUser}?`,
          [
              { text: "Cancel", style: "cancel" },
              { 
                  text: "Delete", 
                  style: "destructive", 
                  onPress: async () => {
                      try {
                          const { error } = await supabase.from('messages')
                              .delete()
                              .or(`and(sender_name.eq."${currentUserName}",receiver_name.eq."${selectedChatUser}"),and(sender_name.eq."${selectedChatUser}",receiver_name.eq."${currentUserName}")`);
                          
                          if (error) throw error;
                          
                          fetchChats(); // I-refresh ang listahan
                          Alert.alert("Deleted", "Conversation has been removed.");
                      } catch (e) {
                          Alert.alert("Error", "Failed to delete conversation.");
                      }
                  }
              }
          ]
      );
  };

  const submitUserReport = async (reasonStr) => {
    const finalReason = reportAdditionalInfo.trim() ? `${reasonStr} - Details: ${reportAdditionalInfo}` : reasonStr;
    
    try {
        const { error } = await supabase.from('user_reports').insert([{
            reported_user: selectedChatUser,
            reporter_email: currentUserName,
            reason: finalReason,
            status: 'Pending'
        }]);
        
        if (error) throw error;
        Alert.alert("Report Sent", `You have successfully reported ${selectedChatUser}. Our admins will review this shortly.`);
    } catch (e) {
        Alert.alert("Error", e.message);
    } finally {
        setOptionsModalVisible(false);
        setSelectedChatUser(null);
        setReportStep(0);
        setSelectedMainReason(null);
        setReportAdditionalInfo('');
    }
  };

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
        keyboardShouldPersistTaps="handled"
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
            <TouchableOpacity 
              style={styles.chatCard} 
              onPress={() => router.push({ pathname: '/chat', params: { chatUser: item.chatUser, postTitle: item.postTitle || '' } })}
              onLongPress={() => handleLongPressChat(item.chatUser)} 
              delayLongPress={500} 
            >
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              <View style={{ flex: 1, justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.chatName, isUnread ? styles.unreadText : null]}>{item.chatUser}</Text>
                      <Text style={[styles.timeText, isUnread ? {color: '#007C00', fontWeight: 'bold'} : null]}>{formatTime(item.time)}</Text>
                  </View>

                  {item.postTitle && (
                    <View style={styles.inquiryBadge}>
                        <Ionicons name="leaf-outline" size={13} color="#007C00" />
                        <Text style={styles.inquiryText} numberOfLines={1}>
                            Inquiring: <Text style={{fontWeight: 'bold'}}>{item.postTitle}</Text>
                        </Text>
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

      {/* 🟢 UNIVERSAL OPTIONS/REPORT MODAL */}
      <Modal visible={optionsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setOptionsModalVisible(false)}>
        <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.darkModalSheet}>
            <View style={{width: 40, height: 5, backgroundColor: '#555', borderRadius: 5, alignSelf: 'center', marginTop: 15, marginBottom: 20}} />
            
            {/* 🟢 STEP 0: OPTIONS MENU (Report User / Delete Chat) */}
            {reportStep === 0 && selectedChatUser && (
              <View style={{marginBottom: 15}}>
                  <View style={styles.darkMenuContainer}>
                      <TouchableOpacity style={styles.darkMenuItemMenu} onPress={() => setReportStep(1)}>
                          <Ionicons name="warning-outline" size={22} color="#FF9800" style={{marginRight: 15}} />
                          <Text style={styles.darkMenuTextMenu}>Report {selectedChatUser}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.darkMenuItemMenu, { borderBottomWidth: 0 }]} onPress={handleDeleteChat}>
                          <Ionicons name="trash-outline" size={22} color="#FF3B30" style={{marginRight: 15}} />
                          <Text style={[styles.darkMenuTextMenu, { color: '#FF3B30', fontWeight: 'bold' }]}>Delete Chat</Text>
                      </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.darkCancelBtn} onPress={() => setOptionsModalVisible(false)}>
                      <Text style={{color: '#fff', fontWeight: 'bold'}}>Cancel</Text>
                  </TouchableOpacity>
              </View>
            )}

            {/* 🟢 STEP 1: REPORT REASONS */}
            {reportStep === 1 && (
              <View style={{marginBottom: 15}}>
                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 5, textAlign: 'center'}}>Report {selectedChatUser}</Text>
                <Text style={{fontSize: 13, color: '#aaa', marginBottom: 15, textAlign: 'center'}}>Why are you reporting this user?</Text>
                
                {userReportReasons.map((reason, index) => (
                  <TouchableOpacity key={index} style={[styles.darkMenuItem, { borderRadius: index === 0 ? 12 : 0, borderTopLeftRadius: index === 0 ? 12 : 0, borderTopRightRadius: index === 0 ? 12 : 0, borderBottomLeftRadius: index === userReportReasons.length -1 ? 12 : 0, borderBottomRightRadius: index === userReportReasons.length -1 ? 12 : 0 }]} onPress={() => { setSelectedMainReason(reason); setReportStep(2); }}>
                    <Text style={styles.darkMenuText}>{reason}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 15}]} onPress={() => setReportStep(0)}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 🟢 STEP 2: CONFIRM REPORT */}
            {reportStep === 2 && selectedMainReason && (
              <View style={{marginBottom: 15}}>
                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center'}}>Confirm Report</Text>
                <View style={{backgroundColor: '#2C2C2E', padding: 20, borderRadius: 15, marginBottom: 15}}>
                    <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>{selectedMainReason}</Text>
                </View>

                <TextInput 
                    style={styles.darkTextInput}
                    placeholder="Add additional details (optional)..."
                    placeholderTextColor="#888"
                    multiline={true}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    value={reportAdditionalInfo}
                    onChangeText={setReportAdditionalInfo}
                />

                <TouchableOpacity style={{backgroundColor: '#FF3B30', padding: 18, borderRadius: 15, alignItems: 'center'}} onPress={() => submitUserReport(selectedMainReason)}>
                  <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>Submit Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 10}]} onPress={() => setReportStep(1)}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  inquiryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: '#007C00', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start', marginTop: 2, marginBottom: 2, gap: 4 },
  inquiryText: { fontSize: 11, color: '#007C00' },
  
  // 🟢 MODAL STYLES
  darkModalSheet: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingBottom: 35 },
  darkMenuContainer: { backgroundColor: '#2C2C2E', borderRadius: 15, overflow: 'hidden', marginBottom: 15 },
  darkMenuItemMenu: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#3A3A3C' },
  darkMenuTextMenu: { fontSize: 16, color: '#fff' },
  darkMenuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#3A3A3C', backgroundColor: '#2C2C2E' },
  darkMenuText: { fontSize: 16, color: '#fff' },
  darkCancelBtn: { padding: 18, backgroundColor: '#2C2C2E', borderRadius: 15, alignItems: 'center' },
  darkTextInput: { backgroundColor: '#2C2C2E', color: 'white', borderRadius: 12, padding: 15, height: 90, textAlignVertical: 'top', marginBottom: 20, borderWidth: 1, borderColor: '#3A3A3C', fontSize: 15 }
});