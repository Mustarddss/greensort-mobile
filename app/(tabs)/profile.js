import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Profile() {
  const router = useRouter();

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
      <StatusBar barStyle="light-content" backgroundColor="#00C853" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Your GreenSort account details</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
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
            {/* APPLY BUTTON */}
            <TouchableOpacity 
                style={styles.applyButton} 
                onPress={() => router.push('/register-location')} // Dito pupunta sa bagong form
            >
                <Text style={styles.applyButtonText}>Apply as Drop-off Point</Text>
            </TouchableOpacity>

            {/* LOGOUT BUTTON */}
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
  container: { flex: 1, backgroundColor: '#E8F5E9' }, // Light green background
  header: {
    backgroundColor: '#00C853',
    paddingTop: 50, paddingBottom: 30, paddingHorizontal: 20,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginTop: 10 },
  headerSubtitle: { color: '#E8F5E9', fontSize: 14 },
  content: { flex: 1, paddingHorizontal: 20, marginTop: -20 },
  
  idCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center',
    elevation: 4, marginBottom: 15,
  },
  name: { fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  role: { color: '#666', fontSize: 12 },
  badge: { backgroundColor: '#00C853', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  infoCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  editText: { color: '#00C853', fontWeight: 'bold' },
  infoRow: { marginBottom: 15 },
  label: { fontSize: 12, color: '#999' },
  value: { fontSize: 14, color: '#333', fontWeight: '500' },

  statsCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 20, elevation: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  statItem: { alignItems: 'center' },
  iconCircle: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 50, marginBottom: 5 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#00C853' },
  statLabel: { fontSize: 10, color: '#666' },

  actionArea: { gap: 15, marginBottom: 20 },
  applyButton: {
    backgroundColor: '#2962FF', // Blue Button
    padding: 18, borderRadius: 12, alignItems: 'center', elevation: 2
  },
  applyButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  logoutButton: {
    backgroundColor: '#D50000', // Red Button
    padding: 18, borderRadius: 12, alignItems: 'center', elevation: 2
  },
  logoutButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});