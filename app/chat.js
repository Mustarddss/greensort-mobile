import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const { chatUser } = useLocalSearchParams(); 
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [myName, setMyName] = useState('');

  useEffect(() => { fetchSessionAndMessages(); }, []);

  const fetchSessionAndMessages = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const name = session.user.user_metadata?.full_name;
      setMyName(name);
      loadMessages(name, chatUser);
    }
  };

  const loadMessages = async (me, them) => {
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_name.eq.${me},receiver_name.eq.${them}),and(sender_name.eq.${them},receiver_name.eq.${me})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const msg = { sender_name: myName, receiver_name: chatUser, text: newMessage };
    setMessages([...messages, { ...msg, id: Date.now() }]);
    setNewMessage('');
    await supabase.from('messages').insert([msg]);
    loadMessages(myName, chatUser);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F5F7FA' }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <View style={{flex: 1}}><Text style={styles.headerTitle}>{chatUser}</Text><Text style={{fontSize: 12, color: '#00C853'}}>Active now</Text></View>
        <TouchableOpacity><Ionicons name="ellipsis-vertical" size={24} color="#333" /></TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
        renderItem={({ item }) => {
          const isMe = item.sender_name === myName;
          return (
            <View style={[styles.messageWrapper, isMe ? styles.myMessage : styles.theirMessage]}>
              <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}><Text style={[styles.msgText, isMe ? { color: 'white' } : { color: '#333' }]}>{item.text}</Text></View>
            </View>
          );
        }}
      />

      <View style={styles.inputContainer}>
        <Ionicons name="image-outline" size={24} color="#999" style={{marginRight: 10}} />
        <TextInput style={styles.input} placeholder="Type a message..." value={newMessage} onChangeText={setNewMessage} />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}><Ionicons name="send" size={16} color="white" /></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee' }, headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' }, messageWrapper: { marginBottom: 15, width: '100%', flexDirection: 'column' }, myMessage: { alignItems: 'flex-end' }, theirMessage: { alignItems: 'flex-start' }, bubble: { maxWidth: '80%', padding: 15, borderRadius: 18 }, myBubble: { backgroundColor: '#00C853', borderBottomRightRadius: 4 }, theirBubble: { backgroundColor: 'white', borderBottomLeftRadius: 4, elevation: 1, borderWidth: 1, borderColor: '#eee' }, msgText: { fontSize: 15 }, inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' }, input: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 12 }, sendBtn: { width: 40, height: 40, backgroundColor: '#00C853', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 }
});