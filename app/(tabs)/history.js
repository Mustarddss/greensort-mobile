import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, StatusBar, ActivityIndicator, Modal } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase'; 

export default function History() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [logs, setLogs] = useState([]);
  const [totalRecycled, setTotalRecycled] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const getWastePhoto = (log) => {
    const possibleImages = [
      // proof / surrender photo column names
      log.proof_photo_url,
      log.proof_image_url,
      log.photo_proof_url,
      log.surrender_photo_url,
      log.surrender_image_url,
      log.proof_of_surrender_url,
      log.surrender_proof_url,
      log.verification_photo_url,
      log.receipt_photo_url,
      log.evidence_photo_url,

      // possible non-url or alternate names
      log.proof_photo,
      log.proof_image,
      log.photo_proof,
      log.surrender_photo,
      log.surrender_image,
      log.submitted_photo,
      log.waste_photo,
      log.waste_image,

      // older/current fallback names
      log.waste_photo_url,
      log.waste_image_url,
      log.image_url,
      log.photo_url,
      log.image
    ];

    const uploadedImage = possibleImages
      .map(item => String(item || '').trim())
      .find(item => item && item !== 'null' && item !== 'undefined');

    if (uploadedImage) return uploadedImage;

    const typeLower = (log.waste_type || '').toLowerCase();

    if (typeLower.includes('glass')) return 'https://images.unsplash.com/photo-1528323273322-d81458248d40?w=500&q=80';
    if (typeLower.includes('plastic') || typeLower.includes('pet') || typeLower.includes('bottle')) return 'https://images.unsplash.com/photo-1526951521990-620dc14c214b?w=500&q=80';
    if (typeLower.includes('paper') || typeLower.includes('cardboard')) return 'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=500&q=80';
    if (typeLower.includes('metal') || typeLower.includes('can')) return 'https://images.unsplash.com/photo-1566847413488-82db371de1e3?w=500&q=80';

    return null;
  };

  const formatFullDateTime = (dateString) => {
    const date = new Date(dateString);

    return {
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
          router.replace('/login');
          return;
      }

      const userEmail = session.user.email;

      const { data: logsData, error } = await supabase
        .from('surrender_logs')
        .select('*')
        .eq('resident_email', userEmail)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let totalKg = 0;
      const formattedLogs = [];

      for (const log of logsData || []) {
          const weight = Number(log.weight_kg) || 0;
          const claimStatus = log.reward_claimed ? String(log.reward_claimed).trim() : 'Unknown';

          if (!claimStatus.startsWith('Banked Redemption')) {
              totalKg += weight;
          }

          let locationName = 'GreenSort Drop-off';
          if (log.collector_email) {
              const { data: center } = await supabase
                .from('dropoff_applications')
                .select('program_name, barangay')
                .eq('user_email', log.collector_email)
                .single();

              if (center) {
                  locationName = center.program_name || `Brgy. ${center.barangay}`;
              }
          }

          const imageUrl = getWastePhoto(log);
          const dateTime = formatFullDateTime(log.created_at);

          formattedLogs.push({
              id: log.id,
              transactionId: `TXN-${String(log.id).slice(0, 6).toUpperCase()}`,
              waste_type: log.waste_type || 'Recyclables',
              weight: weight,
              date: dateTime.date,
              time: dateTime.time,
              fullDateTime: dateTime.full,
              created_at: log.created_at,
              location: locationName,
              collector_email: log.collector_email || '',
              reward: claimStatus,
              image: imageUrl,
              notes: log.notes || log.remarks || '',
              isRedemption: claimStatus.startsWith('Banked Redemption')
          });
      }

      setTotalRecycled(totalKg);
      setLogs(formattedLogs);

    } catch (error) {
      console.log("Error fetching history:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory();
  }, []);

  const renderRewardText = (log) => {
    if (!log) return '';
    if (log.reward === 'Banked') return 'Banked';
    if (log.isRedemption) return log.reward;
    return `Claimed - ${log.reward}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={{flex: 1, alignItems: 'center', marginRight: 40}}>
                <Text style={styles.headerTitle}>Surrender History</Text>
                <Text style={styles.headerSubtitle}>Track your waste submissions</Text>
            </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007C00']} />}
      >
        {loading ? (
            <View style={{marginTop: 50, alignItems: 'center'}}>
                <ActivityIndicator size="large" color="#007C00" />
                <Text style={{marginTop: 10, color: '#666'}}>Fetching records...</Text>
            </View>
        ) : (
            <>
                <View style={styles.totalCard}>
                    <View style={styles.totalIconBg}>
                        <MaterialCommunityIcons name="weight" size={32} color="#007C00" />
                    </View>
                    <View style={{marginLeft: 15}}>
                        <Text style={styles.totalLabel}>TOTAL WASTE RECYCLED</Text>
                        <Text style={styles.totalValue}>{totalRecycled.toFixed(1)} KG</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Recent Surrenders</Text>

                {logs.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="history" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>You haven't surrendered any waste yet.</Text>
                    </View>
                ) : (
                    logs.map((log) => (
                        <TouchableOpacity key={log.id} style={styles.logCard} activeOpacity={0.85} onPress={() => setSelectedLog(log)}>
                            {log.image ? (
                                <View style={styles.imageWrap}>
                                    <Image source={{ uri: log.image }} style={styles.logImage} />
                                    <View style={styles.proofBadge}>
                                        <Text style={styles.proofBadgeText}>Proof</Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.emptyImageBox}>
                                    <MaterialCommunityIcons name="image-off-outline" size={30} color="#B0BEC5" />
                                </View>
                            )}

                            <View style={styles.logDetails}>
                                <View style={styles.cardTopRow}>
                                    <Text style={styles.wasteType} numberOfLines={1}>{log.waste_type}</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color="#B0BEC5" />
                                </View>

                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons name="scale" size={14} color="#666" />
                                    <Text style={styles.infoText}>Weight: <Text style={{fontWeight: 'bold', color: '#333'}}>{log.weight} kg</Text></Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons name="clock-outline" size={14} color="#666" />
                                    <Text style={styles.infoText}>{log.date} • {log.time}</Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons name="map-marker-outline" size={14} color="#666" />
                                    <Text style={styles.infoText} numberOfLines={1}>{log.location}</Text>
                                </View>

                                <View style={[
                                    styles.rewardChip, 
                                    log.isRedemption ? {backgroundColor: '#E8F5E9'} : 
                                    log.reward === 'Banked' ? {backgroundColor: '#E8F5E9'} : {backgroundColor: '#E3F2FD'}
                                ]}>
                                    <MaterialCommunityIcons 
                                        name={log.reward === 'Banked' ? "safe" : "gift"} 
                                        size={14} 
                                        color={log.isRedemption || log.reward === 'Banked' ? "#007C00" : "#1976D2"} 
                                        style={{marginRight: 4}}
                                    />
                                    <Text style={[
                                        styles.rewardText, 
                                        log.isRedemption || log.reward === 'Banked' ? {color: '#007C00'} : {color: '#1976D2'}
                                    ]} numberOfLines={1}>
                                        Reward: {renderRewardText(log)}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </>
        )}
        <View style={{height: 100}} />
      </ScrollView>

      <Modal visible={!!selectedLog} animationType="slide" transparent={true} onRequestClose={() => setSelectedLog(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity onPress={() => setSelectedLog(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedLog.image ? (
                  <View>
                    <Image source={{ uri: selectedLog.image }} style={styles.detailImage} />
                    <View style={styles.detailProofBadge}>
                      <MaterialCommunityIcons name="camera-check" size={16} color="#007C00" />
                      <Text style={styles.detailProofText}>Proof of Surrender</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.detailEmptyImage}>
                    <MaterialCommunityIcons name="image-off-outline" size={44} color="#B0BEC5" />
                    <Text style={{color: '#90A4AE', marginTop: 8}}>No proof photo saved</Text>
                  </View>
                )}

                <View style={styles.transactionBadge}>
                  <Text style={styles.transactionText}>{selectedLog.transactionId}</Text>
                </View>

                <Text style={styles.detailWasteTitle}>{selectedLog.waste_type}</Text>

                <View style={styles.detailInfoCard}>
                  <DetailRow icon="scale" label="Weight" value={`${selectedLog.weight} kg`} />
                  <DetailRow icon="calendar-clock" label="Date & Time" value={selectedLog.fullDateTime} />
                  <DetailRow icon="map-marker-outline" label="Drop-off Center" value={selectedLog.location} />
                  <DetailRow icon="email-outline" label="Collector Email" value={selectedLog.collector_email || 'Not available'} />
                  <DetailRow icon={selectedLog.reward === 'Banked' ? "safe" : "gift-outline"} label="Reward Status" value={renderRewardText(selectedLog)} />
                  {selectedLog.notes ? <DetailRow icon="note-text-outline" label="Notes" value={selectedLog.notes} /> : null}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailModalRow}>
    <View style={styles.detailIconCircle}>
      <MaterialCommunityIcons name={icon} size={20} color="#007C00" />
    </View>
    <View style={{flex: 1}}>
      <Text style={styles.detailModalLabel}>{label}</Text>
      <Text style={styles.detailModalValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#007C00', paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 5 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },

  scrollContent: { padding: 20 },

  totalCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 25, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
  totalIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  totalLabel: { fontSize: 12, color: '#666', fontWeight: 'bold', letterSpacing: 0.5 },
  totalValue: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 2 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },

  logCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 18, padding: 15, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.08, shadowRadius: 4 },
  imageWrap: { width: 86, height: 96, borderRadius: 14, overflow: 'hidden', position: 'relative', backgroundColor: '#eee' },
  logImage: { width: 86, height: 96, borderRadius: 14, backgroundColor: '#eee' },
  proofBadge: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(0,124,0,0.88)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  proofBadgeText: { color: 'white', fontSize: 9, fontWeight: '900' },
  emptyImageBox: { width: 86, height: 96, borderRadius: 14, backgroundColor: '#ECEFF1', justifyContent: 'center', alignItems: 'center' },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logDetails: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  wasteType: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoText: { fontSize: 12, color: '#666', marginLeft: 6 },

  rewardChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: 6, maxWidth: '100%' },
  rewardText: { fontSize: 11, fontWeight: 'bold', flexShrink: 1 },

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '88%' },
  sheetHandle: { width: 45, height: 5, borderRadius: 5, backgroundColor: '#D0D0D0', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1C1C1E' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  detailImage: { width: '100%', height: 210, borderRadius: 18, backgroundColor: '#eee', marginBottom: 14 },
  detailProofBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, marginTop: -4, marginBottom: 12 },
  detailProofText: { color: '#007C00', fontSize: 12, fontWeight: '900', marginLeft: 6 },
  detailEmptyImage: { width: '100%', height: 180, borderRadius: 18, backgroundColor: '#ECEFF1', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  transactionBadge: { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 8 },
  transactionText: { color: '#007C00', fontWeight: '900', fontSize: 12 },
  detailWasteTitle: { fontSize: 22, fontWeight: '900', color: '#263238', marginBottom: 14 },
  detailInfoCard: { backgroundColor: '#F8FAFC', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#ECEFF1', marginBottom: 20 },
  detailModalRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#ECEFF1' },
  detailIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  detailModalLabel: { fontSize: 12, color: '#78909C', fontWeight: '700', marginBottom: 2 },
  detailModalValue: { fontSize: 14, color: '#263238', fontWeight: '700', lineHeight: 19 }
});