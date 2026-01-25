import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const router = useRouter();

  // 🟢 ZERO STATE DATA (Pang-bagong account)
  const [userData] = useState({
    name: 'Eco Warrior',  // Default name
    points: 0,            // 0 Points
    maxPoints: 1000,      // Target for next badge
    kgRecycled: 0,        // 0 kg
    submissions: 0,       // 0 items
    streak: 0,            // 0 days
  });

  // Helper para sa Progress Bar width calculation
  const progressPercent = (userData.points / userData.maxPoints) * 100;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* 1. GREEN HEADER */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.appName}>GreenSort</Text>
              <Text style={styles.welcomeText}>Welcome back, {userData.name}!</Text>
            </View>
            <TouchableOpacity 
              style={styles.headerIconBg} 
              onPress={() => router.replace('/login')} // Logout button patungong Login
            >
              <MaterialCommunityIcons name="logout" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. FLOATING POINTS CARD */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <View>
              <Text style={styles.pointsLabel}>Total Points</Text>
              <Text style={styles.pointsValue}>{userData.points}</Text>
            </View>
            <View style={styles.badgeIcon}>
              <MaterialCommunityIcons name="medal-outline" size={32} color="white" />
            </View>
          </View>

          <View style={styles.progressContainer}>
             <Text style={styles.progressLabel}>Progress to Gold</Text>
             <Text style={styles.progressLabel}>{userData.points} / {userData.maxPoints}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* 3. QUICK ACTIONS (Grid) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            {/* Scan Waste (Green) - Itutuloy sa folder na may footer */}
            <ActionButton 
              color="#00C853" 
              icon="camera-outline" 
              label="Scan Waste" 
              onPress={() => router.push('/(tabs)/scan')} 
            />
            {/* Upcycling Projects (Blue) - Itutuloy sa folder na may footer */}
            <ActionButton 
              color="#2979FF" 
              icon="book-open-page-variant-outline" 
              label="Upcycling Projects" 
              onPress={() => router.push('/(tabs)/projects')} 
            />
            
            <ActionButton 
              color="#AA00FF" 
              icon="history" 
              label="History" 
              onPress={() => router.push('/(tabs)/history')} 
            />
            
            <ActionButton 
              color="#FF6D00" 
              icon="trophy-outline" 
              label="Rewards" 
              onPress={() => router.push('/(tabs)/rewards')} 
            />
          </View>
        </View>

        {/* 4. ECO IMPACT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Eco Impact</Text>
          <View style={styles.impactRow}>
            <ImpactCard value={userData.kgRecycled} unit="kg recycled" icon="chart-line" color="#00C853" />
            <ImpactCard value={userData.submissions} unit="submissions" icon="bullseye" color="#2979FF" />
            <ImpactCard value={userData.streak} unit="days streak" icon="fire" color="#AA00FF" />
          </View>
        </View>

        {/* 5. ECO TIPS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eco Tips</Text>
          <TipCard icon="leaf" color="#4CAF50" text="Separate plastics from organics for better recycling." />
          <TipCard icon="recycle" color="#2E7D32" text="Clean containers increase recyclability by 40%." />
          <TipCard icon="lightbulb-on" color="#FF6D00" text={`You're ${userData.maxPoints - userData.points} points away from Gold!`} />
        </View>

        <View style={{height: 40}} /> 
      </ScrollView>
    </View>
  );
}

// --- HELPER COMPONENTS ---
const ActionButton = ({ color, icon, label, onPress }) => (
  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color }]} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={28} color="white" />
    <Text style={styles.actionBtnText}>{label}</Text>
  </TouchableOpacity>
);

const ImpactCard = ({ value, unit, icon, color }) => (
  <View style={styles.impactCard}>
    <View style={[styles.impactIconBg, { backgroundColor: color + '15' }]}> 
      <MaterialCommunityIcons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.impactValue, { color: color }]}>{value}</Text>
    <Text style={styles.impactUnit}>{unit}</Text>
  </View>
);

const TipCard = ({ icon, color, text }) => (
  <View style={styles.tipCard}>
    <MaterialCommunityIcons name={icon} size={20} color={color} style={{marginRight: 10}} />
    <Text style={styles.tipText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#00C853',
    height: 180,
    paddingTop: 60,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  appName: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  welcomeText: { color: '#E8F5E9', fontSize: 14, marginTop: 5 },
  headerIconBg: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
  pointsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -60,
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  pointsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  pointsLabel: { color: '#888', fontSize: 14 },
  pointsValue: { color: '#00C853', fontSize: 36, fontWeight: 'bold' },
  badgeIcon: { backgroundColor: '#00C853', padding: 10, borderRadius: 15 },
  progressContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { color: '#888', fontSize: 12 },
  progressBarBg: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#00C853' },
  section: { marginTop: 25, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionBtn: { 
    width: (width - 50) / 2, 
    height: 100, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15, 
    elevation: 3 
  },
  actionBtnText: { color: 'white', fontWeight: '600', marginTop: 10 },
  impactRow: { flexDirection: 'row', justifyContent: 'space-between' },
  impactCard: { backgroundColor: 'white', width: (width - 60) / 3, paddingVertical: 20, borderRadius: 15, alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  impactIconBg: { padding: 8, borderRadius: 50, marginBottom: 8 },
  impactValue: { fontSize: 20, fontWeight: 'bold' },
  impactUnit: { fontSize: 11, color: '#888', marginTop: 2 },
  tipCard: { backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  tipText: { color: '#555', fontSize: 13, flex: 1, lineHeight: 18 }
});