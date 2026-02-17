import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CollectorDashboard() {
  const router = useRouter();

  // --- MOCK BACKEND DATA ---
  const [isOnline, setIsOnline] = useState(true);
  
  // Dito papasok ang data galing database (Supabase/Firebase)
  const [shopDetails] = useState({
    name: 'Barangay Sampaloc I',
    location: 'Sampaloc I, Dasmariñas City, Cavite',
    hours: '8:00 AM - 5:00 PM'
  });

  const [stats] = useState({
    todaySurrenders: 12,
    todayWeight: '24kg',
    monthSurrenders: 50
  });

  const [recentSurrenders] = useState([
    { id: 1, name: 'Juan Dela Cruz', time: '10:30 PM', item: 'Plastic Bottles', weight: '2kg', status: 'Completed' },
    { id: 2, name: 'Ana Garcia', time: '9:45 AM', item: 'Cardboard', weight: '3kg', status: 'Completed' },
    { id: 3, name: 'Daniel Cruz', time: '11:00 AM', item: 'Metal Can', weight: '2kg', status: 'Completed' },
    { id: 4, name: 'Rian Mendoza', time: '10:30 PM', item: 'Plastic Bottles', weight: '2kg', status: 'Completed' },
  ]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />

      {/* 🔵 BLUE HEADER CARD */}
      <View style={styles.headerCard}>
        
        {/* Top Row: Home Icon + Badge + Settings */}
        <View style={styles.topRow}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard')}>
                <MaterialCommunityIcons name="home-variant" size={28} color="white" />
            </TouchableOpacity>
            
            <View style={styles.badge}>
                <Text style={styles.badgeText}>Collector Mode</Text>
            </View>

            <TouchableOpacity>
                <MaterialCommunityIcons name="cog" size={28} color="white" />
            </TouchableOpacity>
        </View>

        {/* Shop Info */}
        <View style={styles.shopInfo}>
            <View style={styles.shopIconBg}>
                <MaterialCommunityIcons name="store" size={30} color="#0066FF" />
            </View>
            <View>
                <Text style={styles.shopName}>{shopDetails.name}</Text>
                <View style={styles.row}>
                    <MaterialCommunityIcons name="map-marker" size={14} color="#E3F2FD" />
                    <Text style={styles.shopSub}>{shopDetails.location}</Text>
                </View>
                <View style={styles.row}>
                    <MaterialCommunityIcons name="clock-time-four-outline" size={14} color="#E3F2FD" />
                    <Text style={styles.shopSub}>{shopDetails.hours}</Text>
                </View>
            </View>
        </View>

        {/* Online Toggle Switch */}
        <View style={styles.statusCard}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={[styles.dot, {backgroundColor: isOnline ? '#00C853' : '#aaa'}]} />
                <View>
                    <Text style={styles.statusTitle}>{isOnline ? 'Online' : 'Offline'}</Text>
                    <Text style={styles.statusSub}>{isOnline ? 'Accepting surrenders' : 'Currently unavailable'}</Text>
                </View>
            </View>
            <Switch 
                value={isOnline} 
                onValueChange={setIsOnline}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={isOnline ? "#fff" : "#f4f3f4"}
            />
        </View>
      </View>

      {/* 🟢 MAIN ACTIONS */}
      <View style={styles.body}>
        
        {/* BIG GREEN BUTTON -> PROCESS SURRENDER */}
        <TouchableOpacity 
            style={styles.processBtn} 
            activeOpacity={0.8}
            onPress={() => router.push('/process-surrender')} // Link to Scanner
        >
            <MaterialCommunityIcons name="cube-send" size={24} color="white" style={{marginRight: 10}} />
            <Text style={styles.processBtnText}>Process New Surrender</Text>
        </TouchableOpacity>

        {/* TWO BLUE BUTTONS */}
        <View style={styles.actionRow}>
            {/* LINK TO LOGBOOK */}
            <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => router.push('/digital-logbook')} // Link to Logbook
            >
                <MaterialCommunityIcons name="book-open-page-variant" size={20} color="white" style={{marginRight: 5}} />
                <Text style={styles.actionBtnText}>View Logbook</Text>
            </TouchableOpacity>
            
            {/* LINK TO MANAGE REWARDS */}
            <TouchableOpacity 
                style={[styles.actionBtn, {backgroundColor: '#2979FF'}]}
                onPress={() => router.push('/manage-rewards')} // 👈 ADDED LINK HERE
            >
                <MaterialCommunityIcons name="gift-outline" size={20} color="white" style={{marginRight: 5}} />
                <Text style={styles.actionBtnText}>Rewards Offer</Text>
            </TouchableOpacity>
        </View>

        {/* 🕒 RECENT SURRENDERS LIST */}
        <View style={styles.listContainer}>
            <View style={styles.listHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color="#333" />
                    <Text style={styles.listTitle}> Recent Surrenders</Text>
                </View>
                <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
            </View>

            <ScrollView style={{height: 250}} showsVerticalScrollIndicator={false}>
                {recentSurrenders.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                        <View>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemTime}>{item.time}</Text>
                            <Text style={styles.itemType}>{item.item}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                            <Text style={styles.itemWeight}>{item.weight}</Text>
                            <View style={styles.tag}>
                                <Text style={styles.tagText}>{item.status}</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>

      </View>

      {/* 📊 FOOTER SUMMARY (Floating) */}
      <View style={styles.footerCard}>
        <View style={styles.footerHeader}>
            <Text style={styles.footerTitle}>Today's Summary</Text>
        </View>
        <View style={styles.footerRow}>
            <View style={styles.footerItem}>
                <Text style={styles.footerValue}>{stats.todaySurrenders}</Text>
                <Text style={styles.footerLabel}>Surrenders</Text>
            </View>
            <View style={[styles.footerItem, {borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)'}]}>
                <Text style={styles.footerValue}>{stats.todayWeight}</Text>
                <Text style={styles.footerLabel}>Total Weight</Text>
            </View>
            <View style={styles.footerItem}>
                <Text style={styles.footerValue}>{stats.monthSurrenders}</Text>
                <Text style={styles.footerLabel}>Total Surrenders This Month</Text>
            </View>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  
  // HEADER
  headerCard: {
    backgroundColor: '#0066FF',
    paddingTop: 50, paddingBottom: 60, // Extra space for overlap
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  
  shopInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  shopIconBg: { width: 50, height: 50, backgroundColor: 'white', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  shopName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  shopSub: { color: '#E3F2FD', fontSize: 12, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },

  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusTitle: { color: 'white', fontWeight: 'bold' },
  statusSub: { color: '#E3F2FD', fontSize: 11 },

  // BODY (Overlapping Header)
  body: { paddingHorizontal: 20, marginTop: -40 },

  processBtn: {
    backgroundColor: '#00C853', borderRadius: 12, paddingVertical: 15,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    elevation: 5, marginBottom: 15
  },
  processBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  actionBtn: { 
    flex: 1, backgroundColor: '#2962FF', paddingVertical: 12, borderRadius: 10,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2
  },
  actionBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },

  // LIST
  listContainer: { backgroundColor: 'white', borderRadius: 15, padding: 15, elevation: 2, height: 320 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  listTitle: { fontWeight: 'bold', fontSize: 14 },
  viewAll: { color: '#2962FF', fontSize: 12, fontWeight: 'bold' },
  
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemName: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  itemTime: { fontSize: 11, color: '#888' },
  itemType: { fontSize: 12, color: '#555', marginTop: 2 },
  itemWeight: { fontSize: 16, fontWeight: 'bold', color: '#2962FF', textAlign: 'right' },
  tag: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  tagText: { color: '#2E7D32', fontSize: 10, fontWeight: 'bold' },

  // FOOTER SUMMARY
  footerCard: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: '#0066FF', borderRadius: 20, padding: 20, elevation: 10
  },
  footerHeader: { marginBottom: 10 },
  footerTitle: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerItem: { flex: 1, alignItems: 'center' },
  footerValue: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  footerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, textAlign: 'center' },
});