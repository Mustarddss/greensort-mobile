import { useState } from 'react';
import { StyleSheet, Text, View, Image, ActivityIndicator, Alert, TouchableOpacity, ScrollView, TextInput, Modal, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ScanPage() {
  const router = useRouter();
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // MODAL STATES
  const [modalVisible, setModalVisible] = useState(false);
  const [customIdea, setCustomIdea] = useState('');

  // ⚠️ YOUR IP
  const API_URL = 'http://192.168.1.5:3000/classify';

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
            quality: 0.3,
            allowsEditing: true, 
            aspect: [1, 1] 
        });
        
        if (!pickerResult.canceled) handleImage(pickerResult.assets[0].uri);
    } catch (error) {
        Alert.alert("Error", "Could not open camera.");
    }
  };

  // 🖼️ PICK IMAGE (GALLERY)
  const pickImageGallery = async () => {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'We need access to your gallery!'); return; }
        
        let pickerResult = await ImagePicker.launchImageLibraryAsync({ 
            mediaTypes: ImagePicker.MediaTypeOptions.Images, 
            allowsEditing: true, 
            quality: 0.3, 
            aspect: [1, 1]
        });
        
        if (!pickerResult.canceled) handleImage(pickerResult.assets[0].uri);
    } catch (error) {
        Alert.alert("Error", "Could not open gallery.");
    }
  };

  // 🤖 ANALYZE IMAGE
  const handleImage = async (uri) => {
    setImage(uri); setLoading(true); setResult(null);
    
    // 👇 MOCK DATA: "Recyclable" para lumabas pareho (Note + Button)
    setTimeout(() => {
        setResult({
            success: true,
            detected: "Plastic Bottles (PET)",
            category: "Recyclable", 
            confidenceScore: 94, 
            recyclingTip: "Clean and remove caps before recycling. Crush to save space."
        });
        setLoading(false);
    }, 2000);
  };

  // 🚀 NAVIGATE TO PROJECTS (AUTO-OPEN LOGIC)
  const proceedToProject = (idea) => {
    setModalVisible(false);
    setCustomIdea('');
    
    if (result) {
        // 👇 ITO ANG SIKRETO: Nagpasa tayo ng "openDirectly: true"
        // Pagdating sa Projects Page, babasahin niya ito at bubuksan agad ang guide.
        router.push({ 
            pathname: '/(tabs)/projects', 
            params: { 
                itemName: result.detected, 
                projectType: idea,
                openDirectly: 'true' // <--- SIGNAL PARA MAG-AUTO OPEN
            } 
        });
    }
  };

  // 👇 HELPER: Check categories
  const showBarangayNote = result && (result.category === 'Barangay Collectible' || result.category === 'Recyclable');
  const showUpcycleBtn = result && (result.category === 'Upcyclable' || result.category === 'Recyclable');

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* 🟢 HEADER */}
      <View style={styles.headerBg}>
          <View style={styles.headerContent}>
             <TouchableOpacity onPress={() => router.back()} style={{position: 'absolute', left: 0, top: 5}}>
                <Ionicons name="arrow-back" size={24} color="white" />
             </TouchableOpacity>
             <Text style={styles.headerTitle}>Scan Waste</Text>
             <Text style={styles.headerSubtitle}>Use AI to identify and classify your waste</Text>
          </View>
      </View>

      <View style={styles.bodyContent}>
      
        {/* 📷 CAMERA */}
        <View style={styles.cameraContainer}>
            {image ? (
                <Image source={{ uri: image }} style={styles.cameraImage} />
            ) : (
                <TouchableOpacity style={styles.placeholderContainer} onPress={pickImageCamera}>
                     <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name="camera-plus" size={40} color="#00C853" />
                     </View>
                     <Text style={styles.placeholderText}>Scan your waste here</Text>
                     <Text style={styles.placeholderSubText}>and let AI identify it</Text>
                </TouchableOpacity>
            )}

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#00C853" />
                    <Text style={styles.loadingText}>Analyzing...</Text>
                </View>
            )}
        </View>

        {/* ✅ RESULT CARD */}
        {result && !loading && (
             <View style={styles.newResultCard}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardHeaderText}>AI Recognition Result</Text>
                    <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceText}>{result.confidenceScore}% confident</Text>
                    </View>
                </View>
                
                <View style={styles.cardBody}>
                    <Text style={styles.label}>Waste Type</Text>
                    <Text style={styles.detectedTitle}>{result.detected}</Text>
                    
                    <Text style={[styles.label, {marginTop: 10}]}>Category</Text>
                    <Text style={styles.categoryTitle}>{result.category}</Text>

                    <Text style={[styles.label, {marginTop: 15, marginBottom: 5}]}>Confidence Level</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, {width: `${result.confidenceScore}%`}]} />
                    </View>

                    <View style={styles.tipBox}>
                        <View style={{flexDirection:'row', alignItems:'center', marginBottom: 5}}>
                             <MaterialCommunityIcons name="lightbulb-on" size={18} color="#FFB300" />
                             <Text style={styles.tipHeader}> Recycling Tip</Text>
                        </View>
                        <Text style={styles.tipText}>{result.recyclingTip}</Text>
                    </View>

                    {/* 🌟 LOGIC: SHOW BARANGAY NOTE IF RECYCLABLE OR COLLECTIBLE */}
                    {showBarangayNote && (
                        <View style={styles.barangayNoteBox}>
                            <FontAwesome5 name="coins" size={20} color="#FF6D00" style={{marginBottom: 8}} />
                            <Text style={styles.barangayNoteText}>
                                <Text style={{fontWeight: 'bold'}}>This is a Barangay Collectible!</Text> You can collect these recyclable items and turn them into points for cash.
                            </Text>
                        </View>
                    )}

                    {/* ♻️ LOGIC: SHOW UPCYCLE BUTTON IF RECYCLABLE OR UPCYCLABLE */}
                    {showUpcycleBtn && (
                        <TouchableOpacity style={styles.upcycleBtn} onPress={() => setModalVisible(true)}>
                            <MaterialCommunityIcons name="palette-outline" size={24} color="white" style={{marginRight: 10}}/>
                            <Text style={styles.upcycleBtnText}>Make this Upcycle Project</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity style={styles.scanAgainBtn} onPress={() => {setResult(null); setImage(null);}}>
                    <Text style={styles.scanAgainText}>Scan Another Item</Text>
                </TouchableOpacity>
             </View>
        )}

        {/* 🔘 ACTION BUTTONS */}
        {!result && !loading && (
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.scanBtn} onPress={pickImageCamera}>
                    <MaterialCommunityIcons name="camera" size={20} color="white" style={{marginRight: 10}} />
                    <Text style={styles.scanBtnText}>Scan Now</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.uploadBtn} onPress={pickImageGallery}>
                    <MaterialCommunityIcons name="image-outline" size={20} color="#00C853" style={{marginRight: 10}} />
                    <Text style={styles.uploadBtnText}>Upload from Gallery</Text>
                </TouchableOpacity>
            </View>
        )}

        {/* 💡 SCANNING TIPS */}
        {!result && !loading && (
            <View style={styles.tipsCard}>
                <View style={styles.tipsHeader}>
                    <Text style={styles.tipsTitle}>Scanning Tips</Text>
                    <View style={styles.tipsBadge}>
                        <Text style={styles.tipsBadgeText}>?</Text>
                    </View>
                </View>
                
                <View style={styles.tipItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.tipText}>Ensure good lighting for accurate results</Text>
                </View>
                <View style={styles.tipItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.tipText}>Place the item on a plain background</Text>
                </View>
                <View style={styles.tipItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.tipText}>Center the waste item in the frame</Text>
                </View>
            </View>
        )}

      </View>

      {/* --- UPCYCLING MODAL --- */}
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

                    <Text style={[styles.label, {marginTop: 15, marginBottom: 5}]}>Others (Type your idea):</Text>
                    <View style={styles.customInputRow}>
                        <TextInput 
                            style={styles.customInput} 
                            placeholder="e.g., Robot Toy" 
                            value={customIdea} 
                            onChangeText={setCustomIdea}
                        />
                        <TouchableOpacity 
                            style={[styles.goBtn, !customIdea.trim() && {backgroundColor:'#ccc'}]} 
                            disabled={!customIdea.trim()}
                            onPress={() => proceedToProject(customIdea)}
                        >
                            <MaterialCommunityIcons name="arrow-right" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
      )}

      <View style={{height: 100}} /> 
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F4F6F8' },
  headerBg: { backgroundColor: '#00C853', paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, marginBottom: 20 },
  headerContent: { alignItems: 'center', position: 'relative' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 5 },
  bodyContent: { paddingHorizontal: 20 },
  cameraContainer: { 
    width: '100%', height: 280, borderRadius: 15, overflow: 'hidden', 
    backgroundColor: '#EEEEEE', 
    marginBottom: 25, elevation: 4, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed'
  },
  cameraImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderContainer: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  iconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  placeholderText: { fontSize: 18, fontWeight: 'bold', color: '#424242' },
  placeholderSubText: { fontSize: 14, color: '#757575', marginTop: 2 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, color: '#00C853', fontWeight: 'bold' },
  newResultCard: { backgroundColor: 'white', borderRadius: 15, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 20 },
  cardHeader: { backgroundColor: '#E8F5E9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#C8E6C9' },
  cardHeaderText: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32' },
  confidenceBadge: { backgroundColor: '#00C853', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  confidenceText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  cardBody: { padding: 20 },
  label: { fontSize: 12, color: '#757575', fontWeight: '600' },
  detectedTitle: { fontSize: 22, fontWeight: 'bold', color: '#00C853', marginBottom: 2 },
  categoryTitle: { fontSize: 18, color: '#333', fontWeight: '500' },
  progressBarBg: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#00C853', borderRadius: 4 },
  tipBox: { backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, marginTop: 20, borderLeftWidth: 4, borderLeftColor: '#2196F3' },
  tipHeader: { fontWeight: 'bold', color: '#1565C0' },
  tipText: { color: '#0D47A1', fontSize: 13, lineHeight: 18 },
  barangayNoteBox: { marginTop: 20, backgroundColor: '#FFF3E0', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#FFB300', alignItems: 'center' },
  barangayNoteText: { color: '#E65100', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  upcycleBtn: { marginTop: 20, backgroundColor: '#2979FF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 12, elevation: 3 },
  upcycleBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  scanAgainBtn: { paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center' },
  scanAgainText: { color: '#757575', fontWeight: '600' },
  actionButtons: { gap: 15 },
  scanBtn: { backgroundColor: '#00C853', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, elevation: 3 },
  scanBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  uploadBtn: { backgroundColor: 'white', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#00C853' },
  uploadBtnText: { color: '#00C853', fontSize: 16, fontWeight: 'bold' },
  tipsCard: { backgroundColor: '#E8F0FE', marginTop: 25, padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#D1E3FC' },
  tipsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  tipsTitle: { color: '#1565C0', fontWeight: 'bold', fontSize: 16 },
  tipsBadge: { backgroundColor: '#FF5722', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tipsBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1976D2', marginTop: 6, marginRight: 10 },
  tipText: { color: '#0D47A1', fontSize: 13, lineHeight: 18, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', padding: 25, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  optionText: { fontSize: 16, color: '#333', fontWeight: '500' },
  customInputRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  customInput: { flex: 1, backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  goBtn: { width: 50, backgroundColor: '#00C853', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});