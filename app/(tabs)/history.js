import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, StatusBar, ActivityIndicator } from 'react-native';
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

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
          router.replace('/login');
          return;
      }

      const userEmail = session.user.email;

      // 🟢 1. KUNIN ANG LAHAT NG SURRENDER LOGS NG USER MULA SA DATABASE
      const { data: logsData, error } = await supabase
        .from('surrender_logs')
        .select('*')
        .eq('resident_email', userEmail)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let totalKg = 0;
      const formattedLogs = [];

      // 🟢 2. I-PROCESS ANG DATA AT KUNIN ANG CENTER NAME
      for (const log of logsData) {
          const weight = Number(log.weight_kg) || 0;
          const claimStatus = log.reward_claimed ? log.reward_claimed.trim() : 'Unknown';
          
          // Idadagdag lang natin sa "Total Recycled" kapag HINDI ito redemption ng Banked Points
          // Para hindi madoble yung bilang ng nirecycle na item
          if (!claimStatus.startsWith('Banked Redemption')) {
              totalKg += weight;
          }

          // Kunin ang Drop-off Center Name gamit ang email ng collector
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

          // Mag-assign ng placeholder image base sa waste type
          let imageUrl = 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=500&q=80'; // Default recycle image
          const typeLower = (log.waste_type || '').toLowerCase();
          if (typeLower.includes('glass')) imageUrl = 'https://images.unsplash.com/photo-1528323273322-d81458248d40?w=500&q=80';
          else if (typeLower.includes('plastic') || typeLower.includes('pet')) imageUrl = 'https://images.unsplash.com/photo-1526951521990-620dc14c214b?w=500&q=80';
          else if (typeLower.includes('paper') || typeLower.includes('cardboard')) imageUrl = 'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=500&q=80';
          else if (typeLower.includes('metal') || typeLower.includes('can')) imageUrl = 'https://images.unsplash.com/photo-1566847413488-82db371de1e3?w=500&q=80';

          formattedLogs.push({
              id: log.id,
              waste_type: log.waste_type || 'Recyclables',
              weight: weight,
              date: new Date(log.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
              location: locationName,
              reward: claimStatus,
              image: imageUrl,
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      
      {/* HEADER */}
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
                {/* TOTAL CARD */}
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
                        <View key={log.id} style={styles.logCard}>
                            <Image source={{ uri: log.image }} style={styles.logImage} />
                            <View style={styles.logDetails}>
                                <Text style={styles.wasteType}>{log.waste_type}</Text>
                                
                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons name="scale" size={14} color="#666" />
                                    <Text style={styles.infoText}>Weight: <Text style={{fontWeight: 'bold', color: '#333'}}>{log.weight} kg</Text></Text>
                                </View>
                                
                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons name="calendar" size={14} color="#666" />
                                    <Text style={styles.infoText}>{log.date}</Text>
                                </View>
                                
                                <View style={styles.infoRow}>
                                    <MaterialCommunityIcons name="map-marker-outline" size={14} color="#666" />
                                    <Text style={styles.infoText} numberOfLines={1}>{log.location}</Text>
                                </View>

                                {/* 🟢 REWARD STATUS CHIP */}
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
                                    ]}>
                                        Reward: {log.reward === 'Banked' ? 'Banked' : 
                                                log.isRedemption ? log.reward : `Claimed - ${log.reward}`}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </>
        )}
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

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
  
  logCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 16, padding: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 3 },
  logImage: { width: 80, height: 90, borderRadius: 12, backgroundColor: '#eee' },
  logDetails: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  wasteType: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoText: { fontSize: 12, color: '#666', marginLeft: 6 },
  
  rewardChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: 6 },
  rewardText: { fontSize: 11, fontWeight: 'bold' },
  
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 14 }
});