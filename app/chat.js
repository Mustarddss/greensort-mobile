import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

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
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(chatUser)}&background=E8F5E9&color=00C853&bold=true`
  );

  const [isOnline, setIsOnline] = useState(isBot ? true : false); 
  const [replyingTo, setReplyingTo] = useState(null); 
  const [isUploading, setIsUploading] = useState(false); 
  const [isBotTyping, setIsBotTyping] = useState(false); 

  useEffect(() => { 
    let currentUser = '';
    let messageChannel;
    let statusInterval;

    const fetchSessionAndMessages = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        currentUser = session.user.user_metadata?.full_name;
        setMyName(currentUser);
        
        await supabase.from('messages').update({ is_read: true }).eq('sender_name', chatUser).eq('receiver_name', currentUser);

        const { data, error } = await supabase.from('messages')
          .select('*')
          .or(`and(sender_name.eq."${currentUser}",receiver_name.eq."${chatUser}"),and(sender_name.eq."${chatUser}",receiver_name.eq."${currentUser}")`)
          .order('created_at', { ascending: true });
          
        if (data) setMessages(data);
        if (error) console.log("Error fetching messages:", error);

        if (!isBot) {
            const globalChan = supabase.channel('green_sort_global');
            const checkOnlineStatus = () => {
                const state = globalChan.presenceState();
                setIsOnline(Object.keys(state).includes(chatUser));
            };
            checkOnlineStatus(); 
            statusInterval = setInterval(checkOnlineStatus, 2000); 
        }
      }
    };

    fetchSessionAndMessages();

    messageChannel = supabase.channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          
          const isThisChat = 
            (payload.new.sender_name === currentUser && payload.new.receiver_name === chatUser) || 
            (payload.new.sender_name === chatUser && payload.new.receiver_name === currentUser);

          if (isThisChat) {
              setMessages(prev => {
                  if (prev.find(m => m.id === payload.new.id)) return prev; 
                  return [...prev, payload.new];
              });
              
              if (payload.new.receiver_name === currentUser && payload.new.sender_name === chatUser) {
                  supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id).then();
              }
          }

      }).subscribe();

    return () => {
      if (statusInterval) clearInterval(statusInterval);
      if (messageChannel) supabase.removeChannel(messageChannel);
    };
  }, [chatUser]);

  const handleSend = async (overrideText = null) => {
    const textToSend = overrideText || newMessage;
    if (!textToSend.trim()) return;
    
    const msg = { 
        sender_name: myName, receiver_name: chatUser, text: textToSend,
        reply_to_text: replyingTo ? replyingTo.text : null, reply_to_sender: replyingTo ? replyingTo.sender_name : null, is_read: false 
    };
    
    setNewMessage(''); 
    setReplyingTo(null); 
    await supabase.from('messages').insert([msg]);

    // 🤖 AI CHATBOT LOGIC
    if (isBot) {
        setIsBotTyping(true);
        flatListRef.current?.scrollToEnd({ animated: true });

        const promptText = `You are GreenSort AI Assistant, a helpful virtual eco-bot for the GreenSort recycling app in the Philippines. 
        The user says: "${textToSend}". 
        
        If the user asks where or how to recycle specific items (like "batteries", "laptops", "plastics"), provide a structured answer in two clear sections:

        EXTERNAL DROP-OFFS:
        Provide a quick Google Maps search link (e.g., https://www.google.com/maps/search/e-waste+recycling+near+me) or mention known places like SM Cyberzone or local junk shops.

        GREENSORT CENTERS:
        Remind them that they can directly surrender this item to registered local centers! Tell them to go to the "Exchange" or "Rewards Centers" tab in the GreenSort app to find partners near them to earn points/cash.

        Keep it friendly, structured, and easy to read. Do NOT use markdown asterisks (**) for bolding, just use capital letters for the section titles.`;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json', 
                  // 🟢 UPDATED: Dito na natin tinawag yung .env file
                  'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}` 
                },
                body: JSON.stringify({
                    model: 'gpt-5.4', // 🟢 UPDATED: Pinalitan ng tamang model name
                    messages: [{ role: 'user', content: promptText }],
                    temperature: 0.7,
                    max_completion_tokens: 300
                })
            });
            const data = await response.json();
            
            if (data.choices && data.choices.length > 0) {
                const botReply = data.choices[0].message.content;
                
                const botMsg = { 
                    sender_name: chatUser, receiver_name: myName, text: botReply, is_read: false 
                };
                await supabase.from('messages').insert([botMsg]);
            }
        } catch (error) {
            console.log("AI Chat Error:", error);
            const errorMsg = { sender_name: chatUser, receiver_name: myName, text: "I'm sorry, I'm having a little trouble connecting to my brain right now. Please try asking again later! 🔌", is_read: false };
            await supabase.from('messages').insert([errorMsg]);
        } finally {
            setIsBotTyping(false);
        }
    }
  };

  const handleImageSend = async (mode) => {
    let result;
    if (mode === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return Alert.alert("Required", "Camera access is needed.");
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.3 });
    } else {
        result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.3 });
    }

    if (!result.canceled) {
        setIsUploading(true);
        const uri = result.assets[0].uri;
        let uploadedUrl = uri;

        if (uri && !uri.startsWith('http')) {
            try {
                const formData = new FormData();
                formData.append('file', { uri, name: `chat_${Date.now()}.jpg`, type: 'image/jpeg' });
                const { data, error } = await supabase.storage.from('post_images').upload(`chat/${Date.now()}.jpg`, formData);
                if (!error) {
                    const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path);
                    uploadedUrl = urlData.publicUrl;
                }
            } catch(e) { console.log(e); }
        }

        const msg = { sender_name: myName, receiver_name: chatUser, text: 'Sent an image', image_url: uploadedUrl, is_read: false };
        await supabase.from('messages').insert([msg]);
        setIsUploading(false);
    }
  };

  const formatSmartTime = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const timeOpts = { hour: 'numeric', minute: '2-digit' };
    const timeStr = date.toLocaleTimeString([], timeOpts);
    if (isToday) return timeStr;
    const dayStr = date.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
    return `${dayStr} ${timeStr}`;
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F5F7FA' }} behavior={Platform.OS === "ios" ? "padding" : "padding"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <View style={{position: 'relative'}}>
            <Image source={{uri: chatUserAvatar}} style={{width: 36, height: 36, borderRadius: 18, marginRight: 10}} />
            {isBot && <View style={{position: 'absolute', bottom: -2, right: 8, backgroundColor: 'white', borderRadius: 6, padding: 1}}><Ionicons name="sparkles" size={10} color="#007C00" /></View>}
        </View>
        <View style={{flex: 1}}>
            <Text style={styles.headerTitle}>{chatUser}</Text>
            <Text style={{fontSize: 12, color: isOnline ? '#007C00' : '#999', fontWeight: isOnline ? 'bold' : 'normal'}}>{isOnline ? 'Active now' : 'Offline'}</Text>
        </View>
        <TouchableOpacity><Ionicons name="ellipsis-vertical" size={24} color="#333" /></TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={() => 
            isBotTyping ? (
                <View style={[styles.messageRow, { justifyContent: 'flex-start', marginTop: 10 }]}>
                    <View style={{width: 32, marginRight: 8, justifyContent: 'flex-end'}}>
                        <Image source={{uri: chatUserAvatar}} style={{width: 32, height: 32, borderRadius: 16}} />
                    </View>
                    <View style={[styles.bubble, styles.theirBubble, {paddingHorizontal: 20, paddingVertical: 15}]}>
                        <ActivityIndicator size="small" color="#007C00" />
                    </View>
                </View>
            ) : null
        }
        renderItem={({ item, index }) => {
          const isMe = item.sender_name === myName;
          const prevItem = index > 0 ? messages[index - 1] : null;
          const nextItem = index < messages.length - 1 ? messages[index + 1] : null;
          const isSameSenderAsPrev = prevItem && prevItem.sender_name === item.sender_name;
          const isSameSenderAsNext = nextItem && nextItem.sender_name === item.sender_name;
          
          const timeDiffMins = prevItem ? (new Date(item.created_at) - new Date(prevItem.created_at)) / 60000 : 999;
          const timeDiffNextMins = nextItem ? (new Date(nextItem.created_at) - new Date(item.created_at)) / 60000 : 999;
          
          const showTimeHeader = !isSameSenderAsPrev || timeDiffMins > 1; 
          const showAvatar = !isMe && (!isSameSenderAsNext || timeDiffNextMins > 1);

          return (
            <View style={{marginBottom: isSameSenderAsNext && timeDiffNextMins <= 1 ? 2 : 15}}>
                {showTimeHeader ? (<Text style={{textAlign: 'center', fontSize: 11, color: '#999', marginVertical: 10}}>{formatSmartTime(item.created_at)}</Text>) : null}
                
                <View style={[styles.messageRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
                    {!isMe ? (
                        <View style={{width: 32, marginRight: 8, justifyContent: 'flex-end'}}>
                            {showAvatar ? <Image source={{uri: chatUserAvatar}} style={{width: 32, height: 32, borderRadius: 16}} /> : null}
                        </View>
                    ) : null}
                    
                    <TouchableOpacity activeOpacity={0.8} onLongPress={() => setReplyingTo(item)} style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble, (item.text === '👍' || item.image_url) ? {backgroundColor: 'transparent', padding: 0, borderWidth: 0, elevation: 0} : null]}>
                        
                        {item.reply_to_text ? (
                            <View style={[styles.replyBoxRendered, isMe ? {backgroundColor: '#007C00'} : {backgroundColor: '#f0f0f0'}, item.image_url ? {backgroundColor: '#eee'} : null]}>
                                <Text style={{fontSize: 10, fontWeight: 'bold', color: isMe && !item.image_url ? '#e0e0e0' : '#007C00', marginBottom: 2}}>Replying to {item.reply_to_sender === myName ? 'yourself' : item.reply_to_sender}</Text>
                                <Text style={{fontSize: 12, color: isMe && !item.image_url ? '#fff' : '#666'}} numberOfLines={1}>{item.reply_to_text}</Text>
                            </View>
                        ) : null}
                        
                        {item.image_url ? (
                            <Image source={{uri: item.image_url}} style={{width: 200, height: 250, borderRadius: 15, marginBottom: item.text !== 'Sent an image' ? 5 : 0}} resizeMode="cover" />
                        ) : null}

                        {item.text === '👍' ? (
                            <Text style={{fontSize: 45}}>👍</Text>
                        ) : item.text !== 'Sent an image' ? (
                            <Text style={[styles.msgText, isMe ? { color: 'white' } : { color: '#333' }]} selectable={true}>{item.text}</Text>
                        ) : null}
                    </TouchableOpacity>
                </View>
            </View>
          );
        }}
      />

      <View style={{backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee'}}>
          {replyingTo ? (
              <View style={styles.replyBanner}>
                  <View style={{flex: 1}}>
                      <Text style={{fontSize: 12, color: '#007C00', fontWeight: 'bold'}}>Replying to {replyingTo.sender_name === myName ? 'yourself' : replyingTo.sender_name}</Text>
                      <Text style={{fontSize: 13, color: '#666', marginTop: 2}} numberOfLines={1}>{replyingTo.text}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setReplyingTo(null)} style={{padding: 5}}><MaterialCommunityIcons name="close-circle" size={20} color="#ccc" /></TouchableOpacity>
              </View>
          ) : null}

          <View style={styles.inputContainer}>
            {!isBot && (
                <>
                    <TouchableOpacity onPress={() => handleImageSend('camera')} disabled={isUploading}>
                        <Ionicons name="camera" size={26} color={isUploading ? "#ccc" : "#007C00"} style={{marginRight: 12}} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleImageSend('gallery')} disabled={isUploading}>
                        <Ionicons name="image" size={26} color={isUploading ? "#ccc" : "#007C00"} style={{marginRight: 12}} />
                    </TouchableOpacity>
                </>
            )}
            
            <TextInput 
                style={[styles.input, isBot && {marginLeft: 5}]} 
                placeholder={isBot ? "Ask GreenSort AI..." : "Aa"} 
                value={newMessage} 
                onChangeText={setNewMessage} 
                multiline 
            />
            
            {newMessage.trim().length > 0 ? (
                <TouchableOpacity onPress={() => handleSend(null)}>
                    <Ionicons name="send" size={24} color="#007C00" style={{marginLeft: 10}} />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={() => handleSend('👍')} disabled={isBot}>
                    <MaterialCommunityIcons name="thumb-up" size={28} color={isBot ? "#ccc" : "#007C00"} style={{marginLeft: 10}} />
                </TouchableOpacity>
            )}
          </View>
      </View>

      {isUploading ? (
          <View style={{position: 'absolute', top: 100, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center'}}>
              <ActivityIndicator color="white" style={{marginRight: 10}} />
              <Text style={{color: 'white', fontWeight: 'bold'}}>Sending image...</Text>
          </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee', elevation: 2 }, headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' }, messageRow: { flexDirection: 'row', width: '100%', alignItems: 'flex-end' }, bubble: { maxWidth: '80%', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20 }, myBubble: { backgroundColor: '#007C00', borderBottomRightRadius: 4 }, theirBubble: { backgroundColor: '#E4E6EB', borderBottomLeftRadius: 4, elevation: 1, borderWidth: 1, borderColor: '#eee' }, msgText: { fontSize: 15, lineHeight: 22 }, replyBanner: { flexDirection: 'row', backgroundColor: '#F5F7FA', padding: 10, paddingHorizontal: 15, borderLeftWidth: 4, borderLeftColor: '#007C00', alignItems: 'center' }, replyBoxRendered: { padding: 8, borderRadius: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#fff', opacity: 0.9 }, inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, backgroundColor: 'white', paddingBottom: Platform.OS === 'ios' ? 25 : 10 }, input: { flex: 1, backgroundColor: '#F0F2F5', borderRadius: 20, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, fontSize: 16, maxHeight: 100 }
});