import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StatusBar } from 'react-native';
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
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

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

  const handleDone = () => {
    if (!title || !materials || !procedures || !marketValue || !finalImage) {
      Alert.alert("Incomplete", "Please fill in all fields and upload a photo of your final output.");
      return;
    }

    Alert.alert(
      "Project Completed! 🎉",
      "Do you want to post your work in the community to let others see your own DIY project?",
      [
        {
          text: "No, just save it",
          style: "cancel",
          onPress: () => saveProject(false)
        },
        {
          text: "Yes, I want to post it!",
          onPress: () => saveProject(true)
        }
      ]
    );
  };

  const saveProject = async (shouldPostToCommunity) => {
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
          const postDesc = `⚙️ Difficulty: ${difficulty}\n\n📦 Materials Needed:\n${materials}\n\n🛠️ Step-by-Step Procedure:\n${procedures}`;
          
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

      const materialsArray = materials.split('\n').filter(m => m.trim() !== '');
      const stepsArray = procedures.split('\n').filter(s => s.trim() !== '');

      // 🟢 UPDATE ANG EXISTING DRAFT IMBES NA MAG-INSERT
      if (params.projectId) {
          const { error: updateError } = await supabase.from('saved_projects').update({
              title: title,
              difficulty: difficulty,
              materials: materialsArray,
              steps: stepsArray,
              selling_price: `₱${marketValue}`,
              image_url: uploadedImageUrl,
              is_done: true // 🟢 MARKED AS DONE NA
          }).eq('id', params.projectId);

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

        <Text style={styles.label}>Required Materials *</Text>
        <Text style={styles.subLabel}>List down everything you used (e.g., Scissors, Glue, Paint)</Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder="- 1x Plastic Bottle&#10;- Scissor&#10;- Paint" multiline numberOfLines={4} value={materials} onChangeText={setMaterials} textAlignVertical="top" />

        <Text style={styles.label}>Step-by-Step Procedure *</Text>
        <Text style={styles.subLabel}>Track your DIY process. How did you make it?</Text>
        <TextInput style={[styles.input, styles.textArea, {height: 150}]} placeholder="Step 1: Clean the bottle.&#10;Step 2: Cut the top part..." multiline value={procedures} onChangeText={setProcedures} textAlignVertical="top" />

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: '#007C00', paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, flexDirection: 'row', alignItems: 'center', elevation: 5 },
  backButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  scrollContent: { padding: 20 },
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
  uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#007C00', fontWeight: '600', marginTop: 10, fontSize: 13 },
  submitBtn: { backgroundColor: '#007C00', flexDirection: 'row', paddingVertical: 18, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 35, elevation: 4, shadowColor: '#007C00', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 5 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }
});