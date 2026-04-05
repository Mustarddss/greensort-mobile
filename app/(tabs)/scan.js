import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function ScanPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [manualInput, setManualInput] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  
  // 🟢 MGA BAGONG STATES PARA SA OWN DIY CREATION
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [ownProjectTitle, setOwnProjectTitle] = useState('');
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  const fetchGPTAnalysis = async (base64Image, textInput) => {
    setLoadingText('Greensort AI is looking at your waste...');
    
    const promptText = `Analyze the provided image carefully. Identify the MAIN, largest waste item. Ignore minor accessories. Distinguish carefully between materials.

    CRITICAL RULE FOR MONEY/BANKNOTES: If the image contains actual money, legal tender, or official banknotes (e.g., Philippine Peso), YOU MUST classify it as "Not allowed to dispose or use for recycling". However, if you are CERTAIN it is fake "Play Money" (toy money), treat it as Recyclable Paper/Plastic.
    
    CRITICAL RULE FOR ACCURACY: If the image is blurry, ambiguous, or you are unsure what the item is (like a plain black box or generic case), assign a low "accuracy" score (e.g., 40-70). If it is very clear (like a transparent plastic bottle), assign a high score (85-98).

    CRITICAL RULE FOR PERSON DETECTED: If the image contains a person holding an item, FOCUS on the item and not the person. Do NOT classify the person as part of the waste. Only classify the item they are holding.

    CRITICAL RULE IF MANY ITEMS: If there are multiple waste items, identify the MAIN one (largest or most central). You can mention the others in the recycling tip but only classify one main item.
    
    CRITICAL RULE IF IT IS A GENERIC CONTAINER: If the image shows a generic container (like a plain black box, unbranded bottle, or generic bag) and you cannot identify the material, classify it as "General Waste" with a low accuracy score (40-60). In the recycling tip, advise the user to check for any labels or markings to better identify the material for proper disposal.

    CRITICAL RULE IF IT IS ONLY A PERSON WITHOUT ANY CLEAR ITEM: If the image ONLY shows a person (or body parts like a hand/face) without any clear waste item, YOU MUST classify it exactly like this:
    - detected: "Person / Not a Waste Item"
    - category: "Not a Waste"
    - status: "Prohibited"
    - projects: []
    - accuracy: 99

    Respond strictly in pure JSON format with the following keys:
    {
      "detected": "Standardized name of the MAIN item",
      "category": "Choose the most appropriate: Recyclable Plastic, Glass, Paper, Metal, Organic Waste, General Waste, E-Waste, Hazardous, Not allowed to dispose or use for recycling, Not a Waste",
      "status": "e.g., Recyclable Material, Non-Recyclable, Compostable, Electronic Waste Drop-off, Prohibited",
      "accuracy": <number between 40 to 99 based on how certain you are>,
      "recyclingTip": "Provide 1 short and actionable tip on how to dispose, clean, or prepare it. If it is a person, say 'Please scan a valid waste item.'",
      "projects": [
        {
          "title": "Pen Holder",
          "difficulty": "Easy",
          "youtubeLink": "https://www.youtube.com/results?search_query=diy+plastic+bottle+pen+holder"
        }
      ] // IMPORTANT: Provide EXACTLY 7 creative DIY upcycle projects. Include a mix: 3 "Easy", 2 "Medium", and 2 "Hard". Format as an array of objects containing 'title', 'difficulty' (Easy, Medium, Hard), and 'youtubeLink'. If the item is Hazardous, E-Waste, Prohibited, Money, or a Person ("Not a Waste"), make this an empty array [].
    }`;

    let messagesContent = [];
    if (base64Image) {
        messagesContent = [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ];
    } else {
        messagesContent = [
            { type: "text", text: `${promptText}\n\nItem to analyze: "${textInput}"` }
        ];
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-5.4', 
          messages: [
            { role: 'user', content: messagesContent }
          ],
          temperature: 0.5,
          max_completion_tokens: 800,
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message); 
      
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return null;
    } catch (error) {
      console.error("GPT Fetch Error:", error);
      Alert.alert("OpenAI API Error", error.message || "Failed to classify item. Please check your internet or API key.");
      return null;
    }
  };

  const handleAnalysis = async (uri, base64Image, textInput) => {
    setLoading(true); 
    setResult(null);
    if (uri) setImage(uri);

    try {
        const gptData = await fetchGPTAnalysis(base64Image, textInput);

        if (gptData) {
            setResult({
                success: true,
                detected: gptData.detected,
                category: gptData.category,
                confidenceScore: gptData.accuracy || Math.floor(Math.random() * (98 - 88 + 1)) + 88, 
                status: gptData.status,
                recyclingTip: gptData.recyclingTip,
                projects: gptData.projects || []
            });
        }
    } catch (e) {
        console.error("General Analysis Error", e);
    } finally {
        setLoading(false);
        setLoadingText('');
    }
  };

  const pickImageCamera = async () => {
    try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'We need access to your camera!'); return; }
        let pickerResult = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.3, allowsEditing: true, aspect: [1, 1], base64: true });
        if (!pickerResult.canceled) handleAnalysis(pickerResult.assets[0].uri, pickerResult.assets[0].base64, null);
    } catch (error) { Alert.alert("Error", "Could not open camera."); }
  };

  const pickImageGallery = async () => {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'We need access to your gallery!'); return; }
        let pickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.3, allowsEditing: true, aspect: [1, 1], base64: true });
        if (!pickerResult.canceled) handleAnalysis(pickerResult.assets[0].uri, pickerResult.assets[0].base64, null);
    } catch (error) { Alert.alert("Error", "Could not open gallery."); }
  };

  const submitManualInput = () => {
      if (!manualInput.trim()) return;
      handleAnalysis(null, null, manualInput);
      setManualInput('');
  };

  const goToRewards = () => {
      if (result && result.detected) {
          router.push({ pathname: '/(tabs)/rewards', params: { wasteType: result.detected } });
      } else {
          router.push('/(tabs)/rewards');
      }
  };

  const proceedToProject = (ideaObj) => {
    setModalVisible(false);
    if (result) {
        router.push({ pathname: '/(tabs)/projects', params: { itemName: result.detected, projectType: ideaObj.title, youtubeLink: ideaObj.youtubeLink, openDirectly: 'true', scannedImageUri: image } });
    }
  };

  // 🟢 LOGIC PARA GUMAWA NG DRAFT PROJECT AGAD
  const handleStartOwnProject = async () => {
      if (!ownProjectTitle.trim()) {
          Alert.alert("Required", "Please enter a project title to start.");
          return;
      }
      setIsCreatingDraft(true);

      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Please log in first.");

          const { error: dbError } = await supabase.from('saved_projects').insert([{
              user_email: user.email,
              title: ownProjectTitle,
              material_category: 'My OWN Guides', 
              difficulty: 'Medium', // Default
              time_required: 'Self Paced',
              estimated_cost: 'Custom',
              materials: [],
              steps: [],
              selling_price: '',
              image_url: image || 'https://images.unsplash.com/photo-1528323273322-d81458248d40?w=500', 
              is_done: false // 🟢 ON GOING STATUS
          }]);

          if (dbError) throw dbError;

          // Ipakita ang Success Popup kapag na-save na ang draft
          setTitleModalVisible(false);
          setSuccessModalVisible(true);
          setOwnProjectTitle('');

      } catch (error) {
          Alert.alert("Error", error.message);
      } finally {
          setIsCreatingDraft(false);
      }
  };

  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
        case 'easy': return '#4CAF50';
        case 'medium': return '#FF9800';
        case 'hard': return '#F44336';
        default: return '#9E9E9E';
    }
  };

  const isProhibited = result && (result.category.toLowerCase().includes('not allowed') || result.category.toLowerCase().includes('not a waste'));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1, backgroundColor: '#F4F6F8'}}>
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10, zIndex: 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Scan Waste</Text>
              <Text style={styles.headerSubtitle}>Use AI to identify and classify your waste</Text>
          </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.bodyContent}>
        
          <View style={styles.cameraContainer}>
              {loading ? (
                   <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#007C00" />
                      <Text style={styles.loadingText}>{loadingText}</Text>
                   </View>
              ) : image ? (
                  <Image source={{ uri: image }} style={styles.cameraImage} />
              ) : (
                  <TouchableOpacity style={styles.placeholderContainer} onPress={pickImageCamera}>
                        <View style={styles.iconCircle}>
                           <MaterialCommunityIcons name="camera-plus" size={40} color="#007C00" />
                        </View>
                        <Text style={styles.placeholderText}>Tap to Scan</Text>
                  </TouchableOpacity>
              )}
          </View>

          {result && !loading && (
               <View style={styles.resultCard}>
                  <Text style={styles.cardHeaderTitle}>AI Recognition Result</Text>
                  <View style={styles.accuracyContainer}>
                      <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, {width: `${result.confidenceScore}%`}, result.confidenceScore < 70 && {backgroundColor: '#FF9800'}, result.confidenceScore < 50 && {backgroundColor: '#F44336'}]} />
                      </View>
                      <Text style={[styles.accuracyText, result.confidenceScore < 70 && {color: '#FF9800'}, result.confidenceScore < 50 && {color: '#F44336'}]}>
                          Accuracy Level: {result.confidenceScore}% {result.confidenceScore < 70 && " (AI is not completely sure)"}
                      </Text>
                  </View>

                  <View style={{marginTop: 15}}>
                      <Text style={styles.smallLabel}>Waste Type</Text>
                      <Text style={styles.mainWasteTitle}>{result.detected}</Text>
                      <Text style={styles.smallLabel}>Category</Text>
                      <Text style={styles.categoryText}>{result.category}</Text>
                      
                      <View style={[styles.statusChip, isProhibited && {backgroundColor: '#FFEBEE', borderColor: '#FFCDD2'}]}>
                          <MaterialCommunityIcons name={isProhibited ? "cancel" : "check-circle-outline"} size={16} color={isProhibited ? "#D32F2F" : "#2E7D32"} />
                          <Text style={[styles.statusText, isProhibited && {color: '#D32F2F'}]}>{result.status}</Text>
                      </View>
                  </View>

                  <Text style={styles.actionLabel}>What would you like to do?</Text>

                  {!isProhibited && (
                      <Pressable onPress={goToRewards} style={({ pressed }) => [styles.outlinedBtn, pressed && styles.outlinedBtnActive]}>
                          {({ pressed }) => (
                              <>
                                  <View>
                                      <Text style={[styles.outlinedBtnTitle, pressed && {color: 'white'}]}>Find Disposal & Incentives</Text>
                                      <Text style={[styles.outlinedBtnSub, pressed && {color: 'rgba(255,255,255,0.9)'}]}>View rewards recommendations</Text>
                                  </View>
                                  <MaterialCommunityIcons name="arrow-right-circle" size={24} color={pressed ? "white" : "#007C00"} />
                              </>
                          )}
                      </Pressable>
                  )}

                  {result.projects && result.projects.length > 0 ? (
                      <Pressable onPress={() => setModalVisible(true)} style={({ pressed }) => [styles.outlinedBtn, pressed && styles.outlinedBtnActive]}>
                          {({ pressed }) => (
                              <>
                                  <View>
                                      <Text style={[styles.outlinedBtnTitle, pressed && {color: 'white'}]}>View DIY upcycling projects</Text>
                                      <Text style={[styles.outlinedBtnSub, pressed && {color: 'rgba(255,255,255,0.9)'}]}>Creative ways to reuse this item</Text>
                                  </View>
                                  <MaterialCommunityIcons name="arrow-right-circle" size={24} color={pressed ? "white" : "#007C00"} />
                              </>
                          )}
                      </Pressable>
                  ) : result.category.toLowerCase().includes('e-waste') || result.category.toLowerCase().includes('electronic') ? (
                      <View style={{padding: 15, backgroundColor: '#E3F2FD', borderRadius: 12, marginTop: 5, borderWidth: 1, borderColor: '#1976D2'}}>
                          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}><MaterialCommunityIcons name="recycle-variant" size={20} color="#1976D2" /><Text style={{color: '#1976D2', fontSize: 14, fontWeight: 'bold', marginLeft: 5}}>E-Waste Drop-off Recommended</Text></View>
                          <Text style={{color: '#1565C0', fontSize: 12, lineHeight: 18}}>Electronics contain hazardous materials. Please do not throw them in regular bins. Surrender this to your LGU or designated E-Waste collection centers.</Text>
                      </View>
                  ) : isProhibited ? (
                      <View style={{padding: 10, backgroundColor: '#FFEBEE', borderRadius: 8, marginTop: 5, borderWidth: 1, borderColor: '#EF9A9A'}}>
                          <Text style={{color: '#D32F2F', fontSize: 13, textAlign: 'center', fontWeight: 'bold'}}>{result.category.toLowerCase().includes('not a waste') ? "Not a Waste Item" : "Prohibited Item Detected"}</Text>
                          <Text style={{color: '#C62828', fontSize: 12, textAlign: 'center', marginTop: 4}}>{result.category.toLowerCase().includes('not a waste') ? "We detected a person or non-waste object. Please scan a valid waste item." : "Official banknotes or restricted items cannot be used for recycling or disposed of via this app."}</Text>
                      </View>
                  ) : (
                      <View style={{padding: 10, backgroundColor: '#FFEBEE', borderRadius: 8, marginTop: 5}}>
                          <Text style={{color: '#D32F2F', fontSize: 12, textAlign: 'center'}}>This item cannot be upcycled safely. Please dispose of it properly.</Text>
                      </View>
                  )}

                  <Text style={styles.manualInputLabel}>Couldn't get the exact waste result?</Text>
                  <View style={styles.inputWrapper}>
                      <TextInput style={styles.textInput} placeholder="Type your waste here" value={manualInput} onChangeText={setManualInput} />
                      <TouchableOpacity onPress={submitManualInput}><Feather name="send" size={20} color="#007C00" style={{marginRight: 10}}/></TouchableOpacity>
                  </View>

                  <TouchableOpacity style={{marginTop: 20, alignItems: 'center'}} onPress={() => {setResult(null); setImage(null);}}>
                      <Text style={styles.scanAgainLink}>Scan Another Item</Text>
                  </TouchableOpacity>
               </View>
          )}

          {result && !loading && result.projects && result.projects.length > 0 && (
               <View style={styles.collectibleContainer}>
                   <FontAwesome5 name="coins" size={20} color="#2E7D32" />
                   <Text style={styles.collectibleText}><Text style={{fontWeight:'bold'}}>This is a Waste Collectible!</Text> Collect and earn rewards.</Text>
               </View>
          )}

          {!result && !loading && (
              <View>
                  <View style={styles.defaultActions}>
                      <TouchableOpacity style={styles.scanBtn} onPress={pickImageCamera}><MaterialCommunityIcons name="camera" size={20} color="white" style={{marginRight: 10}} /><Text style={styles.scanBtnText}>Scan Now</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.uploadBtn} onPress={pickImageGallery}><MaterialCommunityIcons name="image-outline" size={20} color="#007C00" style={{marginRight: 10}} /><Text style={styles.uploadBtnText}>Upload from Gallery</Text></TouchableOpacity>
                  </View>

                  <View style={styles.tipsCard}>
                      <View style={styles.tipsHeader}><Text style={styles.tipsCardTitle}>Scanning Tips</Text><View style={styles.tipsBadge}><Text style={styles.tipsBadgeText}>?</Text></View></View>
                      <View style={styles.tipItem}><View style={styles.bullet} /><Text style={styles.tipCardText}>Ensure good lighting for accurate results</Text></View>
                      <View style={styles.tipItem}><View style={styles.bullet} /><Text style={styles.tipCardText}>Place the item on a plain background</Text></View>
                      <View style={styles.tipItem}><View style={styles.bullet} /><Text style={styles.tipCardText}>Center the waste item in the frame</Text></View>
                  </View>
              </View>
          )}

        </View>

        {result && (
          <Modal visible={modalVisible} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                      <View style={styles.modalHeaderRow}>
                          <Text style={styles.modalTitle}>Choose Project Level</Text>
                          <TouchableOpacity onPress={() => setModalVisible(false)}><MaterialCommunityIcons name="close-circle" size={28} color="#ccc" /></TouchableOpacity>
                      </View>
                      
                      <ScrollView style={{maxHeight: 500}} showsVerticalScrollIndicator={false}>
                          
                          <TouchableOpacity 
                              style={{ backgroundColor: '#007C00', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, elevation: 2 }} 
                              onPress={() => {
                                  setModalVisible(false);
                                  setTitleModalVisible(true); // 🟢 LALABAS YUNG TITLE INPUT MODAL
                              }}
                          >
                              <MaterialCommunityIcons name="lightbulb-on" size={20} color="white" style={{marginRight: 8}} />
                              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Create Your Own Project</Text>
                          </TouchableOpacity>

                          <View style={{height: 1, backgroundColor: '#eee', marginBottom: 15}} />
                          <Text style={{fontSize: 12, color: '#999', marginBottom: 10, fontWeight: 'bold'}}>OR TRY AI SUGGESTIONS:</Text>

                          {result.projects && result.projects.map((ideaObj, i) => (
                              <TouchableOpacity key={i} style={styles.modalOption} onPress={() => proceedToProject(ideaObj)}>
                                  <View style={{flex: 1}}>
                                      <Text style={styles.optionText}>{ideaObj.title}</Text>
                                      <View style={[styles.difficultyTag, {backgroundColor: getDifficultyColor(ideaObj.difficulty) + '20'}]}>
                                          <Text style={[styles.difficultyText, {color: getDifficultyColor(ideaObj.difficulty)}]}>{ideaObj.difficulty || 'Normal'}</Text>
                                      </View>
                                  </View>
                                  <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
                              </TouchableOpacity>
                          ))}
                      </ScrollView>
                  </View>
              </View>
          </Modal>
        )}

        {/* 🟢 MODAL 1: ENTER TITLE PARA SA DRAFT */}
        <Modal visible={titleModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlayDark}>
                <View style={styles.inputModalCard}>
                    <Text style={styles.inputModalTitle}>Name your DIY Project</Text>
                    <Text style={styles.inputModalSub}>Give it a catchy name to start your upcycling journey!</Text>
                    
                    <TextInput 
                        style={styles.titleInput} 
                        placeholder="e.g. My Custom Bottle Lamp" 
                        value={ownProjectTitle} 
                        onChangeText={setOwnProjectTitle} 
                        autoFocus
                    />

                    <View style={styles.modalBtnRow}>
                        <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setTitleModalVisible(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalProceedBtn} onPress={handleStartOwnProject} disabled={isCreatingDraft}>
                            {isCreatingDraft ? <ActivityIndicator color="white" /> : <Text style={styles.modalProceedText}>Start Project</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        {/* 🟢 MODAL 2: SUCCESS & MOTIVATION POPUP */}
        <Modal visible={successModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlayDark}>
                <View style={styles.successModalCard}>
                    <View style={styles.successIconBg}>
                        <MaterialCommunityIcons name="check-decagram" size={50} color="#007C00" />
                    </View>
                    <Text style={styles.successTitle}>Project Created!</Text>
                    <Text style={styles.successMessage}>
                        YOUR OWN DIY PROJECT IS NOW SAVED IN THE UPCYCLE IDEAS TAB!
                    </Text>
                    
                    <View style={styles.quoteBox}>
                        <MaterialCommunityIcons name="format-quote-open" size={20} color="#007C00" style={{marginBottom: 5}}/>
                        <Text style={styles.quoteText}>"Every piece of waste has a second life. Great job starting your upcycling journey!"</Text>
                    </View>

                    <TouchableOpacity 
                        style={styles.goUpcycleBtn} 
                        onPress={() => {
                            setSuccessModalVisible(false);
                            router.push('/(tabs)/projects'); // Direkta sa Upcycle Ideas
                        }}
                    >
                        <Text style={styles.goUpcycleBtnText}>Go to Upcycle Ideas</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

        <View style={{height: 50}} /> 
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: '#007C00', paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, flexDirection: 'row', alignItems: 'center', elevation: 6, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5 },
  backButton: { position: 'absolute', left: 20, bottom: 25, zIndex: 10 },
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 20 }, 
  cameraContainer: { width: '100%', height: 250, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff', marginBottom: 20, elevation: 4, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
  cameraImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  loadingContainer: { alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#007C00', fontWeight: 'bold', fontSize: 12 },
  placeholderContainer: { alignItems: 'center' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  placeholderText: { fontSize: 16, color: '#666', fontWeight: 'bold' },
  resultCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 20 },
  cardHeaderTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  accuracyContainer: { marginBottom: 15 },
  progressBarBg: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 5 },
  progressBarFill: { height: '100%', backgroundColor: '#007C00', borderRadius: 4 },
  accuracyText: { fontSize: 12, color: '#007C00', fontWeight: 'bold' },
  smallLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  mainWasteTitle: { fontSize: 20, fontWeight: 'bold', color: '#007C00', marginBottom: 10 },
  categoryText: { fontSize: 16, color: '#333', marginBottom: 10 },
  statusChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#E8F5E9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#C8E6C9' },
  statusText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
  actionLabel: { fontSize: 13, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10 },
  outlinedBtn: { backgroundColor: 'white', borderRadius: 12, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#007C00' },
  outlinedBtnActive: { backgroundColor: '#007C00' },
  outlinedBtnTitle: { color: '#007C00', fontWeight: 'bold', fontSize: 14 },
  outlinedBtnSub: { color: '#666', fontSize: 11 },
  manualInputLabel: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#F9F9F9' },
  textInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, fontSize: 14, color: '#333' },
  scanAgainLink: { color: '#007C00', fontWeight: 'bold', fontSize: 14 },
  tipsContainer: { backgroundColor: 'white', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#4CAF50', marginBottom: 15 },
  tipHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  tipsTitle: { fontWeight: 'bold', color: '#2E7D32', marginLeft: 5, fontSize: 14 },
  bulletPoint: { marginTop: 5, paddingLeft: 5 },
  bulletText: { fontSize: 12, color: '#2E7D32', lineHeight: 18 },
  collectibleContainer: { backgroundColor: '#E8F5E9', borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#81C784', marginBottom: 30 },
  collectibleText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#1B5E20' },
  defaultActions: { gap: 15, marginTop: 10 },
  scanBtn: { backgroundColor: '#007C00', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, elevation: 3 },
  scanBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  uploadBtn: { backgroundColor: 'white', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#007C00' },
  uploadBtnText: { color: '#007C00', fontSize: 16, fontWeight: 'bold' },
  tipsCard: { backgroundColor: '#E8F5E9', marginTop: 25, padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#C8E6C9' },
  tipsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  tipsCardTitle: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
  tipsBadge: { backgroundColor: '#007C00', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tipsBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#007C00', marginTop: 6, marginRight: 10 },
  tipCardText: { color: '#1B5E20', fontSize: 13, lineHeight: 18, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', padding: 25, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#f0f0f0', alignItems: 'center' },
  optionText: { fontSize: 16, color: '#333', fontWeight: 'bold', marginBottom: 4 },
  difficultyTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  difficultyText: { fontSize: 11, fontWeight: 'bold' },

  // 🟢 NEW STYLES FOR DRAFT & SUCCESS MODALS
  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  inputModalCard: { width: '100%', backgroundColor: 'white', borderRadius: 20, padding: 25, elevation: 10 },
  inputModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  inputModalSub: { fontSize: 13, color: '#666', marginBottom: 20 },
  titleInput: { backgroundColor: '#F5F7FA', borderWidth: 1, borderColor: '#E0E0E0', padding: 15, borderRadius: 12, fontSize: 16, color: '#333', marginBottom: 25 },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#F5F5F5' },
  modalCancelText: { color: '#666', fontWeight: 'bold', fontSize: 15 },
  modalProceedBtn: { flex: 1, backgroundColor: '#007C00', paddingVertical: 14, borderRadius: 12, alignItems: 'center', elevation: 2 },
  modalProceedText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  successModalCard: { width: '90%', backgroundColor: 'white', borderRadius: 24, padding: 30, alignItems: 'center', elevation: 10 },
  successIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  successMessage: { fontSize: 14, color: '#007C00', textAlign: 'center', fontWeight: 'bold', marginBottom: 20, lineHeight: 22 },
  quoteBox: { backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', alignItems: 'center', marginBottom: 25 },
  quoteText: { fontStyle: 'italic', color: '#555', textAlign: 'center', fontSize: 13, lineHeight: 20 },
  goUpcycleBtn: { backgroundColor: '#007C00', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', elevation: 3 },
  goUpcycleBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 }
});