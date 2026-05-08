import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const screenWidth = Dimensions.get('window').width;

export default function CollectorChatScreen() {
  const { chatUser, chatUserLocation } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [myPrimaryName, setMyPrimaryName] = useState(''); 
  const [myAliases, setMyAliases] = useState([]);

  const [chatUserAvatar, setChatUserAvatar] = useState(
      `https://ui-avatars.com/api/?name=${encodeURIComponent(chatUser || 'User')}&background=E8F5E9&color=00C853&bold=true`
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true); 
  const [replyingTo, setReplyingTo] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const isNearBottomRef = useRef(true);

  const displayedMessages = useMemo(() => [...messages].slice().reverse(), [messages]);

  useEffect(() => {
    let isMounted = true;
    let messageChannel;

    const fetchSessionAndMessages = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const officerName = session.user.user_metadata?.full_name;
      const userEmail = session.user.email;

      const { data: profile } = await supabase.from('dropoff_applications').select('program_name, applicant_name').eq('user_email', userEmail).single();
      
      const programName = profile?.program_name || '';
      const applicantName = profile?.applicant_name || '';
      const aliases = [officerName, programName, applicantName].filter(Boolean);
      
      if (isMounted) {
          setMyAliases(aliases);
          setMyPrimaryName(programName || officerName); 
      }

      const updateOrQuery = aliases.map(alias => `receiver_name.eq."${alias}"`).join(',');
      await supabase.from('messages').update({ is_read: true }).eq('sender_name', chatUser).or(updateOrQuery);

      if (chatUser) {
          const { data: profileData } = await supabase.from('profiles').select('avatar_url').eq('full_name', chatUser).single();
          if (profileData?.avatar_url && isMounted) setChatUserAvatar(profileData.avatar_url);
      }

      const orQuery = aliases.map(alias => `and(sender_name.eq."${alias}",receiver_name.eq."${chatUser}"),and(sender_name.eq."${chatUser}",receiver_name.eq."${alias}")`).join(',');

      const { data, error } = await supabase.from('messages')
        .select('*')
        .or(orQuery)
        .order('created_at', { ascending: true });

      if (isMounted) {
          const uniqueMessages = Array.from(new Map((data || []).map(m => [m.id, m])).values());
          setMessages(uniqueMessages);
          setIsInitialLoading(false); 
      }
    };

    fetchSessionAndMessages();

    const loadingFallback = setTimeout(() => {
        if (isMounted) setIsInitialLoading(false);
    }, 1500);

    messageChannel = supabase.channel(`collector_chat_${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          
          const isThisChat = myAliases.some(alias => 
              (payload.new.sender_name === alias && payload.new.receiver_name === chatUser) ||
              (payload.new.sender_name === chatUser && payload.new.receiver_name === alias)
          );

          if (isThisChat) {
              setMessages(prev => {
                  if (prev.find(m => m.id === payload.new.id)) return prev;
                  return [...prev, payload.new];
              });
              
              if (payload.new.sender_name === chatUser) {
                  if (isNearBottomRef.current) {
                      requestAnimationFrame(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }));
                  } else {
                      setUnreadCount(c => c + 1);
                  }
                  supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id).then();
              }
          }
      }).subscribe();

    return () => {
      isMounted = false;
      clearTimeout(loadingFallback);
      if (messageChannel) supabase.removeChannel(messageChannel);
    };
  }, [chatUser, myAliases.length]); 

  const handleSend = async (overrideText = null) => {
    let textToSend = overrideText || newMessage;
    if (!textToSend.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
        id: tempId,
        sender_name: myPrimaryName, 
        receiver_name: chatUser, 
        text: textToSend,
        reply_to_text: replyingTo ? replyingTo.text : null,
        reply_to_sender: replyingTo ? replyingTo.sender_name : null,
        is_read: false,
        created_at: new Date().toISOString(),
        status: 'sending'
    };

    setNewMessage('');
    setReplyingTo(null);
    setMessages(prev => [...prev, optimisticMsg]);
    requestAnimationFrame(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }));

    const { data, error } = await supabase.from('messages').insert([{
        sender_name: optimisticMsg.sender_name, 
        receiver_name: optimisticMsg.receiver_name, 
        text: optimisticMsg.text,
        reply_to_text: optimisticMsg.reply_to_text,
        reply_to_sender: optimisticMsg.reply_to_sender,
        is_read: false
    }]).select().single();

    if (error) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
    } else {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...data, status: 'sent' } : m));
    }
  };

  const handleImageSend = async (mode) => {
    let result;
    const options = { mediaTypes: ['images'], allowsEditing: false, quality: 0.6 };

    if (mode === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return Alert.alert("Required", "Camera access is needed.");
        result = await ImagePicker.launchCameraAsync(options);
    } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled) {
        setIsUploading(true);
        const originalUri = result.assets[0].uri;
        let uploadedUrl = originalUri;

        try {
            const formData = new FormData();
            formData.append('file', { uri: originalUri, name: `chat_${Date.now()}.jpg`, type: 'image/jpeg' });
            const { data, error } = await supabase.storage.from('post_images').upload(`chat/${Date.now()}.jpg`, formData);
            if (!error) {
                const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path);
                uploadedUrl = urlData.publicUrl;
            }
        } catch(e) { console.log(e); }

        const msg = { sender_name: myPrimaryName, receiver_name: chatUser, text: 'Sent an image', image_url: uploadedUrl, is_read: false };
        await supabase.from('messages').insert([msg]);
        setIsUploading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatSmartTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true };
    const timeStr = date.toLocaleTimeString([], timeOpts);
    if (isToday) return timeStr;
    const dayStr = date.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
    return `${dayStr} • ${timeStr}`;
  };

  return (
    <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: '#F5F7FA' }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" translucent={false} />

      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 20) + 10 : 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15, padding: 5 }}>
            <Ionicons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>

        <Image 
            source={{uri: chatUserAvatar}} 
            style={{width: 46, height: 46, borderRadius: 23, marginRight: 12, backgroundColor: '#e0e0e0', borderWidth: 2, borderColor: 'white'}} 
        />
        <View style={{flex: 1}}>
            <Text style={styles.headerTitle}>{chatUser}</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={{fontSize: 13, color: 'rgba(255,255,255,0.9)', marginLeft: 3}}>{chatUserLocation || 'User Location'}</Text>
            </View>
        </View>

        <TouchableOpacity style={{padding: 5}}>
            <MaterialCommunityIcons name="dots-vertical" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {isInitialLoading && <ActivityIndicator style={{marginTop: 20}} color="#0066FF" />}

      <FlatList
        ref={flatListRef}
        data={displayedMessages}
        inverted
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 15, paddingTop: 10, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
            const { contentOffset } = e.nativeEvent;
            const nearBottom = contentOffset.y < 100;
            isNearBottomRef.current = nearBottom;
            if (nearBottom && unreadCount > 0) setUnreadCount(0);
        }}
        scrollEventThrottle={100}
        renderItem={({ item, index }) => {
          const isMe = myAliases.includes(item.sender_name);
          const prevItem = index < displayedMessages.length - 1 ? displayedMessages[index + 1] : null;
          
          const timeDiffMins = prevItem ? (new Date(item.created_at) - new Date(prevItem.created_at)) / 60000 : 999;
          
          // 🟢 PARSE INQUIRY DATA
          const textParts = item.text ? item.text.split('|||INQUIRY|||') : [''];
          const actualText = textParts[0].trim();
          let inquiryContext = null;
          if (textParts.length > 1) {
              try { inquiryContext = JSON.parse(textParts[1]); } catch(e){}
          }

          const showTimeHeader = timeDiffMins > 30 || inquiryContext;
          const showBubble = actualText.length > 0 || item.image_url || item.reply_to_text;
          const isThumbsUp = actualText === '👍';

          return (
            <View style={{marginBottom: 15}}>
                
                {/* ⏱ TIME HEADER */}
                {showTimeHeader && (
                    <Text style={styles.timeHeader}>{formatSmartTime(item.created_at)}</Text>
                )}

                {/* 🟢 SYSTEM BANNER & REWARD CARD */}
                {inquiryContext && (
                    <View style={styles.inquirySection}>
                        
                        {/* 🟢 BANNER NA MAKIKITA LANG NI CENTER */}
                        {!isMe && (
                            <Text style={styles.systemContactText}>
                                <Text style={{fontWeight: 'bold'}}>{item.sender_name}</Text> contacted you regarding the {inquiryContext.rewardName || 'Reward'} Reward.
                            </Text>
                        )}

                        <View style={[styles.rewardCard, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                            <View style={styles.rcHeader}>
                                <View style={styles.rcPill}>
                                    <Text style={styles.rcPillText}>✦ GreenSort - Exchange Request</Text>
                                </View>
                                <Text style={styles.rcTitle}>Reward Inquiry Details</Text>
                                <Text style={styles.rcSub}>Exchange details from {item.sender_name}</Text>
                            </View>

                            <View style={styles.rcBody}>
                                <View style={styles.rcTopRow}>
                                    <View style={{alignItems: 'center'}}>
                                        <Text style={styles.rcLabel}>Waste</Text>
                                        <View style={styles.wasteBox}>
                                            <MaterialCommunityIcons name="recycle" size={32} color="#0066FF" />
                                            <View style={styles.wasteBoxLabel}>
                                                <Text style={{color:'white', fontSize: 9, fontWeight:'bold'}}>{inquiryContext.wasteType || 'Plastic'}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={{alignItems: 'center', justifyContent: 'center'}}>
                                        <View style={styles.exchangeCircle}>
                                            <MaterialCommunityIcons name="swap-horizontal" size={20} color="white" />
                                        </View>
                                        <Text style={{fontSize: 9, color: '#0066FF', marginTop: 4, fontWeight: 'bold'}}>exchange</Text>
                                    </View>

                                    <View style={{alignItems: 'center'}}>
                                        <Text style={styles.rcLabel}>Reward</Text>
                                        <View style={styles.rewardBox}>
                                            <MaterialCommunityIcons name="barley" size={32} color="#F9A826" />
                                            <View style={styles.rewardBoxLabel}>
                                                <Text style={{color:'white', fontSize: 9, fontWeight:'bold'}}>{inquiryContext.rewardName || '1kg Rice'}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.rcDetailsRow}>
                                    <View style={styles.rcCol}>
                                        <Text style={styles.rcColHeader}><MaterialCommunityIcons name="recycle" color="#00C853" /> Waste details</Text>
                                        <Text style={styles.rcDetailText}><Text style={{fontWeight: 'bold'}}>Type:</Text> {inquiryContext.wasteType}</Text>
                                        <Text style={styles.rcDetailText}><Text style={{fontWeight: 'bold'}}>Quantity:</Text> {inquiryContext.wasteQty}</Text>
                                        <Text style={styles.rcDetailText}><Text style={{fontWeight: 'bold'}}>Note:</Text> Clean and dry recyclable plastic</Text>
                                        <View style={{flexDirection: 'row', marginTop: 5}}>
                                            <View style={styles.outlineBadge}><Text style={styles.outlineBadgeText}>Clean</Text></View>
                                            <View style={styles.outlineBadge}><Text style={styles.outlineBadgeText}>Dry</Text></View>
                                        </View>
                                    </View>
                                    
                                    <View style={[styles.rcCol, {borderLeftWidth: 1, borderColor: '#eee', paddingLeft: 10}]}>
                                        <Text style={styles.rcColHeader}><MaterialCommunityIcons name="gift" color="#F9A826" /> Reward details</Text>
                                        <Text style={styles.rcDetailText}><Text style={{fontWeight: 'bold'}}>Item:</Text> {inquiryContext.rewardName}</Text>
                                        <Text style={styles.rcDetailText}><Text style={{fontWeight: 'bold'}}>Stock:</Text> Available</Text>
                                        <Text style={styles.rcDetailText}><Text style={{fontWeight: 'bold'}}>Note:</Text> Premium quality white rice</Text>
                                        <View style={{flexDirection: 'row', marginTop: 5}}>
                                            <View style={[styles.outlineBadge, {borderColor: '#00C853'}]}><Text style={[styles.outlineBadgeText, {color: '#00C853'}]}>In stock</Text></View>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.rcFooter}>
                                    <TouchableOpacity style={[styles.rcBtn, {opacity: 0.4}]} disabled>
                                        <Text style={styles.rcBtnText}>View center</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.rcBtn} disabled>
                                        <Text style={[styles.rcBtnText, {color: '#0066FF', fontWeight: 'bold'}]}>Exchange details received</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* 💬 4. NORMAL CHAT BUBBLES (LALABAS LANG KUNG MAY TEXT O IMAGE) */}
                {/* 🟢 FIXED: TEXT SQUISH ISSUE BY RESTORING FLEX: 1 */}
                {showBubble ? (
                    <View style={[styles.messageRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                        
                        {!isMe && !inquiryContext && (
                            <Image source={{ uri: chatUserAvatar }} style={styles.chatAvatar} />
                        )}

                        <View style={{flex: 1, flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start'}}>
                            <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                                <TouchableOpacity activeOpacity={0.85} onLongPress={() => setReplyingTo(item)} style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble, (isThumbsUp || item.image_url) ? {backgroundColor: 'transparent', padding: 0, borderWidth: 0, elevation: 0, shadowOpacity: 0} : null]}>
                                    
                                    {item.reply_to_text ? (
                                        <View style={[styles.replyBoxRendered, isMe ? {backgroundColor: 'rgba(255,255,255,0.18)', borderLeftColor: '#fff'} : {backgroundColor: '#F1F3F5', borderLeftColor: '#0066FF'}, item.image_url ? {backgroundColor: '#eee'} : null]}>
                                            <Text style={{fontSize: 11, fontWeight: '700', color: isMe && !item.image_url ? '#E3F2FD' : '#0066FF', marginBottom: 2}}>↩ Replying to {item.reply_to_sender === myPrimaryName ? 'yourself' : item.reply_to_sender}</Text>
                                            <Text style={{fontSize: 12, color: isMe && !item.image_url ? '#fff' : '#666'}} numberOfLines={1}>{item.reply_to_text.split('|||')[0]}</Text>
                                        </View>
                                    ) : null}

                                    {item.image_url ? (
                                        <Image source={{uri: item.image_url}} style={{width: 220, height: 260, borderRadius: 18, marginBottom: actualText !== 'Sent an image' ? 5 : 0}} resizeMode="cover" />
                                    ) : isThumbsUp ? (
                                        <MaterialCommunityIcons name="thumb-up" size={45} color={isMe ? "#0066FF" : "#007C00"} />
                                    ) : (
                                        <Text style={[styles.msgText, isMe ? { color: 'white' } : { color: '#1C1C1E' }]} selectable={true}>{actualText}</Text>
                                    )}
                                </TouchableOpacity>

                                {isMe && (
                                    <View style={{marginLeft: 4, marginBottom: 4}}>
                                        {item.status === 'sending' && <Ionicons name="ellipse-outline" size={12} color="#999" />}
                                        {item.status === 'failed' && <Ionicons name="alert-circle" size={12} color="red" />}
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                ) : null}
            </View>
          );
        }}
      />

      {unreadCount > 0 && (
          <TouchableOpacity
              style={styles.newMsgButton}
              activeOpacity={0.85}
              onPress={() => {
                  flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                  setUnreadCount(0);
              }}
          >
              <View style={styles.newMsgBadge}>
                  <Text style={styles.newMsgBadgeText}>{unreadCount}</Text>
              </View>
              <Text style={styles.newMsgText}>{unreadCount === 1 ? 'New message' : 'New messages'}</Text>
              <Ionicons name="arrow-down" size={14} color="#fff" style={{marginLeft: 6}} />
          </TouchableOpacity>
      )}

      <View style={styles.inputArea}>
          {replyingTo ? (
              <View style={styles.replyBanner}>
                  <View style={styles.replyAccent} />
                  <View style={{flex: 1}}>
                      <Text style={{fontSize: 12, color: '#0066FF', fontWeight: '700'}}>↩ Replying to {replyingTo.sender_name === myPrimaryName ? 'yourself' : replyingTo.sender_name}</Text>
                      <Text style={{fontSize: 13, color: '#666', marginTop: 2}} numberOfLines={1}>{replyingTo.text.split('|||')[0]}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setReplyingTo(null)} style={{padding: 4}}>
                      <MaterialCommunityIcons name="close-circle" size={22} color="#bbb" />
                  </TouchableOpacity>
              </View>
          ) : null}

          <View style={styles.inputContainer}>
            <TouchableOpacity onPress={() => handleImageSend('camera')} disabled={isUploading} style={{padding: 5}}>
                <Ionicons name="camera-outline" size={28} color="#0066FF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleImageSend('gallery')} disabled={isUploading} style={{padding: 5, marginLeft: 5}}>
                <Ionicons name="image-outline" size={28} color="#0066FF" />
            </TouchableOpacity>

            <View style={styles.inputWrap}>
                <TextInput
                    style={styles.input}
                    placeholder="Aa"
                    placeholderTextColor="#9AA0A6"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                />
            </View>

            {newMessage.trim().length > 0 ? (
                <TouchableOpacity onPress={() => handleSend(null)} style={{padding: 5}}>
                    <Ionicons name="send" size={26} color="#0066FF" />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={() => handleSend('👍')} style={{padding: 5}}>
                    <MaterialCommunityIcons name="thumb-up-outline" size={28} color="#0066FF" />
                </TouchableOpacity>
            )}
          </View>
      </View>

      {isUploading ? (
          <View style={styles.uploadToast}>
              <ActivityIndicator color="white" style={{marginRight: 10}} />
              <Text style={{color: 'white', fontWeight: '600'}}>Sending image...</Text>
          </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0066FF', paddingBottom: 15, paddingHorizontal: 15, elevation: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  timeHeader: { textAlign: 'center', fontSize: 12, color: '#555', fontWeight: '500', marginBottom: 20, marginTop: 10 },
  systemContactText: { textAlign: 'center', fontSize: 13, color: '#111', marginBottom: 15, paddingHorizontal: 20 },
  messageRow: { flexDirection: 'row', width: '100%', alignItems: 'flex-end', marginTop: 2 },
  chatAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 8, marginBottom: 2, backgroundColor: '#ddd' },
  bubble: { maxWidth: screenWidth * 0.75, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 22 },
  myBubble: { backgroundColor: '#4285F4', borderBottomRightRadius: 6 },
  theirBubble: { backgroundColor: '#E4E6EB', borderBottomLeftRadius: 6 },
  msgText: { fontSize: 15, lineHeight: 21 },
  
  // 🟢 REWARD CARD UI STYLES
  inquirySection: { alignItems: 'center', marginBottom: 15, width: '100%' },
  rewardCard: { width: screenWidth * 0.85, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  rcHeader: { backgroundColor: '#0066FF', padding: 15, alignItems: 'center' },
  rcPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  rcPillText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  rcTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  rcSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
  rcBody: { padding: 15 },
  rcTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  rcLabel: { fontSize: 11, color: '#555', fontWeight: '600', marginBottom: 8 },
  wasteBox: { width: 80, height: 90, backgroundColor: '#E3F2FD', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  wasteBoxLabel: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#0066FF', paddingVertical: 4, alignItems: 'center' },
  exchangeCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E3F2FD' },
  rewardBox: { width: 80, height: 90, backgroundColor: '#E8F5E9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  rewardBoxLabel: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#4CAF50', paddingVertical: 4, alignItems: 'center' },
  rcDetailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rcCol: { flex: 1, paddingRight: 5 },
  rcColHeader: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  rcDetailText: { fontSize: 10, color: '#555', marginBottom: 4, lineHeight: 14 },
  outlineBadge: { borderWidth: 1, borderColor: '#0066FF', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginRight: 5 },
  outlineBadgeText: { fontSize: 9, color: '#0066FF', fontWeight: 'bold' },
  rcFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  rcBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fcfcfc', borderRadius: 8, marginHorizontal: 5, borderWidth: 1, borderColor: '#f0f0f0' },
  rcBtnText: { fontSize: 11, color: '#aaa', fontWeight: '600' },

  replyBanner: { flexDirection: 'row', backgroundColor: '#F5F7FA', padding: 10, paddingHorizontal: 14, alignItems: 'center', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  replyAccent: { width: 3, height: 32, backgroundColor: '#0066FF', borderRadius: 2, marginRight: 10 },
  replyBoxRendered: { padding: 8, paddingHorizontal: 10, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3 },
  inputArea: { backgroundColor: '#F5F7FA', borderTopWidth: 1, borderTopColor: '#ECEFF1' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, paddingBottom: Platform.OS === 'ios' ? 25 : 15 },
  inputWrap: { flex: 1, backgroundColor: '#E4E6EB', borderRadius: 20, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 10 : 6, marginHorizontal: 10, minHeight: 40, justifyContent: 'center' },
  input: { fontSize: 15, color: '#1C1C1E', maxHeight: 100, padding: 0 },

  newMsgButton: { position: 'absolute', bottom: Platform.OS === 'ios' ? 95 : 75, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: '#0066FF', paddingLeft: 6, paddingRight: 14, paddingVertical: 6, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6, zIndex: 50 },
  newMsgBadge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  newMsgBadgeText: { color: '#0066FF', fontWeight: '800', fontSize: 12 },
  newMsgText: { color: '#fff', fontWeight: '600', fontSize: 13, letterSpacing: 0.2 },
  uploadToast: { position: 'absolute', top: 110, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.78)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center' },
});