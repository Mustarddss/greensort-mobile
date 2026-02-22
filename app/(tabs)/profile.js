import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 👈 ANG SAGOT SA GIANT HEADER

// Safe shadow para iwas Red Screen sa Android
const getSafeShadow = () => Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  android: { elevation: 3 }
});

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // 👈 Kinukuha ang exact height ng status bar

  // Mock User Data
  const [user] = useState({
    name: 'Maria Santos',
    role: 'GreenSort Member',
    id: 'User #: GS-2026-0612',
    email: 'mariasantos@gmail.com',
    address: 'Brgy. San Francisco, General Trias',
    stats: {
        submissions: 12,
        recycled: 24.5,
        projects: 15
    }
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00C853" translucent={true} />
      
      {/* 🟢 HEADER (DYNAMIC PADDING FIX) */}
      <View style={[
          styles.header, 
          // Pinipigilang mag-doble ang laki ng header
          { paddingTop: Math.max(insets.top, 20) + 15 } 
      ]}>
        
        {/* 3-COLUMN TRICK PARA PERFECT CENTER */}
        <View style={styles.headerRow}>
            
            {/* COLUMN 1: Back Button (Left) */}
            <View style={styles.headerSide}>
                <TouchableOpacity onPress={() => router.back()} style={{padding: 5}}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
            </View>

            {/* COLUMN 2: Header Text (Center) */}
            <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Profile</Text>
                <Text style={styles.headerSubtitle}>Your GreenSort account details</Text>
            </View>

            {/* COLUMN 3: Invisible Spacer (Right) - Ito ang magpapapantay sa back button! */}
            <View style={styles.headerSide} />
            
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ID CARD */}
        <View style={styles.idCard}>
            <View style={styles.avatarContainer}>
                <MaterialCommunityIcons name="account-circle" size={80} color="#00C853" />
            </View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.role}>{user.role}</Text>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{user.id}</Text>
            </View>
        </View>

        {/* CONTACT INFO */}
        <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Contact Information</Text>
                <TouchableOpacity>
                    <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
            </View>
            <InfoRow label="Full Name" value={user.name} />
            <InfoRow label="Email Address" value={user.email} />
            <InfoRow label="Address" value={user.address} />
        </View>

        {/* STATS */}
        <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>Your Stats</Text>
            <View style={styles.statsRow}>
                <StatItem icon="trophy-outline" value={user.stats.submissions} label="Total Submission" />
                <StatItem icon="lightning-bolt-outline" value={`${user.stats.recycled} kg`} label="Kg Recycled" />
                <StatItem icon="star-outline" value={user.stats.projects} label="Upcycle Projects" />
            </View>
        </View>

        {/* 🟢 BUTTONS ACTION AREA */}
        <View style={styles.actionArea}>
            <TouchableOpacity style={styles.applyButton} onPress={() => router.push('/register-location')}>
                <Text style={styles.applyButtonText}>Apply as Drop-off Point</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace('/login')}>
                <Text style={styles.logoutButtonText}>LOGOUT</Text>
            </TouchableOpacity>
        </View>

        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
}

// --- HELPER COMPONENTS ---
const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
    </View>
);

const StatItem = ({ icon, value, label }) => (
    <View style={styles.statItem}>
        <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={icon} size={24} color="#00C853" />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' }, 
  
  // 🟢 HEADER STYLES
  header: {
    backgroundColor: '#00C853',
    paddingBottom: 35, // Space para sa umapaw na card
    paddingHorizontal: 15,
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    // WALA NANG HARDCODED PADDINGTOP DITO!
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  // Fixed width para sa left/right columns para sumakto sa gitna ang text
  headerSide: { width: 50, alignItems: 'flex-start' }, 
  headerCenter: { flex: 1, alignItems: 'center' },
  
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2, textAlign: 'center' },
  
  scrollContent: { paddingHorizontal: 20 }, 

  idCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center',
    marginTop: -25, // Pinatong natin nang konti sa header
    marginBottom: 15, ...getSafeShadow()
  },
  avatarContainer: { marginBottom: 10 },
  name: { fontSize: 20, fontWeight: 'bold' },
  role: { color: '#666', fontSize: 12 },
  badge: { backgroundColor: '#00C853', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  infoCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 15, ...getSafeShadow() },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  editText: { color: '#00C853', fontWeight: 'bold' },
  infoRow: { marginBottom: 15 },
  label: { fontSize: 12, color: '#999' },
  value: { fontSize: 14, color: '#333', fontWeight: '500' },

  statsCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 20, ...getSafeShadow() },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  statItem: { alignItems: 'center', flex: 1 },
  iconCircle: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 50, marginBottom: 5 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#00C853' },
  statLabel: { fontSize: 10, color: '#666', textAlign: 'center' },

  actionArea: { gap: 15, marginBottom: 20 },
  applyButton: { backgroundColor: '#2962FF', padding: 18, borderRadius: 12, alignItems: 'center', ...getSafeShadow() },
  applyButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  logoutButton: { backgroundColor: '#D50000', padding: 18, borderRadius: 12, alignItems: 'center', ...getSafeShadow() },
  logoutButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});