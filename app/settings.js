import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

// 🟢 Idinagdag ang shadow logic para magtugma sa ibang pages
const getSafeShadow = () => Platform.select({ 
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, 
    android: { elevation: 3 },
    web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
});

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [dropoffStatus, setDropoffStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('dropoff_applications')
            .select('status')
            .eq('user_email', user.email)
            .order('created_at', { ascending: false }) 
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
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/collector-dashboard')}>
            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}><MaterialCommunityIcons name="swap-horizontal" size={20} color="#007C00" /></View>
            <Text style={styles.menuText}>Switch to Drop-off Mode</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      );
    }

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
      {/* 🟢 GINAWANG LIGHT CONTENT AT TRANSLUCENT ANG STATUS BAR */}
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      
      {/* 🟢 BAGONG HEADER NA KULAY GREEN AT MAY CURVES SA BABA */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
          <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={{alignItems: 'center'}}>
                  <Text style={styles.headerTitle}>Settings</Text>
              </View>
              <View style={{ width: 40 }} />
          </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Account & Features</Text>

        {/* 🟢 IBINALIK ANG SOLD & TRADED ITEMS DESIGN */}
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/archived-posts')}>
            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}><MaterialCommunityIcons name="shopping" size={20} color="#007C00" /></View>
            <Text style={styles.menuText}>Sold & Traded Items</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/history')}>
            <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}><MaterialCommunityIcons name="history" size={20} color="#FF9800" /></View>
            <Text style={styles.menuText}>Activity History</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {renderDropoffButton()}

        <View style={{height: 40}} />

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#D50000" style={{marginRight: 10}} />
            <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, 
  
  // 🟢 MGA BAGONG STYLES PARA SA HEADER (TUGMA SA DASHBOARD AT PROJECTS)
  header: { backgroundColor: '#007C00', paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },

  content: { padding: 20, paddingTop: 30 }, 
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#888', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 }, 
  
  // 🟢 DINAGDAGAN NG SHADOW ANG MGA MENU ITEMS
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 18, borderRadius: 16, marginBottom: 12, ...getSafeShadow() }, 
  menuIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 }, 
  menuText: { flex: 1, fontSize: 16, color: '#333', fontWeight: '600' }, 
  
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#FFCDD2', padding: 18, borderRadius: 16, ...getSafeShadow() }, 
  logoutText: { color: '#D50000', fontWeight: 'bold', fontSize: 16 }
});