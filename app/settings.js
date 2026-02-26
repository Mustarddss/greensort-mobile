import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: async () => { 
            await supabase.auth.signOut(); 
            router.replace('/login'); 
        }}
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Account & Features</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/archived-posts')}>
            <View style={styles.menuIcon}><MaterialCommunityIcons name="archive" size={20} color="#607D8B" /></View>
            <Text style={styles.menuText}>Archived Posts</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/history')}>
            <View style={styles.menuIcon}><MaterialCommunityIcons name="history" size={20} color="#FF9800" /></View>
            <Text style={styles.menuText}>Activity History</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/register-location')}>
            <View style={styles.menuIcon}><MaterialCommunityIcons name="map-marker-plus" size={20} color="#2962FF" /></View>
            <Text style={styles.menuText}>Apply as Drop-off Point</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <View style={{height: 40}} />

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#D50000" style={{marginRight: 10}} />
            <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee' }, headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' }, content: { padding: 20 }, sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }, menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10 }, menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center', marginRight: 15 }, menuText: { flex: 1, fontSize: 16, color: '#333', fontWeight: '500' }, logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEBEE', padding: 16, borderRadius: 12 }, logoutText: { color: '#D50000', fontWeight: 'bold', fontSize: 16 }
});