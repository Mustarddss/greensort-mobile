import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // 👈 Import Router

// 🗄️ MOCK DATABASE
const SURRENDER_HISTORY = [
  {
    id: '1',
    item: 'Plastic Bottles (PET)',
    image: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?q=80&w=200',
    weight: '2.5 kg',
    points: 'Waiting...', 
    date: 'Just Now',
    status: 'pending', 
    location: 'Barangay Hall Drop-off'
  },
  {
    id: '2',
    item: 'Glass Bottles',
    image: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?q=80&w=200',
    weight: '3.2 kg',
    points: '+32 pts',
    date: 'Jan 10, 2026',
    status: 'approved', 
    location: 'Roaming Truck'
  },
  {
    id: '3',
    item: 'Greasy Pizza Box',
    image: 'https://images.unsplash.com/photo-1595278069441-2cf29f525a3c?q=80&w=200',
    weight: '1.0 kg',
    points: '0 pts',
    date: 'Jan 07, 2026',
    status: 'rejected', 
    reason: 'Contaminated with food waste. Cannot be recycled.',
    location: 'Barangay Hall Drop-off'
  },
];

export default function HistoryPage() {
  const router = useRouter(); // 👈 Initialize Router
  const [filter, setFilter] = useState('All');

  const getFilteredData = () => {
    if (filter === 'All') return SURRENDER_HISTORY;
    return SURRENDER_HISTORY.filter(item => item.status === filter.toLowerCase());
  };

  const getStatusColor = (status) => {
    switch(status) {
        case 'approved': return '#00C853'; 
        case 'pending': return '#FFAB00'; 
        case 'rejected': return '#FF1744'; 
        default: return '#999';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        
        <View style={styles.cardContent}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                <View>
                    <Text style={styles.itemTitle}>{item.item}</Text>
                    <Text style={styles.locationText}><MaterialCommunityIcons name="map-marker" size={10} /> {item.location}</Text>
                </View>
                
                <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status)}]}>
                    <Text style={styles.statusText}>
                        {item.status === 'pending' ? 'IN REVIEW' : item.status.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
                <Text style={styles.label}>Weight submitted:</Text>
                <Text style={styles.value}>{item.weight}</Text>
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>Points awarded:</Text>
                <Text style={[styles.value, {color: item.status === 'approved' ? '#00C853' : '#666'}]}>
                    {item.points}
                </Text>
            </View>
            
            <Text style={styles.dateText}>{item.date}</Text>

            {item.status === 'rejected' && (
                <View style={styles.errorBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#D32F2F" />
                    <Text style={styles.errorText}>Admin Note: {item.reason}</Text>
                </View>
            )}
             {item.status === 'pending' && (
                <View style={styles.pendingBox}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#E65100" />
                    <Text style={styles.pendingText}>Admin is verifying your photo...</Text>
                </View>
            )}
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 🟢 HEADER WITH BACK BUTTON */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={{marginRight: 10}}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Surrender History</Text>
        </View>
        <Text style={styles.headerSubtitle}>Track status of your submissions</Text>
      </View>

      {/* FILTER TABS */}
      <View style={styles.filterContainer}>
        {['All', 'Approved', 'Pending', 'Rejected'].map((tab) => (
            <TouchableOpacity 
                key={tab} 
                style={[styles.filterBtn, filter === tab && styles.filterBtnActive]}
                onPress={() => setFilter(tab)}
            >
                <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>{tab}</Text>
            </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFilteredData()}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  
  // UPDATED HEADER STYLES
  header: { 
      backgroundColor: '#D500F9', 
      padding: 25, 
      paddingTop: 60, 
      borderBottomLeftRadius: 30, 
      borderBottomRightRadius: 30 
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' }, // Aligns arrow and title
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', marginTop: 5, marginLeft: 34 }, // Aligned with title

  filterContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
  filterBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, backgroundColor: 'white', borderWidth: 1, borderColor: '#EEE' },
  filterBtnActive: { backgroundColor: '#D500F9', borderColor: '#D500F9' },
  filterText: { fontSize: 12, color: '#666', fontWeight: '600' },
  filterTextActive: { color: 'white' },

  listContainer: { padding: 20 },
  card: { backgroundColor: 'white', borderRadius: 15, marginBottom: 15, padding: 15, flexDirection: 'row', elevation: 2 },
  cardImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#EEE' },
  cardContent: { flex: 1, marginLeft: 15 },
  
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  locationText: { fontSize: 10, color: '#888', marginTop: 2 },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  label: { fontSize: 12, color: '#666' },
  value: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 10, color: '#999', marginTop: 5, textAlign: 'right' },
  
  errorBox: { marginTop: 8, backgroundColor: '#FFEBEE', padding: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  errorText: { color: '#D32F2F', fontSize: 11, marginLeft: 5, flex: 1 },
  
  pendingBox: { marginTop: 8, backgroundColor: '#FFF3E0', padding: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  pendingText: { color: '#E65100', fontSize: 11, marginLeft: 5 },
});