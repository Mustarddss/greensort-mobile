import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function CollectorInbox() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatId, setSelectedChatId] = useState(null); 

  useEffect(() => {
    let isMounted = true;
    let messageChannel;

    const fetchSessionAndInbox = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return router.replace('/login');

      const officerName = session.user.user_metadata?.full_name;
      const userEmail = session.user.email;

      const fetchUniqueChats = async () => {
          const { data: profile } = await supabase
              .from('dropoff_applications')
              .select('program_name, applicant_name')
              .eq('user_email', userEmail)
              .single();

          const programName = profile?.program_name || '';
          const applicantName = profile?.applicant_name || '';

          const myAliases = [officerName, programName, applicantName].filter(Boolean);
          const orQuery = myAliases.map(alias => `sender_name.eq."${alias}",receiver_name.eq."${alias}"`).join(',');

          const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .or(orQuery)
            .order('created_at', { ascending: false });

          if (error) {
              console.log("Error fetching inbox: ", error);
              return;
          }

          const conversationsMap = new Map();

          messages?.forEach(msg => {
              const otherUser = myAliases.includes(msg.sender_name) ? msg.receiver_name : msg.sender_name;
              const isMe = myAliases.includes(msg.sender_name);
              
              let rawText = msg.text || '';
              let cleanMsg = rawText.split('|||INQUIRY|||')[0].trim();
              
              let inquiryTag = null;
              if (rawText.includes('|||INQUIRY|||')) {
                  try {
                      const context = JSON.parse(rawText.split('|||INQUIRY|||')[1]);
                      inquiryTag = context.rewardName || context.type;
                  } catch(e){}
              }

              if (!conversationsMap.has(otherUser)) {
                  conversationsMap.set(otherUser, {
                      id: `${userEmail}_${otherUser}`, 
                      partnerName: otherUser,
                      lastMessageOriginal: isMe ? (cleanMsg ? `You: ${cleanMsg}` : 'You: ') : cleanMsg,
                      lastMessageTime: msg.created_at,
                      lastImageUrl: msg.image_url,
                      isRead: isMe ? true : msg.is_read,
                      lastSenderIsMe: isMe,
                      inquiryTag: inquiryTag
                  });
              }
          });

          const conversationList = Array.from(conversationsMap.values()).map(chat => {
              let displayMsg = chat.lastMessageOriginal;
              if (chat.lastImageUrl) { 
                  displayMsg = chat.lastSenderIsMe ? 'You sent an attachment.' : 'Sent an attachment.'; 
              } else if (chat.inquiryTag && (displayMsg === 'You: ' || displayMsg === '')) {
                  displayMsg = chat.lastSenderIsMe ? `You sent an inquiry card.` : `Sent an inquiry card.`;
              }
              return { ...chat, displayMessage: displayMsg };
          });

          if(isMounted) {
              setConversations(conversationList);
              setIsLoading(false);
          }
      };

      await fetchUniqueChats();

      // 🟢 FIXED SUPABASE REALTIME ERROR
      messageChannel = supabase.channel(`inbox_center_${Date.now()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
            fetchUniqueChats(); 
        }).subscribe();
    };

    fetchSessionAndInbox();

    return () => {
      isMounted = false;
      if (messageChannel) supabase.removeChannel(messageChannel);
    };
  }, []);

  const formatSmartTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    if(date > lastWeek) return date.toLocaleDateString([], { weekday: 'short' });

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getPartnerAvatar = (partnerName) => `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=random&color=fff&bold=true`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" translucent={false} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{width: 24}} /> 
      </View>

      <View style={styles.body}>
          <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#9AA0A6" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations..."
                placeholderTextColor="#9AA0A6"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
          </View>

          {isLoading ? (
              <View style={[styles.centered, { marginTop: 100 }]}><ActivityIndicator size="large" color="#0066FF" /></View>
          ) : conversations.length === 0 ? (
              <View style={styles.emptyWrap}>
                  <MaterialCommunityIcons name="message-off-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyText}>No messages yet.</Text>
                  <Text style={styles.emptySub}>Your conversations will appear here.</Text>
              </View>
          ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 10, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    const isHighlighted = item.id === selectedChatId; 

                    return (
                        <TouchableOpacity 
                          style={[styles.chatCard, isHighlighted && styles.highlightedCard]}
                          activeOpacity={0.8}
                          onPress={() => {
                                setSelectedChatId(item.id);
                                // 🟢 FIXED THE ROUTING TO ENSURE CHAT USER IS PASSED
                                router.push({ pathname: '/collector-chat', params: { chatUser: item.partnerName } });
                          }}
                        >
                            <View style={styles.avatarWrap}>
                                <Image source={{ uri: getPartnerAvatar(item.partnerName) }} style={styles.avatar} />
                            </View>
                            
                            <View style={styles.detailsWrap}>
                                <View style={styles.nameRow}>
                                    <Text style={[styles.partnerName, !item.isRead && {fontWeight: '800', color: '#111'}]} numberOfLines={1}>{item.partnerName}</Text>
                                    <Text style={[styles.timeText, !item.isRead && {color: '#0066FF', fontWeight: 'bold'}]}>{formatSmartTime(item.lastMessageTime)}</Text>
                                </View>
                                
                                {/* 🟢 EXACT BLUE BADGE DESIGN PARA SA CENTER INBOX */}
                                {item.inquiryTag && (
                                    <View style={styles.inquiryBadge}>
                                        <MaterialCommunityIcons name="tag-text-outline" size={12} color="#0066FF" />
                                        <Text style={styles.inquiryTagText} numberOfLines={1}>
                                            Question about {item.inquiryTag}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.msgRow}>
                                    <Text style={[styles.lastMsg, !item.isRead && { color: '#333', fontWeight: '600' }]} numberOfLines={1}>
                                        {item.displayMessage}
                                    </Text>
                                    {!item.isRead && <View style={styles.unreadDot} />}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
              />
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
      flex: 1, 
      backgroundColor: '#0066FF' 
  }, 
  header: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      paddingHorizontal: 15, 
      paddingBottom: 20, 
      backgroundColor: '#0066FF' 
  },
  headerTitle: { 
      fontSize: 24, 
      fontWeight: '800', 
      color: 'white', 
      letterSpacing: 0.5 
  },
  backBtn: { 
      padding: 5, 
      marginLeft: -5 
  },
  body: { 
      flex: 1, 
      backgroundColor: '#F7F8FA', 
      borderTopLeftRadius: 30, 
      borderTopRightRadius: 30, 
      overflow: 'hidden' 
  },
  searchContainer: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: '#FFFFFF', 
      borderRadius: 14, 
      margin: 15, 
      paddingHorizontal: 12, 
      height: 48, 
      borderWidth: 1, 
      borderColor: '#ECEFF1', 
      elevation: 1 
  },
  searchIcon: { 
      marginRight: 10 
  },
  searchInput: { 
      flex: 1, 
      fontSize: 15, 
      color: '#1C1C1E' 
  },
  chatCard: { 
      flexDirection: 'row', 
      backgroundColor: '#FFFFFF', 
      borderRadius: 20, 
      padding: 15, 
      marginBottom: 10, 
      alignItems: 'center', 
      borderWidth: 1, 
      borderColor: 'transparent', 
      elevation: 1 
  },
  highlightedCard: { 
      borderColor: '#0066FF', 
      backgroundColor: '#F4F9FF' 
  },
  avatarWrap: { 
      position: 'relative', 
      marginRight: 15 
  },
  avatar: { 
      width: 56, 
      height: 56, 
      borderRadius: 28, 
      backgroundColor: '#e0e0e0' 
  },
  detailsWrap: { 
      flex: 1, 
      justifyContent: 'center' 
  },
  nameRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: 2 
  },
  partnerName: { 
      fontSize: 16, 
      fontWeight: '700', 
      color: '#1C1C1E', 
      flex: 1, 
      marginRight: 10 
  },
  timeText: { 
      fontSize: 12, 
      color: '#757575' 
  },
  
  // 🟢 BLUE BADGE DESIGN
  inquiryBadge: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: '#FFFFFF', 
      borderWidth: 1, 
      borderColor: '#0066FF', 
      paddingHorizontal: 8, 
      paddingVertical: 3, 
      borderRadius: 12, 
      alignSelf: 'flex-start', 
      marginTop: 3, 
      marginBottom: 3, 
      gap: 4 
  },
  inquiryTagText: { 
      fontSize: 10, 
      fontWeight: 'bold', 
      color: '#0066FF' 
  },

  msgRow: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingRight: 10 
  },
  lastMsg: { 
      fontSize: 13, 
      color: '#757575', 
      flex: 1 
  },
  unreadDot: { 
      width: 10, 
      height: 10, 
      borderRadius: 5, 
      backgroundColor: '#0066FF', 
      marginLeft: 10 
  },
  centered: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center' 
  },
  emptyWrap: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginTop: 100, 
      paddingHorizontal: 40 
  },
  emptyText: { 
      fontSize: 18, 
      fontWeight: 'bold', 
      color: '#333', 
      marginTop: 20 
  },
  emptySub: { 
      fontSize: 14, 
      color: '#757575', 
      textAlign: 'center', 
      marginTop: 10 
  }
});