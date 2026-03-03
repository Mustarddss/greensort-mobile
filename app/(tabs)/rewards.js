import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase'; 

export default function Rewards() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [wasteType, setWasteType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isClean, setIsClean] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); 
  const [hasSearched, setHasSearched] = useState(false);

  // 🔍 LIVE SEARCH + SMART CLAIMED CHECKER
  const handleSearch = async () => {
    if (!wasteType || !quantity) {
        Alert.alert("Missing Info", "Please enter the waste type and quantity (kg).");
        return;
    }
    setLoading(true);
    setHasSearched(true);
    Keyboard.dismiss();

    try {
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Kunin lahat ng available rewards
        const { data: rewardsData, error: rewardsError } = await supabase
            .from('rewards_inventory')
            .select('*')
            .eq('is_available', true)
            .ilike('condition', `%${wasteType}%`); 

        if (rewardsError) throw rewardsError;

        // 2. Kunin ang HISTORY ng user para malaman kung na-claim na niya
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

                // 🟢 SMART CHECKER: Hahanapin kung nag-match kahit may slight typo o extra space
                const isAlreadyClaimed = userLogs?.some(log => {
                    if (!log.reward_claimed || !reward.name) return false;
                    
                    // Tatanggalin ang extra spaces at gagawing lowercase lahat
                    const savedReward = log.reward_claimed.toLowerCase().trim();
                    const centerReward = reward.name.toLowerCase().trim();

                    // Kung exact match, O KUNG kasama sa string (e.g. "Coffee" is inside "10 KG of Coffee bean")
                    const isNameMatch = savedReward === centerReward || 
                                        savedReward.includes(centerReward) || 
                                        centerReward.includes(savedReward);
                                        
                    const isCenterMatch = log.collector_email === reward.user_email;

                    return isNameMatch && isCenterMatch;
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
                    isClaimed: isAlreadyClaimed // 🟢 Naipasa na ang mas matalinong checking
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{flex: 1, backgroundColor: '#F4F6F8'}}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Rewards Drop-off Centers</Text>
                <View style={{width: 24}} />
            </View>
            <Text style={styles.headerSubtitle}>Find centers accepting your waste</Text>
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.body}>
                    
                    <View style={styles.formCard}>
                        <Text style={styles.cardTitle}>Search Locations</Text>
                        <Text style={styles.label}>Waste Type</Text>
                        <TextInput style={styles.input} placeholder="e.g., Pet bottle, Cans" value={wasteType} onChangeText={setWasteType} />
                        <Text style={styles.label}>Quantity (kg)</Text>
                        <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />

                        <TouchableOpacity style={[styles.checkboxContainer, isClean && styles.checkboxActive]} onPress={() => setIsClean(!isClean)} activeOpacity={0.8}>
                            <View style={[styles.checkbox, isClean && {backgroundColor: '#FF6D00', borderColor: '#FF6D00'}]}>
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
                    {hasSearched && results.length === 0 && !loading && <Text style={styles.noResults}>No drop-off centers found for this criteria.</Text>}

                    {results.map((loc) => (
                        <TouchableOpacity 
                            key={loc.id} 
                            style={[styles.resultCard, loc.isClaimed && {borderColor: '#9E9E9E', opacity: 0.8}]} 
                            onPress={() => router.push({
                                pathname: '/location-details',
                                params: { data: JSON.stringify(loc) }
                            })}
                        >
                            {loc.isClaimed && (
                                <View style={styles.claimedBadge}>
                                    <Text style={styles.claimedText}>ALREADY CLAIMED</Text>
                                </View>
                            )}

                            <Text style={styles.locName}>{loc.name}</Text>
                            <View style={styles.tagContainer}><Text style={styles.tagText}>{loc.type}</Text></View>
                            
                            <View style={styles.detailRow}><Ionicons name="location-outline" size={16} color="#666" style={{marginRight: 6}} /><Text style={styles.detailText}>{loc.address}</Text></View>
                            <View style={styles.detailRow}><Ionicons name="time-outline" size={16} color="#666" style={{marginRight: 6}} /><Text style={styles.detailText}>{loc.schedule}</Text></View>

                            <View style={styles.materialsRow}>
                                {loc.accepted.map((item, index) => (
                                    <View key={index} style={styles.materialTag}><Text style={styles.materialText}>{item}</Text></View>
                                ))}
                            </View>

                            <View style={[styles.incentiveBox, loc.isClaimed && {backgroundColor: '#F5F5F5', borderLeftColor: '#9E9E9E'}]}>
                                <Text style={styles.incentiveLabel}>Estimated Reward:</Text>
                                <Text style={[styles.incentiveValue, loc.isClaimed && {color: '#666'}]}>{loc.computedIncentive}</Text>
                                <Text style={styles.incentiveSub}>{loc.subText}</Text>
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
  container: { flexGrow: 1 },
  header: { backgroundColor: '#FF6D00', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10, elevation: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 5, fontSize: 12 },
  body: { padding: 20, paddingTop: 15 }, 
  formCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 25, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  label: { fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#F0F0F0', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 14, color: '#333' },
  checkboxContainer: { flexDirection: 'row', backgroundColor: '#FFF3E0', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FFE0B2', marginBottom: 20 },
  checkboxActive: { backgroundColor: '#FFE0B2', borderColor: '#FFB74D' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#FF6D00', marginRight: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  checkboxSub: { fontSize: 11, color: '#666', marginTop: 2, lineHeight: 14 },
  searchBtn: { backgroundColor: '#FF6D00', paddingVertical: 14, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  searchBtnText: { fontWeight: 'bold', color: 'white', fontSize: 14 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  noResults: { textAlign: 'center', color: '#999', marginTop: 20 },
  resultCard: { backgroundColor: 'white', borderRadius: 15, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#34A853', elevation: 2, position: 'relative' },
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
  claimedBadge: { position: 'absolute', top: 15, right: 15, backgroundColor: '#9E9E9E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, zIndex: 5 },
  claimedText: { color: 'white', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
});