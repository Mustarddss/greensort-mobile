import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, StatusBar, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase'; // 🟢 MAKE SURE TAMA ANG PATH

export default function DigitalLogbook() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [searchText, setSearchText] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🟢 FETCH DATA FROM SUPABASE
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { data, error } = await supabase
            .from('surrender_logs')
            .select('*')
            .eq('collector_email', user.email)
            .order('created_at', { ascending: false });

        if (data && !error) {
            const formattedLogs = data.map((item, index) => {
                const dateObj = new Date(item.created_at);
                // Simple ID generator TXN-001, TXN-002 etc.
                const txnId = `TXN-${String(data.length - index).padStart(3, '0')}`;
                
                return {
                    id: txnId,
                    rawId: item.id, // Supabase real ID
                    date: dateObj.toLocaleDateString('en-CA'), // YYYY-MM-DD
                    time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    name: item.resident_name,
                    userId: item.resident_email, // Using email as user identifier for now
                    type: item.waste_type,
                    weight: `${item.weight_kg}kg`,
                    reward: item.reward_claimed,
                    points: '+0 pts' // Temporary, if you don't have a points system yet
                };
            });
            setLogs(formattedLogs);
        }
    }
    setLoading(false);
  };

  // Filter Logic (Search by Name or TXN ID)
  const filteredLogs = logs.filter(log => 
    log.name.toLowerCase().includes(searchText.toLowerCase()) || 
    log.id.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      {/* Column 1: Transaction ID & Date */}
      <View style={{flex: 1.2}}>
        <Text style={styles.txnId}>{item.id}</Text>
        <Text style={styles.date}>{item.date}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>

      {/* Column 2: Surrenderer */}
      <View style={{flex: 1.5, paddingLeft: 5}}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.userId} numberOfLines={1}>{item.userId}</Text>
      </View>

      {/* Column 3: Details */}
      <View style={{flex: 1.3, alignItems: 'flex-end'}}>
        <Text style={styles.wasteType}>{item.type}</Text>
        <Text style={styles.weight}>{item.weight}</Text>
        <Text style={styles.reward}>{item.reward}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()}>
                <MaterialCommunityIcons name="chevron-left" size={30} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Digital Logbook</Text>
            <View style={{width: 30}} />
        </View>

        {/* SEARCH & FILTERS */}
        <View style={styles.filterContainer}>
            <View style={styles.searchBar}>
                <MaterialCommunityIcons name="magnify" size={20} color="#666" />
                <TextInput 
                    style={styles.input} 
                    placeholder="Search by name or ID..." 
                    value={searchText}
                    onChangeText={setSearchText}
                />
            </View>
            
            <View style={styles.filterRow}>
                <TouchableOpacity style={styles.filterBtn}>
                    <MaterialCommunityIcons name="filter-variant" size={16} color="#555" />
                    <Text style={styles.filterText}> All Types</Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterBtn}>
                    <MaterialCommunityIcons name="calendar" size={16} color="#555" />
                    <Text style={styles.filterText}> All Dates</Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color="#555" />
                </TouchableOpacity>
            </View>
        </View>
      </View>

      {/* BODY */}
      <View style={styles.body}>
        
        {/* EXPORT BUTTON */}
        <TouchableOpacity style={styles.exportBtn}>
            <MaterialCommunityIcons name="download" size={20} color="#333" />
            <Text style={styles.exportText}> Export as CSV</Text>
        </TouchableOpacity>

        {/* TABLE HEADER */}
        <View style={styles.tableHeader}>
            <Text style={[styles.th, {flex: 1.2}]}>Transaction</Text>
            <Text style={[styles.th, {flex: 1.5, paddingLeft: 5}]}>Surrenderer</Text>
            <Text style={[styles.th, {flex: 1.3, textAlign: 'right'}]}>Details</Text>
        </View>

        {/* LIST */}
        {loading ? (
            <ActivityIndicator size="large" color="#0066FF" style={{marginTop: 50}} />
        ) : (
            <FlatList
                data={filteredLogs}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{paddingBottom: 20}}
                ListEmptyComponent={
                    <View style={{alignItems: 'center', marginTop: 50}}>
                        <MaterialCommunityIcons name="clipboard-text-outline" size={50} color="#ccc" />
                        <Text style={{color: '#999', marginTop: 10}}>No records found.</Text>
                    </View>
                }
            />
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#0066FF', paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingHorizontal: 20, elevation: 5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  filterContainer: { gap: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 10, height: 45 },
  input: { flex: 1, marginLeft: 10 },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8 },
  filterText: { fontSize: 12, color: '#555' },
  body: { flex: 1, padding: 20 },
  exportBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, elevation: 2, marginBottom: 20 },
  exportText: { fontWeight: 'bold', color: '#333' },
  tableHeader: { flexDirection: 'row', marginBottom: 10, paddingHorizontal: 10 },
  th: { fontWeight: 'bold', fontSize: 12, color: '#333' },
  row: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  txnId: { fontWeight: 'bold', fontSize: 12, color: '#333' },
  date: { fontSize: 10, color: '#666', marginTop: 2 },
  time: { fontSize: 10, color: '#888' },
  name: { fontWeight: 'bold', fontSize: 12, color: '#333' },
  userId: { fontSize: 10, color: '#666', marginTop: 2 },
  wasteType: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  weight: { fontSize: 11, color: '#0066FF', fontWeight: 'bold' },
  reward: { fontSize: 10, color: '#00C853' },
  points: { fontSize: 10, color: '#555', marginTop: 2 },
});