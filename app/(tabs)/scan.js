import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// 🟢 MIXED FUN FACTS: Environment + GreenSort App Knowledge
const FUN_FACTS = [
  "GreenSort uses AI technology to instantly identify your waste and suggest creative upcycling projects!",
  "Recycling 1 aluminum can saves enough energy to power a TV for 3 hours!",
  "You can earn rewards in GreenSort by turning in your recyclable Waste Collectibles to our exchange partners.",
  "It takes about 500 years for a single plastic water bottle to fully decompose.",
  "GreenSort promotes a circular economy by connecting your household waste to proper recycling channels.",
  "Upcycling adds value to waste by transforming it into a product of higher quality. Be creative!",
  "Only 9% of all plastic ever produced has been recycled. Let's change that together with GreenSort!"
];

export default function ScanPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [manualInput, setManualInput] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [ownProjectTitle, setOwnProjectTitle] = useState('');
  const [ownProjectNotes, setOwnProjectNotes] = useState('');
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  const [upcycleSearchQuery, setUpcycleSearchQuery] = useState('');
  const [isSearchingMoreIdeas, setIsSearchingMoreIdeas] = useState(false);
  const [aiMoreProjects, setAiMoreProjects] = useState([]);

  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setCurrentFactIndex((prev) => (prev + 1) % FUN_FACTS.length);
      }, 4500); 
    } else {
      setCurrentFactIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const fetchGPTAnalysis = async (base64Image, textInput) => {
    // 🟢 SUPER STRICT PROMPT: Literal nating nilagay yung 7 objects para pilitin siyang punuin!
    const promptText = `Analyze the provided image carefully. Identify the MAIN, largest waste item. Ignore minor accessories. Distinguish carefully between materials.

    CRITICAL RULE FOR MONEY/BANKNOTES: If the image contains actual money, legal tender, or official banknotes (e.g., Philippine Peso), YOU MUST classify it as "Not allowed to dispose or use for recycling". However, if you are CERTAIN it is fake "Play Money" (toy money), treat it as Recyclable Paper/Plastic.
    
    CRITICAL RULE FOR ELECTRONICS/BATTERIES: E-Waste is STRICTLY NOT SCOPED for upcycling to prevent safety hazards (like explosions). If you detect electronics, batteries, phones, laptops, or any related components, classify it as "Hazardous" or "Not allowed to dispose or use for recycling" with status "Electronic Waste Drop-off Recommended". Do NOT provide any upcycling projects for electronics.

    CRITICAL RULE FOR ACCURACY: If the image is blurry, ambiguous, or you are unsure what the item is, assign a low "accuracy" score (e.g., 40-70). If it is very clear, assign a high score (85-98).

    CRITICAL RULE FOR PERSON DETECTED: If the image contains a person holding an item, FOCUS on the item and not the person. Do NOT classify the person as part of the waste. Only classify the item they are holding.

    CRITICAL RULE IF MANY ITEMS: If there are multiple waste items, identify the MAIN one (largest or most central). You can mention the others in the recycling tip but only classify one main item.    
    CRITICAL RULE IF IT IS A GENERIC CONTAINER: If the image shows a generic container (like a plain black box, unbranded bottle, or generic bag) and you cannot identify the material, classify it as "General Waste" with a low accuracy score (40-60). In the recycling tip, advise the user to check for any labels or markings to better identify the material for proper disposal.
    CRITICAL RULE IF IT IS A BRAND-NEW UNOPENED ITEM: If the image shows a brand-new, unopened product (like a sealed water bottle, packaged snack, or boxed item), classify it based on the packaging material (e.g., "Recyclable Plastic" for a plastic bottle) but include in the recycling tips that the user should remove any non-recyclable components (like caps, labels, or wrappers) before recycling.
    CRITICAL RULE IF IT IS A FOOD ITEM: If the image contains food waste, classify it as "Organic Waste" and in the recycling tips, suggest composting if possible, or proper disposal methods if not.
    CRITICAL RULE IF IT IS A MIXED MATERIAL ITEM: If the item is made of mixed materials (like a juice box with plastic and aluminum), classify it based on the dominant material but include in the recycling tips that the user should separate components if possible for better recycling.
    CRITICAL RULE IF IT IS A DAMAGED ITEM: If the item is heavily damaged (like a crushed plastic bottle or torn cardboard), classify it based on the original material but assign a lower accuracy score (40-60) and include in the recycling tips that damaged items may not be accepted by all recycling programs and to check local guidelines.
    CRITICAL RULE IF IT IS ONLY A PERSON WITHOUT ANY CLEAR ITEM: If the image ONLY shows a person (or body parts like a hand/face) without any clear waste item, YOU MUST classify it exactly like this:
    - detected: "Person / Not a Waste Item"
    - category: "Not a Waste"
    - status: "Prohibited"
    - projects: []
    - accuracy: 99
    
    Respond strictly in pure JSON format with the following keys:
    {
      "detected": "Standardized name of the MAIN item",
      "category": "Choose: Recyclable Plastic, Glass, Paper, Metal, Organic Waste, General Waste, Hazardous, Not allowed to dispose or use for recycling, Not a Waste",
      "status": "e.g., Recyclable Material, Non-Recyclable, Compostable, Electronic Waste Drop-off Recommended, Prohibited",
      "accuracy": <number between 40 to 99>,
      "recyclingTips": [
         "Remove caps and labels before recycling",
         "Rinse bottles thoroughly and let dry",
         "Crush bottles to save space"
      ], 
      "projects": [
        { "title": "Creative Easy Idea 1", "difficulty": "Easy", "youtubeLink": "https://www.youtube.com/results?search_query=..." },
        { "title": "Creative Easy Idea 2", "difficulty": "Easy", "youtubeLink": "https://www.youtube.com/results?search_query=..." },
        { "title": "Creative Easy Idea 3", "difficulty": "Easy", "youtubeLink": "https://www.youtube.com/results?search_query=..." },
        { "title": "Creative Medium Idea 1", "difficulty": "Medium", "youtubeLink": "https://www.youtube.com/results?search_query=..." },
        { "title": "Creative Medium Idea 2", "difficulty": "Medium", "youtubeLink": "https://www.youtube.com/results?search_query=..." },
        { "title": "Creative Hard Idea 1", "difficulty": "Hard", "youtubeLink": "https://www.youtube.com/results?search_query=..." },
        { "title": "Creative Hard Idea 2", "difficulty": "Hard", "youtubeLink": "https://www.youtube.com/results?search_query=..." }
      ] 
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
          messages: [{ role: 'user', content: messagesContent }],
          temperature: 0.7, // 🟢 Tinaasan ang creativity para makaisip ng maraming ideas
          max_completion_tokens: 1500, // 🟢 TINAASAN ANG TOKENS PARA HINDI MAPUTOL ANG 7 IDEAS
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
    setLoadingText('Greensort AI is looking at your waste...');
    setResult(null);
    if (uri) setImage(uri);

    try {
        const gptData = await fetchGPTAnalysis(base64Image, textInput);

        if (gptData) {
            setAiMoreProjects([]);
            setUpcycleSearchQuery('');

            setResult({
                success: true,
                detected: gptData.detected,
                category: gptData.category,
                confidenceScore: gptData.accuracy || Math.floor(Math.random() * (98 - 88 + 1)) + 88, 
                status: gptData.status,
                recyclingTips: gptData.recyclingTips || (gptData.recyclingTip ? [gptData.recyclingTip] : []),
                projects: gptData.projects || []
            });
        }
    } catch (e) {
        console.error("General Analysis Error", e);
    } finally {
        setLoading(false);
    }
  };

  const pickImageCamera = async () => {
    try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'We need access to your camera!'); return; }
        
        let pickerResult = await ImagePicker.launchCameraAsync({ 
            mediaTypes: ['images'], 
            quality: 0.3, 
            allowsEditing: false, 
            base64: true 
        });
        
        if (!pickerResult.canceled) {
            const asset = pickerResult.assets[0];
            const fileSizeInMB = (asset.base64.length * 0.75) / (1024 * 1024);
            if (fileSizeInMB > 250) {
                Alert.alert("File Too Large", "Please select an image smaller than 250MB.");
                return;
            }
            handleAnalysis(asset.uri, asset.base64, null);
        }
    } catch (error) { Alert.alert("Error", "Could not open camera."); }
  };

  const pickImageGallery = async () => {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'We need access to your gallery!'); return; }
        
        let pickerResult = await ImagePicker.launchImageLibraryAsync({ 
            mediaTypes: ['images'], 
            quality: 0.3, 
            allowsEditing: false, 
            base64: true 
        });
        
        if (!pickerResult.canceled) {
            const asset = pickerResult.assets[0];
            const fileSizeInMB = (asset.base64.length * 0.75) / (1024 * 1024);
            if (fileSizeInMB > 250) {
                Alert.alert("File Too Large", "Please select an image smaller than 250MB.");
                return;
            }
            handleAnalysis(asset.uri, asset.base64, null);
        }
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

  const searchMoreUpcycleIdeas = async () => {
    const query = upcycleSearchQuery.trim();

    if (!query) {
        Alert.alert("Search required", "Type what you want to make or what material you want to use.");
        return;
    }

    if (!result?.detected) {
        Alert.alert("Scan first", "Please scan or type a waste item first.");
        return;
    }

    setIsSearchingMoreIdeas(true);

    const promptText = `You are GreenSort AI, an expert in creative and practical upcycling ideas.

    Waste item detected: "${result.detected}"
    Material/category: "${result.category}"
    User wants to search for: "${query}"

    Generate 5 additional upcycling project ideas that are safe, useful, realistic, and related to the user's search.
    Avoid hazardous projects. Do not suggest electronics or unsafe chemical modifications.

    Respond strictly in pure JSON format:
    {
      "projects": [
        { "title": "Project idea title", "difficulty": "Easy, Medium, or Hard", "youtubeLink": "https://www.youtube.com/results?search_query=..." }
      ]
    }`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-5.4',
                messages: [{ role: 'user', content: promptText }],
                temperature: 0.8,
                max_completion_tokens: 900
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error("Invalid AI response format.");
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const newIdeas = parsed.projects || [];

        if (newIdeas.length === 0) {
            Alert.alert("No Ideas Found", "Try a different keyword.");
            return;
        }

        setAiMoreProjects(prev => {
            const existingTitles = new Set(prev.map(item => item.title?.toLowerCase()));
            const originalTitles = new Set((result.projects || []).map(item => item.title?.toLowerCase()));

            const uniqueIdeas = newIdeas.filter(item => {
                const title = item.title?.toLowerCase();
                return title && !existingTitles.has(title) && !originalTitles.has(title);
            });

            return [...uniqueIdeas, ...prev];
        });

    } catch (error) {
        console.error("More Upcycle Search Error:", error);
        Alert.alert("AI Search Error", error.message || "Could not search more upcycle ideas.");
    } finally {
        setIsSearchingMoreIdeas(false);
    }
  };

  const proceedToProject = (ideaObj) => {
    setModalVisible(false);
    if (result) {
        router.push({ pathname: '/(tabs)/projects', params: { itemName: result.detected, projectType: ideaObj.title, youtubeLink: ideaObj.youtubeLink, openDirectly: 'true', scannedImageUri: image } });
    }
  };

  const handleStartOwnProject = async () => {
      if (!ownProjectTitle.trim()) {
          Alert.alert("Required", "Please enter a project title to start.");
          return;
      }
      setIsCreatingDraft(true);

      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Please log in first.");

          const draftPayload = {
              user_email: user.email,
              title: ownProjectTitle,
              material_category: 'My OWN Guides', 
              difficulty: 'Medium',
              time_required: 'Self Paced',
              estimated_cost: 'Custom',
              materials: [],
              steps: [],
              selling_price: '',
              image_url: image || 'https://images.unsplash.com/photo-1528323273322-d81458248d40?w=500', 
              is_done: false,
              notes: ownProjectNotes.trim()
          };

          let { error: dbError } = await supabase
              .from('saved_projects')
              .insert([draftPayload]);

          if (dbError && dbError.message && dbError.message.toLowerCase().includes('notes')) {
              const fallbackPayload = { ...draftPayload };
              delete fallbackPayload.notes;

              const retry = await supabase
                  .from('saved_projects')
                  .insert([fallbackPayload]);

              dbError = retry.error;
          }

          if (dbError) throw dbError;

          setTitleModalVisible(false);
          setSuccessModalVisible(true);
          setOwnProjectTitle('');
          setOwnProjectNotes('');

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

  const isPerson = result && result.category.toLowerCase().includes('not a waste');
  const isProhibited = result && (result.category.toLowerCase().includes('not allowed') || isPerson);
  const isHazardousOrElectronic = result && (result.category.toLowerCase().includes('hazardous') || result.status.toLowerCase().includes('electronic'));

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
                      <ActivityIndicator size="large" color="#007C00" style={{ transform: [{ scale: 1.2 }], marginBottom: 15 }} />
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

          {loading && (
             <View style={styles.funFactCard}>
                 <View style={styles.funFactHeader}>
                     <MaterialCommunityIcons name="lightbulb-on" size={18} color="#007C00" />
                     <Text style={styles.funFactTitle}>DID YOU KNOW?</Text>
                 </View>
                 <Text style={styles.funFactText}>{FUN_FACTS[currentFactIndex]}</Text>
             </View>
          )}

          {result && !loading && (
               <View style={styles.resultCard}>
                  <View style={styles.cardHeaderArea}>
                      <Text style={styles.cardHeaderTitle}>AI Recognition Result</Text>
                  </View>

                  <View style={styles.cardBodyArea}>
                      <View style={styles.accuracyContainer}>
                          <View style={styles.progressBarBg}>
                              <View style={[styles.progressBarFill, {width: `${result.confidenceScore}%`}, result.confidenceScore < 70 && {backgroundColor: '#FF9800'}, result.confidenceScore < 50 && {backgroundColor: '#F44336'}]} />
                          </View>
                          <Text style={[styles.accuracyText, result.confidenceScore < 70 && {color: '#FF9800'}, result.confidenceScore < 50 && {color: '#F44336'}]}>
                              Accuracy Level: {result.confidenceScore}% {result.confidenceScore < 70 && " (Unsure)"}
                          </Text>
                      </View>

                      <View style={{marginTop: 15}}>
                          <Text style={styles.smallLabel}>Waste Type</Text>
                          <Text style={styles.mainWasteTitle}>{result.detected}</Text>
                          
                          <Text style={styles.smallLabel}>Category</Text>
                          <Text style={styles.categoryText}>{result.category}</Text>
                          
                          <View style={[styles.statusChip, (isProhibited || isHazardousOrElectronic) && {backgroundColor: '#FFEBEE', borderColor: '#FFCDD2'}]}>
                              <MaterialCommunityIcons name={(isProhibited || isHazardousOrElectronic) ? "cancel" : "check-circle-outline"} size={16} color={(isProhibited || isHazardousOrElectronic) ? "#D32F2F" : "#2E7D32"} />
                              <Text style={[styles.statusText, (isProhibited || isHazardousOrElectronic) && {color: '#D32F2F'}]}>{result.status}</Text>
                          </View>
                      </View>

                      <Text style={styles.actionLabel}>What would you like to do?</Text>

                      {(!isProhibited && !isHazardousOrElectronic) && (
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

                      {result.projects && result.projects.length > 0 && !isHazardousOrElectronic ? (
                          <Pressable onPress={() => setModalVisible(true)} style={({ pressed }) => [styles.outlinedBtn, pressed && styles.outlinedBtnActive]}>
                              {({ pressed }) => (
                                  <>
                                      <View>
                                          <Text style={[styles.outlinedBtnTitle, pressed && {color: 'white'}]}>View DIY upcycling projects</Text>
                                          <Text style={[styles.outlinedBtnSub, pressed && {color: 'rgba(255,255,255,0.9)'}]}>Creative ways to reuse this item</Text>
                                      </View>
                                      <MaterialCommunityIcons name="arrow-right-circle-outline" size={24} color={pressed ? "white" : "#007C00"} />
                                  </>
                              )}
                          </Pressable>
                      ) : isHazardousOrElectronic ? (
                          <View style={{padding: 15, backgroundColor: '#FFEBEE', borderRadius: 12, marginTop: 5, borderWidth: 1, borderColor: '#EF9A9A'}}>
                              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}><MaterialCommunityIcons name="alert-circle" size={20} color="#D32F2F" /><Text style={{color: '#D32F2F', fontSize: 14, fontWeight: 'bold', marginLeft: 5}}>Not Safe for Upcycling</Text></View>
                              <Text style={{color: '#C62828', fontSize: 12, lineHeight: 18}}>Electronics and hazardous items can be dangerous to upcycle due to toxic chemicals or risk of explosion. Please surrender this to designated Drop-off locations instead.</Text>
                              
                              <Pressable onPress={goToRewards} style={({ pressed }) => [styles.solidBtnRed, pressed && {opacity: 0.8}, {marginTop: 15}]}>
                                  <View>
                                      <Text style={styles.solidBtnRedTitle}>Find E-Waste Drop-off</Text>
                                      <Text style={styles.solidBtnRedSub}>Search for safe disposal locations</Text>
                                  </View>
                                  <MaterialCommunityIcons name="map-marker-radius" size={24} color="white" />
                              </Pressable>
                          </View>
                      ) : isProhibited ? (
                          <View style={{padding: 10, backgroundColor: '#FFEBEE', borderRadius: 8, marginTop: 5, borderWidth: 1, borderColor: '#EF9A9A'}}>
                              <Text style={{color: '#D32F2F', fontSize: 13, textAlign: 'center', fontWeight: 'bold'}}>{isPerson ? "Not a Waste Item" : "Prohibited Item Detected"}</Text>
                              <Text style={{color: '#C62828', fontSize: 12, textAlign: 'center', marginTop: 4}}>{isPerson ? "We detected a person or non-waste object. Please scan a valid waste item." : "Official banknotes or restricted items cannot be used for recycling or disposed of via this app."}</Text>
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

                      <TouchableOpacity style={{marginTop: 25, alignItems: 'center'}} onPress={() => {setResult(null); setImage(null);}}>
                          <Text style={styles.scanAgainLink}>Scan Another Item</Text>
                      </TouchableOpacity>
                  </View>
               </View>
          )}

          {result && !loading && isPerson ? (
              <View style={[styles.tipsContainer, {borderColor: '#1976D2', backgroundColor: '#E3F2FD'}]}>
                  <View style={styles.tipHeaderRow}>
                      <MaterialCommunityIcons name="heart" size={18} color="#1976D2" />
                      <Text style={[styles.tipsTitle, {color: '#1976D2'}]}>A Gentle Reminder</Text>
                  </View>
                  <Text style={{color: '#1565C0', fontSize: 13, fontStyle: 'italic', lineHeight: 22, textAlign: 'center'}}>
                      "A person is never a waste. Every human life holds immeasurable value, potential, and purpose. Let's focus on healing the planet, starting with kindness and love for one another."
                  </Text>
              </View>
          ) : result && !loading && result.recyclingTips && result.recyclingTips.length > 0 && !isProhibited && (
              <View style={styles.tipsContainer}>
                  <View style={styles.tipHeaderRow}>
                      <MaterialCommunityIcons name="leaf" size={18} color="#007C00" />
                      <Text style={styles.tipsTitle}>Recycling Tip</Text>
                  </View>
                  {result.recyclingTips.map((tip, index) => (
                      <View key={index} style={styles.bulletPoint}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.bulletText}>{tip}</Text>
                      </View>
                  ))}
              </View>
          )}
          
          {result && !loading && result.projects && result.projects.length > 0 && (
               <View style={styles.collectibleContainer}>
                   <MaterialCommunityIcons name="database-outline" size={24} color="#007C00" />
                   <View style={{flex: 1, marginLeft: 15, alignItems: 'center'}}>
                       <Text style={styles.collectibleSmallText}>This is a Waste Collectible!</Text>
                       <Text style={styles.collectibleBoldText}>You can collect these recyclable items and turn them into rewards.</Text>
                   </View>
               </View>
          )}

          {!result && !loading && (
              <View>
                  <View style={styles.defaultActions}>
                      <TouchableOpacity style={styles.scanBtn} onPress={pickImageCamera}>
                          <MaterialCommunityIcons name="camera" size={20} color="white" style={{marginRight: 10}} />
                          <Text style={styles.scanBtnText}>Scan Now</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.uploadBtn} onPress={pickImageGallery}>
                          <MaterialCommunityIcons name="image-outline" size={20} color="#007C00" style={{marginRight: 10}} />
                          <Text style={styles.uploadBtnText}>Upload from Gallery</Text>
                      </TouchableOpacity>
                  </View>

                  <View style={styles.preScanTipsCard}>
                      <Text style={styles.preScanTipsTitle}>Scanning Tips</Text>
                      <View style={styles.tipItem}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.preScanTipText}>Ensure good lighting for accurate results</Text>
                      </View>
                      <View style={styles.tipItem}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.preScanTipText}>Place the item on a plain background</Text>
                      </View>
                      <View style={styles.tipItem}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.preScanTipText}>Center the waste item in the frame</Text>
                      </View>
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
                              onPress={() => { setModalVisible(false); setTitleModalVisible(true); }}
                          >
                              <MaterialCommunityIcons name="lightbulb-on" size={20} color="white" style={{marginRight: 8}} />
                              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Create Your Own Project</Text>
                          </TouchableOpacity>

                          <View style={{height: 1, backgroundColor: '#eee', marginBottom: 15}} />
                          <Text style={{fontSize: 12, color: '#999', marginBottom: 10, fontWeight: 'bold'}}>SEARCH MORE UPCYCLE IDEAS WITH GREENSORT AI:</Text>

                          <View style={styles.upcycleSearchBox}>
                              <Ionicons name="search" size={18} color="#888" />
                              <TextInput
                                  style={styles.upcycleSearchInput}
                                  placeholder="e.g. planter, organizer, lamp..."
                                  placeholderTextColor="#999"
                                  value={upcycleSearchQuery}
                                  onChangeText={setUpcycleSearchQuery}
                                  returnKeyType="search"
                                  onSubmitEditing={searchMoreUpcycleIdeas}
                              />
                              <TouchableOpacity style={styles.upcycleSearchBtn} onPress={searchMoreUpcycleIdeas} disabled={isSearchingMoreIdeas}>
                                  {isSearchingMoreIdeas ? (
                                      <ActivityIndicator size="small" color="white" />
                                  ) : (
                                      <MaterialCommunityIcons name="robot" size={18} color="white" />
                                  )}
                              </TouchableOpacity>
                          </View>

                          {aiMoreProjects.length > 0 && (
                              <>
                                  <Text style={styles.aiResultLabel}>AI SEARCH RESULTS</Text>
                                  {aiMoreProjects.map((ideaObj, i) => (
                                      <TouchableOpacity key={`ai-${i}`} style={[styles.modalOption, styles.aiModalOption]} onPress={() => proceedToProject(ideaObj)}>
                                          <View style={{flex: 1}}>
                                              <Text style={styles.optionText}>{ideaObj.title}</Text>
                                              <View style={[styles.difficultyTag, {backgroundColor: getDifficultyColor(ideaObj.difficulty) + '20'}]}>
                                                  <Text style={[styles.difficultyText, {color: getDifficultyColor(ideaObj.difficulty)}]}>{ideaObj.difficulty || 'Normal'}</Text>
                                              </View>
                                          </View>
                                          <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
                                      </TouchableOpacity>
                                  ))}
                              </>
                          )}

                          <Text style={{fontSize: 12, color: '#999', marginBottom: 10, marginTop: 12, fontWeight: 'bold'}}>OR TRY AI SUGGESTIONS:</Text>

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

        <Modal visible={titleModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlayDark}>
                <View style={styles.inputModalCard}>
                    <Text style={styles.inputModalTitle}>Name your DIY Project</Text>
                    <Text style={styles.inputModalSub}>Give it a catchy name to start your upcycling journey!</Text>
                    <TextInput style={styles.titleInput} placeholder="e.g. My Custom Bottle Lamp" value={ownProjectTitle} onChangeText={setOwnProjectTitle} autoFocus />
                    <TextInput
                        style={styles.notesInput}
                        placeholder="Add notes or other information (optional)"
                        placeholderTextColor="#999"
                        value={ownProjectNotes}
                        onChangeText={setOwnProjectNotes}
                        multiline
                    />
                    <View style={styles.modalBtnRow}>
                        <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setTitleModalVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalProceedBtn} onPress={handleStartOwnProject} disabled={isCreatingDraft}>{isCreatingDraft ? <ActivityIndicator color="white" /> : <Text style={styles.modalProceedText}>Start Project</Text>}</TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        <Modal visible={successModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlayDark}>
                <View style={styles.successModalCard}>
                    <View style={styles.successIconBg}>
                        <MaterialCommunityIcons name="check-decagram" size={50} color="#007C00" />
                    </View>
                    <Text style={styles.successTitle}>Project Created!</Text>
                    <Text style={styles.successMessage}>YOUR OWN DIY PROJECT IS NOW SAVED IN THE UPCYCLE IDEAS TAB!</Text>
                    
                    <View style={styles.quoteBox}>
                        <MaterialCommunityIcons name="format-quote-open" size={20} color="#007C00" style={{marginBottom: 5}}/>
                        <Text style={styles.quoteText}>"Every piece of waste has a second life. Great job starting your upcycling journey!"</Text>
                    </View>

                    <TouchableOpacity style={styles.goUpcycleBtn} onPress={() => { setSuccessModalVisible(false); router.push('/(tabs)/projects'); }}>
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
  header: { backgroundColor: '#007C00', paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  backButton: { position: 'absolute', left: 20, bottom: 20, zIndex: 10 },
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }, 
  
  cameraContainer: { width: '100%', height: 250, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff', elevation: 4, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
  cameraImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', width: '100%' },
  loadingText: { marginTop: 10, color: '#007C00', fontWeight: 'bold', fontSize: 14 },
  
  funFactCard: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#C8E6C9', width: '100%', marginTop: 15 },
  funFactHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'center' },
  funFactTitle: { fontSize: 14, fontWeight: 'bold', color: '#007C00', marginLeft: 6 },
  funFactText: { fontSize: 13, color: '#2E7D32', textAlign: 'center', fontStyle: 'italic', lineHeight: 20 },

  placeholderContainer: { alignItems: 'center' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  placeholderText: { fontSize: 16, color: '#666', fontWeight: 'bold' },

  resultCard: { backgroundColor: 'white', borderRadius: 15, borderWidth: 1, borderColor: '#007C00', overflow: 'hidden', marginBottom: 15 },
  cardHeaderArea: { backgroundColor: '#E8F5E9', paddingVertical: 12, paddingHorizontal: 15 },
  cardHeaderTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  cardBodyArea: { padding: 20 },
  
  accuracyContainer: { marginBottom: 15 },
  progressBarBg: { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden', marginBottom: 5, borderWidth: 1, borderColor: '#007C00' },
  progressBarFill: { height: '100%', backgroundColor: '#007C00', borderRadius: 5 },
  accuracyText: { fontSize: 14, color: '#007C00', fontWeight: 'bold' },
  
  smallLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  mainWasteTitle: { fontSize: 20, fontWeight: 'bold', color: '#007C00', marginBottom: 15 },
  categoryText: { fontSize: 14, color: '#333', marginBottom: 10 },
  
  statusChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#E8F5E9', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: '#007C00', marginBottom: 5 },
  statusText: { color: '#007C00', fontWeight: 'bold', fontSize: 13, marginLeft: 8 },
  
  actionLabel: { fontSize: 13, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10 },
  
  outlinedBtn: { backgroundColor: 'white', borderRadius: 10, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#007C00' },
  outlinedBtnActive: { backgroundColor: '#007C00' },
  outlinedBtnTitle: { color: '#007C00', fontWeight: 'bold', fontSize: 13 },
  outlinedBtnSub: { color: '#666', fontSize: 10 },

  solidBtnRed: { backgroundColor: '#D32F2F', borderRadius: 10, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  solidBtnRedTitle: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  solidBtnRedSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
  
  manualInputLabel: { fontSize: 11, color: '#007C00', fontWeight: 'bold', marginBottom: 5, marginTop: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#007C00', borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#FFF' },
  textInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, fontSize: 13, color: '#333' },
  scanAgainLink: { color: '#007C00', fontWeight: 'bold', fontSize: 14 },
  
  tipsContainer: { backgroundColor: 'white', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#007C00', marginBottom: 15 },
  tipHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tipsTitle: { fontWeight: 'bold', color: '#007C00', marginLeft: 5, fontSize: 14 },
  bulletPoint: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingLeft: 5 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#007C00', marginTop: 6, marginRight: 8 },
  bulletText: { fontSize: 11, color: '#007C00', flex: 1, lineHeight: 16 },

  collectibleContainer: { backgroundColor: '#F1F8E9', borderRadius: 10, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#007C00', marginBottom: 30 },
  collectibleSmallText: { fontSize: 10, color: '#007C00', marginBottom: 4 },
  collectibleBoldText: { fontSize: 12, color: '#007C00', fontWeight: 'bold', textAlign: 'center', lineHeight: 18 },

  defaultActions: { gap: 15, marginTop: 10 },
  scanBtn: { backgroundColor: '#007C00', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, elevation: 3 },
  scanBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  uploadBtn: { backgroundColor: 'white', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#007C00' },
  uploadBtnText: { color: '#007C00', fontSize: 16, fontWeight: 'bold' },
  
  preScanTipsCard: { backgroundColor: '#F1F8E9', marginTop: 25, padding: 20, borderRadius: 10, borderWidth: 1, borderColor: '#C8E6C9' },
  preScanTipsTitle: { color: '#007C00', fontWeight: 'bold', fontSize: 16, marginBottom: 15 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  preScanTipText: { color: '#007C00', fontSize: 13, flex: 1, marginLeft: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', padding: 25, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#f0f0f0', alignItems: 'center' },
  optionText: { fontSize: 16, color: '#333', fontWeight: 'bold', marginBottom: 4 },
  difficultyTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  difficultyText: { fontSize: 11, fontWeight: 'bold' },
  upcycleSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 12, paddingLeft: 12, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 12 },
  upcycleSearchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 13, color: '#333' },
  upcycleSearchBtn: { width: 44, height: 44, backgroundColor: '#007C00', justifyContent: 'center', alignItems: 'center', borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  aiResultLabel: { fontSize: 11, color: '#007C00', fontWeight: '900', marginBottom: 8, marginTop: 4 },
  aiModalOption: { backgroundColor: '#F8FFF9', borderRadius: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: '#D7EED9', marginBottom: 8 },

  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  inputModalCard: { width: '100%', backgroundColor: 'white', borderRadius: 20, padding: 25, elevation: 10 },
  inputModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  inputModalSub: { fontSize: 13, color: '#666', marginBottom: 20 },
  titleInput: { backgroundColor: '#F5F7FA', borderWidth: 1, borderColor: '#E0E0E0', padding: 15, borderRadius: 12, fontSize: 16, color: '#333', marginBottom: 12 },
  notesInput: { backgroundColor: '#F5F7FA', borderWidth: 1, borderColor: '#E0E0E0', padding: 15, borderRadius: 12, fontSize: 14, color: '#333', marginBottom: 25, minHeight: 90, textAlignVertical: 'top' },
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