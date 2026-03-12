import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StatusBar } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase'; 

const getSafeShadow = () => Platform.select({ 
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, 
    android: { elevation: 3 } 
});

const WASTE_OPTIONS = ['Plastics', 'Glass', 'Paper', 'Metals', 'Others'];

export default function Rewards() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [wasteType, setWasteType] = useState('');
  const [customWaste, setCustomWaste] = useState(''); 
  const [quantity, setQuantity] = useState('');
  const [isClean, setIsClean] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); 
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    const finalWaste = wasteType === 'Others' ? customWaste : wasteType;

    if (!finalWaste || !quantity) {
        Alert.alert("Missing Info", "Please select a waste type and enter quantity.");
        return;
    }
    setLoading(true);
    setHasSearched(true);
    Keyboard.dismiss();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: rewardsData, error: rewardsError } = await supabase
            .from('rewards_inventory')
            .select('*')
            .eq('is_available', true)
            .ilike('condition', `%${finalWaste}%`); 

        if (rewardsError) throw rewardsError;

        const { data: userLogs } = await supabase
            .from('surrender_logs')
            .select('reward_claimed, collector_email')
            .eq('resident_email', user?.email);

        const computedResults = [];
        const inputQty = parseFloat(quantity);

        for (const reward of rewardsData) {
            const { data: centerData } = await supabase
                .from('dropoff_applications')
                .select('program_name, exact_location, barangay, city, operating_days, operating_hours, contact_number')
                .eq('user_email', reward.user_email)
                .single();

            if (centerData) {
                const match = reward.condition.match(/(\d+)/);
                const baseRate = match ? parseFloat(match[1]) : 1;
                let incentiveText = "";
                const rewardMultiplier = Math.floor(inputQty / baseRate);

                if (rewardMultiplier >= 1) {
                    incentiveText = `Exchange your ${inputQty}kg waste for ${rewardMultiplier}x ${reward.name}`;
                } else {
                    incentiveText = `Need at least ${baseRate}kg for ${reward.name} (Current: ${inputQty}kg)`;
                }

                const isAlreadyClaimed = userLogs?.some(log => {
                    if (!log.reward_claimed || !reward.name) return false;
                    const savedReward = log.reward_claimed.toLowerCase().trim();
                    const centerReward = reward.name.toLowerCase().trim();
                    const isNameMatch = savedReward === centerReward || savedReward.includes(centerReward) || centerReward.includes(savedReward);
                    return isNameMatch && log.collector_email === reward.user_email;
                }) || false;

                computedResults.push({
                    id: reward.id,
                    name: centerData.program_name,
                    type: 'Collection Center',
                    address: centerData.exact_location || `${centerData.barangay}, ${centerData.city}`,
                    schedule: `${centerData.operating_days}, ${centerData.operating_hours}`,
                    contact: centerData.contact_number,
                    accepted: [reward.condition.replace(/[\d]+(kg|pcs)\s+/i, '')], 
                    baseRate: baseRate,
                    rewardUnit: reward.name,
                    subText: reward.description,
                    checklist: reward.checklist || '',
                    computedIncentive: incentiveText,
                    imageUrl: reward.image_url,
                    isClaimed: isAlreadyClaimed,
                    // 🟢 NAKASAMA NA YUNG SEARCHED WASTE DITO
                    searchedWasteType: finalWaste 
                });
            }
        }
        setResults(computedResults);
    } catch (error) {
        Alert.alert("Search Error", error.message);
    } finally {
        setLoading(false);
    }
  };

  const selectOption = (option) => {
    setWasteType(option);
    setIsDropdownOpen(false);
    if (option !== 'Others') setCustomWaste(''); 
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{flex: 1, backgroundColor: '#F5F7FA'}}>
        <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
        
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={{alignItems: 'center'}}>
                    <Text style={styles.headerTitle}>Rewards Centers</Text>
                    <Text style={styles.headerSubtitle}>Find centers accepting your waste</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>
        </View>

        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setIsDropdownOpen(false); }}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.body}>
                    
                    <View style={styles.formCard}>
                        <Text style={styles.cardTitle}>Search Locations</Text>
                        
                        <Text style={styles.label}>Waste Type</Text>
                        
                        <View style={{ zIndex: 100 }}>
                          {wasteType === 'Others' ? (
                            <View style={styles.customInputContainer}>
                              <TextInput 
                                style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                                placeholder="Type waste type (e.g. Battery)" 
                                autoFocus 
                                value={customWaste} 
                                onChangeText={setCustomWaste} 
                              />
                              <TouchableOpacity style={styles.resetBtn} onPress={() => setWasteType('')}>
                                <Ionicons name="close-circle" size={24} color="#999" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={[styles.dropdownTrigger, isDropdownOpen && styles.dropdownTriggerActive]} 
                              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                              <Text style={[styles.dropdownText, !wasteType && {color: '#999'}]}>
                                {wasteType || "Select waste type..."}
                              </Text>
                              <Ionicons name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                            </TouchableOpacity>
                          )}

                          {isDropdownOpen && (
                            <View style={styles.dropdownOverlay}>
                              {WASTE_OPTIONS.map((option) => (
                                <TouchableOpacity 
                                  key={option} 
                                  style={styles.optionItem} 
                                  onPress={() => selectOption(option)}
                                >
                                  <Text style={styles.optionText}>{option}</Text>
                                  {wasteType === option && <Ionicons name="checkmark" size={18} color="#007C00" />}
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                        
                        <Text style={styles.label}>Quantity (kg)</Text>
                        <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />

                        <TouchableOpacity style={[styles.checkboxContainer, isClean && styles.checkboxActive]} onPress={() => setIsClean(!isClean)} activeOpacity={0.8}>
                            <View style={[styles.checkbox, isClean && {backgroundColor: '#007C00', borderColor: '#007C00'}]}>
                                {isClean && <Ionicons name="checkmark" size={14} color="white" />}
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.checkboxTitle}>My Waste is Clean and Dry</Text>
                                <Text style={styles.checkboxSub}>Clean recyclables have higher value and are easier to process</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <><Ionicons name="search" size={18} color="white" style={{marginRight: 8}} /><Text style={styles.searchBtnText}>Search Centers</Text></>}
                        </TouchableOpacity>
                    </View>

                    {hasSearched && <Text style={styles.sectionHeader}>Available Locations</Text>}
                    {hasSearched && results.length === 0 && !loading && <Text style={styles.noResults}>No drop-off centers found.</Text>}

                    {results.map((loc) => (
                        <TouchableOpacity key={loc.id} style={styles.resultCard} onPress={() => router.push({ pathname: '/location-details', params: { data: JSON.stringify(loc) } })}>
                            {loc.isClaimed && <View style={styles.claimedBadge}><Text style={styles.claimedText}>ALREADY CLAIMED</Text></View>}
                            <Text style={styles.locName}>{loc.name}</Text>
                            <View style={styles.tagContainer}><Text style={styles.tagText}>{loc.type}</Text></View>
                            <View style={styles.detailRow}><Ionicons name="location-outline" size={16} color="#666" style={{marginRight: 6}} /><Text style={styles.detailText}>{loc.address}</Text></View>
                            <View style={styles.materialsRow}>{loc.accepted.map((item, index) => (<View key={index} style={styles.materialTag}><Text style={styles.materialText}>{item}</Text></View>))}</View>
                            <View style={styles.incentiveBox}>
                                <Text style={styles.incentiveLabel}>Estimated Reward:</Text>
                                <Text style={styles.incentiveValue}>{loc.computedIncentive}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={{height: 100}} /> 
            </ScrollView>
        </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  header: { backgroundColor: '#007C00', paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
  body: { padding: 20 }, 
  formCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 25, ...getSafeShadow() },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  label: { fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '600', marginTop: 10 },
  input: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#F0F0F0' },
  
  dropdownTrigger: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#F5F7FA', 
    borderRadius: 10, 
    padding: 14, 
    borderWidth: 1, 
    borderColor: '#F0F0F0',
    zIndex: 100
  },
  dropdownTriggerActive: { borderColor: '#007C00' },
  dropdownText: { fontSize: 14, color: '#333' },

  dropdownOverlay: {
    position: 'absolute',
    top: 50, 
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 999, 
    paddingVertical: 5
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0'
  },
  optionText: { fontSize: 14, color: '#555' },

  customInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  resetBtn: { padding: 5 },

  checkboxContainer: { flexDirection: 'row', backgroundColor: '#e7ffe0', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d1ffb2', marginBottom: 20, marginTop: 10 },
  checkboxActive: { backgroundColor: '#b2ffbe', borderColor: '#4dff65' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#007C00', marginRight: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  checkboxSub: { fontSize: 11, color: '#666', marginTop: 2, lineHeight: 14 },
  searchBtn: { backgroundColor: '#007C00', paddingVertical: 14, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  searchBtnText: { fontWeight: 'bold', color: 'white', fontSize: 14 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#263238', marginBottom: 15 },
  noResults: { textAlign: 'center', color: '#999', marginTop: 20 },
  resultCard: { backgroundColor: 'white', borderRadius: 15, padding: 18, marginBottom: 15, ...getSafeShadow() },
  locName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  tagContainer: { backgroundColor: '#F5F5F5', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 4, marginBottom: 12 },
  tagText: { fontSize: 10, color: '#666', fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailText: { fontSize: 13, color: '#555' },
  materialsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 15 },
  materialTag: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  materialText: { fontSize: 11, color: '#2E7D32', fontWeight: '600' },
  incentiveBox: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#007C00' },
  incentiveLabel: { fontSize: 11, color: '#00695C', marginBottom: 2 },
  incentiveValue: { fontSize: 15, fontWeight: 'bold', color: '#004D40', lineHeight: 22 },
  claimedBadge: { position: 'absolute', top: 15, right: 15, backgroundColor: '#9E9E9E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, zIndex: 5 },
  claimedText: { color: 'white', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
});