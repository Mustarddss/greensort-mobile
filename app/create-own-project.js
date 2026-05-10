import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StatusBar, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase'; 

export default function CreateOwnProject() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [materials, setMaterials] = useState('');
  const [procedures, setProcedures] = useState('');
  const [marketValue, setMarketValue] = useState('');
  const [finalImage, setFinalImage] = useState(null);
  const [notes, setNotes] = useState('');
  const [checkedMaterials, setCheckedMaterials] = useState({});
  const [checkedSteps, setCheckedSteps] = useState({});
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [postChoiceModalVisible, setPostChoiceModalVisible] = useState(false);

  // 🟢 KUNG IN-OPEN MULA SA UPCYCLE IDEAS (ON GOING), I-LOAD ANG DATA
  useEffect(() => {
      if (params.projectId) {
          const fetchDraft = async () => {
              setIsLoadingDraft(true);
              try {
                  const { data, error } = await supabase
                      .from('saved_projects')
                      .select('*')
                      .eq('id', params.projectId)
                      .single();
                      
                  if (data) {
                      setTitle(data.title);
                      if (data.difficulty) setDifficulty(data.difficulty);
                      if (data.materials && data.materials.length > 0) setMaterials(data.materials.join('\n'));
                      if (data.steps && data.steps.length > 0) setProcedures(data.steps.join('\n'));
                      if (data.selling_price) setMarketValue(data.selling_price.replace('₱', ''));
                      if (data.image_url && !data.image_url.includes('unsplash')) setFinalImage(data.image_url);
                      setNotes(data.notes || data.additional_notes || data.other_information || data.other_info || '');
                      setCheckedMaterials(data.checked_materials || {});
                      setCheckedSteps(data.checked_steps || {});
                  }
              } catch (error) {
                  console.log("Draft load error:", error);
              } finally {
                  setIsLoadingDraft(false);
              }
          };
          fetchDraft();
      }
  }, [params.projectId]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setFinalImage(result.assets[0].uri);
    }
  };

  const materialsArray = materials
    .split('\n')
    .map(item => item.trim())
    .filter(item => item !== '');

  const stepsArray = procedures
    .split('\n')
    .map(item => item.trim())
    .filter(item => item !== '');

  const toggleMaterialCheck = (index) => {
    setCheckedMaterials(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleStepCheck = (index) => {
    setCheckedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleDone = () => {
    if (!title || !materials || !procedures || !marketValue || !finalImage) {
      Alert.alert("Incomplete", "Please fill in all fields and upload a photo of your final output.");
      return;
    }

    setPostChoiceModalVisible(true);
  };

  const saveProject = async (shouldPostToCommunity, postType = 'DIY Project') => {
    setPostChoiceModalVisible(false);
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Please log in first.");

      const userName = session.user.user_metadata?.full_name || 'GreenSort Member';
      const userAvatar = session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=00C853&color=fff`;

      let uploadedImageUrl = finalImage;
      if (finalImage && !finalImage.startsWith('http')) {
          const formData = new FormData();
          formData.append('file', { uri: finalImage, name: `diy_${Date.now()}.jpg`, type: 'image/jpeg' });
          const { data, error } = await supabase.storage.from('post_images').upload(`diy/${Date.now()}.jpg`, formData);
          if (!error) { 
              const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path); 
              uploadedImageUrl = urlData.publicUrl; 
          }
      }

      if (shouldPostToCommunity) {
          const postDesc = `⚙️ Difficulty: ${difficulty}\n\n📦 Materials Needed:\n${materials}\n\n🛠️ Step-by-Step Procedure:\n${procedures}${notes.trim() ? `\n\n📝 Notes & Reminders:\n${notes}` : ''}`;
          
          const postData = { 
              user: userName, 
              avatar: userAvatar, 
              type: 'DIY Project', 
              title: `Hey checkout my Own DIY Project: ${title}`, 
              desc: postDesc, 
              price: `Market Value: ₱${marketValue}`, 
              location: 'GreenSort Community', 
              image: uploadedImageUrl, 
              status: 'active', 
              likes: 0, 
              comments: 0, 
              liked_by: [] 
          };

          const { error: postError } = await supabase.from('posts').insert([postData]);
          if (postError) throw postError;
      }

      // 🟢 UPDATE ANG EXISTING DRAFT IMBES NA MAG-INSERT
      if (params.projectId) {
          const updatePayload = {
              title: title,
              difficulty: difficulty,
              materials: materialsArray,
              steps: stepsArray,
              selling_price: `₱${marketValue}`,
              image_url: uploadedImageUrl,
              is_done: true,
              notes: notes,
              checked_materials: checkedMaterials,
              checked_steps: checkedSteps
          };

          let { error: updateError } = await supabase
              .from('saved_projects')
              .update(updatePayload)
              .eq('id', params.projectId);

          // Fallback para hindi mag-crash kung wala pa yung bagong columns sa Supabase
          if (updateError && updateError.message) {
              const msg = updateError.message.toLowerCase();

              if (
                  msg.includes('notes') ||
                  msg.includes('checked_materials') ||
                  msg.includes('checked_steps')
              ) {
                  const fallbackPayload = { ...updatePayload };
                  delete fallbackPayload.notes;
                  delete fallbackPayload.checked_materials;
                  delete fallbackPayload.checked_steps;

                  const retry = await supabase
                      .from('saved_projects')
                      .update(fallbackPayload)
                      .eq('id', params.projectId);

                  updateError = retry.error;
              }
          }

          if (updateError) throw updateError;
      }

      Alert.alert(
          "Success!", 
          shouldPostToCommunity ? "Project posted to feed & saved to your guides!" : "Saved securely as your OWN GUIDE.",
          [{ text: "Awesome!", onPress: () => router.replace('/(tabs)/projects') }]
      );

    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingDraft) {
      return (
          <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
              <ActivityIndicator size="large" color="#007C00" />
              <Text style={{marginTop: 10, color: '#666'}}>Loading your draft...</Text>
          </View>
      );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={{flex: 1, alignItems: 'center', marginRight: 40}}>
              <Text style={styles.headerTitle}>OWN DIY PROJECT</Text>
              <Text style={styles.headerSub}>Finish what you started</Text>
          </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.label}>Show Off Your Final Output *</Text>
        <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage}>
            {finalImage ? (
                <Image source={{ uri: finalImage }} style={styles.uploadedImage} />
            ) : (
                <View style={styles.placeholderBox}>
                    <MaterialCommunityIcons name="camera-plus" size={36} color="#007C00" />
                    <Text style={styles.placeholderText}>Tap to upload your finished project</Text>
                </View>
            )}
        </TouchableOpacity>

        <Text style={styles.label}>Project Name *</Text>
        <TextInput style={styles.input} placeholder="e.g. Elegant Glass Bottle Lamp" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Difficulty Level</Text>
        <View style={styles.diffRow}>
            {['Easy', 'Medium', 'Hard'].map(lvl => (
                <TouchableOpacity key={lvl} style={[styles.diffBtn, difficulty === lvl && styles.diffBtnActive, {borderColor: difficulty === lvl ? '#007C00' : '#E0E0E0'}]} onPress={() => setDifficulty(lvl)}>
                    <Text style={[styles.diffBtnText, difficulty === lvl && {color: '#007C00'}]}>{lvl}</Text>
                </TouchableOpacity>
            ))}
        </View>

        <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
                <MaterialCommunityIcons name="hammer-screwdriver" size={20} color="#007C00" />
                <View style={{flex: 1}}>
                    <Text style={[styles.label, {marginTop: 0}]}>Required Materials *</Text>
                    <Text style={styles.subLabel}>List each material on a new line.</Text>
                </View>
            </View>

            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={"- 1x Plastic Bottle\n- Scissor\n- Paint"}
                multiline
                numberOfLines={4}
                value={materials}
                onChangeText={setMaterials}
                textAlignVertical="top"
            />

            {materialsArray.length > 0 && (
                <View style={styles.checklistPreview}>
                    <Text style={styles.previewTitle}>Material Checklist Preview</Text>
                    {materialsArray.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            activeOpacity={0.8}
                            style={[
                                styles.checkItem,
                                checkedMaterials[index] && styles.checkItemActive
                            ]}
                            onPress={() => toggleMaterialCheck(index)}
                        >
                            <MaterialCommunityIcons
                                name={checkedMaterials[index] ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                                size={22}
                                color={checkedMaterials[index] ? "#007C00" : "#90A4AE"}
                            />
                            <Text style={[
                                styles.checkItemText,
                                checkedMaterials[index] && styles.checkItemTextDone
                            ]}>
                                {item.replace(/^-\s*/, '')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>

        <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={21} color="#007C00" />
                <View style={{flex: 1}}>
                    <Text style={[styles.label, {marginTop: 0}]}>Step-by-Step Procedure *</Text>
                    <Text style={styles.subLabel}>Write each step on a new line.</Text>
                </View>
            </View>
            <TextInput
                style={[styles.input, styles.textArea, {height: 150}]}
                placeholder={"Step 1: Clean the bottle.\nStep 2: Cut the top part..."}
                multiline
                value={procedures}
                onChangeText={setProcedures}
                textAlignVertical="top"
            />

            {stepsArray.length > 0 && (
                <View style={styles.checklistPreview}>
                    <Text style={styles.previewTitle}>Procedure Checklist Preview</Text>
                    {stepsArray.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            activeOpacity={0.8}
                            style={[
                                styles.stepCheckCard,
                                checkedSteps[index] && styles.stepCheckCardDone
                            ]}
                            onPress={() => toggleStepCheck(index)}
                        >
                            <View style={[
                                styles.stepNumberCircle,
                                checkedSteps[index] && styles.stepNumberCircleDone
                            ]}>
                                {checkedSteps[index] ? (
                                    <MaterialCommunityIcons name="check" size={18} color="white" />
                                ) : (
                                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                                )}
                            </View>

                            <View style={{flex: 1}}>
                                <Text style={[
                                    styles.stepPreviewTitle,
                                    checkedSteps[index] && styles.stepPreviewTitleDone
                                ]}>
                                    Step {index + 1}
                                </Text>
                                <Text style={[
                                    styles.stepPreviewText,
                                    checkedSteps[index] && styles.stepPreviewTextDone
                                ]}>
                                    {item.replace(/^Step\s*\d+\s*:/i, '').trim()}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>

        <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
                <MaterialCommunityIcons name="note-edit-outline" size={21} color="#FF9800" />
                <View style={{flex: 1}}>
                    <Text style={[styles.label, {marginTop: 0}]}>Notes & Reminders</Text>
                    <Text style={styles.subLabel}>Optional reminders, measurements, mistakes to avoid, or design ideas.</Text>
                </View>
            </View>

            <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder={"Example:\n- Let the paint dry overnight\n- Buy stronger glue\n- Try adding ribbon design"}
                multiline
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
            />
        </View>

        <Text style={styles.label}>Market Value (₱) *</Text>
        <Text style={styles.subLabel}>How much do you think this is worth if sold?</Text>
        <View style={styles.priceWrap}>
            <Text style={styles.currencyIcon}>₱</Text>
            <TextInput style={styles.priceInput} placeholder="0.00" keyboardType="numeric" value={marketValue} onChangeText={setMarketValue} />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleDone} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="white" /> : (
                <>
                    <FontAwesome5 name="check-circle" size={18} color="white" style={{marginRight: 8}} />
                    <Text style={styles.submitBtnText}>Done & Save</Text>
                </>
            )}
        </TouchableOpacity>
        
        <View style={{height: 40}} />
      </ScrollView>

      <Modal
        visible={postChoiceModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPostChoiceModalVisible(false)}
      >
        <View style={styles.completeModalOverlay}>
          <View style={styles.completeModalCard}>
            <View style={styles.completeIconCircle}>
              <MaterialCommunityIcons name="check-decagram" size={42} color="white" />
            </View>

            <Text style={styles.completeModalTitle}>Project Completed!</Text>
            <Text style={styles.completeModalSub}>
              Do you want to share your finished DIY project with the community?
            </Text>

            <View style={styles.completeOptionRow}>
              <TouchableOpacity style={styles.completeSmallBtn} onPress={() => saveProject(true, 'For Sale')}>
                <MaterialCommunityIcons name="tag" size={20} color="#007C00" />
                <Text style={styles.completeSmallBtnText}>For Sale</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.completeSmallBtn} onPress={() => saveProject(true, 'Trade')}>
                <MaterialCommunityIcons name="swap-horizontal" size={22} color="#007C00" />
                <Text style={styles.completeSmallBtnText}>Trade</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.completeSmallBtn} onPress={() => saveProject(true, 'Free')}>
                <MaterialCommunityIcons name="gift-outline" size={20} color="#007C00" />
                <Text style={styles.completeSmallBtnText}>Free</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.completeShowcaseBtn} onPress={() => saveProject(true, 'DIY Project')}>
              <MaterialCommunityIcons name="creation" size={20} color="white" />
              <Text style={styles.completeShowcaseText}>Post as DIY Project Showcase</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.completeCancelBtn} onPress={() => saveProject(false)}>
              <Text style={styles.completeCancelText}>No thanks, just save it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: '#007C00', paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, flexDirection: 'row', alignItems: 'center', elevation: 5 },
  backButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  scrollContent: { padding: 20, paddingBottom: 50 },
  label: { fontSize: 15, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 4 },
  subLabel: { fontSize: 11, color: '#888', marginBottom: 8, fontStyle: 'italic' },
  input: { backgroundColor: 'white', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#E5E5EA', fontSize: 14, color: '#333', elevation: 1 },
  textArea: { height: 100, paddingTop: 15 },
  diffRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  diffBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', backgroundColor: 'white' },
  diffBtnActive: { backgroundColor: '#E8F5E9' },
  diffBtnText: { fontSize: 13, fontWeight: 'bold', color: '#666' },
  priceWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA', paddingHorizontal: 15, elevation: 1 },
  currencyIcon: { fontSize: 16, color: '#666', fontWeight: 'bold', marginRight: 10 },
  priceInput: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#333', fontWeight: 'bold' },
  imageUploadBox: { width: '100%', height: 200, borderRadius: 16, borderWidth: 2, borderColor: '#C8E6C9', borderStyle: 'dashed', backgroundColor: '#F1F8E9', overflow: 'hidden', marginTop: 5 },
  formCard: { backgroundColor: 'white', borderRadius: 18, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#ECEFF1', elevation: 1 },
  formCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  checklistPreview: { marginTop: 12, gap: 9 },
  previewTitle: { fontSize: 12, fontWeight: '900', color: '#007C00', marginBottom: 2, textTransform: 'uppercase' },
  checkItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11 },
  checkItemActive: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  checkItemText: { flex: 1, marginLeft: 9, color: '#455A64', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  checkItemTextDone: { color: '#2E7D32', textDecorationLine: 'line-through' },
  stepCheckCard: { flexDirection: 'row', backgroundColor: '#FAFAFA', borderRadius: 16, padding: 13, borderWidth: 1, borderColor: '#EEEEEE' },
  stepCheckCardDone: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  stepNumberCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#007C00', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNumberCircleDone: { backgroundColor: '#2E7D32' },
  stepNumberText: { color: 'white', fontWeight: '900', fontSize: 14 },
  stepPreviewTitle: { color: '#263238', fontSize: 13, fontWeight: '900', marginBottom: 3 },
  stepPreviewTitleDone: { color: '#2E7D32' },
  stepPreviewText: { color: '#546E7A', fontSize: 13, lineHeight: 19 },
  stepPreviewTextDone: { color: '#607D8B', textDecorationLine: 'line-through' },
  notesInput: { minHeight: 120, textAlignVertical: 'top' },
  uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#007C00', fontWeight: '600', marginTop: 10, fontSize: 13 },
  completeModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  completeModalCard: { width: '100%', backgroundColor: 'white', borderRadius: 28, padding: 24, alignItems: 'center', elevation: 10 },
  completeIconCircle: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#007C00', justifyContent: 'center', alignItems: 'center', marginTop: -62, marginBottom: 14, borderWidth: 5, borderColor: 'white' },
  completeModalTitle: { fontSize: 23, fontWeight: '900', color: '#263238', marginBottom: 8, textAlign: 'center' },
  completeModalSub: { fontSize: 14, color: '#607D8B', textAlign: 'center', lineHeight: 21, marginBottom: 22 },
  completeOptionRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 12 },
  completeSmallBtn: { flex: 1, backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 15, paddingVertical: 13, justifyContent: 'center', alignItems: 'center' },
  completeSmallBtnText: { color: '#007C00', fontSize: 12, fontWeight: '800', marginTop: 4 },
  completeShowcaseBtn: { width: '100%', backgroundColor: '#007C00', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  completeShowcaseText: { color: 'white', fontSize: 13, fontWeight: '900' },
  completeCancelBtn: { paddingVertical: 12, paddingHorizontal: 18 },
  completeCancelText: { color: '#78909C', fontWeight: '700', fontSize: 13 },
  submitBtn: { backgroundColor: '#007C00', flexDirection: 'row', paddingVertical: 18, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 35, elevation: 4, shadowColor: '#007C00', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 5 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }
});