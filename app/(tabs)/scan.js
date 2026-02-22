import { useState } from 'react';
import { StyleSheet, Text, View, Image, ActivityIndicator, Alert, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons, Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 👈 Import for Giant Header Fix

export default function ScanPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // 👈 Kukunin ang exact height ng Notch/Status Bar
  
  // STATES
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState('');
  
  // MODAL STATES
  const [modalVisible, setModalVisible] = useState(false);
  const [customIdea, setCustomIdea] = useState('');

  // 💡 SUGGESTIONS LOGIC
  const getSuggestions = () => {
    if (!result || !result.detected) return [];
    const item = result.detected.toLowerCase();
    if (item.includes('bottle')) return ['Plastic Bottle Planter', 'Pen Organizer', 'Bird Feeder'];
    if (item.includes('paper') || item.includes('cardboard')) return ['Storage Box', 'Gift Bag', 'Wall Decor'];
    return ['Decorative Art', 'Desk Organizer', 'Garden Tool'];
  };

  // 📸 PICK IMAGE (CAMERA)
  const pickImageCamera = async () => {
    try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'We need access to your camera!'); return; }
        
        let pickerResult = await ImagePicker.launchCameraAsync({ 
            mediaTypes: ImagePicker.MediaTypeOptions.Images, 
            quality: 0.5, allowsEditing: true, aspect: [1, 1] 
        });
        
        if (!pickerResult.canceled) handleAnalysis(pickerResult.assets[0].uri, null);
    } catch (error) { Alert.alert("Error", "Could not open camera."); }
  };

  // 🖼️ PICK IMAGE (GALLERY)
  const pickImageGallery = async () => {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'We need access to your gallery!'); return; }
        
        let pickerResult = await ImagePicker.launchImageLibraryAsync({ 
            mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5, aspect: [1, 1]
        });
        
        if (!pickerResult.canceled) handleAnalysis(pickerResult.assets[0].uri, null);
    } catch (error) { Alert.alert("Error", "Could not open gallery."); }
  };

  // 🤖 ANALYZE FUNCTION
  const handleAnalysis = async (uri, textInput) => {
    setLoading(true); setResult(null);
    if (uri) setImage(uri);

    const detectedItem = textInput ? textInput : "Plastic Bottles (PET)"; 
    const isRecyclable = detectedItem.toLowerCase().includes('bottle') || detectedItem.toLowerCase().includes('paper') || detectedItem.toLowerCase().includes('plastic');

    setTimeout(() => {
        setResult({
            success: true,
            detected: isRecyclable ? "Plastic Bottles (PET)" : detectedItem,
            category: isRecyclable ? "Recyclable Plastic" : "General Waste", 
            confidenceScore: 90, 
            status: "Recyclable Material",
            recyclingTip: "Remove caps and labels before recycling. Rinse bottles thoroughly and let dry. Crush to save space."
        });
        setLoading(false);
    }, 2000);
  };

  // ⌨️ HANDLE MANUAL INPUT
  const submitManualInput = () => {
      if (!manualInput.trim()) return;
      handleAnalysis(null, manualInput);
      setManualInput('');
  };

  // 📍 NAVIGATE TO REWARDS
  const goToRewards = () => {
      router.push('/(tabs)/rewards');
  };

  // 🚀 NAVIGATE TO PROJECTS
  const proceedToProject = (idea) => {
    setModalVisible(false); setCustomIdea('');
    if (result) {
        router.push({ 
            pathname: '/(tabs)/projects', 
            params: { itemName: result.detected, projectType: idea, openDirectly: 'true' } 
        });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
             <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={{marginTop: 10}}>
             <Text style={styles.headerTitle}>Scan Waste</Text>
             <Text style={styles.headerSubtitle}>Use AI to identify and classify your waste</Text>
          </View>
      </View>

      <View style={styles.bodyContent}>
      
        {/* CAMERA PREVIEW */}
        <View style={styles.cameraContainer}>
            {loading ? (
                 <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00C853" />
                    <Text style={styles.loadingText}>Analyzing...</Text>
                 </View>
            ) : image ? (
                <Image source={{ uri: image }} style={styles.cameraImage} />
            ) : (
                <TouchableOpacity style={styles.placeholderContainer} onPress={pickImageCamera}>
                      <View style={styles.iconCircle}>
                         <MaterialCommunityIcons name="camera-plus" size={40} color="#00C853" />
                      </View>
                      <Text style={styles.placeholderText}>Tap to Scan</Text>
                </TouchableOpacity>
            )}
        </View>

        {/* ✅ RESULT CARD */}
        {result && !loading && (
             <View style={styles.resultCard}>
                
                <Text style={styles.cardHeaderTitle}>AI Recognition Result</Text>
                
                <View style={styles.accuracyContainer}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, {width: `${result.confidenceScore}%`}]} />
                    </View>
                    <Text style={styles.accuracyText}>Accuracy Level: {result.confidenceScore}%</Text>
                </View>

                <View style={{marginTop: 15}}>
                    <Text style={styles.smallLabel}>Waste Type</Text>
                    <Text style={styles.mainWasteTitle}>{result.detected}</Text>
                    <Text style={styles.smallLabel}>Category</Text>
                    <Text style={styles.categoryText}>{result.category}</Text>
                    <View style={styles.statusChip}>
                        <MaterialCommunityIcons name="check-circle-outline" size={16} color="#2E7D32" />
                        <Text style={styles.statusText}>{result.status}</Text>
                    </View>
                </View>

                {/* 🔘 ACTION BUTTONS */}
                <Text style={styles.actionLabel}>What would you like to do?</Text>

                {/* 1. Find Disposal (PRESSABLE: Green Hover) */}
                <Pressable 
                    onPress={goToRewards}
                    style={({ pressed }) => [
                        styles.outlinedBtn, 
                        pressed && styles.outlinedBtnActive 
                    ]}
                >
                    {({ pressed }) => (
                        <>
                            <View>
                                <Text style={[styles.outlinedBtnTitle, pressed && {color: 'white'}]}>
                                    Find Disposal & Incentives
                                </Text>
                                <Text style={[styles.outlinedBtnSub, pressed && {color: 'rgba(255,255,255,0.9)'}]}>
                                    View rewards recommendations
                                </Text>
                            </View>
                            <MaterialCommunityIcons 
                                name="arrow-right-circle" 
                                size={24} 
                                color={pressed ? "white" : "#00C853"} 
                            />
                        </>
                    )}
                </Pressable>

                {/* 2. View DIY Projects (PRESSABLE: Green Hover - UPDATED!) */}
                <Pressable 
                    onPress={() => setModalVisible(true)}
                    style={({ pressed }) => [
                        styles.outlinedBtn, 
                        pressed && styles.outlinedBtnActive 
                    ]}
                >
                    {({ pressed }) => (
                        <>
                            <View>
                                <Text style={[styles.outlinedBtnTitle, pressed && {color: 'white'}]}>
                                    View DIY upcycling projects
                                </Text>
                                <Text style={[styles.outlinedBtnSub, pressed && {color: 'rgba(255,255,255,0.9)'}]}>
                                    Creative ways to reuse this item
                                </Text>
                            </View>
                            <MaterialCommunityIcons 
                                name="arrow-right-circle" 
                                size={24} 
                                color={pressed ? "white" : "#00C853"} 
                            />
                        </>
                    )}
                </Pressable>

                {/* MANUAL INPUT */}
                <Text style={styles.manualInputLabel}>Couldn't get the exact waste result?</Text>
                <View style={styles.inputWrapper}>
                    <TextInput 
                        style={styles.textInput}
                        placeholder="Type your waste here"
                        value={manualInput}
                        onChangeText={setManualInput}
                    />
                    <TouchableOpacity onPress={submitManualInput}>
                        <Feather name="send" size={20} color="#00C853" style={{marginRight: 10}}/>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={{marginTop: 20, alignItems: 'center'}} onPress={() => {setResult(null); setImage(null);}}>
                    <Text style={styles.scanAgainLink}>Scan Another Item</Text>
                </TouchableOpacity>
             </View>
        )}

        {/* 🌿 POST-SCAN RECYCLING TIP */}
        {result && !loading && (
            <View style={styles.tipsContainer}>
                <View style={styles.tipHeaderRow}>
                    <MaterialCommunityIcons name="leaf" size={18} color="#2E7D32" />
                    <Text style={styles.tipsTitle}>Recycling Tip</Text>
                </View>
                <View style={styles.bulletPoint}><Text style={styles.bulletText}>• {result.recyclingTip}</Text></View>
            </View>
        )}
        
        {/* 💰 POST-SCAN COLLECTIBLE NOTE */}
        {result && !loading && (
             <View style={styles.collectibleContainer}>
                 <FontAwesome5 name="coins" size={20} color="#2E7D32" />
                 <Text style={styles.collectibleText}><Text style={{fontWeight:'bold'}}>This is a Waste Collectible!</Text> Collect and earn rewards.</Text>
             </View>
        )}

        {/* 🟢 DEFAULT ACTIONS & TIPS (KUNG WALA PANG SCAN) */}
        {!result && !loading && (
            <View>
                <View style={styles.defaultActions}>
                    <TouchableOpacity style={styles.scanBtn} onPress={pickImageCamera}>
                        <MaterialCommunityIcons name="camera" size={20} color="white" style={{marginRight: 10}} />
                        <Text style={styles.scanBtnText}>Scan Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.uploadBtn} onPress={pickImageGallery}>
                        <MaterialCommunityIcons name="image-outline" size={20} color="#00C853" style={{marginRight: 10}} />
                        <Text style={styles.uploadBtnText}>Upload from Gallery</Text>
                    </TouchableOpacity>
                </View>

                {/* 💡 SCANNING TIPS (UPDATED TO GREEN THEME) */}
                <View style={styles.tipsCard}>
                    <View style={styles.tipsHeader}>
                        <Text style={styles.tipsCardTitle}>Scanning Tips</Text>
                        <View style={styles.tipsBadge}>
                            <Text style={styles.tipsBadgeText}>?</Text>
                        </View>
                    </View>
                    
                    <View style={styles.tipItem}>
                        <View style={styles.bullet} />
                        <Text style={styles.tipCardText}>Ensure good lighting for accurate results</Text>
                    </View>
                    <View style={styles.tipItem}>
                        <View style={styles.bullet} />
                        <Text style={styles.tipCardText}>Place the item on a plain background</Text>
                    </View>
                    <View style={styles.tipItem}>
                        <View style={styles.bullet} />
                        <Text style={styles.tipCardText}>Center the waste item in the frame</Text>
                    </View>
                </View>
            </View>
        )}

      </View>

      {/* MODAL */}
      {result && (
        <Modal visible={modalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeaderRow}>
                        <Text style={styles.modalTitle}>Choose Project</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <MaterialCommunityIcons name="close-circle" size={28} color="#ccc" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.modalSubtitle}>Ideas for {result.detected}:</Text>
                    {getSuggestions().map((idea, i) => (
                        <TouchableOpacity key={i} style={styles.modalOption} onPress={() => proceedToProject(idea)}>
                            <Text style={styles.optionText}>{idea}</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="#00C853" />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </Modal>
      )}
      <View style={{height: 50}} /> 
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F4F6F8' },
  headerBg: { backgroundColor: '#00C853', 
    paddingTop: 50, 
    paddingBottom: 30, 
    paddingHorizontal: 20, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30, 
    marginBottom: 10 },
  backBtn: { marginBottom: 5 },
  headerTitle: { color: 'white', fontSize: 22, textAlign: 'center', fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontSize: 13 },
  bodyContent: { paddingHorizontal: 20, marginTop: -20 },
  cameraContainer: { width: '100%', height: 250, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff', marginBottom: 20, elevation: 4, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
  cameraImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  loadingContainer: { alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#00C853', fontWeight: 'bold' },
  placeholderContainer: { alignItems: 'center' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  placeholderText: { fontSize: 16, color: '#666', fontWeight: 'bold' },
  
  resultCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 20 },
  cardHeaderTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  accuracyContainer: { marginBottom: 15 },
  progressBarBg: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 5 },
  progressBarFill: { height: '100%', backgroundColor: '#00C853', borderRadius: 4 },
  accuracyText: { fontSize: 12, color: '#00C853', fontWeight: 'bold' },
  smallLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  mainWasteTitle: { fontSize: 20, fontWeight: 'bold', color: '#00C853', marginBottom: 10 },
  categoryText: { fontSize: 16, color: '#333', marginBottom: 10 },
  statusChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#E8F5E9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#C8E6C9' },
  statusText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
  actionLabel: { fontSize: 13, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10 },
  
  // 👇 BUTTON STYLES (Used for BOTH Buttons now)
  outlinedBtn: {
      backgroundColor: 'white', 
      borderRadius: 12, 
      padding: 15, 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#00C853' 
  },
  outlinedBtnActive: {
      backgroundColor: '#00C853', // Nagiging Green pag pinindot (Hover effect)
  },
  outlinedBtnTitle: { color: '#00C853', fontWeight: 'bold', fontSize: 14 },
  outlinedBtnSub: { color: '#666', fontSize: 11 },

  manualInputLabel: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#F9F9F9' },
  textInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, fontSize: 14, color: '#333' },
  scanAgainLink: { color: '#00C853', fontWeight: 'bold', fontSize: 14 },
  
  // POST-SCAN TIPS
  tipsContainer: { backgroundColor: 'white', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#4CAF50', marginBottom: 15 },
  tipHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  tipsTitle: { fontWeight: 'bold', color: '#2E7D32', marginLeft: 5, fontSize: 14 },
  bulletPoint: { marginTop: 5, paddingLeft: 5 },
  bulletText: { fontSize: 12, color: '#2E7D32', lineHeight: 18 },
  collectibleContainer: { backgroundColor: '#E8F5E9', borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#81C784', marginBottom: 30 },
  collectibleText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#1B5E20' },
  
  defaultActions: { gap: 15, marginTop: 10 },
  scanBtn: { backgroundColor: '#00C853', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, elevation: 3 },
  scanBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  uploadBtn: { backgroundColor: 'white', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#00C853' },
  uploadBtnText: { color: '#00C853', fontSize: 16, fontWeight: 'bold' },
  
  // 👇 PRE-SCAN TIPS CARD (UPDATED TO GREEN THEME)
  tipsCard: { 
      backgroundColor: '#E8F5E9', // Light Green (instead of Teal)
      marginTop: 25, 
      padding: 20, 
      borderRadius: 15, 
      borderWidth: 1, 
      borderColor: '#C8E6C9' 
  },
  tipsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  tipsCardTitle: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 }, // Dark Green Text
  tipsBadge: { backgroundColor: '#00C853', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tipsBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00C853', marginTop: 6, marginRight: 10 }, // Green Bullet
  tipCardText: { color: '#1B5E20', fontSize: 13, lineHeight: 18, flex: 1 }, // Dark Green Text

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', padding: 25, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  optionText: { fontSize: 16, color: '#333', fontWeight: '500' },
});