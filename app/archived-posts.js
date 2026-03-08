import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, StatusBar, Alert, Platform, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const getSafeShadow = () => Platform.select({ 
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, 
    android: { elevation: 3 },
    web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
});

export default function SoldAndTradedItems() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [relistModalVisible, setRelistModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchSoldItems();
    }, [])
  );

  const fetchSoldItems = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const myName = session.user.user_metadata?.full_name || '';
      const { data } = await supabase.from('posts').select('*').eq('user', myName).order('created_at', { ascending: false });
      if (data) {
          const filtered = data.filter(item => item.status === 'sold');
          setSoldItems(filtered);
      }
    }
    setLoading(false);
  };

  const handleRelistOnly = async () => {
    const { error } = await supabase.from('posts').update({ status: 'active' }).eq('id', selectedItem.id);
    setRelistModalVisible(false);
    if (!error) {
      Alert.alert("Success", "Item is now active again!");
      fetchSoldItems();
    }
  };

  // 🟢 BINAGO NATIN ITO: Ipapasa ang data papuntang Profile
  const handleRelistAndEdit = async () => {
    const postToEdit = selectedItem; 
    const { error } = await supabase.from('posts').update({ status: 'active' }).eq('id', postToEdit.id);
    setRelistModalVisible(false);
    
    if (!error) {
      // Mag-push sa profile at ipasa ang data as parameter
      router.push({
        pathname: '/profile',
        params: { autoEditPost: JSON.stringify(postToEdit) }
      });
    }
  };

  const handleDelete = async (id) => {
    Alert.alert("Delete Permanently", "Are you sure? You cannot undo this.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => { 
            await supabase.from('posts').delete().eq('id', id); 
            fetchSoldItems(); 
        }}
    ]);
  };

  const openRelistMenu = (item) => {
    setSelectedItem(item);
    setRelistModalVisible(true);
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
                  <Text style={styles.headerTitle}>Sold & Traded</Text>
              </View>
              <View style={{ width: 40 }} />
          </View>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading items...</Text>
      ) : (
        <FlatList
          data={soldItems}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <MaterialCommunityIcons name="shopping-search" size={60} color="#ccc" />
                <Text style={styles.emptyText}>You haven't sold or traded any items yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.soldBadge}><Text style={styles.soldText}>SOLD OUT</Text></View>
              <Image source={{ uri: item.image }} style={styles.image} />
              <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.priceText} numberOfLines={1}>{item.price}</Text> 
                  <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.btnRelist} onPress={() => openRelistMenu(item)}>
                          <Ionicons name="refresh" size={14} color="white" />
                          <Text style={styles.btnText}>Relist</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(item.id)}>
                          <Ionicons name="trash-outline" size={16} color="#D50000" />
                      </TouchableOpacity>
                  </View>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={relistModalVisible} animationType="slide" transparent={true} onRequestClose={() => setRelistModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRelistModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.darkModalSheet}>
            <View style={styles.dragHandle} />
            <View style={styles.darkMenuContainer}>
              <TouchableOpacity style={styles.darkMenuItem} onPress={handleRelistOnly}>
                <Ionicons name="refresh-outline" size={22} color="#fff" style={{marginRight: 15}} />
                <Text style={styles.darkMenuText}>Relist Only</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkMenuItem, { borderBottomWidth: 0 }]} onPress={handleRelistAndEdit}>
                <Ionicons name="create-outline" size={22} color="#fff" style={{marginRight: 15}} />
                <Text style={styles.darkMenuText}>Relist & Edit</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.darkCancelBtn} onPress={() => setRelistModalVisible(false)}>
              <Text style={{color: '#fff', fontWeight: 'bold'}}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, 
  header: { backgroundColor: '#007C00', paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
  loadingText: { textAlign: 'center', marginTop: 50, color: '#007C00', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 10, fontSize: 14 }, 
  card: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 16, marginBottom: 15, overflow: 'hidden', position: 'relative', ...getSafeShadow() }, 
  soldBadge: { position: 'absolute', top: 15, right: 15, backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, zIndex: 10 },
  soldText: { color: 'white', fontWeight: 'bold', fontSize: 9, letterSpacing: 0.5 },
  image: { width: 85, height: 85, borderRadius: 10, marginRight: 15, backgroundColor: '#eee' }, 
  title: { fontSize: 16, fontWeight: 'bold', color: '#333', maxWidth: '70%' }, 
  priceText: { fontSize: 14, color: '#007C00', fontWeight: 'bold', marginTop: 4 }, 
  actionRow: { flexDirection: 'row', marginTop: 10, gap: 10, alignItems: 'center' }, 
  btnRelist: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007C00', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 11, marginLeft: 4 },
  btnDelete: { backgroundColor:'#FFEBEE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  darkModalSheet: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingBottom: 35 },
  dragHandle: { width: 40, height: 5, backgroundColor: '#555', borderRadius: 5, alignSelf: 'center', marginTop: 15, marginBottom: 20 },
  darkMenuContainer: { backgroundColor: '#2C2C2E', borderRadius: 15, overflow: 'hidden', marginBottom: 15 },
  darkMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#3A3A3C' },
  darkMenuText: { fontSize: 16, color: '#fff' },
  darkCancelBtn: { padding: 18, backgroundColor: '#2C2C2E', borderRadius: 15, alignItems: 'center' }
});