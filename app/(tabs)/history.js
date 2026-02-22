import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 🗄️ MOCK DATABASE
const SURRENDER_HISTORY = [
  {
    id: '1',
    item: 'Plastic Bottles (PET)',
    image: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?q=80&w=200',
    weight: '2.5 kg',
    date: 'Jan 12, 2026',
    location: 'Barangay Sampaloc I',
  },
  {
    id: '2',
    item: 'Paper & Cardboard',
    image: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?q=80&w=200',
    weight: '4 kg',
    date: 'Jan 14, 2026',
    location: 'Barangay Luciano',
  },
  {
    id: '3',
    item: 'Glass Bottles',
    image: 'https://images.unsplash.com/photo-1595278069441-2cf29f525a3c?q=80&w=200',
    weight: '3.2 kg',
    date: 'Jan 10, 2026',
    location: 'Barangay Paliparan II',
  },
  {
    id: '4',
    item: 'Metal Can',
    image: 'https://images.unsplash.com/photo-1595278069441-2cf29f525a3c?q=80&w=200',
    weight: '1.5 kg',
    date: 'Jan 07, 2026',
    location: 'Barangay Salitran I',
  },
   {
    id: '5',
    item: 'Cardboard Boxes',
    image: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?q=80&w=200',
    weight: '5.5 kg',
    date: 'Jan 07, 2026',
    location: 'Barangay Salitran I',
  },
];

export default function HistoryPage() {
  const router = useRouter(); 
  const insets = useSafeAreaInsets();

  // Calculate Total Weight
  const totalWeight = SURRENDER_HISTORY
    .reduce((sum, item) => sum + parseFloat(item.weight.split(' ')[0]), 0)
    .toFixed(1);

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
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#D500F9" />
      
      {/* 🟣 HEADER (CENTERED) */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <View style={styles.headerRow}>
            {/* Back Button (Absolute Left) */}
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            {/* Title (Centered) */}
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
      <FlatList
        data={SURRENDER_HISTORY}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3E5F5' }, 

  // Header Styles
  headerBg: { 
      backgroundColor: '#D500F9', 
      paddingTop: 60, 
      paddingBottom: 25, 
      paddingHorizontal: 20, 
      borderBottomLeftRadius: 30, 
      borderBottomRightRadius: 30,
      elevation: 5,
      alignItems: 'center' // Ensures subtitle centers
  },
  headerRow: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', // Centers the title
      marginBottom: 5,
      width: '100%',
      position: 'relative' // Needed for absolute positioning of back button
  },
  backButton: {
      position: 'absolute',
      left: 0,
      zIndex: 10,
      padding: 5
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, textAlign: 'center' },

  // Summary Card
  summaryCardContainer: { 
      paddingHorizontal: 20, 
      marginTop: 20,     
      marginBottom: 15 
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center', 
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    borderWidth: 1, borderColor: '#E1BEE7'
  },
  summaryLabel: { fontSize: 12, fontWeight: 'bold', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 5 },

  // List Styles
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { 
      backgroundColor: 'white', borderRadius: 15, marginBottom: 15, padding: 15, 
      flexDirection: 'row', alignItems: 'center',
      elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2
  },
  cardImage: { width: 60, height: 80, borderRadius: 10, backgroundColor: '#f0f0f0', marginRight: 15, resizeMode: 'cover' },
  cardContent: { flex: 1, justifyContent: 'center' },
  
  itemTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  label: { fontSize: 12, color: '#555' },
  weightValue: { fontSize: 12, fontWeight: 'bold', color: '#333' },

  dateText: { fontSize: 11, color: '#888', marginBottom: 1 },
  locationText: { fontSize: 11, color: '#666' },
});