import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // 🟢 MGA STATES PARA SA STATUS CHECKING
  const [dropoffStatus, setDropoffStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🟢 KUNIN ANG STATUS SA DATABASE PAGKABUKAS NG SETTINGS
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('dropoff_applications')
            .select('status')
            .eq('user_email', user.email)
            .order('created_at', { ascending: false }) // Kunin yung pinakabago
            .limit(1)
            .single();

          if (data) {
            setDropoffStatus(data.status);
          }
        }
      } catch (error) {
        console.log("Error checking status:", error.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: async () => { 
            await supabase.auth.signOut(); 
            router.replace('/login'); 
        }}
    ]);
  };

  // 🟢 DYNAMIC BUTTON LOGIC
  const renderDropoffButton = () => {
    if (isLoading) {
      return (
        <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}><ActivityIndicator size="small" color="#2962FF" /></View>
            <Text style={styles.menuText}>Checking status...</Text>
        </View>
      );
    }

    if (dropoffStatus === 'pending') {
      return (
        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("Application Pending", "Your application is currently being reviewed by the Admin. Please wait for an email update.")}>
            <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}><MaterialCommunityIcons name="timer-sand" size={20} color="#FF9800" /></View>
            <Text style={styles.menuText}>Application Pending ⏳</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      );
    }

    if (dropoffStatus === 'approved') {
      return (
        // ⚠️ PALITAN ANG '/collector-dashboard' NG TOTOONG ROUTE NG DROP-OFF DASHBOARD MO
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/collector-dashboard')}>
            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}><MaterialCommunityIcons name="swap-horizontal" size={20} color="#00C853" /></View>
            <Text style={styles.menuText}>Switch to Drop-off Mode</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      );
    }

    // DEFAULT (Wala pang application o na-reject/deactivate)
    return (
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/register-location')}>
            <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}><MaterialCommunityIcons name="map-marker-plus" size={20} color="#2962FF" /></View>
            <Text style={styles.menuText}>Apply as Drop-off Point</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
    );
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

        {/* 🟢 DITO NA LALABAS YUNG DYNAMIC BUTTON */}
        {renderDropoffButton()}

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
  container: { flex: 1, backgroundColor: '#F5F7FA' }, 
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee' }, 
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' }, 
  content: { padding: 20 }, 
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }, 
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10 }, 
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center', marginRight: 15 }, 
  menuText: { flex: 1, fontSize: 16, color: '#333', fontWeight: '500' }, 
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEBEE', padding: 16, borderRadius: 12 }, 
  logoutText: { color: '#D50000', fontWeight: 'bold', fontSize: 16 }
});