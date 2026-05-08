import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const screenWidth = Dimensions.get('window').width;

export default function ChatScreen() {
  const { chatUser } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);

  const isBot = chatUser === 'GreenSort AI Assistant';

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [myName, setMyName] = useState('');
  
  const [chatUserAvatar, setChatUserAvatar] = useState(
      isBot ? 'https://ui-avatars.com/api/?name=AI&background=007C00&color=fff&bold=true' 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(chatUser || 'User')}&background=E8F5E9&color=00C853&bold=true`
  );

  const [chatContext, setChatContext] = useState('direct'); 
  const [centerDetails, setCenterDetails] = useState(null);
  const [isOnline, setIsOnline] = useState(isBot ? true : false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);          
  const [isInitialLoading, setIsInitialLoading] = useState(true); 
  const isNearBottomRef = useRef(true);                       

  const displayedMessages = useMemo(() => [...messages].slice().reverse(), [messages]);

  const faqs = [
    "How do I surrender recyclable materials?",
    "Where can I bring my recyclables?",
    "Do I need to schedule first?",
    "What materials are you accepting right now?"
  ];

  useEffect(() => {
    let isMounted = true;
    let currentUser = '';
    let messageChannel;
    let statusInterval;

    const fetchSessionAndMessages = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      currentUser = session.user.user_metadata?.full_name;
      if (isMounted) setMyName(currentUser);

      await supabase.from('messages').update({ is_read: true }).eq('sender_name', chatUser).eq('receiver_name', currentUser);

      if (!isBot && chatUser) {
          let foundAvatar = null;
          const { data: profileData } = await supabase.from('profiles').select('avatar_url').eq('full_name', chatUser).single();
          if (profileData?.avatar_url) {
              foundAvatar = profileData.avatar_url;
          } else {
              const { data: postData } = await supabase.from('posts').select('avatar').eq('user', chatUser).limit(1).single();
              if (postData?.avatar) {
                  foundAvatar = postData.avatar;
              }
          }
          if (foundAvatar && isMounted) {
              setChatUserAvatar(foundAvatar);
          }
      }

      const { data: centerData } = await supabase
        .from('dropoff_applications')
        .select('*')
        .or(`program_name.eq."${chatUser}",user_email.eq."${chatUser}"`)
        .single();

      if (centerData && isMounted) {
          setCenterDetails(centerData);
          setChatContext('center');
          setIsOnline(centerData.is_online !== false); 
      } else if (!isBot) {
          const globalChan = supabase.channel('green_sort_global');
          const checkOnlineStatus = () => {
              const state = globalChan.presenceState();
              if (isMounted) setIsOnline(Object.keys(state).includes(chatUser));
          };
          checkOnlineStatus();
          statusInterval = setInterval(checkOnlineStatus, 2000);
      }

      const { data, error } = await supabase.from('messages')
        .select('*')
        .or(`and(sender_name.eq."${currentUser}",receiver_name.eq."${chatUser}"),and(sender_name.eq."${chatUser}",receiver_name.eq."${currentUser}")`)
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

    // 🟢 FIXED SUPABASE REALTIME ERROR: Unique channel name every mount
    messageChannel = supabase.channel(`chat_res_${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const isThisChat =
            (payload.new.sender_name === currentUser && payload.new.receiver_name === chatUser) ||
            (payload.new.sender_name === chatUser && payload.new.receiver_name === currentUser);

          if (isThisChat) {
              setMessages(prev => {
                  if (prev.find(m => m.id === payload.new.id)) return prev;

                  const existingTempIndex = prev.findIndex(m => 
                      String(m.id).startsWith('temp-') && 
                      m.text === payload.new.text && 
                      m.sender_name === payload.new.sender_name
                  );

                  if (existingTempIndex >= 0) {
                      const newMessages = [...prev];
                      newMessages[existingTempIndex] = { ...payload.new, status: 'sent' };
                      return newMessages;
                  }
                  
                  return [...prev, payload.new];
              });

              if (payload.new.sender_name === chatUser) {
                  if (isNearBottomRef.current) {
                      requestAnimationFrame(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }));
                  } else {
                      setUnreadCount(c => c + 1);
                  }
              }

              if (payload.new.receiver_name === currentUser && payload.new.sender_name === chatUser) {
                  supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id).then();
              }
          }
      }).subscribe();

    return () => {
      isMounted = false;
      clearTimeout(loadingFallback);
      if (statusInterval) clearInterval(statusInterval);
      if (messageChannel) supabase.removeChannel(messageChannel);
    };
  }, [chatUser]);

  const handleSend = async (overrideText = null) => {
    let textToSend = overrideText || newMessage;
    if (!textToSend.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
        id: tempId,
        sender_name: myName, 
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
        setMessages(prev => {
            const exists = prev.find(m => m.id === data.id);
            if(exists) return prev; 
            return prev.map(m => m.id === tempId ? { ...data, status: 'sent' } : m)
        });
    }

    if (isBot && !error) {
        setIsBotTyping(true);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

        const systemInstruction = `You are GreenSort AI Assistant, a helpful virtual eco-bot for the GreenSort recycling app in the Philippines.
        CRITICAL RULE 1 (Language Matching): You MUST respond in the same language the user uses.
        CRITICAL RULE 2 (Scope): Your SOLE purpose is to assist users with recycling, waste management, upcycling, environmental tips, and how to use the GreenSort app.
        If the user asks about ANYTHING else, you MUST NOT answer the question.`;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}` },
                body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: textToSend }], temperature: 0.2, max_completion_tokens: 300 })
            });
            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                const botMsg = { sender_name: chatUser, receiver_name: myName, text: data.choices[0].message.content, is_read: false };
                await supabase.from('messages').insert([botMsg]);
            }
        } catch (error) {
            const errorMsg = { sender_name: chatUser, receiver_name: myName, text: "I'm sorry, I'm having a little trouble connecting to my brain right now. 🔌", is_read: false };
            await supabase.from('messages').insert([errorMsg]);
        } finally {
            setIsBotTyping(false);
        }
    }
  };

  const processImage = async (uri) => {
    try {
        const manipResult = await ImageManipulator.manipulateAsync(
            uri, [], { format: ImageManipulator.SaveFormat.JPEG }
        );

        const actions = [];
        const MAX_SIZE = 1080;

        if (manipResult.width > MAX_SIZE || manipResult.height > MAX_SIZE) {
            if (manipResult.width > manipResult.height) actions.push({ resize: { width: MAX_SIZE } });
            else actions.push({ resize: { height: MAX_SIZE } });
        }

        const finalManip = await ImageManipulator.manipulateAsync(
            uri, actions, { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );

        return finalManip.uri;
    } catch (error) {
        return uri; 
    }
  };

  const handleImageSend = async (mode) => {
    let result;
    const options = { mediaTypes: ['images'], allowsEditing: false, quality: 1 };

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
        const compressedUri = await processImage(originalUri);
        let uploadedUrl = compressedUri;

        if (compressedUri && !compressedUri.startsWith('http')) {
            try {
                const formData = new FormData();
                formData.append('file', { uri: compressedUri, name: `chat_${Date.now()}.jpg`, type: 'image/jpeg' });
                const { data, error } = await supabase.storage.from('post_images').upload(`chat/${Date.now()}.jpg`, formData);
                if (!error) {
                    const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path);
                    uploadedUrl = urlData.publicUrl;
                }
            } catch(e) {}
        }

        const msg = { sender_name: myName, receiver_name: chatUser, text: 'Sent an image', image_url: uploadedUrl, is_read: false };
        await supabase.from('messages').insert([msg]);
        setIsUploading(false);
    }
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F5F7FA' }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={false} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10, padding: 5 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            <View style={{position: 'relative'}}>
                <Image source={{uri: chatUserAvatar}} style={{width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#e0e0e0', borderWidth: 1.5, borderColor: 'white'}} />
                {isBot && <View style={{position: 'absolute', bottom: -2, right: 8, backgroundColor: 'white', borderRadius: 6, padding: 1}}><Ionicons name="sparkles" size={10} color="#007C00" /></View>}
            </View>

            <View>
                <Text style={styles.headerTitle}>{chatUser}</Text>
                {chatContext === 'center' && centerDetails ? (
                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 1}}>
                        <Ionicons name="location-outline" size={12} color="#E8F5E9" />
                        <Text style={{fontSize: 11, color: '#E8F5E9', marginLeft: 2}}>{centerDetails.city || 'Location'}</Text>
                    </View>
                ) : (
                    <Text style={{fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 1}}>{isOnline ? 'Active' : 'Offline'}</Text>
                )}
            </View>
        </View>

        <TouchableOpacity style={{padding: 5}}><MaterialCommunityIcons name="dots-vertical" size={26} color="white" /></TouchableOpacity>
      </View>

      {isInitialLoading && (
          <View style={styles.skeletonWrap} pointerEvents="none">
              <View style={[styles.skeletonBubble, { alignSelf: 'flex-start', width: '60%' }]} />
              <View style={[styles.skeletonBubble, { alignSelf: 'flex-end', width: '45%', backgroundColor: '#D7EDD8' }]} />
              <View style={[styles.skeletonBubble, { alignSelf: 'flex-start', width: '70%' }]} />
          </View>
      )}

      <FlatList
        ref={flatListRef}
        data={displayedMessages}
        inverted
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 15, paddingTop: 10, flexGrow: 1 }}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={false}
        onScroll={(e) => {
            const { contentOffset } = e.nativeEvent;
            const nearBottom = contentOffset.y < 100;
            isNearBottomRef.current = nearBottom;
            if (nearBottom && unreadCount > 0) setUnreadCount(0);
        }}
        scrollEventThrottle={100}
        ListFooterComponent={() => {
            if (chatContext === 'center' && centerDetails) {
                return (
                    <View style={styles.centerIntroWrapper}>
                        <View style={styles.heroCircle}><MaterialCommunityIcons name="storefront" size={54} color="#007C00" /></View>
                        <Text style={styles.centerTitle}>{centerDetails.program_name || chatUser}</Text>
                        <View style={[styles.statusPill, { backgroundColor: isOnline ? '#E8F5E9' : '#FBE9E7', borderColor: isOnline ? '#A5D6A7' : '#FFCCBC' }]}>
                            <View style={[styles.statusPillDot, { backgroundColor: isOnline ? '#4CAF50' : '#E57373' }]} />
                            <Text style={[styles.statusPillText, { color: isOnline ? '#2E7D32' : '#C62828' }]}>{isOnline ? 'Accepting Surrenders' : 'Not Accepting Right Now'}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <View style={styles.infoCardRow}>
                                <View style={styles.infoIconBubble}><Ionicons name="location-outline" size={16} color="#007C00" /></View>
                                <View style={{flex: 1}}>
                                    <Text style={styles.infoLabel}>Location</Text>
                                    <Text style={styles.infoValue} numberOfLines={2}>{centerDetails.exact_location || `${centerDetails.barangay || ''}${centerDetails.barangay && centerDetails.city ? ', ' : ''}${centerDetails.city || ''}`}</Text>
                                </View>
                            </View>
                            <View style={styles.infoDivider} />
                            <View style={styles.infoCardRow}>
                                <View style={styles.infoIconBubble}><Ionicons name="time-outline" size={16} color="#007C00" /></View>
                                <View style={{flex: 1}}>
                                    <Text style={styles.infoLabel}>Operating Hours</Text>
                                    <Text style={styles.infoValue}>{centerDetails.operating_days || 'Mon - Sun'}</Text>
                                    <Text style={[styles.infoValue, {color: '#5F6368', fontSize: 12}]}>{centerDetails.operating_hours || '8:00 AM - 5:00 PM'}</Text>
                                </View>
                            </View>
                        </View>
                        {messages.length === 0 && (
                            <>
                                <View style={styles.faqHeaderRow}><Ionicons name="chatbubbles-outline" size={14} color="#007C00" /><Text style={styles.faqHeaderText}>Frequently asked questions</Text></View>
                                <View style={styles.faqWrapper}>
                                    {faqs.map((faq, idx) => (
                                        <TouchableOpacity key={idx} style={[styles.faqRow, idx === faqs.length - 1 && { borderBottomWidth: 0 }]} onPress={() => handleSend(faq)} activeOpacity={0.6}>
                                            <View style={styles.faqIconBubble}><Ionicons name="help" size={12} color="#007C00" /></View>
                                            <Text style={styles.faqText} numberOfLines={2}>{faq}</Text>
                                            <Ionicons name="chevron-forward" size={16} color="#B0B0B0" />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.faqHint}>Tap a question to send it instantly</Text>
                            </>
                        )}
                    </View>
                );
            }
            return null;
        }}
        ListHeaderComponent={() =>
            isBotTyping ? (
                <View style={[styles.messageRow, { justifyContent: 'flex-start', marginBottom: 10 }]}>
                    <View style={[styles.bubble, styles.theirBubble, styles.typingBubble]}>
                        <View style={styles.typingDot} /><View style={[styles.typingDot, { opacity: 0.6 }]} /><View style={[styles.typingDot, { opacity: 0.3 }]} />
                    </View>
                </View>
            ) : <View style={{height: 10}} /> 
        }
        renderItem={({ item, index }) => {
          const isMe = item.sender_name === myName;
          const prevItem = index < displayedMessages.length - 1 ? displayedMessages[index + 1] : null;
          const nextItem = index > 0 ? displayedMessages[index - 1] : null;
          const isSameSenderAsPrev = prevItem && prevItem.sender_name === item.sender_name;
          const isSameSenderAsNext = nextItem && nextItem.sender_name === item.sender_name;

          const timeDiffMins = prevItem ? (new Date(item.created_at) - new Date(prevItem.created_at)) / 60000 : 999;
          const timeDiffNextMins = nextItem ? (new Date(nextItem.created_at) - new Date(item.created_at)) / 60000 : 999;

          const textParts = item.text ? item.text.split('|||INQUIRY|||') : [''];
          const actualText = textParts[0].trim();
          let inquiryContext = null;
          if (textParts.length > 1) {
              try { inquiryContext = JSON.parse(textParts[1]); } catch(e){}
          }

          const showTimeHeader = !isSameSenderAsPrev || timeDiffMins > 1 || inquiryContext;
          const showBubble = actualText.length > 0 || item.reply_to_text || item.image_url;
          const isThumbsUp = actualText === '👍';

          return (
            <View style={{marginBottom: isSameSenderAsNext && timeDiffNextMins <= 1 ? 2 : 14}}>

                {showTimeHeader ? (
                    <View style={styles.timePillWrap}><Text style={styles.timePill}>{formatSmartTime(item.created_at)}</Text></View>
                ) : null}

                {/* 🟢 EXACT REWARD CARD UI PARA SA RESIDENT SIDE (WALANG SYSTEM BANNER) */}
                {inquiryContext && (
                    <View style={styles.inquirySection}>
                        <View style={[styles.rewardCard, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                            <View style={styles.rcHeader}>
                                <View style={styles.rcPill}><Text style={styles.rcPillText}>✦ GreenSort - Exchange Request</Text></View>
                                <Text style={styles.rcTitle}>Reward Inquiry Details</Text>
                                <Text style={styles.rcSub}>Exchange details from {item.sender_name}</Text>
                            </View>

                            <View style={styles.rcBody}>
                                <View style={styles.rcTopRow}>
                                    <View style={{alignItems: 'center'}}>
                                        <Text style={styles.rcLabel}>Waste</Text>
                                        <View style={styles.wasteBox}>
                                            <MaterialCommunityIcons name="recycle" size={32} color="#0066FF" />
                                            <View style={styles.wasteBoxLabel}><Text style={{color:'white', fontSize: 9, fontWeight:'bold'}}>{inquiryContext.wasteType || 'Plastic'}</Text></View>
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
                                            <View style={styles.rewardBoxLabel}><Text style={{color:'white', fontSize: 9, fontWeight:'bold'}}>{inquiryContext.rewardName || '1kg Rice'}</Text></View>
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
                                    <TouchableOpacity style={[styles.rcBtn, {opacity: 0.4}]} disabled><Text style={styles.rcBtnText}>View center</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.rcBtn} disabled><Text style={[styles.rcBtnText, {color: '#0066FF', fontWeight: 'bold'}]}>Exchange details sent!</Text></TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* 💬 CHAT BUBBLES */}
                {showBubble ? (
                    <View style={[styles.messageRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                        {!isMe && !inquiryContext && (<Image source={{ uri: chatUserAvatar }} style={styles.chatAvatar} />)}

                        <View style={{flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start'}}>
                            <TouchableOpacity activeOpacity={0.85} onLongPress={() => setReplyingTo(item)} style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble, (isThumbsUp || item.image_url) ? {backgroundColor: 'transparent', padding: 0, borderWidth: 0, elevation: 0, shadowOpacity: 0} : null]}>
                                
                                {item.reply_to_text ? (
                                    <View style={[styles.replyBoxRendered, isMe ? {backgroundColor: 'rgba(255,255,255,0.18)', borderLeftColor: '#fff'} : {backgroundColor: '#F1F3F5', borderLeftColor: '#007C00'}, item.image_url ? {backgroundColor: '#eee'} : null]}>
                                        <Text style={{fontSize: 11, fontWeight: '700', color: isMe && !item.image_url ? '#E8F5E9' : '#007C00', marginBottom: 2}}>↩ Replying to {item.reply_to_sender === myName ? 'yourself' : item.reply_to_sender}</Text>
                                        <Text style={{fontSize: 12, color: isMe && !item.image_url ? '#fff' : '#666'}} numberOfLines={1}>{item.reply_to_text.split('|||')[0]}</Text>
                                    </View>
                                ) : null}

                                {item.image_url ? (
                                    <Image source={{uri: item.image_url}} style={{width: 220, height: 260, borderRadius: 18, marginBottom: actualText !== 'Sent an image' ? 5 : 0}} resizeMode="cover" />
                                ) : isThumbsUp ? (
                                    <MaterialCommunityIcons name="thumb-up" size={45} color={isMe ? "#007C00" : "#007C00"} />
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
                ) : null}
            </View>
          );
        }}
      />

      {unreadCount > 0 && (
          <TouchableOpacity style={styles.newMsgButton} activeOpacity={0.85} onPress={() => { flatListRef.current?.scrollToOffset({ offset: 0, animated: true }); setUnreadCount(0); }}>
              <View style={styles.newMsgBadge}><Text style={styles.newMsgBadgeText}>{unreadCount}</Text></View>
              <Text style={styles.newMsgText}>{unreadCount === 1 ? 'New message' : 'New messages'}</Text>
              <Ionicons name="arrow-down" size={14} color="#fff" style={{marginLeft: 6}} />
          </TouchableOpacity>
      )}

      <View style={styles.inputArea}>
          {replyingTo ? (
              <View style={styles.replyBanner}>
                  <View style={styles.replyAccent} />
                  <View style={{flex: 1}}>
                      <Text style={{fontSize: 12, color: '#007C00', fontWeight: '700'}}>↩ Replying to {replyingTo.sender_name === myName ? 'yourself' : replyingTo.sender_name}</Text>
                      <Text style={{fontSize: 13, color: '#666', marginTop: 2}} numberOfLines={1}>{replyingTo.text.split('|||')[0]}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setReplyingTo(null)} style={{padding: 4}}><MaterialCommunityIcons name="close-circle" size={22} color="#bbb" /></TouchableOpacity>
              </View>
          ) : null}

          <View style={styles.inputContainer}>
            {!isBot && (
                <>
                    <TouchableOpacity onPress={() => handleImageSend('camera')} disabled={isUploading} activeOpacity={0.7}><Ionicons name="camera-outline" size={28} color={isUploading ? "#ccc" : "#007C00"} style={{marginRight: 10}} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleImageSend('gallery')} disabled={isUploading} activeOpacity={0.7}><Ionicons name="image-outline" size={28} color={isUploading ? "#ccc" : "#007C00"} style={{marginRight: 10}} /></TouchableOpacity>
                </>
            )}

            <View style={styles.inputWrap}>
                <TextInput style={styles.input} placeholder={isBot ? "Ask GreenSort AI..." : "Type a message..."} placeholderTextColor="#9AA0A6" value={newMessage} onChangeText={setNewMessage} multiline />
            </View>

            {newMessage.trim().length > 0 ? (
                <TouchableOpacity onPress={() => handleSend(null)} activeOpacity={0.7}><Ionicons name="send" size={26} color="#007C00" style={{marginLeft: 10}} /></TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={() => handleSend('👍')} disabled={isBot} activeOpacity={0.7}><MaterialCommunityIcons name="thumb-up" size={28} color={isBot ? "#ccc" : "#007C00"} style={{marginLeft: 10}} /></TouchableOpacity>
            )}
          </View>
      </View>

      {isUploading && (
          <View style={styles.uploadToast}><ActivityIndicator color="white" style={{marginRight: 10}} /><Text style={{color: 'white', fontWeight: '600'}}>Sending image...</Text></View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007C00', paddingBottom: 15, paddingHorizontal: 10, elevation: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  messageRow: { flexDirection: 'row', width: '100%', alignItems: 'flex-end' },
  chatAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 8, marginBottom: 2, backgroundColor: '#ddd' },
  bubble: { maxWidth: '85%', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20 },
  myBubble: { backgroundColor: '#007C00', borderBottomRightRadius: 6, shadowColor: '#007C00', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 2 },
  theirBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 6, borderWidth: 1, borderColor: '#ECEFF1', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  msgText: { fontSize: 15, lineHeight: 21 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#007C00', marginHorizontal: 2 },
  timePillWrap: { alignItems: 'center', marginVertical: 10 },
  timePill: { fontSize: 11, color: '#7A7A7A', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.04)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  replyBanner: { flexDirection: 'row', backgroundColor: '#F5F7FA', padding: 10, paddingHorizontal: 14, alignItems: 'center', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  replyAccent: { width: 3, height: 32, backgroundColor: '#007C00', borderRadius: 2, marginRight: 10 },
  replyBoxRendered: { padding: 8, paddingHorizontal: 10, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3 },
  inputArea: { backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#ECEFF1', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: 'white', paddingBottom: Platform.OS === 'ios' ? 25 : 10 },
  inputWrap: { flex: 1, backgroundColor: '#F2F4F7', borderRadius: 22, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 8 : 2, minHeight: 42, justifyContent: 'center', borderWidth: 1, borderColor: '#E5E8EC' },
  input: { fontSize: 15, color: '#1C1C1E', maxHeight: 100, padding: 0 },
  
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
  
  centerIntroWrapper: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 6 },
  heroCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 6, borderColor: '#F1F8E9' },
  centerTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', textAlign: 'center', marginBottom: 10, letterSpacing: 0.2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginBottom: 18 },
  statusPillDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusPillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  infoCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#ECEFF1', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 18 },
  infoCardRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  infoIconBubble: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  infoLabel: { fontSize: 11, color: '#7A7A7A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 13, color: '#1C1C1E', fontWeight: '500', lineHeight: 18 },
  infoDivider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 4 },
  faqHeaderRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 8, marginLeft: 4 },
  faqHeaderText: { fontSize: 12, fontWeight: '700', color: '#007C00', marginLeft: 6, letterSpacing: 0.3, textTransform: 'uppercase' },
  faqWrapper: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEFF1', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  faqRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F0F2F5', alignItems: 'center' },
  faqIconBubble: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  faqText: { flex: 1, fontSize: 13, color: '#1C1C1E', fontWeight: '500', lineHeight: 18 },
  faqHint: { fontSize: 11, color: '#9AA0A6', marginTop: 10, fontStyle: 'italic' },
  skeletonWrap: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F5F7FA', paddingTop: 20, paddingHorizontal: 15, zIndex: 30 },
  skeletonBubble: { height: 38, borderRadius: 18, backgroundColor: '#E4E6EB', marginVertical: 6, opacity: 0.7 },
  newMsgButton: { position: 'absolute', bottom: Platform.OS === 'ios' ? 95 : 75, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: '#007C00', paddingLeft: 6, paddingRight: 14, paddingVertical: 6, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6, zIndex: 50 },
  newMsgBadge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  newMsgBadgeText: { color: '#007C00', fontWeight: '800', fontSize: 12 },
  newMsgText: { color: '#fff', fontWeight: '600', fontSize: 13, letterSpacing: 0.2 },
  uploadToast: { position: 'absolute', top: 110, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.78)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center' }
});