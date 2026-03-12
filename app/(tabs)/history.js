import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList, StatusBar, ActivityIndicator, Platform, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 🟢 TAMA NA ANG PATH: Dalawang akyat pabalik sa root directory
import { supabase } from '../../lib/supabase';

const getSafeShadow = () => Platform.select({ 
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, 
    android: { elevation: 3 },
    web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
});

export default function HistoryPage() {
  const router = useRouter(); 
  const insets = useSafeAreaInsets();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalWeight, setTotalWeight] = useState(0);

  // 🟢 NAVIGATION FIX: History -> Settings
  useEffect(() => {
    const backAction = () => {
      router.navigate('/settings');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove(); 
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const { data, error } = await supabase
              .from('surrender_logs')
              .select(`id, created_at, waste_type, weight_kg, collector_email, reward_claimed`)
              .eq('resident_email', user.email)
              .order('created_at', { ascending: false });

          if (data && !error) {
              const total = data.reduce((sum, item) => sum + parseFloat(item.weight_kg), 0);
              setTotalWeight(total.toFixed(1));
              const formattedData = await Promise.all(data.map(async (item) => {
                  const { data: center } = await supabase.from('dropoff_applications').select('program_name').eq('user_email', item.collector_email).single();
                  return {
                      id: item.id.toString(),
                      item: item.waste_type,
                      image: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?q=80&w=200', 
                      weight: `${item.weight_kg} kg`,
                      date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                      location: center ? center.program_name : 'GreenSort Center',
                      reward: item.reward_claimed
                  };
              }));
              setHistory(formattedData);
          }
      }
    } catch (err) {
      console.log("Supabase Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const renderSummaryCard = () => (
    <View style={styles.summaryCardContainer}>
      <View style={styles.summaryCard}>
          <View style={styles.iconCircle}><MaterialCommunityIcons name="weight-kilogram" size={32} color="#007C00" /></View>
          <View style={{flex: 1, marginLeft: 15}}><Text style={styles.summaryLabel}>Total Waste Recycled</Text><Text style={styles.summaryValue}>{totalWeight} KG</Text></View>
      </View>
      <Text style={styles.sectionTitle}>Recent Surrenders</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
          <View style={styles.headerRow}>
              {/* 🟢 NAVIGATION FIX: Screen Back Button */}
              <TouchableOpacity onPress={() => router.navigate('/settings')} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={{alignItems: 'center'}}><Text style={styles.headerTitle}>Surrender History</Text><Text style={styles.headerSubtitle}>Track your waste submissions</Text></View>
              <View style={{ width: 40 }} />
          </View>
      </View>
      {loading ? ( <ActivityIndicator size="large" color="#007C00" style={{marginTop: 50}} /> ) : (
          <FlatList
            data={history}
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <Image source={{ uri: item.image }} style={styles.cardImage} />
                    <View style={styles.cardContent}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{item.item}</Text>
                        <View style={styles.row}><Ionicons name="scale-outline" size={14} color="#666" style={{marginRight: 6}} /><Text style={styles.label}>Weight: </Text><Text style={styles.weightValue}>{item.weight}</Text></View>
                        <View style={styles.row}><Ionicons name="calendar-outline" size={14} color="#666" style={{marginRight: 6}} /><Text style={styles.dateText}>{item.date}</Text></View>
                        <View style={styles.row}><Ionicons name="location-outline" size={14} color="#666" style={{marginRight: 6}} /><Text style={styles.locationText} numberOfLines={1}>{item.location}</Text></View>
                        {item.reward && item.reward !== 'None' && ( <View style={styles.rewardBadge}><Ionicons name="gift" size={12} color="#007C00" style={{marginRight: 4}} /><Text style={styles.rewardText}>Reward: {item.reward}</Text></View> )}
                    </View>
                </View>
            )}
            keyExtractor={item => item.id}
            ListHeaderComponent={renderSummaryCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={ <View style={styles.emptyState}><MaterialCommunityIcons name="history" size={60} color="#ccc" /><Text style={styles.emptyText}>No surrenders yet.</Text></View> }
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, 
  header: { backgroundColor: '#007C00', paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
  summaryCardContainer: { marginTop: 20, marginBottom: 10 },
  summaryCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', ...getSafeShadow(), marginBottom: 20 },
  iconCircle: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 50 },
  summaryLabel: { fontSize: 12, color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 26, fontWeight: 'bold', color: '#333', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#263238', marginBottom: 10 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 30 },
  card: { backgroundColor: 'white', borderRadius: 16, marginBottom: 15, padding: 15, flexDirection: 'row', alignItems: 'center', ...getSafeShadow() },
  cardImage: { width: 75, height: 95, borderRadius: 12, backgroundColor: '#eee', marginRight: 15 },
  cardContent: { flex: 1, justifyContent: 'center' },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 12, color: '#666' },
  weightValue: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 12, color: '#666' },
  locationText: { fontSize: 12, color: '#666', flex: 1 },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginTop: 6 },
  rewardText: { fontSize: 10, color: '#007C00', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 14 }
});