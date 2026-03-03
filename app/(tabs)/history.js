import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase'; // 🟢 MAKE SURE TAMA ANG PATH

export default function HistoryPage() {
  const router = useRouter(); 
  const insets = useSafeAreaInsets();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalWeight, setTotalWeight] = useState(0);

  // 🟢 FETCH DATA MULA SA SUPABASE
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { data, error } = await supabase
            .from('surrender_logs')
            .select(`
                id,
                created_at,
                waste_type,
                weight_kg,
                collector_email,
                reward_claimed
            `)
            .eq('resident_email', user.email)
            .order('created_at', { ascending: false });

        if (data && !error) {
            // Compute Total Weight
            const total = data.reduce((sum, item) => sum + parseFloat(item.weight_kg), 0);
            setTotalWeight(total.toFixed(1));

            // Format Data para sa UI
            const formattedData = await Promise.all(data.map(async (item) => {
                // Kunin yung pangalan ng Drop-off Center based sa collector_email
                const { data: center } = await supabase
                    .from('dropoff_applications')
                    .select('program_name')
                    .eq('user_email', item.collector_email)
                    .single();

                return {
                    id: item.id.toString(),
                    item: item.waste_type,
                    // Temporary Placeholder Image (In a real app, you can save specific images per waste type)
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
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        
        <View style={styles.cardContent}>
            <Text style={styles.itemTitle}>{item.item}</Text>
            
            <View style={styles.row}>
                <Text style={styles.label}>Weight: </Text>
                <Text style={styles.weightValue}>{item.weight}</Text>
            </View>

            <Text style={styles.dateText}>{item.date}</Text>
            <Text style={styles.locationText}>{item.location}</Text>
            {item.reward !== 'None' && (
                <Text style={{fontSize: 10, color: '#00C853', marginTop: 2, fontWeight: 'bold'}}>Reward: {item.reward}</Text>
            )}
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#D500F9" />
      
      {/* 🟣 HEADER */}
      <View style={[styles.headerBg, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Surrender History</Text>
        </View>
        <Text style={styles.headerSubtitle}>Track your waste submissions</Text>
      </View>

      {/* ⚪ SUMMARY CARD */}
      <View style={styles.summaryCardContainer}>
        <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Kilograms Collected</Text>
            <Text style={styles.summaryValue}>{totalWeight} KG</Text>
        </View>
      </View>

      {/* 📋 LIST */}
      {loading ? (
          <ActivityIndicator size="large" color="#D500F9" style={{marginTop: 50}} />
      ) : (
          <FlatList
            data={history}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                <View style={{alignItems: 'center', marginTop: 50}}>
                    <Text style={{color: '#999'}}>No surrenders yet. Start recycling today!</Text>
                </View>
            }
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3E5F5' }, 
  headerBg: { backgroundColor: '#D500F9', paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5, alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 5, width: '100%', position: 'relative' },
  backButton: { position: 'absolute', left: 0, zIndex: 10, padding: 5 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, textAlign: 'center' },
  summaryCardContainer: { paddingHorizontal: 20, marginTop: 20, marginBottom: 15 },
  summaryCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#E1BEE7' },
  summaryLabel: { fontSize: 12, fontWeight: 'bold', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 5 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 15, marginBottom: 15, padding: 15, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  cardImage: { width: 60, height: 80, borderRadius: 10, backgroundColor: '#f0f0f0', marginRight: 15, resizeMode: 'cover' },
  cardContent: { flex: 1, justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  label: { fontSize: 12, color: '#555' },
  weightValue: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 11, color: '#888', marginBottom: 1 },
  locationText: { fontSize: 11, color: '#666' },
});