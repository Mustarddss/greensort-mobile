import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, StatusBar, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DigitalLogbook() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');

  // --- MOCK DATA (Galing sa Database dapat ito) ---
  const [logs] = useState([
    { id: 'TXN001', date: '2026-02-14 10:30 AM', name: 'Juan Dela Cruz', userId: 'USR001', type: 'Plastic Bottles', weight: '2.5kg', reward: '1kg Rice', points: '+25 pts' },
    { id: 'TXN002', date: '2026-02-14 11:15 AM', name: 'Ana Garcia', userId: 'USR002', type: 'Cardboard', weight: '5.0kg', reward: 'Canned Good', points: '+10 pts' },
    { id: 'TXN003', date: '2026-02-14 01:00 PM', name: 'Pedro Santos', userId: 'USR003', type: 'Metal Cans', weight: '1.2kg', reward: 'Cash', points: '+15 pts' },
    { id: 'TXN004', date: '2026-02-13 09:30 AM', name: 'Maria Clara', userId: 'USR004', type: 'Glass Bottles', weight: '3.0kg', reward: '1kg Rice', points: '+30 pts' },
    { id: 'TXN005', date: '2026-02-13 08:45 AM', name: 'Jose Rizal', userId: 'USR005', type: 'Mixed Paper', weight: '10kg', reward: 'Cash', points: '+50 pts' },
  ]);

  // Filter Logic (Search by Name or ID)
  const filteredLogs = logs.filter(log => 
    log.name.toLowerCase().includes(searchText.toLowerCase()) || 
    log.id.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      {/* Column 1: Transaction ID & Date */}
      <View style={{flex: 1.2}}>
        <Text style={styles.txnId}>{item.id}</Text>
        <Text style={styles.date}>{item.date.split(' ')[0]}</Text>
        <Text style={styles.time}>{item.date.split(' ').slice(1).join(' ')}</Text>
      </View>

      {/* Column 2: Surrenderer */}
      <View style={{flex: 1.5, paddingLeft: 5}}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.userId}>{item.userId}</Text>
      </View>

      {/* Column 3: Details */}
      <View style={{flex: 1.3, alignItems: 'flex-end'}}>
        <Text style={styles.wasteType}>{item.type}</Text>
        <Text style={styles.weight}>{item.weight}</Text>
        <Text style={styles.reward}>{item.reward}</Text>
        <Text style={styles.points}>{item.points}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />

      {/* HEADER */}
      <View style={styles.header}>
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
        <FlatList
            data={filteredLogs}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 20}}
            ListEmptyComponent={
                <View style={{alignItems: 'center', marginTop: 50}}>
                    <Text style={{color: '#999'}}>No records found.</Text>
                </View>
            }
        />

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  
  // Header
  header: { backgroundColor: '#0066FF', paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  // Filters
  filterContainer: { gap: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 10, height: 45 },
  input: { flex: 1, marginLeft: 10 },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8 },
  filterText: { fontSize: 12, color: '#555' },

  // Body
  body: { flex: 1, padding: 20 },
  
  // Export Btn
  exportBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, elevation: 2, marginBottom: 20 },
  exportText: { fontWeight: 'bold', color: '#333' },

  // Table
  tableHeader: { flexDirection: 'row', marginBottom: 10, paddingHorizontal: 10 },
  th: { fontWeight: 'bold', fontSize: 12, color: '#333' },

  // Rows
  row: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  
  // Typography
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