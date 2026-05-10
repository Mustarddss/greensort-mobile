import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, Image, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const CATEGORIES = ['All', 'Plastics', 'Glass', 'Paper', 'Metals', 'Others', 'My OWN Guides'];

const getSafeShadow = () => Platform.select({ 
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, 
    android: { elevation: 3 } 
});

export default function ProjectsPage() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  const insets = useSafeAreaInsets(); 
  
  const [projects, setProjects] = useState([]); 
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false); 
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [completedProjectModalVisible, setCompletedProjectModalVisible] = useState(false);
  const [completedProject, setCompletedProject] = useState(null);

  const loadSavedProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
          .from('saved_projects')
          .select('*')
          .eq('user_email', user.email)
          .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
          const formattedData = data.map(item => ({
              id: item.id,
              title: item.title,
              materialCategory: item.material_category,
              difficulty: item.difficulty,
              time: item.time_required,
              cost: item.estimated_cost,
              materials: item.materials || [],
              steps: item.steps || [],
              sellingPrice: item.selling_price,
              image: item.image_url,
              youtubeLink: item.youtube_link,
              isDone: item.is_done || false,
              isOwnGuide: item.material_category === 'My OWN Guides' 
          }));
          setProjects(formattedData);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    loadSavedProjects();
  }, []);

  const generateDIYGuide = async (itemName, projectType) => {
    setIsGenerating(true);
    
    const promptText = `You are an expert DIY upcycling crafter. Create a step-by-step DIY guide on how to make a "${projectType}" using a discarded "${itemName}".
    Respond strictly in pure JSON format (no markdown blocks like \`\`\`json) with the following keys:
    {
      "title": "${projectType}",
      "materialCategory": "Choose one: Plastics, Glass, Paper, Metals, Others",
      "difficulty": "Easy, Medium, or Hard",
      "time": "e.g., 15 min, 1 hour",
      "cost": "e.g., ₱20-50",
      "materials": ["Material 1", "Material 2"],
      "steps": ["Step 1: ...", "Step 2: ..."],
      "sellingPrice": "e.g., ₱50-100"
    }`;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to save projects.");

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}` 
        },
        body: JSON.stringify({
          model: 'gpt-5.4', 
          messages: [{ role: 'user', content: promptText }],
          temperature: 0.7,
          max_completion_tokens: 1200, 
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
          const generatedGuide = JSON.parse(jsonMatch[0]);
          let finalImageUrl = params.scannedImageUri; 
          
          if (params.scannedImageUri && params.scannedImageUri.startsWith('file://')) {
              try {
                  const formData = new FormData();
                  formData.append('file', {
                      uri: params.scannedImageUri,
                      name: `project_${Date.now()}.jpg`,
                      type: 'image/jpeg',
                  });

                  const { data: uploadData, error: uploadError } = await supabase.storage
                      .from('project_images')
                      .upload(`public/${Date.now()}.jpg`, formData);

                  if (uploadError) {
                      console.log("Supabase Upload Blocked:", uploadError.message);
                  } else if (uploadData) {
                      const { data: urlData } = supabase.storage
                          .from('project_images')
                          .getPublicUrl(uploadData.path);
                      finalImageUrl = urlData.publicUrl; 
                  }
              } catch (uploadError) {
                  console.log("Image upload failed:", uploadError);
              }
          }

          const ytLink = params.youtubeLink || null;
          
          const { data: insertedData, error: dbError } = await supabase
              .from('saved_projects')
              .insert([{
                  user_email: user.email,
                  title: generatedGuide.title,
                  material_category: generatedGuide.materialCategory,
                  difficulty: generatedGuide.difficulty,
                  time_required: generatedGuide.time,
                  estimated_cost: generatedGuide.cost,
                  materials: generatedGuide.materials, 
                  steps: generatedGuide.steps, 
                  selling_price: generatedGuide.sellingPrice,
                  image_url: finalImageUrl, 
                  youtube_link: ytLink,
                  is_done: false 
              }])
              .select()
              .single();

          if (dbError) throw dbError;

          const newProject = {
              id: insertedData.id,
              title: insertedData.title,
              materialCategory: insertedData.material_category,
              difficulty: insertedData.difficulty,
              time: insertedData.time_required,
              cost: insertedData.estimated_cost,
              materials: insertedData.materials,
              steps: insertedData.steps,
              sellingPrice: insertedData.selling_price,
              image: insertedData.image_url,
              youtubeLink: insertedData.youtube_link,
              isDone: false,
              isOwnGuide: false
          };
          
          setProjects(prevProjects => [newProject, ...prevProjects]);
          setSelectedProject(newProject);
      } else {
          throw new Error("Invalid format from AI.");
      }
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Oops!", "May problema sa pag-save. Subukan ulit.");
      if (router.canGoBack()) router.back(); 
      else router.replace('/(tabs)/scan'); 
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleProjectStatus = async (projectId, currentStatus) => {
      const newStatus = !currentStatus;
      const targetProject = projects.find(p => p.id === projectId);

      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, isDone: newStatus } : p));
      if (selectedProject && selectedProject.id === projectId) {
          setSelectedProject(prev => ({ ...prev, isDone: newStatus }));
      }

      try {
          const { error } = await supabase
              .from('saved_projects')
              .update({ is_done: newStatus })
              .eq('id', projectId);

          if (error) throw error;

          if (newStatus === true && targetProject) {
              setCompletedProject({ ...targetProject, isDone: true });
              setCompletedProjectModalVisible(true);
          }
      } catch (error) {
          console.error("Error updating status:", error);
          setProjects(prev => prev.map(p => p.id === projectId ? { ...p, isDone: currentStatus } : p));
          if (selectedProject && selectedProject.id === projectId) {
              setSelectedProject(prev => ({ ...prev, isDone: currentStatus }));
          }
      }
  };

  const openCommunityPostFromProject = (postType) => {
      if (!completedProject) return;

      const cleanPrice = completedProject.sellingPrice
          ? String(completedProject.sellingPrice).replace(/[₱]/g, '').trim()
          : '';

      setCompletedProjectModalVisible(false);

      router.push({
          pathname: '/(tabs)/dashboard',
          params: {
              autoCreatePost: 'true',
              fromUpcycle: 'true',
              postType: postType,
              postTitle: completedProject.title || '',
              postDesc: `Upcycled DIY Project: ${completedProject.title || ''}`,
              postPrice: postType === 'For Sale' ? cleanPrice : '',
              postImage: completedProject.image || ''
          }
      });
  };

  useEffect(() => {
    if (params.openDirectly === 'true' && params.projectType && params.itemName) {
        generateDIYGuide(params.itemName, params.projectType);
    }
  }, [params.openDirectly, params.projectType, params.itemName]); 

  useEffect(() => {
    const backAction = () => {
      if (selectedProject) { setSelectedProject(null); return true; }
      return false; 
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedProject]);

  const handleBack = () => {
      if (selectedProject) {
          setSelectedProject(null);
          loadSavedProjects(); 
      } else {
          router.back();
      }
  };

  const openYouTube = async (url) => {
    if (!url) return;
    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
        else Alert.alert("Error", "Cannot open YouTube links on this device.");
    } catch (error) { console.error("Error opening link:", error); }
  };

  const filteredProjects = projects.filter(project => {
    const matchesCategory = activeCategory === 'All' ? true : project.materialCategory === activeCategory;
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          project.materialCategory.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isGenerating) {
      return (
          <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
              <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
              <ActivityIndicator size="large" color="#007C00" />
              <Text style={{marginTop: 20, fontSize: 18, fontWeight: 'bold', color: '#007C00'}}>Crafting your DIY Guide...</Text>
              <Text style={{marginTop: 5, fontSize: 14, color: '#666'}}>AI is gathering materials and steps</Text>
          </View>
      );
  }

  // 📖 RENDER: DIY GUIDE (DETAIL VIEW)
  if (selectedProject) {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                    <Text style={styles.headerTitle}>{selectedProject.isOwnGuide ? 'OWN DIY PROJECT' : 'DIY Guide'}</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.detailBody}>
                    <View style={styles.detailCard}>
                        <Image source={{ uri: selectedProject.image }} style={styles.detailImage} fallbackSource={require('../../assets/images/favicon.png')} />
                        <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{selectedProject.materialCategory}</Text></View>
                        <View style={styles.detailContent}>
                            <Text style={styles.detailTitle}>{selectedProject.title}</Text>
                            <View style={styles.tagsRow}>
                                <View style={[styles.tag, {backgroundColor: '#E8F5E9'}]}><Text style={[styles.tagText, {color: '#007C00'}]}>{selectedProject.difficulty}</Text></View>
                                {!selectedProject.isOwnGuide && <View style={styles.metaItem}><MaterialCommunityIcons name="clock-outline" size={16} color="#666" /><Text style={styles.metaText}>{selectedProject.time}</Text></View>}
                                {!selectedProject.isOwnGuide && <View style={styles.metaItem}><MaterialCommunityIcons name="cash" size={16} color="#666" /><Text style={styles.metaText}>{selectedProject.cost}</Text></View>}
                            </View>
                        </View>
                    </View>

                    {/* Tago ang "Mark as Done" button kapag OWN DIY GUIDE na kasi tapos na yon */}
                    {!selectedProject.isOwnGuide && (
                        <TouchableOpacity 
                            style={[styles.doneButton, selectedProject.isDone ? styles.doneButtonActive : null]} 
                            onPress={() => toggleProjectStatus(selectedProject.id, selectedProject.isDone)}
                        >
                            <MaterialCommunityIcons 
                                name={selectedProject.isDone ? "check-circle" : "check-circle-outline"} 
                                size={24} 
                                color={selectedProject.isDone ? "white" : "#007C00"} 
                                style={{marginRight: 10}} 
                            />
                            <Text style={[styles.doneButtonText, selectedProject.isDone ? {color: 'white'} : null]}>
                                {selectedProject.isDone ? "Project Completed! ✅" : "Mark as Done"}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Required Materials</Text>
                        {selectedProject.materials.map((mat, i) => <View key={i} style={styles.listItem}><View style={styles.squareBullet} /><Text style={styles.listText}>{mat}</Text></View>)}
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
                        {selectedProject.steps.map((step, i) => <View key={i} style={styles.stepItem}><View style={styles.stepNumberBox}><Text style={styles.stepNumber}>{i+1}</Text></View><Text style={styles.stepText}>{step}</Text></View>)}
                    </View>

                    {selectedProject.sellingPrice && (
                        <View style={[styles.sectionCard, { borderLeftWidth: 5, borderLeftColor: '#007C00' }]}>
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}><FontAwesome5 name="money-bill-wave" size={16} color="#007C00" /><Text style={[styles.sectionTitle, {marginLeft: 10, marginBottom: 0}]}>Market Value</Text></View>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#007C00', marginTop: 5 }}>{selectedProject.sellingPrice}</Text>
                            <Text style={{ fontSize: 12, color: '#888' }}>Potential selling price for your finished product.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <Modal
                visible={completedProjectModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setCompletedProjectModalVisible(false)}
            >
                <View style={styles.completeModalOverlay}>
                    <View style={styles.completeModalCard}>
                        <View style={styles.completeIconCircle}>
                            <MaterialCommunityIcons name="check-decagram" size={42} color="white" />
                        </View>

                        <Text style={styles.completeModalTitle}>Project Completed!</Text>
                        <Text style={styles.completeModalSub}>
                            Do you want to share this upcycled project with the community?
                        </Text>

                        <View style={styles.completeOptionRow}>
                            <TouchableOpacity style={styles.completeSmallBtn} onPress={() => openCommunityPostFromProject('For Sale')}>
                                <MaterialCommunityIcons name="tag" size={20} color="#007C00" />
                                <Text style={styles.completeSmallBtnText}>For Sale</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.completeSmallBtn} onPress={() => openCommunityPostFromProject('Trade')}>
                                <MaterialCommunityIcons name="swap-horizontal" size={22} color="#007C00" />
                                <Text style={styles.completeSmallBtnText}>Trade</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.completeSmallBtn} onPress={() => openCommunityPostFromProject('Free')}>
                                <MaterialCommunityIcons name="gift-outline" size={20} color="#007C00" />
                                <Text style={styles.completeSmallBtnText}>Free</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.completeCancelBtn} onPress={() => setCompletedProjectModalVisible(false)}>
                            <Text style={styles.completeCancelText}>Not now, just save it</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
  }

  // 📋 RENDER: PROJECT LIST (MAIN VIEW)
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
          <View style={styles.headerRow}>
             <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity> 
             <View style={{alignItems: 'center'}}><Text style={styles.headerTitle}>Upcycle Ideas</Text><Text style={styles.headerSubtitle}>Give waste a second life</Text></View>
             <View style={{ width: 40 }} />
          </View>
      </View>

     <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput placeholder="Search projects or materials..." placeholderTextColor="#A9A9A9" style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery.length > 0 && (<TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color="#999" /></TouchableOpacity>)}
        </View>
      </View>

          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {CATEGORIES.map((cat, i) => (
                    <TouchableOpacity key={i} style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive, cat === 'My OWN Guides' && {borderWidth: 1, borderColor: '#007C00'}]} onPress={() => setActiveCategory(cat)}>
                        <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive, cat === 'My OWN Guides' && !activeCategory.includes('My OWN') && {color: '#007C00'}]}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
          </View>

          {isLoadingProjects ? (
             <View style={{marginTop: 50, alignItems: 'center'}}>
                 <ActivityIndicator size="large" color="#007C00" />
                 <Text style={{marginTop: 10, color: '#666'}}>Loading projects...</Text>
             </View>
          ) : (
            <FlatList
                data={filteredProjects}
                scrollEnabled={false} 
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="robot-outline" size={60} color="#ccc" />
                    <Text style={[styles.emptyText, {fontWeight: 'bold', color: '#666', marginTop: 15}]}>Your Gallery is Empty</Text>
                    <Text style={[styles.emptyText, {textAlign: 'center', paddingHorizontal: 40, marginTop: 5}]}>Go to the Scan page, take a photo of your waste, and let AI generate DIY projects for you, or create your own!</Text>
                </View>
                )}
                renderItem={({ item }) => (
                <TouchableOpacity 
                    style={styles.card} 
                    activeOpacity={0.9}
                    onPress={() => {
                        // 🟢 LOGIC: Kung "ON GOING" ito (is_done: false), ipadala sa edit page
                        if (item.isOwnGuide && !item.isDone) {
                            router.push({ pathname: '/create-own-project', params: { projectId: item.id } });
                        } else {
                            setSelectedProject(item);
                        }
                    }} 
                >
                    <Image source={{ uri: item.image }} style={styles.cardImage} />
                    
                    {/* 🟢 CUSTOM BADGE PARA SA OWN DIY */}
                    {item.isOwnGuide ? (
                        <View style={[styles.completedBadge, item.isDone ? {backgroundColor: '#2E7D32'} : {backgroundColor: '#1976D2'}]}>
                            <MaterialCommunityIcons name={item.isDone ? "check-decagram" : "pencil-circle"} size={14} color="white" />
                            <Text style={styles.completedBadgeText}>{item.isDone ? "OWN GUIDE | DONE" : "OWN GUIDE | ON GOING"}</Text>
                        </View>
                    ) : item.isDone ? (
                        <View style={styles.completedBadge}>
                            <MaterialCommunityIcons name="check-decagram" size={14} color="white" />
                            <Text style={styles.completedBadgeText}>DONE</Text>
                        </View>
                    ) : null}

                    <View style={[styles.badge, {backgroundColor: '#007C00'}]}><Text style={styles.badgeText}>{item.difficulty}</Text></View>
                    <View style={styles.cardContent}>
                    <Text style={[styles.cardMaterialTag, item.isOwnGuide && {color: '#1976D2'}]}>{item.materialCategory}</Text>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    
                    {!item.isOwnGuide && (
                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}><MaterialCommunityIcons name="clock-outline" size={16} color="#888" /><Text style={styles.metaText}>{item.time}</Text></View>
                            <View style={styles.metaItem}><MaterialCommunityIcons name="cash" size={16} color="#888" /><Text style={styles.metaText}>{item.cost}</Text></View>
                        </View>
                    )}
                    </View>
                </TouchableOpacity>
                )}
            />
          )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#007C00', paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
  searchContainer: { paddingHorizontal: 20, marginTop: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 15, paddingHorizontal: 15, height: 52, ...getSafeShadow() },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#999' },
  categoryContainer: { marginTop: 10 },
  categoryScroll: { paddingHorizontal: 20, paddingVertical: 10 },
  categoryPill: { backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 10, ...getSafeShadow() },
  categoryPillActive: { backgroundColor: '#007C00' },
  categoryText: { fontSize: 13, color: '#666', fontWeight: '600' },
  categoryTextActive: { color: 'white' },
  listContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 20, marginBottom: 20, ...getSafeShadow(), overflow: 'hidden' },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover', backgroundColor: '#e0e0e0' },
  badge: { position: 'absolute', top: 15, right: 15, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  completedBadge: { position: 'absolute', top: 15, left: 15, backgroundColor: '#2E7D32', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', zIndex: 5, elevation: 3 },
  completedBadgeText: { color: 'white', fontSize: 11, fontWeight: 'bold', marginLeft: 4, letterSpacing: 0.5 },
  cardContent: { padding: 18 },
  cardMaterialTag: { color: '#007C00', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#666', fontSize: 13, fontWeight: '500' },
  detailBody: { paddingHorizontal: 20, marginTop: 20 },
  detailCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 15, ...getSafeShadow() },
  detailImage: { width: '100%', height: 220, borderRadius: 16, backgroundColor: '#e0e0e0' },
  categoryBadge: { position: 'absolute', top: 35, left: 35, padding: 6, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)' },
  categoryBadgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: '#263238', marginVertical: 15 },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  tag: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 12 },
  tagText: { fontSize: 12, fontWeight: 'bold' },
  doneButton: { backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 15, marginBottom: 15, borderWidth: 2, borderColor: '#007C00', ...getSafeShadow() },
  doneButtonActive: { backgroundColor: '#007C00' },
  doneButtonText: { color: '#007C00', fontSize: 16, fontWeight: 'bold' },
  youtubeButton: { backgroundColor: '#FF0000', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 15, marginBottom: 20, ...getSafeShadow() },
  youtubeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  sectionCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 20, ...getSafeShadow() },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#263238', marginBottom: 18 },
  listItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  squareBullet: { width: 8, height: 8, backgroundColor: '#007C00', marginRight: 12, borderRadius: 3 }, 
  listText: { color: '#546E7A', fontSize: 15, flex: 1 },
  stepItem: { flexDirection: 'row', marginBottom: 18 },
  stepNumberBox: { width: 32, height: 32, backgroundColor: '#E8F5E9', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 }, 
  stepNumber: { color: '#007C00', fontWeight: 'bold' },
  stepText: { color: '#546E7A', fontSize: 15, flex: 1, lineHeight: 22 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 14 },

  completeModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  completeModalCard: { width: '100%', backgroundColor: 'white', borderRadius: 28, padding: 24, alignItems: 'center', elevation: 10 },
  completeIconCircle: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#007C00', justifyContent: 'center', alignItems: 'center', marginTop: -62, marginBottom: 14, borderWidth: 5, borderColor: 'white' },
  completeModalTitle: { fontSize: 23, fontWeight: '900', color: '#263238', marginBottom: 8, textAlign: 'center' },
  completeModalSub: { fontSize: 14, color: '#607D8B', textAlign: 'center', lineHeight: 21, marginBottom: 22 },
  completeOptionRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 10 },
  completeSmallBtn: { flex: 1, backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 15, paddingVertical: 13, justifyContent: 'center', alignItems: 'center' },
  completeSmallBtnText: { color: '#007C00', fontSize: 12, fontWeight: '800', marginTop: 4 },
  completeCancelBtn: { paddingVertical: 12, paddingHorizontal: 18 },
  completeCancelText: { color: '#78909C', fontWeight: '700', fontSize: 13 },
});