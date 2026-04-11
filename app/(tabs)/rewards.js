import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StatusBar } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase'; 
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

const getSafeShadow = () => Platform.select({ 
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, 
    android: { elevation: 3 } 
});

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export default function Rewards() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [wasteType, setWasteType] = useState(params.wasteType || params.itemName || params.scannedWaste || '');
  const [quantity, setQuantity] = useState('1');
  const [isClean, setIsClean] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); 
  
  const [aiResultText, setAiResultText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 🟢 UPDATED FIX 1: Auto-update ang input field kapag may pinasa galing Scan page
  useEffect(() => {
      if (params.wasteType || params.itemName || params.scannedWaste) {
          setWasteType(params.wasteType || params.itemName || params.scannedWaste || '');
      }
  }, [params.wasteType, params.itemName, params.scannedWaste]);

  const handleToggleClean = () => {
      const newValue = !isClean;
      setIsClean(newValue);
      if (!newValue) {
          setHasSearched(false);
          setResults([]);
          setAiResultText('');
      }
  };

  const handleSearch = async () => {
    if (!isClean) {
        return Alert.alert("Wait!", "Please confirm that your waste is clean and dry before searching.");
    }

    const finalWaste = wasteType.trim();

    if (!finalWaste) {
        Alert.alert("Missing Info", "Please enter a waste type to search.");
        return;
    }

    // 🟢 UPDATED FIX 2: Hard stopper para hindi na mag-AI search kapag "No Detectable Waste Item"
    if (finalWaste.toLowerCase().includes("no detectable waste") || finalWaste.toLowerCase() === "none") {
        setHasSearched(true);
        setResults([]);
        setAiResultText("Please enter a valid waste item or recyclable material so I can find the right drop-off centers for you.");
        return;
    }
    
    setLoading(true);
    setHasSearched(true);
    setAiResultText(''); 
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
        const inputQty = parseFloat(quantity) || 1;

        for (const reward of rewardsData) {
            const { data: centerData } = await supabase
                .from('dropoff_applications')
                .select('*') 
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
                    searchedWasteType: finalWaste,
                    latitude: centerData.latitude,
                    longitude: centerData.longitude
                });
            }
        }
        setResults(computedResults);

        setIsAiLoading(true);
        let userLocation = "Cavite or Metro Manila"; 

        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                let geocode = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
                if (geocode.length > 0) {
                    const address = geocode[0];
                    userLocation = [address.city || address.subregion, address.region].filter(Boolean).join(', ');
                }
            }
        } catch (locError) {
            console.log("Error getting location:", locError);
        }

        // 🟢 UPDATED FIX 3: Mas mahigpit na AI Prompt
        const aiPrompt = `The user wants to recycle or dispose of the following item: "${finalWaste}".
        They are currently located in or near: ${userLocation}, Philippines.
        
        CRITICAL RULE 1: First, determine if "${finalWaste}" is an actual physical waste item, recyclable material, or e-waste. 
        If it is NOT a valid waste item (e.g., a person, an abstract concept, random letters, or gibberish), DO NOT provide locations. Instead, reply EXACTLY with this sentence and nothing else: "Please enter a valid waste item or recyclable material so I can find the right drop-off centers for you."

        CRITICAL RULE 2: If it IS a valid waste item, provide a list of EXACT STORE NAMES, NGOs, OR SPECIFIC BUSINESSES near their location that accept this type of waste.
        DO NOT give generic answers like "local junk shops". Give real organization names (e.g., "SM Cares Trash to Cash", "The Plastic Flamingo", "IKEA Pasay", etc.).
        
        Format the response exactly like this:
        Exact places to check near ${userLocation}:
        - [Specific Store/NGO Name 1] - [Short description of what they accept]
        - [Specific Store/NGO Name 2] - [Short description of what they accept]
        - [Specific Store/NGO Name 3] - [Short description of what they accept]

        Tip: [Add a short, helpful tip about preparing this specific waste.]
         
        Keep it brief and conversational.
        Do NOT use markdown asterisks (**) for bolding.`;

        try {
            const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
                body: JSON.stringify({ 
                    model: 'gpt-5.4', 
                    messages: [{ role: 'user', content: aiPrompt }], 
                    temperature: 0.5, 
                    max_completion_tokens: 250 
                })
            });
            const aiData = await aiRes.json();
            if (aiData.choices && aiData.choices.length > 0) {
                setAiResultText(aiData.choices[0].message.content);
            }
        } catch (aiError) {
            console.log("AI Search Error:", aiError);
            setAiResultText("Sorry, GreenSort AI couldn't connect right now to search for recommendations. Please try again later.");
        } finally {
            setIsAiLoading(false);
        }

    } catch (error) {
        Alert.alert("Search Error", error.message);
    } finally {
        setLoading(false);
    }
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

        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); }}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.body}>
                    
                    <View style={styles.formCard}>
                        <Text style={styles.cardTitle}>Search Locations</Text>
                        
                        <Text style={styles.label}>Waste Type</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Type waste type (e.g. Computer Mouse, Plastic)" 
                            value={wasteType} 
                            onChangeText={setWasteType} 
                        />
                        
                        <Text style={styles.label}>Quantity (kg or pcs)</Text>
                        <TextInput style={styles.input} placeholder="1" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />

                        <TouchableOpacity style={[styles.checkboxContainer, isClean && styles.checkboxActive]} onPress={handleToggleClean} activeOpacity={0.8}>
                            <View style={[styles.checkbox, isClean && {backgroundColor: '#007C00', borderColor: '#007C00'}]}>
                                {isClean && <Ionicons name="checkmark" size={14} color="white" />}
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.checkboxTitle}>My Waste is Clean and Dry</Text>
                                <Text style={styles.checkboxSub}>Clean recyclables have higher value and are easier to process</Text>
                            </View>
                        </TouchableOpacity>

                        {!isClean && (
                            <Text style={{color: '#FF3B30', fontSize: 12, textAlign: 'center', marginBottom: 10, fontWeight: '600'}}>
                                * You must confirm your waste is clean to search.
                            </Text>
                        )}

                        <TouchableOpacity 
                            style={[styles.searchBtn, { backgroundColor: isClean ? '#007C00' : '#ccc' }]} 
                            onPress={handleSearch} 
                            disabled={loading || !isClean}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <><Ionicons name="search" size={18} color="white" style={{marginRight: 8}} /><Text style={styles.searchBtnText}>Search Centers</Text></>}
                        </TouchableOpacity>
                    </View>

                    {hasSearched && <Text style={[styles.sectionHeader, {color: '#007C00'}]}>AVAILABLE DROP OFF LOCATIONS</Text>}
                
                    {hasSearched && results.length === 0 && !loading && <Text style={styles.noResults}>No registered app centers found for this waste.</Text>}

                    {results.map((loc) => (
                        <TouchableOpacity key={loc.id} style={styles.resultCard} onPress={() => router.push({ pathname: '/location-details', params: { data: JSON.stringify(loc) } })}>
                            {loc.isClaimed && <View style={styles.claimedBadge}><Text style={styles.claimedText}>ALREADY CLAIMED</Text></View>}
                            
                            <Text style={styles.locName}>{loc.name}</Text>
                            <View style={styles.tagContainer}><Text style={styles.tagText}>{loc.type}</Text></View>
                            
                            {(loc.latitude && loc.longitude) ? (
                                <View style={styles.mapContainer}>
                                    <MapView
                                        style={styles.map}
                                        initialRegion={{
                                            latitude: loc.latitude,
                                            longitude: loc.longitude,
                                            latitudeDelta: 0.005, 
                                            longitudeDelta: 0.005,
                                        }}
                                        scrollEnabled={false} 
                                        zoomEnabled={false}
                                        pitchEnabled={false}
                                        rotateEnabled={false}
                                    >
                                        <Marker coordinate={{ latitude: loc.latitude, longitude: loc.longitude }} />
                                    </MapView>
                                </View>
                            ) : null}

                            <View style={styles.detailRow}><Ionicons name="location-outline" size={16} color="#666" style={{marginRight: 6}} /><Text style={styles.detailText}>{loc.address}</Text></View>
                            <View style={styles.materialsRow}>{loc.accepted.map((item, index) => (<View key={index} style={styles.materialTag}><Text style={styles.materialText}>{item}</Text></View>))}</View>
                            <View style={styles.incentiveBox}>
                                <Text style={styles.incentiveLabel}>Estimated Reward:</Text>
                                <Text style={styles.incentiveValue}>{loc.computedIncentive}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {hasSearched && (
                        <View style={{ marginTop: 20 }}>
                            <Text style={[styles.sectionHeader, {color: '#007C00'}]}>Can’t find anything nearby? Check out our recommended places based on our research in your area.</Text>
                            
                            {isAiLoading ? (
                                <View style={{padding: 20, alignItems: 'center'}}>
                                    <ActivityIndicator size="large" color="#007C00" />
                                    <Text style={{color: '#666', marginTop: 10, fontSize: 12}}>GreenSort is scanning locations near you...</Text>
                                </View>
                            ) : aiResultText ? (
                                <View style={styles.aiCard}>
                                    <View style={styles.aiHeader}>
                                        <Ionicons name="sparkles" size={18} color="#007C00" />
                                        <Text style={styles.aiLocName}>GreenSort Suggestions</Text>
                                    </View>
                                    <Text style={styles.aiDetails} selectable={true}>{aiResultText}</Text>
                                </View>
                            ) : (
                                !loading && <Text style={styles.noResults}>GreenSort could not find external locations at this moment.</Text>
                            )}
                        </View>
                    )}

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
  checkboxContainer: { flexDirection: 'row', backgroundColor: '#e7ffe0', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d1ffb2', marginBottom: 20, marginTop: 10 },
  checkboxActive: { backgroundColor: '#b2ffbe', borderColor: '#4dff65' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#007C00', marginRight: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  checkboxSub: { fontSize: 11, color: '#666', marginTop: 2, lineHeight: 14 },
  searchBtn: { backgroundColor: '#007C00', paddingVertical: 14, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  searchBtnText: { fontWeight: 'bold', color: 'white', fontSize: 14 },
  sectionHeader: { fontSize: 15, fontWeight: '900', marginBottom: 15, letterSpacing: 0.5 },
  noResults: { textAlign: 'center', color: '#999', marginTop: 10, marginBottom: 20, fontSize: 13 },
  resultCard: { backgroundColor: 'white', borderRadius: 15, padding: 18, marginBottom: 15, ...getSafeShadow() },
  locName: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  tagContainer: { backgroundColor: '#F5F5F5', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 4, marginBottom: 12 },
  mapContainer: { width: '100%', height: 130, borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  map: { width: '100%', height: '100%' },
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
  aiCard: { backgroundColor: '#F1F8E9', borderRadius: 15, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#C8E6C9', ...getSafeShadow() },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  aiLocName: { fontSize: 16, fontWeight: 'bold', color: '#007C00', marginLeft: 8 },
  aiDetails: { fontSize: 14, color: '#333', lineHeight: 22 }
});