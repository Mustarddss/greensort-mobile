import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, StatusBar, FlatList, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase'; // 🟢 MAKE SURE TAMA ANG PATH
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function DigitalLogbook() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [searchText, setSearchText] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedDate, setSelectedDate] = useState('All Dates');
  const [typeDropdownVisible, setTypeDropdownVisible] = useState(false);
  const [dateDropdownVisible, setDateDropdownVisible] = useState(false);

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


  const exportCSV = async () => {
    try {
      const csvRows = [
        [
          'Transaction ID',
          'Date',
          'Time',
          'Name',
          'Email',
          'Waste Type',
          'Weight',
          'Reward'
        ]
      ];

      filteredLogs.forEach(item => {
        csvRows.push([
          item.id || '',
          item.date || '',
          item.time || '',
          item.name || '',
          item.userId || '',
          item.type || '',
          item.weight || '',
          item.reward || ''
        ]);
      });

      const csvContent = csvRows
        .map(row =>
          row
            .map(value => `"${String(value).replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');

      const fileName = `greensort-logbook-${Date.now()}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (sharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export GreenSort CSV',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        alert('CSV exported successfully!');
      }

    } catch (error) {
      console.log('CSV Export Error:', error);
      alert('Failed to export CSV.');
    }
  };

  // Filter Logic (Search by Name or TXN ID)
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.name.toLowerCase().includes(searchText.toLowerCase()) ||
      log.id.toLowerCase().includes(searchText.toLowerCase());

    const matchesType =
      selectedType === 'All Types' ||
      log.type === selectedType;

    const matchesDate =
      selectedDate === 'All Dates' ||
      log.date === selectedDate;

    return matchesSearch && matchesType && matchesDate;
  });

  const uniqueTypes = ['All Types', ...new Set(logs.map(item => item.type).filter(Boolean))];
  const uniqueDates = ['All Dates', ...new Set(logs.map(item => item.date).filter(Boolean))];


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
                <TouchableOpacity
                    style={styles.filterBtn}
                    onPress={() => setTypeDropdownVisible(true)}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name="filter-variant" size={16} color="#555" />
                    <Text style={styles.filterText} numberOfLines={1}> {selectedType}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color="#555" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.filterBtn}
                    onPress={() => setDateDropdownVisible(true)}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name="calendar" size={16} color="#555" />
                    <Text style={styles.filterText} numberOfLines={1}> {selectedDate}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color="#555" />
                </TouchableOpacity>
            </View>
        </View>
      </View>

      {/* BODY */}
      <View style={styles.body}>
        
        {/* EXPORT BUTTON */}
        <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
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

      <Modal visible={typeDropdownVisible} animationType="fade" transparent={true} onRequestClose={() => setTypeDropdownVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypeDropdownVisible(false)}>
          <View style={styles.dropdownSheet}>
            <Text style={styles.dropdownTitle}>Select Waste Type</Text>
            {uniqueTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.dropdownOption, selectedType === type && styles.dropdownOptionActive]}
                onPress={() => {
                  setSelectedType(type);
                  setTypeDropdownVisible(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, selectedType === type && styles.dropdownOptionTextActive]}>{type}</Text>
                {selectedType === type && <MaterialCommunityIcons name="check-circle" size={20} color="#0066FF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={dateDropdownVisible} animationType="fade" transparent={true} onRequestClose={() => setDateDropdownVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDateDropdownVisible(false)}>
          <View style={styles.dropdownSheet}>
            <Text style={styles.dropdownTitle}>Select Date</Text>
            {uniqueDates.map((date) => (
              <TouchableOpacity
                key={date}
                style={[styles.dropdownOption, selectedDate === date && styles.dropdownOptionActive]}
                onPress={() => {
                  setSelectedDate(date);
                  setDateDropdownVisible(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, selectedDate === date && styles.dropdownOptionTextActive]}>{date}</Text>
                {selectedDate === date && <MaterialCommunityIcons name="check-circle" size={20} color="#0066FF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#0066FF', paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 20, elevation: 5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  filterContainer: { gap: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 10, height: 45 },
  input: { flex: 1, marginLeft: 10 },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E3F2FD', padding: 10, borderRadius: 10, minHeight: 42 },
  filterText: { flex: 1, fontSize: 12, color: '#555' },
  body: { flex: 1, padding: 20 },
  exportBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, elevation: 3, marginBottom: 20, borderWidth:1, borderColor:'#EAEAEA' },
  exportText: { fontWeight: 'bold', color: '#333' },
  tableHeader: { flexDirection: 'row', marginBottom: 10, paddingHorizontal: 10 },
  th: { fontWeight: 'bold', fontSize: 12, color: '#333' },
  row: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, borderWidth:1, borderColor:'#F0F0F0' },
  txnId: { fontWeight: 'bold', fontSize: 12, color: '#333' },
  date: { fontSize: 10, color: '#666', marginTop: 2 },
  time: { fontSize: 10, color: '#888' },
  name: { fontWeight: 'bold', fontSize: 12, color: '#333' },
  userId: { fontSize: 10, color: '#666', marginTop: 2 },
  wasteType: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  weight: { fontSize: 11, color: '#0066FF', fontWeight: 'bold' },
  reward: { fontSize: 10, color: '#007C00' },
  points: { fontSize: 10, color: '#555', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  dropdownSheet: { backgroundColor: 'white', borderRadius: 20, padding: 18, maxHeight: '70%' },
  dropdownTitle: { fontSize: 18, fontWeight: '900', color: '#1C1C1E', marginBottom: 12 },
  dropdownOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownOptionActive: { backgroundColor: '#E3F2FD' },
  dropdownOptionText: { fontSize: 14, color: '#333', fontWeight: '600' },
  dropdownOptionTextActive: { color: '#0066FF', fontWeight: '900' },
});