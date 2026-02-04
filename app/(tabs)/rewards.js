import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// 👇 MOCK DATABASE (Ito ang temporary data habang offline)
const MOCK_LOCATIONS = [
  {
    id: 1,
    name: 'Barangay Sampaloc I',
    type: 'Municipal Facility',
    address: 'Dasmariñas City, Cavite',
    schedule: 'Mon-Sat, 8:00am - 5:00pm',
    accepted: ['Plastics', 'Paper', 'Metal'],
    baseRate: 10, 
    rewardUnit: 'kg Rice',
    subText: 'Subject to availability of stocks.'
  },
  {
    id: 2,
    name: 'GreenSort Central Hub',
    type: 'Official Drop-off',
    address: 'Silang, Cavite',
    schedule: 'Daily, 7:00am - 7:00pm',
    accepted: ['All Types'],
    baseRate: 15,
    rewardUnit: 'Cash',
    subText: 'Rates change daily based on market value.'
  }
];

export default function Rewards() {
  const router = useRouter();
  
  // 🟢 INPUT STATES
  const [wasteType, setWasteType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isClean, setIsClean] = useState(false);
  
  // 🟢 SEARCH STATES
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); 
  const [hasSearched, setHasSearched] = useState(false);

  // 🔍 HANDLE SEARCH
  const handleSearch = () => {
    if (!wasteType || !quantity) {
        Alert.alert("Missing Info", "Please enter the waste type and quantity (kg).");
        return;
    }

    setLoading(true);
    setHasSearched(true);

    // Simulate Loading
    setTimeout(() => {
        const inputQty = parseFloat(quantity);
        
        const computedResults = MOCK_LOCATIONS.map(loc => {
            let incentiveText = "";

            if (loc.rewardUnit === 'kg Rice') {
                const riceKilos = Math.floor(inputQty / loc.baseRate); 
                if (riceKilos >= 1) {
                    incentiveText = `Exchange your ${inputQty}kg waste for ${riceKilos}kg Bigas`;
                } else {
                    incentiveText = `Need at least ${loc.baseRate}kg for Rice (Current: ${inputQty}kg)`;
                }
            } else if (loc.rewardUnit === 'Cash') {
                const cash = inputQty * loc.baseRate;
                incentiveText = `Receive approx. ₱${cash.toFixed(2)} Cash`;
            }

            return { ...loc, computedIncentive: incentiveText };
        });

        setResults(computedResults);
        setLoading(false);
    }, 1000);
  };

  return (
    <View style={{flex: 1, backgroundColor: '#F4F6F8'}}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
            {/* 🟠 HEADER */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Rewards Recommendation</Text>
                    <View style={{width: 24}} />
                </View>
                <Text style={styles.headerSubtitle}>Check your reward</Text>
            </View>

            <View style={styles.body}>
                
                {/* 📝 FORM CARD */}
                <View style={styles.formCard}>
                    <Text style={styles.cardTitle}>Drop-off Locations Centers</Text>

                    <Text style={styles.label}>Waste Type</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g., Plastic bottles, Aluminum cans"
                        value={wasteType}
                        onChangeText={setWasteType}
                    />

                    <Text style={styles.label}>Quantity (kg)</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="0" 
                        keyboardType="numeric"
                        value={quantity}
                        onChangeText={setQuantity}
                    />

                    <TouchableOpacity 
                        style={[styles.checkboxContainer, isClean && styles.checkboxActive]}
                        onPress={() => setIsClean(!isClean)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.checkbox, isClean && {backgroundColor: '#FF6D00', borderColor: '#FF6D00'}]}>
                            {isClean && <Ionicons name="checkmark" size={14} color="white" />}
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.checkboxTitle}>My Waste is Clean and Dry</Text>
                            <Text style={styles.checkboxSub}>Clean recyclables have higher value and are easier to process</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                        {loading ? (
                            <ActivityIndicator color="#333" />
                        ) : (
                            <>
                                <Ionicons name="search" size={18} color="#333" style={{marginRight: 8}} />
                                <Text style={styles.searchBtnText}>Search Drop-off Centers</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* 📍 RESULTS SECTION (Dito yung nabago) */}
                <Text style={styles.sectionHeader}>Available Locations</Text>

                {hasSearched && results.length === 0 && !loading && (
                    <Text style={styles.noResults}>No drop-off centers found for this criteria.</Text>
                )}

                {/* 👇 ITO ANG CLICKABLE LIST */}
                {results.map((loc) => (
                    <TouchableOpacity 
                        key={loc.id} 
                        style={styles.resultCard}
                        onPress={() => router.push({
                            pathname: '/location-details',
                            params: { data: JSON.stringify(loc) }
                        })}
                    >
                        {/* Title & Type */}
                        <Text style={styles.locName}>{loc.name}</Text>
                        <View style={styles.tagContainer}>
                            <Text style={styles.tagText}>{loc.type}</Text>
                        </View>

                        {/* Info */}
                        <View style={styles.detailRow}>
                            <Ionicons name="location-outline" size={16} color="#666" style={{marginRight: 6}} />
                            <Text style={styles.detailText}>{loc.address}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="time-outline" size={16} color="#666" style={{marginRight: 6}} />
                            <Text style={styles.detailText}>{loc.schedule}</Text>
                        </View>

                        {/* Accepted Items */}
                        <View style={styles.materialsRow}>
                            {loc.accepted.map((item, index) => (
                                <View key={index} style={styles.materialTag}>
                                    <Text style={styles.materialText}>{item}</Text>
                                </View>
                            ))}
                        </View>

                        {/* 🎁 DYNAMIC INCENTIVE BOX */}
                        <View style={styles.incentiveBox}>
                            <Text style={styles.incentiveLabel}>Estimated Incentive:</Text>
                            <Text style={styles.incentiveValue}>
                                {loc.computedIncentive}
                            </Text>
                            <Text style={styles.incentiveSub}>{loc.subText}</Text>
                        </View>
                    </TouchableOpacity>
                ))}

            </View>
            <View style={{height: 100}} /> 
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  header: { backgroundColor: '#FF6D00', paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 5 },
  body: { padding: 20, marginTop: -20 }, 
  formCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 25, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  label: { fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#F0F0F0', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 14, color: '#333' },
  checkboxContainer: { flexDirection: 'row', backgroundColor: '#FFF3E0', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FFE0B2', marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#FF6D00', marginRight: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  checkboxSub: { fontSize: 11, color: '#666', marginTop: 2, lineHeight: 14 },
  searchBtn: { backgroundColor: '#E0E0E0', paddingVertical: 14, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D0D0D0' },
  searchBtnText: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  noResults: { textAlign: 'center', color: '#999', marginTop: 20 },
  resultCard: { backgroundColor: 'white', borderRadius: 15, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#34A853', elevation: 2 },
  locName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  tagContainer: { backgroundColor: '#F5F5F5', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 4, marginBottom: 12 },
  tagText: { fontSize: 10, color: '#666', fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailText: { fontSize: 13, color: '#555' },
  materialsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 15 },
  materialTag: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  materialText: { fontSize: 11, color: '#2E7D32', fontWeight: '600' },
  incentiveBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#00C853' },
  incentiveLabel: { fontSize: 11, color: '#00695C', marginBottom: 2 },
  incentiveValue: { fontSize: 15, fontWeight: 'bold', color: '#004D40', lineHeight: 22 },
  incentiveSub: { fontSize: 11, color: '#00796B', marginTop: 4, fontStyle: 'italic' },
});