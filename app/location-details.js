import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function LocationDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // I-parse ang data na pinasa galing sa rewards.js
  const location = params.data ? JSON.parse(params.data) : null;

  if (!location) return null;

  return (
    <View style={{flex: 1, backgroundColor: '#F4F6F8'}}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* 🟠 HEADER (Orange Gradient Style) */}
        <View style={styles.header}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rewards Recommendation</Text>
                <View style={{width: 24}} />
            </View>
            <Text style={styles.headerSubtitle}>Check your reward</Text>
        </View>

        <View style={styles.body}>

            {/* 🎁 REWARD CARD */}
            <View style={styles.rewardCard}>
                <View style={styles.rewardRow}>
                    {/* Placeholder Image (Gray Box) */}
                    <View style={styles.rewardImagePlaceholder} />
                    
                    <View style={styles.rewardInfo}>
                        {/* Dynamic Reward Title */}
                        <Text style={styles.rewardTitle}>{location.rewardUnit}</Text>
                        
                        {/* Green Pill: Requirement */}
                        <View style={styles.requirementPill}>
                            <Text style={styles.requirementText}>Required: {location.baseRate}kg waste</Text>
                        </View>

                        {/* Accepted Tags */}
                        <Text style={styles.acceptLabel}>Accepts:</Text>
                        <View style={styles.tagsRow}>
                            {location.accepted.map((item, index) => (
                                <View key={index} style={styles.miniTag}>
                                    <Text style={styles.miniTagText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            {/* 📍 COLLECTION CENTER DETAILS */}
            <View style={styles.detailsCard}>
                <Text style={styles.sectionTitle}>Collection Center Details</Text>
                <Text style={styles.centerName}>{location.name}</Text>

                <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={20} color="#555" style={{marginRight: 10}} />
                    <View style={{flex: 1}}>
                        <Text style={styles.infoLabel}>{location.address}</Text>
                        <Text style={styles.infoSub}>Dasmariñas City, Cavite</Text>
                    </View>
                </View>

                <View style={[styles.infoRow, {marginTop: 15}]}>
                    <Ionicons name="time-outline" size={20} color="#555" style={{marginRight: 10}} />
                    <View style={{flex: 1}}>
                        <Text style={styles.infoLabel}>Operating Hours</Text>
                        <Text style={styles.infoSub}>{location.schedule}</Text>
                    </View>
                </View>
            </View>

            {/* ⚠️ REQUIRED CHECKLIST (Red Box) */}
            <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                    <MaterialCommunityIcons name="alert-outline" size={20} color="#D32F2F" style={{marginRight: 8}} />
                    <Text style={styles.warningTitle}>Before You Go - Required Checklist</Text>
                </View>
                
                <View style={styles.bulletPoint}>
                    <Text style={styles.bullet}>•</Text>
                    <View>
                        <Text style={styles.bulletTitle}>I have separated my waste by type</Text>
                        <Text style={styles.bulletSub}>Plastics, paper, and metals should be in separate bags</Text>
                    </View>
                </View>

                <View style={styles.bulletPoint}>
                    <Text style={styles.bullet}>•</Text>
                    <View>
                        <Text style={styles.bulletTitle}>I have written the type of waste on my bag</Text>
                        <Text style={styles.bulletSub}>Labeling helps sorting be faster</Text>
                    </View>
                </View>
            </View>

            {/* 🟢 ACTION BUTTON */}
            <TouchableOpacity style={styles.actionBtn}>
                <MaterialCommunityIcons name="crop-free" size={24} color="white" style={{marginRight: 8}} />
                <Text style={styles.actionText}>Scan to Exchange</Text>
            </TouchableOpacity>

        </View>
        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  
  // HEADER
  header: { backgroundColor: '#FF6D00', paddingTop: 60, paddingBottom: 40, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 5 },

  body: { padding: 20, marginTop: -30 },

  // REWARD CARD
  rewardCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  rewardRow: { flexDirection: 'row' },
  rewardImagePlaceholder: { width: 90, height: 90, backgroundColor: '#E0E0E0', borderRadius: 10, marginRight: 15 },
  rewardInfo: { flex: 1, justifyContent: 'center' },
  rewardTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  
  requirementPill: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 },
  requirementText: { color: '#2E7D32', fontSize: 11, fontWeight: 'bold' },

  acceptLabel: { fontSize: 10, color: '#888', marginBottom: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  miniTag: { backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#EEE' },
  miniTagText: { fontSize: 9, color: '#555' },

  // DETAILS CARD
  detailsCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  centerName: { fontSize: 14, color: '#666', marginBottom: 20 },
  
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  infoSub: { fontSize: 12, color: '#666', marginTop: 2 },

  // WARNING CARD (RED)
  warningCard: { backgroundColor: '#FFEBEE', borderRadius: 15, padding: 20, borderWidth: 1, borderColor: '#FFCDD2', marginBottom: 20 },
  warningHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  warningTitle: { fontSize: 14, fontWeight: 'bold', color: '#D32F2F' },
  
  bulletPoint: { flexDirection: 'row', marginBottom: 12 },
  bullet: { fontSize: 18, color: '#D32F2F', marginRight: 10, lineHeight: 20 },
  bulletTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  bulletSub: { fontSize: 11, color: '#666', marginTop: 2 },

  // ACTION BUTTON
  actionBtn: { backgroundColor: '#00C853', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 30, elevation: 5 },
  actionText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});