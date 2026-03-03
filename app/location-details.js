import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LocationDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const location = params.data ? JSON.parse(params.data) : null;

  if (!location) return null;

  return (
    <View style={{flex: 1, backgroundColor: '#F4F6F8'}}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
          <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
              <Text style={styles.headerTitle}>Center Details</Text>
              <View style={{width: 24}} />
          </View>
          <Text style={styles.headerSubtitle}>Review before visiting</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>

            {/* 🎁 REWARD CARD */}
            <View style={styles.rewardCard}>
                {location.isClaimed && (
                    <View style={styles.claimedOverlay}>
                        <MaterialCommunityIcons name="check-decagram" size={40} color="#9E9E9E" />
                        <Text style={styles.overlayText}>CLAIMED</Text>
                    </View>
                )}

                <View style={[styles.rewardRow, location.isClaimed && {opacity: 0.5}]}>
                    {location.imageUrl ? (
                        <Image source={{ uri: location.imageUrl }} style={styles.rewardImagePlaceholder} />
                    ) : (
                        <View style={[styles.rewardImagePlaceholder, {justifyContent: 'center', alignItems: 'center'}]}>
                            <MaterialCommunityIcons name="gift-outline" size={30} color="#999" />
                        </View>
                    )}
                    
                    <View style={styles.rewardInfo}>
                        <Text style={styles.rewardTitle} numberOfLines={2}>{location.rewardUnit}</Text>
                        <View style={styles.requirementPill}>
                            <Text style={styles.requirementText}>Required: {location.baseRate} {location.accepted[0]}</Text>
                        </View>
                        <Text style={styles.acceptLabel}>Accepts:</Text>
                        <View style={styles.tagsRow}>
                            {location.accepted.map((item, index) => (
                                <View key={index} style={styles.miniTag}><Text style={styles.miniTagText}>{item}</Text></View>
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            {/* 📍 CENTER DETAILS */}
            <View style={styles.detailsCard}>
                <Text style={styles.sectionTitle}>Collection Center Details</Text>
                <Text style={styles.centerName}>{location.name}</Text>

                <View style={styles.infoRow}><Ionicons name="location-outline" size={20} color="#555" style={{marginRight: 10}} /><View style={{flex: 1}}><Text style={styles.infoLabel}>{location.address}</Text></View></View>
                <View style={[styles.infoRow, {marginTop: 15}]}><Ionicons name="time-outline" size={20} color="#555" style={{marginRight: 10}} /><View style={{flex: 1}}><Text style={styles.infoLabel}>Operating Hours</Text><Text style={styles.infoSub}>{location.schedule}</Text></View></View>
                {location.contact && (
                    <View style={[styles.infoRow, {marginTop: 15}]}><Ionicons name="call-outline" size={20} color="#555" style={{marginRight: 10}} /><View style={{flex: 1}}><Text style={styles.infoLabel}>Contact Number</Text><Text style={styles.infoSub}>{location.contact}</Text></View></View>
                )}
            </View>

            {/* ⚠️ CHECKLIST */}
            {location.checklist ? (
                <View style={styles.warningCard}>
                    <View style={styles.warningHeader}><MaterialCommunityIcons name="alert-outline" size={20} color="#D32F2F" style={{marginRight: 8}} /><Text style={styles.warningTitle}>Before You Go - Center Rules</Text></View>
                    <Text style={styles.bulletTitle}>{location.checklist}</Text>
                </View>
            ) : (
                <View style={styles.warningCard}>
                    <View style={styles.warningHeader}><MaterialCommunityIcons name="alert-outline" size={20} color="#D32F2F" style={{marginRight: 8}} /><Text style={styles.warningTitle}>General Reminder</Text></View>
                    <Text style={styles.bulletTitle}>Please make sure your recyclables are clean and separated by type before going to the center.</Text>
                </View>
            )}

            {/* 🟢 ACTION BUTTON LOGIC */}
            {location.isClaimed ? (
                <View style={[styles.actionBtn, {backgroundColor: '#9E9E9E', elevation: 0}]}>
                    <MaterialCommunityIcons name="lock-outline" size={24} color="white" style={{marginRight: 8}} />
                    <Text style={styles.actionText}>Reward Already Claimed</Text>
                </View>
            ) : (
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/qr-generator', params: { rewardName: location.rewardUnit } })}>
                    <MaterialCommunityIcons name="qrcode-scan" size={24} color="white" style={{marginRight: 8}} />
                    <Text style={styles.actionText}>Scan to Exchange</Text>
                </TouchableOpacity>
            )}

        </View>
        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  header: { backgroundColor: '#FF6D00', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10, elevation: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 5, fontSize: 12 },
  body: { padding: 20, paddingTop: 15 },
  rewardCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 20, elevation: 4, position: 'relative' },
  rewardRow: { flexDirection: 'row' },
  rewardImagePlaceholder: { width: 90, height: 90, backgroundColor: '#E0E0E0', borderRadius: 10, marginRight: 15 },
  rewardInfo: { flex: 1, justifyContent: 'center' },
  rewardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  requirementPill: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 },
  requirementText: { color: '#2E7D32', fontSize: 11, fontWeight: 'bold' },
  acceptLabel: { fontSize: 10, color: '#888', marginBottom: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  miniTag: { backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#EEE' },
  miniTagText: { fontSize: 9, color: '#555' },
  detailsCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  centerName: { fontSize: 14, color: '#666', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  infoSub: { fontSize: 12, color: '#666', marginTop: 2 },
  warningCard: { backgroundColor: '#FFEBEE', borderRadius: 15, padding: 20, borderWidth: 1, borderColor: '#FFCDD2', marginBottom: 20 },
  warningHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  warningTitle: { fontSize: 14, fontWeight: 'bold', color: '#D32F2F' },
  bulletTitle: { fontSize: 13, color: '#333', lineHeight: 20 },
  actionBtn: { backgroundColor: '#00C853', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 30, elevation: 5 },
  actionText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // STYLES FOR CLAIMED
  claimedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 15 },
  overlayText: { color: '#9E9E9E', fontWeight: '900', fontSize: 20, letterSpacing: 2, marginTop: 5 }
});