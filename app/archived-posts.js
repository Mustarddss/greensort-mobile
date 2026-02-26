import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function ArchivedPosts() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [archives, setArchives] = useState([]);

  useEffect(() => { fetchArchives(); }, []);

  const fetchArchives = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const myName = session.user.user_metadata?.full_name;
      const { data } = await supabase.from('posts').select('*').eq('user', myName).eq('status', 'archived');
      if (data) setArchives(data);
    }
  };

  const handleUnarchive = async (id) => {
    await supabase.from('posts').update({ status: 'active' }).eq('id', id);
    Alert.alert("Restored", "Post is back on your profile and feed!");
    fetchArchives();
  };

  const handleDelete = async (id) => {
    Alert.alert("Delete Permanently", "Are you sure? You cannot undo this.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => { await supabase.from('posts').delete().eq('id', id); fetchArchives(); }}
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Archived Posts</Text>
      </View>

      <FlatList
        data={archives}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No archived posts.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.desc} numberOfLines={2}>{item.desc}</Text>
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.btnRestore} onPress={() => handleUnarchive(item.id)}><Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Unarchive</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(item.id)}><Ionicons name="trash-outline" size={16} color="#D50000" /></TouchableOpacity>
                </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee' }, headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' }, emptyText: { textAlign: 'center', color: '#999', marginTop: 50 }, card: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 1 }, image: { width: 80, height: 80, borderRadius: 8, marginRight: 15, backgroundColor: '#eee' }, title: { fontSize: 16, fontWeight: 'bold', color: '#333' }, desc: { fontSize: 12, color: '#666', marginTop: 4, flex: 1 }, actionRow: { flexDirection: 'row', marginTop: 10, gap: 10 }, btnRestore: { backgroundColor: '#00C853', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 6 }, btnDelete: { backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }
});